const state = {
    guilds: [],
    selectedGuildId: null,
    roles: [],
    permissions: null,
    commands: [],
};

const elements = {
    banner: document.getElementById('banner'),
    userDisplay: document.getElementById('userDisplay'),
    sessionExpiry: document.getElementById('sessionExpiry'),
    logoutButton: document.getElementById('logoutButton'),
    guildList: document.getElementById('guildList'),
    guildEmpty: document.getElementById('guildEmpty'),
    tabs: document.querySelectorAll('.tab'),
    permissionsPanel: document.getElementById('permissionsPanel'),
    warningsPanel: document.getElementById('warningsPanel'),
    adminRolesSelect: document.getElementById('adminRolesSelect'),
    adminUserInput: document.getElementById('adminUserInput'),
    addAdminUserButton: document.getElementById('addAdminUserButton'),
    adminUserChips: document.getElementById('adminUserChips'),
    newCommandInput: document.getElementById('newCommandInput'),
    addCommandButton: document.getElementById('addCommandButton'),
    commandsTable: document.getElementById('commandsTable'),
    savePermissionsButton: document.getElementById('savePermissionsButton'),
    permissionsStatus: document.getElementById('permissionsStatus'),
    warningsUserInput: document.getElementById('warningsUserInput'),
    fetchWarningsButton: document.getElementById('fetchWarningsButton'),
    warningsList: document.getElementById('warningsList'),
    warningsEmpty: document.getElementById('warningsEmpty'),
    newWarningUserInput: document.getElementById('newWarningUserInput'),
    warningReasonInput: document.getElementById('warningReasonInput'),
    addWarningButton: document.getElementById('addWarningButton'),
    warningStatus: document.getElementById('warningStatus'),
};

const dashboardApi = window.dashboardApi;
const fetchDashboardJson = dashboardApi.fetchJson;

const COMMAND_NAME_REGEX = /^[a-z0-9_-]{1,32}$/i;

const setLoading = (isLoading) => {
    document.body.classList.toggle('loading', isLoading);
};

const renderGuilds = () => {
    elements.guildList.innerHTML = '';
    if (state.guilds.length === 0) {
        elements.guildEmpty.hidden = false;
        return;
    }

    elements.guildEmpty.hidden = true;
    state.guilds.forEach((guild) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = `guild-item${state.selectedGuildId === guild.id ? ' active' : ''}`;
        item.dataset.guildId = guild.id;
        const icon = document.createElement('img');
        if (guild.icon) {
            icon.src = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`;
            icon.alt = `${guild.name} icon`;
        } else {
            icon.alt = '';
        }
        const name = document.createElement('span');
        name.textContent = guild.name;
        item.appendChild(icon);
        item.appendChild(name);
        item.addEventListener('click', () => selectGuild(guild.id));
        elements.guildList.appendChild(item);
    });
};

const renderRolesSelect = () => {
    elements.adminRolesSelect.innerHTML = '';
    state.roles
        .sort((a, b) => b.position - a.position)
        .forEach((role) => {
            const option = document.createElement('option');
            option.value = role.id;
            option.textContent = role.name;
            elements.adminRolesSelect.appendChild(option);
        });

    if (state.permissions) {
        const adminRoleIds = new Set(state.permissions.adminRoleIds || []);
        Array.from(elements.adminRolesSelect.options).forEach((option) => {
            option.selected = adminRoleIds.has(option.value);
        });
    }
};

const renderAdminUsers = () => {
    elements.adminUserChips.innerHTML = '';
    const adminUserIds = state.permissions?.adminUserIds || [];
    if (adminUserIds.length === 0) {
        const empty = document.createElement('span');
        empty.className = 'muted';
        empty.textContent = 'No admin users added.';
        elements.adminUserChips.appendChild(empty);
        return;
    }

    adminUserIds.forEach((userId) => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = userId;
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.textContent = '✕';
        removeButton.addEventListener('click', () => {
            state.permissions.adminUserIds = adminUserIds.filter((id) => id !== userId);
            renderAdminUsers();
        });
        chip.appendChild(removeButton);
        elements.adminUserChips.appendChild(chip);
    });
};

const ensureCommandEntry = (commandName) => {
    if (!state.permissions.commandPermissions[commandName]) {
        state.permissions.commandPermissions[commandName] = {
            allowedRoleIds: [],
            allowedUserIds: [],
        };
    }
};

const renderCommandsTable = () => {
    const tbody = elements.commandsTable.querySelector('tbody');
    tbody.innerHTML = '';

    const commands = [...new Set(state.commands)].sort();
    if (commands.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 4;
        cell.className = 'muted';
        cell.textContent = 'No commands configured yet. Add one above.';
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }

    commands.forEach((commandName) => {
        ensureCommandEntry(commandName);
        const commandConfig = state.permissions.commandPermissions[commandName];
        const row = document.createElement('tr');

        const nameCell = document.createElement('td');
        nameCell.textContent = commandName;

        const roleCell = document.createElement('td');
        const roleSelect = document.createElement('select');
        roleSelect.multiple = true;
        roleSelect.className = 'multi-select';
        state.roles
            .sort((a, b) => b.position - a.position)
            .forEach((role) => {
                const option = document.createElement('option');
                option.value = role.id;
                option.textContent = role.name;
                option.selected = commandConfig.allowedRoleIds.includes(role.id);
                roleSelect.appendChild(option);
            });
        roleSelect.addEventListener('change', () => {
            commandConfig.allowedRoleIds = Array.from(roleSelect.selectedOptions).map((opt) => opt.value);
        });
        roleCell.appendChild(roleSelect);

        const userCell = document.createElement('td');
        const userInput = document.createElement('input');
        userInput.type = 'text';
        userInput.placeholder = 'User ID';
        const addUserButton = document.createElement('button');
        addUserButton.type = 'button';
        addUserButton.className = 'button';
        addUserButton.textContent = 'Add';
        const chipList = document.createElement('div');
        chipList.className = 'chip-list';

        const renderUserChips = () => {
            chipList.innerHTML = '';
            if (commandConfig.allowedUserIds.length === 0) {
                const empty = document.createElement('span');
                empty.className = 'muted';
                empty.textContent = 'No users added.';
                chipList.appendChild(empty);
                return;
            }
            commandConfig.allowedUserIds.forEach((userId) => {
                const chip = document.createElement('span');
                chip.className = 'chip';
                chip.textContent = userId;
                const remove = document.createElement('button');
                remove.type = 'button';
                remove.textContent = '✕';
                remove.addEventListener('click', () => {
                    commandConfig.allowedUserIds = commandConfig.allowedUserIds.filter((id) => id !== userId);
                    renderUserChips();
                });
                chip.appendChild(remove);
                chipList.appendChild(chip);
            });
        };

        addUserButton.addEventListener('click', () => {
            const value = userInput.value.trim();
            if (!value) {
                return;
            }
            if (!commandConfig.allowedUserIds.includes(value)) {
                commandConfig.allowedUserIds.push(value);
                renderUserChips();
            }
            userInput.value = '';
        });

        const userControls = document.createElement('div');
        userControls.className = 'button-row';
        userControls.appendChild(userInput);
        userControls.appendChild(addUserButton);
        userCell.appendChild(userControls);
        userCell.appendChild(chipList);
        renderUserChips();

        const actionCell = document.createElement('td');
        const clearButton = document.createElement('button');
        clearButton.type = 'button';
        clearButton.className = 'button button--ghost';
        clearButton.textContent = 'Clear restrictions';
        clearButton.addEventListener('click', () => {
            commandConfig.allowedRoleIds = [];
            commandConfig.allowedUserIds = [];
            renderCommandsTable();
        });
        actionCell.appendChild(clearButton);

        row.appendChild(nameCell);
        row.appendChild(roleCell);
        row.appendChild(userCell);
        row.appendChild(actionCell);
        tbody.appendChild(row);
    });
};

const loadSession = async () => {
    const data = await fetchDashboardJson('/api/me');
    elements.userDisplay.textContent = dashboardApi.formatUserDisplay(data.user);
    if (data.expiresAt) {
        const expires = new Date(data.expiresAt);
        elements.sessionExpiry.textContent = `Session expires ${expires.toLocaleString()}`;
    }
};

const loadGuilds = async () => {
    const data = await fetchDashboardJson('/api/guilds');
    state.guilds = data.guilds || [];
    if (state.guilds.length > 0) {
        state.selectedGuildId = state.guilds[0].id;
    }
    renderGuilds();
};

const loadGuildDetails = async () => {
    if (!state.selectedGuildId) {
        return;
    }
    setLoading(true);
    try {
        const [permissionsData, rolesData, commandsData] = await Promise.all([
            fetchDashboardJson(`/api/guilds/${state.selectedGuildId}/permissions`),
            fetchDashboardJson(`/api/guilds/${state.selectedGuildId}/roles`),
            fetchDashboardJson(`/api/guilds/${state.selectedGuildId}/commands`),
        ]);

        state.permissions = permissionsData.permissions || {
            adminRoleIds: [],
            adminUserIds: [],
            commandPermissions: {},
        };
        state.permissions.commandPermissions = state.permissions.commandPermissions || {};
        state.roles = rolesData.roles || [];
        state.commands = commandsData.commands || [];

        Object.keys(state.permissions.commandPermissions).forEach((commandName) => {
            if (!state.commands.includes(commandName)) {
                state.commands.push(commandName);
            }
        });

        renderRolesSelect();
        renderAdminUsers();
        renderCommandsTable();
        elements.permissionsStatus.textContent = '';
        dashboardApi.clearBanner(elements.banner);
    } catch (error) {
        dashboardApi.setBanner(elements.banner, error.message || 'Failed to load guild data.');
    } finally {
        setLoading(false);
    }
};

const selectGuild = async (guildId) => {
    state.selectedGuildId = guildId;
    renderGuilds();
    await loadGuildDetails();
};

const addAdminUser = () => {
    const value = elements.adminUserInput.value.trim();
    if (!value) {
        return;
    }
    if (!state.permissions.adminUserIds.includes(value)) {
        state.permissions.adminUserIds.push(value);
    }
    elements.adminUserInput.value = '';
    renderAdminUsers();
};

const addCommand = () => {
    const value = elements.newCommandInput.value.trim();
    if (!value) {
        return;
    }
    if (!COMMAND_NAME_REGEX.test(value)) {
        dashboardApi.setBanner(elements.banner, 'Command name must be 1-32 characters and use letters, numbers, - or _.');
        return;
    }
    if (!state.commands.includes(value)) {
        state.commands.push(value);
    }
    elements.newCommandInput.value = '';
    renderCommandsTable();
};

const savePermissions = async () => {
    if (!state.selectedGuildId) {
        return;
    }

    const adminRoleIds = Array.from(elements.adminRolesSelect.selectedOptions).map((option) => option.value);
    state.permissions.adminRoleIds = adminRoleIds;

    const payload = {
        adminRoleIds: state.permissions.adminRoleIds,
        adminUserIds: state.permissions.adminUserIds,
        commandPermissions: state.permissions.commandPermissions,
    };

    setLoading(true);
    try {
        const data = await fetchDashboardJson(`/api/guilds/${state.selectedGuildId}/permissions`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
        state.permissions = data.permissions;
        elements.permissionsStatus.textContent = 'Permissions saved successfully.';
        dashboardApi.setBanner(elements.banner, 'Permissions updated successfully.', 'success');
        renderRolesSelect();
        renderAdminUsers();
        renderCommandsTable();
    } catch (error) {
        dashboardApi.setBanner(elements.banner, error.message || 'Failed to save permissions.');
    } finally {
        setLoading(false);
    }
};

const switchTab = (tabName) => {
    elements.tabs.forEach((tab) => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    elements.permissionsPanel.hidden = tabName !== 'permissions';
    elements.warningsPanel.hidden = tabName !== 'warnings';
};

const fetchWarnings = async () => {
    const userId = elements.warningsUserInput.value.trim();
    if (!userId) {
        dashboardApi.setBanner(elements.banner, 'Enter a user ID to fetch warnings.');
        return;
    }
    setLoading(true);
    try {
        const data = await fetchDashboardJson(`/api/guilds/${state.selectedGuildId}/warnings/${userId}`);
        const warnings = data.warnings || [];
        elements.warningsList.innerHTML = '';
        if (warnings.length === 0) {
            elements.warningsEmpty.hidden = false;
        } else {
            elements.warningsEmpty.hidden = true;
            warnings.forEach((warning) => {
                const item = document.createElement('li');
                const dateText = warning.createdAt ? new Date(warning.createdAt).toLocaleString() : 'Unknown date';
                item.textContent = `${warning.reason} (Moderator: ${warning.moderatorId || 'Unknown'}) — ${dateText}`;
                elements.warningsList.appendChild(item);
            });
        }
        dashboardApi.clearBanner(elements.banner);
    } catch (error) {
        dashboardApi.setBanner(elements.banner, error.message || 'Failed to fetch warnings.');
    } finally {
        setLoading(false);
    }
};

const addWarning = async () => {
    const userId = elements.newWarningUserInput.value.trim();
    const reason = elements.warningReasonInput.value.trim();
    if (!userId || !reason) {
        elements.warningStatus.textContent = 'User ID and reason are required.';
        return;
    }

    setLoading(true);
    try {
        const data = await fetchDashboardJson(`/api/guilds/${state.selectedGuildId}/warnings/${userId}`, {
            method: 'POST',
            body: JSON.stringify({reason}),
        });
        elements.warningStatus.textContent = `Warning added. Total warnings: ${data.warnings?.length || 0}`;
        elements.warningReasonInput.value = '';
        dashboardApi.clearBanner(elements.banner);
    } catch (error) {
        dashboardApi.setBanner(elements.banner, error.message || 'Failed to add warning.');
    } finally {
        setLoading(false);
    }
};

const initDashboard = async () => {
    try {
        await loadSession();
        await loadGuilds();
        if (state.selectedGuildId) {
            await loadGuildDetails();
        }
    } catch (error) {
        dashboardApi.setBanner(elements.banner, 'Please log in to access the dashboard.');
        window.location.href = '/';
        return;
    }

    elements.logoutButton.addEventListener('click', async () => {
        await fetch('/auth/logout', {method: 'POST', credentials: 'include'});
        window.location.href = '/';
    });

    elements.tabs.forEach((tab) => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    elements.addAdminUserButton.addEventListener('click', addAdminUser);
    elements.addCommandButton.addEventListener('click', addCommand);
    elements.savePermissionsButton.addEventListener('click', savePermissions);
    elements.fetchWarningsButton.addEventListener('click', fetchWarnings);
    elements.addWarningButton.addEventListener('click', addWarning);
};

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});
