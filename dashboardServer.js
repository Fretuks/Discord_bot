const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const rateLimit = require('express-rate-limit');
const {addWarning, getWarnings} = require('./services/warnings');
const {
    getGuildPermissions,
    updateGuildPermissions,
    sanitizePermissionPayload,
} = require('./services/permissions');
const DEFAULT_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const PERMISSION_BITS = {
    ADMINISTRATOR: 0x8n,
    MANAGE_GUILD: 0x20n,
};

const loadConfig = () => {
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
        return require(configPath);
    }
    return {};
};

const config = loadConfig();

const DISCORD_CLIENT_ID =
    process.env.DISCORD_CLIENT_ID ||
    config.discordClientId ||
    config.clientId ||
    config.appId;
const DISCORD_CLIENT_SECRET =
    process.env.DISCORD_CLIENT_SECRET ||
    config.discordClientSecret ||
    config.clientSecret;
const DISCORD_REDIRECT_URI =
    process.env.DISCORD_REDIRECT_URI ||
    config.discordRedirectUri ||
    config.redirectUri;
const DISCORD_BOT_TOKEN =
    process.env.DISCORD_BOT_TOKEN ||
    config.discordBotToken ||
    config.token;
const MONGODB_URI = process.env.MONGODB_URI || config.mongodb;
const SESSION_SECRET = process.env.SESSION_SECRET || config.sessionSecret;
const DASHBOARD_CLIENT_URL =
    process.env.DASHBOARD_CLIENT_URL ||
    config.dashboardClientUrl ||
    config.clientUrl;
const SESSION_TTL_MS = Number.parseInt(
    process.env.DASHBOARD_SESSION_TTL_MS || config.dashboardSessionTtlMs,
    10,
);

console.log('[oauth config]', {
    DISCORD_CLIENT_ID_present: Boolean(DISCORD_CLIENT_ID && String(DISCORD_CLIENT_ID).trim()),
    DISCORD_CLIENT_SECRET_present: Boolean(DISCORD_CLIENT_SECRET && String(DISCORD_CLIENT_SECRET).trim()),
    DISCORD_REDIRECT_URI: DISCORD_REDIRECT_URI || null,
    configFilePath: path.join(__dirname, 'config.json'),
    configFileExists: fs.existsSync(path.join(__dirname, 'config.json')),
});

const DISCORD_API_BASE = 'https://discord.com/api';
const DISCORD_OAUTH_BASE = 'https://discord.com/oauth2';

const logInfo = (message, meta = {}) => {
    console.log(JSON.stringify({level: 'info', message, ...meta}));
};

const logError = (message, meta = {}) => {
    console.error(JSON.stringify({level: 'error', message, ...meta}));
};

const ensureOAuthConfig = () => {
    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET || !DISCORD_REDIRECT_URI) {
        return null;
    }

    return {
        clientId: DISCORD_CLIENT_ID,
        clientSecret: DISCORD_CLIENT_SECRET,
        redirectUri: DISCORD_REDIRECT_URI,
    };
};

const buildAuthorizationUrl = (state) => {
    const params = new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        redirect_uri: DISCORD_REDIRECT_URI,
        response_type: 'code',
        scope: 'identify guilds',
        state,
        prompt: 'consent',
    });

    return `${DISCORD_OAUTH_BASE}/authorize?${params.toString()}`;
};

const fetchDiscordAccessToken = async (code) => {
    const params = new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: DISCORD_REDIRECT_URI,
    });

    const response = await axios.post(`${DISCORD_API_BASE}/oauth2/token`, params, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    });

    return response.data;
};

const fetchDiscordUser = async (accessToken) => {
    const response = await axios.get(`${DISCORD_API_BASE}/users/@me`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    return response.data;
};

const fetchDiscordUserGuilds = async (accessToken) => {
    const response = await axios.get(`${DISCORD_API_BASE}/users/@me/guilds`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    return response.data;
};

const fetchDiscordGuildRoles = async (guildId) => {
    if (!DISCORD_BOT_TOKEN) {
        throw new Error('Missing Discord bot token.');
    }

    const response = await axios.get(`${DISCORD_API_BASE}/guilds/${guildId}/roles`, {
        headers: {
            Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        },
    });

    return response.data;
};

const parsePermissionBits = (permissionValue) => {
    if (!permissionValue) {
        return 0n;
    }

    try {
        return BigInt(permissionValue);
    } catch (error) {
        return 0n;
    }
};

const canManageGuild = (guild) => {
    const permissions = parsePermissionBits(guild.permissions);
    return (
        (permissions & PERMISSION_BITS.ADMINISTRATOR) === PERMISSION_BITS.ADMINISTRATOR ||
        (permissions & PERMISSION_BITS.MANAGE_GUILD) === PERMISSION_BITS.MANAGE_GUILD
    );
};

const ensureSession = (req, res, next) => {
    if (!req.session?.user || !req.session?.accessToken) {
        return res.status(401).json({error: 'Unauthorized'});
    }

    return next();
};

const ensureManageableGuild = async (req, res, next) => {
    try {
        const guilds = await fetchDiscordUserGuilds(req.session.accessToken);
        const guild = guilds.find((entry) => entry.id === req.params.guildId);
        if (!guild) {
            return res.status(404).json({error: 'Guild not found'});
        }
        if (!canManageGuild(guild)) {
            return res.status(403).json({error: 'Forbidden'});
        }

        req.guild = guild;
        return next();
    } catch (error) {
        logError('Failed to fetch guilds for permission check', {
            message: error.message,
            status: error.response?.status,
        });
        return res.status(502).json({error: 'Failed to fetch guilds'});
    }
};

const buildCorsOrigins = () => {
    if (!DASHBOARD_CLIENT_URL) {
        return true;
    }
    const entries = DASHBOARD_CLIENT_URL.split(',').map((value) => value.trim()).filter(Boolean);
    return entries.length ? entries : true;
};

const buildSessionStore = () => {
    if (!MONGODB_URI) {
        return null;
    }
    return MongoStore.create({
        mongoUrl: MONGODB_URI,
        collectionName: 'dashboard_sessions',
        ttl: Math.floor(
            (Number.isNaN(SESSION_TTL_MS) ? DEFAULT_SESSION_TTL_MS : SESSION_TTL_MS) / 1000,
        ),
    });
};

const validatePermissionPayload = (payload = {}) => {
    const errors = [];
    if (payload.adminRoleIds && !Array.isArray(payload.adminRoleIds)) {
        errors.push('adminRoleIds must be an array of role IDs');
    }
    if (payload.adminUserIds && !Array.isArray(payload.adminUserIds)) {
        errors.push('adminUserIds must be an array of user IDs');
    }
    if (payload.commandPermissions && typeof payload.commandPermissions !== 'object') {
        errors.push('commandPermissions must be an object');
    }

    return errors;
};

const validateWarningReason = (reason) => {
    if (typeof reason !== 'string') {
        return 'Reason must be a string';
    }
    const trimmed = reason.trim();
    if (!trimmed) {
        return 'Reason is required';
    }
    if (trimmed.length > 500) {
        return 'Reason must be 500 characters or fewer';
    }
    return null;
};

const createDashboardApp = () => {
    const app = express();
    const isProduction = process.env.NODE_ENV === 'production';

    app.set('trust proxy', 1);

    app.use(
        cors({
            origin: buildCorsOrigins(),
            credentials: true,
        }),
    );
    app.use(express.json());
    app.use(cookieParser());
    app.use(express.static(path.join(__dirname, 'public')));

    if (!SESSION_SECRET) {
        logError('Missing SESSION_SECRET configuration');
    }

    const sessionStore = buildSessionStore();
    if (!sessionStore) {
        logError('Missing MONGODB_URI configuration for session store');
    }

    app.use(
        session({
            secret: SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
            resave: false,
            saveUninitialized: false,
            cookie: {
                httpOnly: true,
                sameSite: 'lax',
                secure: isProduction,
                maxAge: Number.isNaN(SESSION_TTL_MS) ? DEFAULT_SESSION_TTL_MS : SESSION_TTL_MS,
            },
            store: sessionStore || undefined,
        }),
    );

    const authLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 30,
        standardHeaders: true,
        legacyHeaders: false,
    });

    app.get('/health', (req, res) => {
        return res.json({status: 'ok'});
    });

    app.get('/auth/discord', authLimiter, (req, res) => {
        if (!ensureOAuthConfig()) {
            return res.status(500).json({error: 'Missing Discord OAuth configuration'});
        }

        const state = crypto.randomBytes(16).toString('hex');
        res.cookie('oauth_state', state, {
            httpOnly: true,
            sameSite: 'lax',
            secure: isProduction,
            maxAge: 300 * 1000,
        });

        return res.redirect(buildAuthorizationUrl(state));
    });

    app.get('/auth/discord/callback', authLimiter, async (req, res) => {
        if (!ensureOAuthConfig()) {
            return res.status(500).json({error: 'Missing Discord OAuth configuration'});
        }

        const {code, state} = req.query;
        if (!code || !state || req.cookies.oauth_state !== state) {
            return res.status(400).json({error: 'Invalid OAuth state'});
        }

        try {
            const tokenData = await fetchDiscordAccessToken(code);
            const user = await fetchDiscordUser(tokenData.access_token);

            const expiresAt = Date.now() + (tokenData.expires_in || 0) * 1000;
            req.session.accessToken = tokenData.access_token;
            req.session.refreshToken = tokenData.refresh_token;
            req.session.tokenType = tokenData.token_type;
            req.session.scope = tokenData.scope;
            req.session.expiresAt = expiresAt;
            req.session.user = user;

            res.clearCookie('oauth_state');

            if (DASHBOARD_CLIENT_URL) {
                return res.redirect(DASHBOARD_CLIENT_URL);
            }

            if (req.accepts('html')) {
                return res.redirect('/');
            }

            return res.status(200).json({user});
        } catch (error) {
            logError('Discord OAuth failed', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data,
            });

            return res.status(502).json({
                error: 'Failed to authenticate with Discord',
                details: error.response?.data || error.message,
            });
        }
    });

    app.post('/auth/logout', ensureSession, (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                logError('Failed to destroy session', {message: err.message});
                return res.status(500).json({error: 'Failed to log out'});
            }
            res.clearCookie('connect.sid');
            return res.status(204).send();
        });
    });

    app.get('/api/me', ensureSession, (req, res) => {
        return res.json({user: req.session.user});
    });

    app.get('/api/guilds', ensureSession, async (req, res) => {
        try {
            const guilds = await fetchDiscordUserGuilds(req.session.accessToken);
            const manageableGuilds = guilds.filter(canManageGuild);
            return res.json({guilds: manageableGuilds});
        } catch (error) {
            logError('Failed to fetch guilds', {
                message: error.message,
                status: error.response?.status,
            });
            return res.status(502).json({error: 'Failed to fetch guilds'});
        }
    });

    app.get(
        '/api/guilds/:guildId/permissions',
        ensureSession,
        ensureManageableGuild,
        async (req, res) => {
            try {
                const permissions = await getGuildPermissions(req.params.guildId);
                return res.json({permissions});
            } catch (error) {
                logError('Failed to fetch permissions', {message: error.message});
                return res.status(500).json({error: 'Failed to fetch permissions'});
            }
        },
    );

    app.patch(
        '/api/guilds/:guildId/permissions',
        ensureSession,
        ensureManageableGuild,
        async (req, res) => {
            const validationErrors = validatePermissionPayload(req.body || {});
            if (validationErrors.length) {
                return res.status(400).json({error: 'Invalid permissions payload', details: validationErrors});
            }
            try {
                const sanitizedPermissions = sanitizePermissionPayload(req.body || {});
                const permissions = await updateGuildPermissions({
                    guildId: req.params.guildId,
                    permissions: sanitizedPermissions,
                });
                return res.json({permissions});
            } catch (error) {
                logError('Failed to update permissions', {message: error.message});
                return res.status(500).json({error: 'Failed to update permissions'});
            }
        },
    );

    app.get(
        '/api/guilds/:guildId/roles',
        ensureSession,
        ensureManageableGuild,
        async (req, res) => {
            try {
                const roles = await fetchDiscordGuildRoles(req.params.guildId);
                return res.json({roles});
            } catch (error) {
                logError('Failed to fetch roles', {
                    message: error.message,
                    status: error.response?.status,
                });
                return res.status(500).json({error: 'Failed to fetch roles'});
            }
        },
    );

    app.get(
        '/api/guilds/:guildId/warnings/:userId',
        ensureSession,
        ensureManageableGuild,
        async (req, res) => {
            try {
                const warnings = await getWarnings({
                    guildId: req.params.guildId,
                    userId: req.params.userId,
                });
                return res.json({warnings});
            } catch (error) {
                logError('Failed to fetch warnings', {message: error.message});
                return res.status(500).json({error: 'Failed to fetch warnings'});
            }
        },
    );

    app.post(
        '/api/guilds/:guildId/warnings/:userId',
        ensureSession,
        ensureManageableGuild,
        async (req, res) => {
            const {reason} = req.body || {};
            const reasonError = validateWarningReason(reason);
            if (reasonError) {
                return res.status(400).json({error: reasonError});
            }
            try {
                const result = await addWarning({
                    guildId: req.params.guildId,
                    userId: req.params.userId,
                    moderatorId: req.session.user?.id,
                    reason: reason.trim(),
                });
                return res.status(201).json(result);
            } catch (error) {
                logError('Failed to add warning', {message: error.message});
                return res.status(500).json({error: 'Failed to add warning'});
            }
        },
    );
    return app;
};

if (require.main === module) {
    const port = Number.parseInt(process.env.DASHBOARD_PORT || 3000, 10);
    const app = createDashboardApp();
    app.listen(port, () => {
        console.log(`Dashboard API listening on port ${port}`);
    });
}

module.exports = {
    createDashboardApp,
};
