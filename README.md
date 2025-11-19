# Beru Anti-Nuke Bot v3.0

Production-grade Discord Anti-Nuke system with comprehensive protection, recovery, and moderation features.

## Features

### 🛡️ Protection Categories
- **Member Actions**: Ban/Kick protection with configurable limits
- **Role Management**: Create/Delete role protection + dangerous permission detection
- **Channel Management**: Create/Delete channel protection
- **Bot Security**: Unauthorized bot addition detection
- **Permission Monitoring**: Admin role assignment tracking
- **Member Pruning**: Protection against mass member removal

### 🔧 Configuration
- Granular per-action limits with sliding time windows
- Customizable punishments (ban/kick/timeout) per action
- Whitelist system for trusted users and roles
- Separate logging channels for security and moderation events

### 🔄 Recovery System
- Automatic snapshots of roles and channels
- Partial or full server restoration
- Background job processing for reliable recovery

### 📊 Management
- Comprehensive status and monitoring commands
- Detailed server information display
- Case management for all moderation actions
- Audit trail with PostgreSQL NOTIFY for real-time cache invalidation

## Installation

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Discord Bot with required permissions

### Setup Steps

1. **Clone and Install**
   ```bash
   cd /Users/adnan/Downloads/beru-mod-3.0
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your values:
   # - DISCORD_TOKEN: Your bot token from Discord Developer Portal
   # - CLIENT_ID: Your application/client ID
   # - DATABASE_URL: PostgreSQL connection string
   ```

3. **Setup Database**
   ```bash
   npm run prisma:migrate
   npm run prisma:generate
   ```

4. **Build and Start**
   ```bash
   # Development mode (with hot reload)
   npm run dev

   # Production mode
   npm run build
   npm start
   ```

## Required Bot Permissions

The bot needs these permissions to function properly:

### Essential
- View Audit Log
- Manage Roles
- Manage Channels
- Ban Members
- Kick Members
- Moderate Members (for timeout)

### Recommended
- Manage Server
- Manage Webhooks
- Send Messages
- Embed Links

## Command Reference

### `/antinuke enable`
Enable anti-nuke protection with selected actions.
- **actions**: Choose protections to enable (or ALL)
- **Permission**: Administrator

### `/antinuke disable`
Disable all anti-nuke protections.
- **Permission**: Administrator

### `/antinuke status`
View current configuration and recent activity.
- **brief**: Show condensed view
- **Permission**: Administrator

### `/antinuke restore`
Restore server from latest backup.
- **mode**: partial (critical roles) or full (roles + channels)
- **preview**: Preview what would be restored without executing
- **Permission**: Administrator

### `/setlimit`
Configure action limits with sliding windows.
- **action**: Protection type to limit
- **limit**: Max allowed count
- **window_seconds**: Time window (default: 10)
- **Permission**: Administrator

Example: `/setlimit action:DELETE_CHANNELS limit:3 window_seconds:10`

### `/setpunishment`
Set punishment when limits are exceeded.
- **action**: Protection type
- **punishment**: ban, kick, or timeout
- **duration_seconds**: Required for timeout
- **Permission**: Administrator

Example: `/setpunishment action:DELETE_CHANNELS punishment:ban`

### `/logs mod`
Configure moderation log channel.
- **channel**: Text channel for mod logs
- **Permission**: Manage Server

### `/logs security`
Configure security log channel.
- **channel**: Text channel for security alerts
- **Permission**: Manage Server

### `/logs view`
View current logging configuration.
- **Permission**: Manage Server

### `/whitelist add_role`
Add a role to whitelist.
- **role**: Role to whitelist
- **category**: Action category or ALL
- **Permission**: Administrator

### `/whitelist add_user`
Add a user to whitelist.
- **user**: User to whitelist
- **category**: Action category or ALL
- **Permission**: Administrator

### `/whitelist remove_role` / `/whitelist remove_user`
Remove from whitelist.
- **category**: Specific category or leave empty for all
- **Permission**: Administrator

### `/whitelist view`
View whitelist entries for a role or user.
- **Permission**: Administrator

### `/whitelist list`
List all whitelist entries.
- **filter**: role, user, or all
- **Permission**: Administrator

### `/whitelist reset`
Remove all whitelist entries (requires confirmation).
- **confirm**: Must be true
- **Permission**: Administrator

### `/server`
Display server information.
- **full**: Show detailed info (requires Manage Server)
- **Permission**: Everyone (full details for Manage Server)

## Typical Setup Workflow

1. **Enable Protection**
   ```
   /antinuke enable actions:ALL
   ```

2. **Configure Limits**
   ```
   /setlimit action:DELETE_CHANNELS limit:3 window_seconds:10
   /setlimit action:BAN_MEMBERS limit:5 window_seconds:15
   /setlimit action:ADD_BOTS limit:2 window_seconds:30
   ```

3. **Set Punishments**
   ```
   /setpunishment action:DELETE_CHANNELS punishment:ban
   /setpunishment action:BAN_MEMBERS punishment:kick
   /setpunishment action:ADD_BOTS punishment:timeout duration_seconds:3600
   ```

4. **Configure Logging**
   ```
   /logs security channel:#security-logs
   /logs mod channel:#mod-logs
   ```

5. **Add Trusted Staff**
   ```
   /whitelist add_role role:@Admin category:ALL
   /whitelist add_user user:@TrustedMod category:DELETE_CHANNELS
   ```

6. **Monitor Status**
   ```
   /antinuke status
   ```

## Architecture Overview

### Services
- **ConfigService**: Manages anti-nuke configuration with caching
- **WhitelistService**: Fast whitelist lookups with NOTIFY-based cache invalidation
- **LoggingService**: Centralized logging to configured channels
- **CaseService**: Moderation case management and tracking

### Modules
- **AuditLogMonitor**: Correlates gateway events with audit logs
- **ActionLimiter**: Records events and evaluates sliding window limits
- **Executor**: Enforces punishments with PostgreSQL advisory locks
- **RecoveryManager**: Snapshots and restores server state

### Data Flow
1. Discord event → AuditLogMonitor
2. Fetch audit log → Correlate executor
3. Check whitelist (fast in-memory lookup)
4. Skip if guild owner or whitelisted
5. Record action → ActionLimiter
6. Count in sliding window → Check limit
7. If exceeded → Executor (with advisory lock)
8. Apply punishment → Create case → Log to channels

## Database Schema

The system uses PostgreSQL with the following key tables:

- `antinuke_config`: Per-guild protection settings
- `antinuke_limits`: Sliding window limits per action
- `antinuke_punishments`: Punishment configuration per action
- `antinuke_actions`: Event log for limit calculation
- `whitelist`: Bypass entries for users and roles
- `guild_logging`: Channel configuration
- `moderation_cases`: Audit trail of all actions
- `role_backups` / `channel_backups`: Snapshot storage
- `job_queue`: Background task management

## Monitoring & Maintenance

### Automatic Cleanup
- Old action records: Cleaned every 6 hours (keeps 30 days)
- Old backups: Cleaned daily (keeps 7 days)

### Automatic Snapshots
- Full server snapshots: Created every 12 hours
- Includes roles, channels, and permissions

### Health Checks
Monitor these logs:
- `✅` = Successful operations
- `⚠️` = Warnings (permissions, configuration issues)
- `🚨` = Security events (limit exceeded)
- `❌` = Errors (require attention)

## Troubleshooting

### Bot not responding to commands
1. Check bot token is valid
2. Verify bot has `applications.commands` scope
3. Check bot is online and has proper intents
4. Review logs for errors

### Anti-nuke not triggering
1. Verify `/antinuke enable` was run
2. Check limits are configured with `/setlimit`
3. Ensure punishments are set with `/setpunishment`
4. Verify bot has View Audit Log permission
5. Check if executor is whitelisted or is guild owner

### Database connection issues
1. Verify DATABASE_URL in .env
2. Check PostgreSQL is running
3. Ensure database exists: `createdb beru_antinuke`
4. Run migrations: `npm run prisma:migrate`

### Permissions errors
Bot needs to be higher in role hierarchy than users it moderates:
1. Move bot role up in server settings
2. Ensure bot has required permissions (see above)
3. Check specific channel permissions

## Development

### Project Structure
```
src/
├── commands/         # Slash command handlers
│   ├── antinuke.ts
│   ├── setlimit.ts
│   ├── setpunishment.ts
│   ├── logs.ts
│   ├── whitelist.ts
│   └── server.ts
├── modules/          # Core anti-nuke logic
│   ├── ActionLimiter.ts
│   ├── Executor.ts
│   ├── AuditLogMonitor.ts
│   └── RecoveryManager.ts
├── services/         # Shared services
│   ├── ConfigService.ts
│   ├── WhitelistService.ts
│   ├── LoggingService.ts
│   └── CaseService.ts
├── types/            # TypeScript type definitions
│   └── index.ts
└── index.ts          # Main entry point

prisma/
└── schema.prisma     # Database schema
```

### Running Tests
```bash
# Check TypeScript compilation
npm run build

# Run in development with auto-reload
npm run dev

# View database in browser
npm run prisma:studio
```

### Database Migrations
```bash
# Create a new migration
npx prisma migrate dev --name description_of_change

# Apply migrations in production
npm run prisma:deploy

# Reset database (⚠️ destroys data)
npx prisma migrate reset
```

## Security Considerations

1. **Environment Variables**: Never commit .env to version control
2. **Database Access**: Use connection pooling and prepared statements
3. **Rate Limiting**: Built-in via sliding windows
4. **Advisory Locks**: Prevents race conditions in punishment execution
5. **Owner Protection**: Guild owner is never auto-punished
6. **Whitelist Safety**: Cannot whitelist @everyone or the bot itself

## Production Deployment

### Using PM2
```bash
npm run build
pm2 start dist/index.js --name beru-antinuke
pm2 save
pm2 startup
```

### Using Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
RUN npx prisma generate
CMD ["node", "dist/index.js"]
```

### Environment Variables
Ensure these are set in production:
- `NODE_ENV=production`
- `DATABASE_URL` with connection pooling
- `DISCORD_TOKEN` and `CLIENT_ID`

## License

MIT

## Support

For issues or questions, check:
1. This README
2. Command help text (`/command --help`)
3. Bot console logs
4. Database logs via `npm run prisma:studio`
