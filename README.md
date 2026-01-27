# Discord Bot

## Dashboard setup

This repository includes a lightweight dashboard for configuring permissions and warnings without editing JSON. The dashboard uses Discord OAuth2 and the existing MongoDB collections.

### Environment variables

Copy `.env.example` and fill in the values:

```bash
cp .env.example .env
```

Required backend variables:

- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI` (example: `http://localhost:3000/auth/discord/callback`)
- `DISCORD_BOT_TOKEN`
- `MONGODB_URI`
- `SESSION_SECRET`
- `DASHBOARD_CLIENT_URL` (example: `http://localhost:5173`)

Frontend variables (Vite):

- `VITE_API_BASE_URL` (example: `http://localhost:3000`)
- `VITE_BOT_INVITE_URL`

> Make sure the redirect URI is added in the Discord Developer Portal OAuth2 settings.

### Running the backend

```bash
node dashboardServer.js
```

The API will run on `DASHBOARD_PORT` (default `3000`).

### Running the dashboard frontend

```bash
cd dashboard
npm install
npm run dev
```

The frontend will run on `http://localhost:5173` by default.

### API health check

```bash
curl http://localhost:3000/health
```

---

## Existing feature notes

### Server-Specific Permission Configuration

Moderation commands support per-server permission overrides stored in MongoDB. Each guild can define which users or roles are allowed to run specific commands, plus optional admin overrides that apply to all moderation commands.

Example document stored in the `discord.guild_permissions` collection:
```json
{
  "guildId": "1234567890",
  "adminUserIds": ["1111111111"],
  "adminRoleIds": ["2222222222"],
  "commandPermissions": {
    "kick": {
      "allowedUserIds": ["3333333333"],
      "allowedRoleIds": ["4444444444"]
    }
  }
}
```
