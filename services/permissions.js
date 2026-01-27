const { connectToDatabase } = require('../db');

const DEFAULT_GUILD_PERMISSIONS = {
    adminRoleIds: [],
    adminUserIds: [],
    commandPermissions: {},
};

const normalizePermissionConfig = (config = {}) => ({
    ...DEFAULT_GUILD_PERMISSIONS,
    ...config,
    adminRoleIds: Array.isArray(config.adminRoleIds) ? config.adminRoleIds : [],
    adminUserIds: Array.isArray(config.adminUserIds) ? config.adminUserIds : [],
    commandPermissions: config.commandPermissions ?? {},
});

const sanitizePermissionPayload = (config = {}) => {
    const adminRoleIds = Array.isArray(config.adminRoleIds)
        ? config.adminRoleIds.filter((entry) => typeof entry === 'string' && entry.trim())
        : [];
    const adminUserIds = Array.isArray(config.adminUserIds)
        ? config.adminUserIds.filter((entry) => typeof entry === 'string' && entry.trim())
        : [];
    const commandPermissions = {};

    if (config.commandPermissions && typeof config.commandPermissions === 'object') {
        Object.entries(config.commandPermissions).forEach(([commandName, entry]) => {
            if (!commandName || typeof commandName !== 'string') {
                return;
            }
            if (!entry || typeof entry !== 'object') {
                return;
            }
            const allowedRoleIds = Array.isArray(entry.allowedRoleIds)
                ? entry.allowedRoleIds.filter((roleId) => typeof roleId === 'string' && roleId.trim())
                : [];
            const allowedUserIds = Array.isArray(entry.allowedUserIds)
                ? entry.allowedUserIds.filter((userId) => typeof userId === 'string' && userId.trim())
                : [];
            commandPermissions[commandName] = {
                allowedRoleIds,
                allowedUserIds,
            };
        });
    }

    return {
        adminRoleIds,
        adminUserIds,
        commandPermissions,
    };
};

const memberHasRole = (member, roleIds) =>
    roleIds.some((roleId) => member.roles?.cache?.has(roleId));

const getGuildPermissions = async (guildId) => {
    const dbClient = await connectToDatabase();
    const db = dbClient.db('discord');
    const collection = db.collection('guild_permissions');
    const config = await collection.findOne({ guildId });

    return normalizePermissionConfig(config);
};

const updateGuildPermissions = async ({ guildId, permissions }) => {
    if (!guildId) {
        throw new Error('Guild ID is required');
    }

    const dbClient = await connectToDatabase();
    const db = dbClient.db('discord');
    const collection = db.collection('guild_permissions');

    const sanitizedPermissions = sanitizePermissionPayload(permissions);
    const normalizedPermissions = normalizePermissionConfig(sanitizedPermissions);
    const payload = {
        guildId,
        ...normalizedPermissions,
        updatedAt: new Date(),
    };

    await collection.updateOne({ guildId }, { $set: payload }, { upsert: true });

    return payload;
};

const isCommandAllowed = async ({
    guildId,
    userId,
    member,
    commandName,
    permissionGroup,
}) => {
    if (!guildId) return true;

    const permissions = await getGuildPermissions(guildId);
    const isAdmin =
        permissions.adminUserIds.includes(userId) ||
        (member && memberHasRole(member, permissions.adminRoleIds));

    if (isAdmin) {
        return true;
    }

    const commandPermissions = permissions.commandPermissions?.[commandName];
    if (!commandPermissions) {
        return true;
    }

    const allowedUserIds = Array.isArray(commandPermissions.allowedUserIds)
        ? commandPermissions.allowedUserIds
        : [];
    const allowedRoleIds = Array.isArray(commandPermissions.allowedRoleIds)
        ? commandPermissions.allowedRoleIds
        : [];

    if (allowedUserIds.length === 0 && allowedRoleIds.length === 0) {
        return true;
    }

    if (allowedUserIds.includes(userId)) {
        return true;
    }

    return member ? memberHasRole(member, allowedRoleIds) : false;
};

module.exports = {
    getGuildPermissions,
    updateGuildPermissions,
    isCommandAllowed,
    normalizePermissionConfig,
    sanitizePermissionPayload,
};
