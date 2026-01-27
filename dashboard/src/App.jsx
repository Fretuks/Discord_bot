import { useCallback, useEffect, useMemo, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const BOT_INVITE_URL = import.meta.env.VITE_BOT_INVITE_URL || '';

const apiFetch = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const contentType = response.headers.get('content-type');
  const data = contentType && contentType.includes('application/json')
    ? await response.json()
    : null;

  if (!response.ok) {
    const error = new Error(data?.error || 'Request failed');
    error.details = data?.details;
    throw error;
  }

  return data;
};

const usePath = () => {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handler = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  const navigate = useCallback((nextPath) => {
    window.history.pushState({}, '', nextPath);
    setPath(nextPath);
  }, []);

  return { path, navigate };
};

const Toast = ({ message, type, onDismiss }) => {
  if (!message) return null;
  return (
    <div className={`toast toast-${type}`}>
      <span>{message}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
};

const Landing = () => (
  <div className="card">
    <h1>Discord Bot Dashboard</h1>
    <p>Manage bot permissions and warnings without editing raw JSON.</p>
    <div className="button-row">
      {BOT_INVITE_URL ? (
        <a className="button" href={BOT_INVITE_URL} target="_blank" rel="noreferrer">
          Add bot to server
        </a>
      ) : (
        <span className="muted">Set VITE_BOT_INVITE_URL to enable the invite link.</span>
      )}
      <a className="button primary" href={`${API_BASE_URL}/auth/discord`}>
        Login with Discord
      </a>
    </div>
  </div>
);

const GuildPicker = ({ onManage }) => {
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    apiFetch('/api/guilds')
      .then((data) => {
        if (!ignore) {
          setGuilds(data.guilds || []);
          setError('');
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div>
      <h1>Your Guilds</h1>
      <p className="muted">Choose a server you manage to update permissions and warnings.</p>
      {loading ? <p>Loading guilds…</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <div className="guild-grid">
        {guilds.map((guild) => (
          <div key={guild.id} className="guild-card">
            {guild.icon ? (
              <img
                src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                alt=""
              />
            ) : (
              <div className="guild-placeholder" />
            )}
            <div className="guild-meta">
              <h3>{guild.name}</h3>
              <button className="button" type="button" onClick={() => onManage(guild.id)}>
                Manage
              </button>
            </div>
          </div>
        ))}
        {!loading && guilds.length === 0 ? (
          <p className="muted">No manageable guilds found for this account.</p>
        ) : null}
      </div>
    </div>
  );
};

const AdminUserList = ({ value, onChange }) => {
  const [input, setInput] = useState('');

  const addUser = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (!value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput('');
  };

  return (
    <div>
      <div className="chip-row">
        {value.map((userId) => (
          <span key={userId} className="chip">
            {userId}
            <button type="button" onClick={() => onChange(value.filter((id) => id !== userId))}>
              ✕
            </button>
          </span>
        ))}
        {value.length === 0 ? <span className="muted">No admin users yet.</span> : null}
      </div>
      <div className="input-row">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Add user ID"
        />
        <button type="button" className="button" onClick={addUser}>
          Add
        </button>
      </div>
    </div>
  );
};

const CommandPermissionEditor = ({ roles, value, onChange }) => {
  const [newCommand, setNewCommand] = useState('');
  const commandEntries = Object.entries(value || {});

  const updateCommand = (commandName, nextData) => {
    onChange({
      ...value,
      [commandName]: {
        allowedRoleIds: nextData.allowedRoleIds,
        allowedUserIds: nextData.allowedUserIds,
      },
    });
  };

  const removeCommand = (commandName) => {
    const updated = { ...value };
    delete updated[commandName];
    onChange(updated);
  };

  const addCommand = () => {
    const trimmed = newCommand.trim();
    if (!trimmed) return;
    if (!value[trimmed]) {
      onChange({
        ...value,
        [trimmed]: { allowedRoleIds: [], allowedUserIds: [] },
      });
    }
    setNewCommand('');
  };

  return (
    <div className="command-editor">
      <div className="input-row">
        <input
          type="text"
          value={newCommand}
          onChange={(event) => setNewCommand(event.target.value)}
          placeholder="Add command name"
        />
        <button type="button" className="button" onClick={addCommand}>
          Add command
        </button>
      </div>
      {commandEntries.length === 0 ? (
        <p className="muted">No command overrides yet. Empty means commands are allowed for everyone.</p>
      ) : null}
      {commandEntries.map(([commandName, entry]) => (
        <div key={commandName} className="command-card">
          <div className="command-header">
            <h4>{commandName}</h4>
            <button type="button" className="text-button" onClick={() => removeCommand(commandName)}>
              Remove
            </button>
          </div>
          <p className="muted">
            If both lists are empty, this command remains available to everyone.
          </p>
          <div className="form-group">
            <label>Allowed roles</label>
            <div className="checkbox-grid">
              {roles.map((role) => (
                <label key={role.id} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={entry.allowedRoleIds?.includes(role.id)}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? [...entry.allowedRoleIds, role.id]
                        : entry.allowedRoleIds.filter((id) => id !== role.id);
                      updateCommand(commandName, {
                        ...entry,
                        allowedRoleIds: next,
                      });
                    }}
                  />
                  <span>{role.name}</span>
                </label>
              ))}
              {roles.length === 0 ? <span className="muted">No roles available.</span> : null}
            </div>
          </div>
          <div className="form-group">
            <label>Allowed user IDs</label>
            <AdminUserList
              value={entry.allowedUserIds || []}
              onChange={(nextUsers) => updateCommand(commandName, {
                ...entry,
                allowedUserIds: nextUsers,
              })}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const PermissionsTab = ({ guildId, onToast }) => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    Promise.all([
      apiFetch(`/api/guilds/${guildId}/roles`),
      apiFetch(`/api/guilds/${guildId}/permissions`),
    ])
      .then(([rolesData, permissionsData]) => {
        if (ignore) return;
        setRoles(rolesData.roles || []);
        setPermissions(permissionsData.permissions || {});
        setError('');
      })
      .catch((err) => {
        if (!ignore) setError(err.message);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [guildId]);

  const toggleRole = (roleId) => {
    if (!permissions) return;
    const adminRoleIds = permissions.adminRoleIds || [];
    const next = adminRoleIds.includes(roleId)
      ? adminRoleIds.filter((id) => id !== roleId)
      : [...adminRoleIds, roleId];
    setPermissions({ ...permissions, adminRoleIds: next });
  };

  const savePermissions = async () => {
    if (!permissions) return;
    setSaving(true);
    try {
      const response = await apiFetch(`/api/guilds/${guildId}/permissions`, {
        method: 'PATCH',
        body: JSON.stringify(permissions),
      });
      setPermissions(response.permissions);
      onToast('Permissions saved.', 'success');
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Loading permissions…</p>;
  if (error) return <p className="error">{error}</p>;
  if (!permissions) return <p className="error">Failed to load permissions.</p>;

  return (
    <div className="tab-content">
      <div className="form-group">
        <label>Admin roles</label>
        <div className="checkbox-grid">
          {roles.map((role) => (
            <label key={role.id} className="checkbox-item">
              <input
                type="checkbox"
                checked={permissions.adminRoleIds?.includes(role.id)}
                onChange={() => toggleRole(role.id)}
              />
              <span>{role.name}</span>
            </label>
          ))}
          {roles.length === 0 ? <span className="muted">No roles available.</span> : null}
        </div>
      </div>

      <div className="form-group">
        <label>Admin users</label>
        <AdminUserList
          value={permissions.adminUserIds || []}
          onChange={(nextUsers) => setPermissions({ ...permissions, adminUserIds: nextUsers })}
        />
      </div>

      <div className="form-group">
        <label>Per-command permissions</label>
        <CommandPermissionEditor
          roles={roles}
          value={permissions.commandPermissions || {}}
          onChange={(nextCommands) =>
            setPermissions({ ...permissions, commandPermissions: nextCommands })
          }
        />
      </div>

      <div className="button-row">
        <button type="button" className="button primary" onClick={savePermissions} disabled={saving}>
          {saving ? 'Saving…' : 'Save permissions'}
        </button>
      </div>
    </div>
  );
};

const WarningsTab = ({ guildId, onToast }) => {
  const [userId, setUserId] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const fetchWarnings = async () => {
    if (!userId.trim()) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/api/guilds/${guildId}/warnings/${userId.trim()}`);
      setWarnings(data.warnings || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addWarning = async () => {
    if (!userId.trim()) return;
    try {
      const data = await apiFetch(`/api/guilds/${guildId}/warnings/${userId.trim()}`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      setWarnings(data.warnings || []);
      setReason('');
      onToast('Warning added.', 'success');
    } catch (err) {
      onToast(err.message, 'error');
    }
  };

  return (
    <div className="tab-content">
      <div className="form-group">
        <label>User ID</label>
        <div className="input-row">
          <input
            type="text"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="Enter user ID"
          />
          <button type="button" className="button" onClick={fetchWarnings} disabled={loading}>
            {loading ? 'Loading…' : 'Load warnings'}
          </button>
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="warnings-list">
        {warnings.length === 0 ? (
          <p className="muted">No warnings found for this user.</p>
        ) : (
          warnings.map((warning, index) => (
            <div key={`${warning.createdAt}-${index}`} className="warning-card">
              <p>{warning.reason}</p>
              <div className="warning-meta">
                <span>Moderator: {warning.moderatorId || 'Unknown'}</span>
                <span>{warning.createdAt ? new Date(warning.createdAt).toLocaleString() : ''}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="form-group">
        <label>Add warning</label>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={4}
          placeholder="Reason for this warning"
        />
        <button type="button" className="button primary" onClick={addWarning}>
          Add warning
        </button>
      </div>
    </div>
  );
};

const GuildSettings = ({ guildId }) => {
  const [activeTab, setActiveTab] = useState('permissions');
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const dismissToast = () => setToast({ message: '', type: 'success' });

  return (
    <div>
      <div className="tabs">
        <button
          type="button"
          className={activeTab === 'permissions' ? 'active' : ''}
          onClick={() => setActiveTab('permissions')}
        >
          Permissions
        </button>
        <button
          type="button"
          className={activeTab === 'warnings' ? 'active' : ''}
          onClick={() => setActiveTab('warnings')}
        >
          Warnings
        </button>
      </div>
      {activeTab === 'permissions' ? (
        <PermissionsTab
          guildId={guildId}
          onToast={(message, type) => setToast({ message, type })}
        />
      ) : (
        <WarningsTab
          guildId={guildId}
          onToast={(message, type) => setToast({ message, type })}
        />
      )}
      <Toast message={toast.message} type={toast.type} onDismiss={dismissToast} />
    </div>
  );
};

const App = () => {
  const { path, navigate } = usePath();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/me')
      .then((data) => {
        setUser(data.user);
        setError('');
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const guildId = useMemo(() => {
    const match = path.match(/^\/guilds\/(.+)$/);
    return match ? match[1] : null;
  }, [path]);

  if (loading) {
    return <div className="container"><p>Loading dashboard…</p></div>;
  }

  if (!user) {
    return (
      <div className="container">
        <Landing />
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <div>
          <h2>Welcome, {user.username}</h2>
          <p className="muted">{user.id}</p>
        </div>
        <button
          type="button"
          className="button ghost"
          onClick={() => apiFetch('/auth/logout', { method: 'POST' }).then(() => window.location.reload())}
        >
          Log out
        </button>
      </header>
      {error ? <p className="error">{error}</p> : null}
      {guildId ? (
        <div>
          <button type="button" className="text-button" onClick={() => navigate('/')}>← Back to guilds</button>
          <GuildSettings guildId={guildId} />
        </div>
      ) : (
        <GuildPicker onManage={(id) => navigate(`/guilds/${id}`)} />
      )}
    </div>
  );
};

export default App;
