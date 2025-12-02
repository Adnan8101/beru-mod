/**
 * Main Bot Entry Point
 * Anti-Nuke System - Production Ready
 */

import { Client, GatewayIntentBits, REST, Routes, Collection } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Services
import { ConfigService } from './services/ConfigService';
import { WhitelistService } from './services/WhitelistService';
import { LoggingService } from './services/LoggingService';
import { CaseService } from './services/CaseService';
import { AutoResponderService } from './services/AutoResponderService';
import { ModerationService } from './services/ModerationService';
import { GuildConfigService } from './services/GuildConfigService';
import { AutoModService } from './services/AutoModService';
import { InviteService } from './services/InviteService';

// Modules
import { ActionLimiter } from './modules/ActionLimiter';
import { Executor } from './modules/Executor';
import { AuditLogMonitor } from './modules/AuditLogMonitor';
import { RecoveryManager } from './modules/RecoveryManager';
import { AutoResponder } from './modules/AutoResponder';
import { LoggingMonitor } from './modules/LoggingMonitor';
import { QuarantineMonitor } from './modules/QuarantineMonitor';

// Utils
import { createUsageEmbed } from './utils/embedHelpers';
import { ValidationError } from './utils/prefixCommand';
import { DatabaseManager } from './utils/DatabaseManager';
import * as antinukeCommand from './commands/antinuke/antinuke';
import * as setlimitCommand from './commands/antinuke/setlimit';
import * as setpunishmentCommand from './commands/antinuke/setpunishment';
import * as logsCommand from './commands/logging/logs';
import * as whitelistCommand from './commands/antinuke/whitelist';
import * as automodWhitelistCommand from './commands/automod/automod-whitelist';
import * as serverCommand from './commands/server';
import * as autoresponderCommand from './commands/autoresponder/autoresponder';
// Moderation Commands
import * as banCommand from './commands/moderations/ban';
import * as unbanCommand from './commands/moderations/unban';
import * as kickCommand from './commands/moderations/kick';
import * as muteCommand from './commands/moderations/mute';
import * as unmuteCommand from './commands/moderations/unmute';
import * as warnCommand from './commands/moderations/warn';
import * as checkwarnCommand from './commands/moderations/checkwarn';
import * as quarantineCommand from './commands/moderations/quarantine';
import * as channelCommand from './commands/moderations/channel';
import * as softbanCommand from './commands/moderations/softban';
import * as nickCommand from './commands/moderations/nick';
import * as roleCommand from './commands/moderations/role';
import * as setprefixCommand from './commands/setprefix';
import * as purgeCommand from './commands/moderations/purge';
import * as nukeCommand from './commands/moderations/nuke';
import * as automodCommand from './commands/automod/automod';
import * as loggingCommand from './commands/logging/logging';
import * as helpCommand from './commands/help';
import * as modlogsCommand from './commands/logging/modlogs';
// Invite/Welcome Commands
import * as invitesCommand from './commands/invites_welcome/invites';
import * as welcomeCommand from './commands/invites_welcome/welcome';
import * as inviterCommand from './commands/invites_welcome/inviter';
import * as addInvitesCommand from './commands/invites_welcome/add-invites';
import * as deleteInvitesCommand from './commands/invites_welcome/delete-invites';
import * as resetInvitesCommand from './commands/invites_welcome/reset-invites';
import * as inviteLinksCommand from './commands/invites_welcome/invite-links';
import * as leaveCommand from './commands/invites_welcome/leave';
import * as leaveTestCommand from './commands/invites_welcome/leave-test';
import * as testWelcomeCommand from './commands/invites_welcome/test-welcome';
// Server Stats Commands
import * as setupCommand from './commands/serverstats/setup';
import * as panelCommand from './commands/serverstats/panel';
import * as refreshCommand from './commands/serverstats/refresh';
import * as deletePanelCommand from './commands/serverstats/delete-panel';

// Load environment variables
dotenv.config();

// Validate environment
const requiredEnv = ['DISCORD_TOKEN', 'DATABASE_URL', 'CLIENT_ID'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// Initialize Prisma
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Initialize Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildInvites,
  ],
});

// Command collection
const commands = new Collection<string, any>();

// Initialize services
const configService = new ConfigService(prisma);
const whitelistService = new WhitelistService(prisma);
const loggingService = new LoggingService(prisma, client);
const caseService = new CaseService(prisma);
const autoResponderService = new AutoResponderService(prisma);
const moderationService = new ModerationService(prisma);
const guildConfigService = new GuildConfigService(prisma);
const autoModService = new AutoModService(prisma);
const inviteService = new InviteService(prisma);

// Initialize modules
const actionLimiter = new ActionLimiter(prisma, configService);
const executor = new Executor(prisma, client, configService, caseService, loggingService, actionLimiter);
const recoveryManager = new RecoveryManager(prisma, client, caseService, loggingService);
const auditLogMonitor = new AuditLogMonitor(
  client,
  configService,
  whitelistService,
  actionLimiter,
  executor
);
const autoResponder = new AutoResponder(client, autoResponderService);
const loggingMonitor = new LoggingMonitor(client, prisma);
const quarantineMonitor = new QuarantineMonitor(client, moderationService);

// Initialize AutoModMonitor - THIS IS CRITICAL FOR 24/7 MESSAGE MONITORING
let autoModMonitor: any = null;

// Services bundle for commands
const services = {
  configService,
  whitelistService,
  loggingService,
  caseService,
  actionLimiter,
  executor,
  recoveryManager,
  autoResponderService,
  moderationService,
  guildConfigService,
  autoModService,
  prisma,
  commands,
};

// Register commands
function registerCommands() {
  // Main commands
  commands.set(antinukeCommand.data.name, antinukeCommand);
  commands.set(setlimitCommand.data.name, setlimitCommand);
  commands.set(setpunishmentCommand.data.name, setpunishmentCommand);
  commands.set(logsCommand.data.name, logsCommand);
  commands.set(whitelistCommand.data.name, whitelistCommand);
  commands.set(automodWhitelistCommand.data.name, automodWhitelistCommand);
  commands.set(serverCommand.data.name, serverCommand);
  commands.set(autoresponderCommand.data.name, autoresponderCommand);
  commands.set(channelCommand.data.name, channelCommand);
  commands.set(setprefixCommand.data.name, setprefixCommand);
  commands.set(purgeCommand.data.name, purgeCommand);
  commands.set(nukeCommand.data.name, nukeCommand);
  commands.set(automodCommand.data.name, automodCommand);
  commands.set(loggingCommand.data.name, loggingCommand);
  commands.set(helpCommand.data.name, helpCommand);
  commands.set(modlogsCommand.data.name, modlogsCommand);

  // Moderation commands
  commands.set(banCommand.data.name, banCommand);
  commands.set(unbanCommand.data.name, unbanCommand);
  commands.set(kickCommand.data.name, kickCommand);
  commands.set(muteCommand.data.name, muteCommand);
  commands.set(unmuteCommand.data.name, unmuteCommand);
  commands.set(warnCommand.data.name, warnCommand);
  commands.set(checkwarnCommand.data.name, checkwarnCommand);
  commands.set(quarantineCommand.data.name, quarantineCommand);
  commands.set(softbanCommand.data.name, softbanCommand);
  commands.set(nickCommand.data.name, nickCommand);
  commands.set(roleCommand.data.name, roleCommand);

  // Invite/Welcome commands
  commands.set(invitesCommand.data.name, invitesCommand);
  commands.set(welcomeCommand.data.name, welcomeCommand);
  commands.set(inviterCommand.data.name, inviterCommand);
  commands.set(addInvitesCommand.data.name, addInvitesCommand);
  commands.set(deleteInvitesCommand.data.name, deleteInvitesCommand);
  commands.set(resetInvitesCommand.data.name, resetInvitesCommand);
  commands.set(inviteLinksCommand.data.name, inviteLinksCommand);
  commands.set(leaveCommand.data.name, leaveCommand);
  commands.set(leaveTestCommand.data.name, leaveTestCommand);
  commands.set(testWelcomeCommand.data.name, testWelcomeCommand);

  // Server Stats commands
  commands.set(setupCommand.data.name, setupCommand);
  commands.set(panelCommand.data.name, panelCommand);
  commands.set(refreshCommand.data.name, refreshCommand);
  commands.set(deletePanelCommand.data.name, deletePanelCommand);

  console.log('✔ Commands registered:', Array.from(commands.keys()).join(', '));
}

// Deploy commands to Discord
async function deployCommands() {
  const commandsData = Array.from(commands.values()).map(cmd => cmd.data.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

  try {
    console.log('🔄 Deploying slash commands...');

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID!),
      { body: commandsData }
    );

    console.log('✔ Successfully deployed slash commands globally');
  } catch (error) {
    console.error('✖ Failed to deploy commands:', error);
  }
}

// Setup event handlers
function setupEventHandlers() {
  // Ready event
  client.once('ready', async () => {
    console.log(`✔ Bot logged in as ${client.user?.tag}`);
    console.log(` Serving ${client.guilds.cache.size} guilds`);

    // Set activity
    client.user?.setActivity('Protecting servers from nukes 🔒', { type: 3 }); // Watching

    // Cache invites for all guilds using InviteService
    console.log('🔄 Caching invites for all guilds...');
    let cachedGuilds = 0;
    for (const [guildId, guild] of client.guilds.cache) {
      try {
        await inviteService.cacheGuildInvites(guild);
        cachedGuilds++;
      } catch (error: any) {
        console.error(`Failed to cache invites for guild ${guildId}:`, error);
      }
    }
    console.log(`✔ Cached invites for ${cachedGuilds}/${client.guilds.cache.size} guilds`);

    // Initialize AutoModMonitor for 24/7 message monitoring
    const { AutoModMonitor } = await import('./modules/AutoModMonitor');
    autoModMonitor = new AutoModMonitor(client, autoModService, moderationService, loggingService);
    console.log('✔ AutoMod Monitor started - watching all channels 24/7');

    // Deploy commands
    await deployCommands();

    // Start periodic tasks
    startPeriodicTasks();
  });

  // Interaction handling
  client.on('interactionCreate', async interaction => {
    // Handle button and menu interactions from automod and other features
    if (interaction.isButton() || interaction.isStringSelectMenu() ||
      interaction.isUserSelectMenu() || interaction.isRoleSelectMenu() ||
      interaction.isChannelSelectMenu()) {
      // These interactions are handled within their respective command collectors
      // No global handler needed - they're already managed in command files
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);
    if (!command) {
      console.warn(`Unknown command: ${interaction.commandName}`);
      return;
    }

    // Check permissions - silently ignore if user lacks permissions
    if (interaction.inGuild() && command.data.default_member_permissions) {
      const member = interaction.member as any;
      const requiredPerms = BigInt(command.data.default_member_permissions);

      if (!member.permissions.has(requiredPerms)) {
        // Silently ignore - no response
        return;
      }
    }

    try {
      await command.execute(interaction, services);
    } catch (error: any) {
      console.error(`Error executing command ${interaction.commandName}:`, error);

      // Don't try to respond if interaction already handled or timed out
      if (error.code === 10062 || error.code === 40060) {
        return;
      }

      const errorMessage = {
        content: '❌ An error occurred while executing this command.',
        ephemeral: true,
      };

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      } catch (replyError) {
        // Interaction might have expired, ignore
        console.error('Failed to send error message:', replyError);
      }
    }
  });

  // Prefix command handling
  client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    const prefix = await guildConfigService.getPrefix(message.guild.id);
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();
    if (!commandName) return;

    let command = commands.get(commandName);
    if (!command) {
      command = commands.find((cmd: any) => cmd.prefixCommand?.aliases?.includes(commandName));
    }
    if (!command) return;

    // Check permissions - silently ignore if user lacks permissions
    if (command.data.default_member_permissions) {
      const member = message.member!;
      const requiredPerms = BigInt(command.data.default_member_permissions);

      if (!member.permissions.has(requiredPerms)) {
        // Silently ignore - no response
        return;
      }
    }

    try {
      // Create a pseudo-interaction object for prefix commands
      const { createPrefixInteraction } = await import('./utils/prefixCommand');
      const interaction = await createPrefixInteraction(message, prefix);

      // Execute the command with the pseudo-interaction
      await command.execute(interaction as any, services);
    } catch (error: any) {
      console.error(`Error executing prefix command ${commandName}:`, error);

      // Don't try to respond if interaction already handled or timed out
      if (error.code === 10062 || error.code === 40060) {
        return;
      }

      if (error.name === 'ValidationError') {
        const help = {
          name: command.data.name,
          description: command.data.description,
          permission: command.permission || 'None',
          syntax: command.syntax || `!${command.data.name}`,
          examples: command.example ? [command.example] : (command.examples || [`!${command.data.name}`])
        };

        const embed = createUsageEmbed(help);
        try {
          await message.reply({ embeds: [embed] });
        } catch (replyError) {
          console.error('Failed to send usage embed:', replyError);
        }
        return;
      }

      try {
        await message.reply(`❌ ${error.message || 'An error occurred while executing this command.'}`);
      } catch (replyError) {
        console.error('Failed to send error message:', replyError);
      }
    }
  });

  // Update invites cache when bot joins a guild
  client.on('guildCreate', async guild => {
    try {
      await inviteService.cacheGuildInvites(guild);
      console.log(`✔ Cached invites for new guild: ${guild.name}`);
    } catch (error) {
      console.error(`Failed to cache invites for guild ${guild.id}:`, error);
    }
  });

  // Update cache when invites are created or deleted
  client.on('inviteCreate', async invite => {
    try {
      if (invite.guild && 'invites' in invite.guild) {
        await inviteService.updateInviteCache(invite.guild);
      }
    } catch (error) {
      console.error('Failed to update invite cache on create:', error);
    }
  });

  client.on('inviteDelete', async invite => {
    try {
      if (invite.guild && 'invites' in invite.guild) {
        await inviteService.updateInviteCache(invite.guild);
      }
    } catch (error) {
      console.error('Failed to update invite cache on delete:', error);
    }
  });

  // Welcome/Leave event handling
  client.on('guildMemberAdd', async member => {
    try {
      const db = DatabaseManager.getInstance();
      const config = await db.getWelcomeConfig(member.guild.id);

      // Track invite info using InviteService
      let inviterInfo = '';
      let inviteData = {
        inviterId: null as string | null,
        inviterTag: null as string | null,
        inviteCode: null as string | null,
        joinType: 'unknown' as 'invite' | 'vanity' | 'unknown' | 'oauth'
      };

      try {
        // Fetch current invites
        const newInvites = await member.guild.invites.fetch();

        // Find which invite was used
        inviteData = await inviteService.findUsedInvite(member.guild.id, newInvites);

        // Update invite cache
        await inviteService.updateInviteCache(member.guild);

        // Generate appropriate message based on join type
        if (member.user.bot) {
          inviterInfo = `${member} has been added as an **Integration** 🤖.`;
        } else if (inviteData.joinType === 'invite' && inviteData.inviterId && inviteData.inviterTag) {
          // Increment inviter's invite count
          const totalInvites = await inviteService.incrementInvites(member.guild.id, inviteData.inviterId);
          inviterInfo = `${member} has been invited by **${inviteData.inviterTag}** who now has **${totalInvites}** invite${totalInvites !== 1 ? 's' : ''}.`;
        } else if (inviteData.joinType === 'vanity') {
          inviterInfo = `${member} has joined **${member.guild.name}** via **vanity URL**.`;
        } else {
          inviterInfo = `${member} has been invited via **unknown link**.`;
        }

        // Store join data in database for leave tracking
        await inviteService.storeMemberJoin(
          member.guild.id,
          member.id,
          inviteData.inviterId,
          inviteData.inviterTag,
          inviteData.inviteCode,
          inviteData.joinType
        );
      } catch (inviteError: any) {
        // Handle missing permissions
        if (inviteError.code === 50013) {
          console.warn(`⚠️ Missing permissions to track invites in guild ${member.guild.name} (${member.guild.id})`);
        } else {
          console.error('Error tracking invite:', inviteError);
        }
        inviterInfo = `${member} has been invited via **unknown link**.`;
      }

      // Send welcome message if enabled
      if (config.welcomeChannelId && config.welcomeEnabled) {
        const welcomeChannel = member.guild.channels.cache.get(config.welcomeChannelId);
        if (welcomeChannel && welcomeChannel.isTextBased()) {
          // Use custom message if set, otherwise use invite tracking message
          const message = config.message || inviterInfo;

          await welcomeChannel.send(message.replace(/{user}/g, member.toString()).replace(/{server}/g, member.guild.name));
        }
      }
    } catch (error) {
      console.error('Error handling member join:', error);
    }
  });

  client.on('guildMemberRemove', async member => {
    try {
      const db = DatabaseManager.getInstance();
      const config = await db.getWelcomeConfig(member.guild.id);

      if (config.leaveChannelId && config.leaveEnabled) {
        const leaveChannel = member.guild.channels.cache.get(config.leaveChannelId);
        if (leaveChannel && leaveChannel.isTextBased()) {
          // Get join info from database
          const joinInfo = await inviteService.getMemberJoinData(member.guild.id, member.id);
          let leaveMessage = '';

          if (member.user.bot) {
            // Check for kick/ban in audit logs
            let action = 'left';
            try {
              const auditLogs = await member.guild.fetchAuditLogs({ limit: 5 });
              const entry = auditLogs.entries.find(e => e.target?.id === member.id && (e.action === 20 || e.action === 22)); // 20: Kick, 22: Ban Add
              if (entry) {
                if (entry.action === 20) action = 'was kicked';
                if (entry.action === 22) action = 'was banned';
                // Check if it was recent (within last 30 seconds)
                if (Date.now() - entry.createdTimestamp > 30000) action = 'left';
              }
            } catch (e) {
              console.error('Failed to fetch audit logs for bot leave:', e);
            }
            leaveMessage = `${member.user.tag} ${action} the server.`;
          } else if (joinInfo) {
            if (joinInfo.joinType === 'invite' && joinInfo.inviterId && joinInfo.inviterTag) {
              // Decrement inviter's invite count (person left)
              try {
                const totalInvites = await inviteService.decrementInvites(member.guild.id, joinInfo.inviterId);
                leaveMessage = `${member.user.tag} left the server. They were invited by **${joinInfo.inviterTag}** who now has **${totalInvites}** invite${totalInvites !== 1 ? 's' : ''}.`;
              } catch (error) {
                leaveMessage = `${member.user.tag} left the server. They were invited by **${joinInfo.inviterTag}**.`;
              }
            } else if (joinInfo.joinType === 'vanity') {
              leaveMessage = `${member.user.tag} left the server. They joined using **vanity URL**.`;
            } else {
              leaveMessage = `${member.user.tag} left the server. They joined using **unknown link**.`;
            }

            // Clean up stored join info
            await inviteService.deleteMemberJoinData(member.guild.id, member.id);
          } else {
            // No join info stored (member joined before bot or tracking failed)
            leaveMessage = `${member.user.tag} left the server. They joined using **unknown link**.`;
          }

          // Use custom message if set, otherwise use the generated leave message
          const finalMessage = config.leaveMessage || leaveMessage;

          await leaveChannel.send(finalMessage.replace(/{user}/g, member.user.tag).replace(/{server}/g, member.guild.name));
        }
      }
    } catch (error) {
      console.error('Error handling member leave:', error);
    }
  });

  // Error handling
  client.on('error', error => {
    console.error('✖ Discord client error:', error);
  });

  process.on('unhandledRejection', error => {
    console.error('✖ Unhandled promise rejection:', error);
  });

  process.on('uncaughtException', error => {
    console.error('✖ Uncaught exception:', error);
    process.exit(1);
  });
}

// Periodic tasks
function startPeriodicTasks() {
  // Cleanup old action records every 6 hours
  setInterval(async () => {
    try {
      const deleted = await actionLimiter.cleanupOldActions(30);
      console.log(`🧹 Cleaned up ${deleted} old action records`);
    } catch (error) {
      console.error('Failed to cleanup old actions:', error);
    }
  }, 6 * 60 * 60 * 1000); // 6 hours

  // Cleanup old backups every day
  setInterval(async () => {
    try {
      await recoveryManager.cleanupOldBackups(7);
      console.log('🧹 Cleaned up old backups');
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours

  // Create snapshots every 12 hours
  setInterval(async () => {
    try {
      for (const [guildId] of client.guilds.cache) {
        await recoveryManager.createSnapshot(guildId);
      }
      console.log('📸 Created guild snapshots');
    } catch (error) {
      console.error('Failed to create snapshots:', error);
    }
  }, 12 * 60 * 60 * 1000); // 12 hours

  // Update server stats every 10 minutes
  setInterval(async () => {
    try {
      console.log('🔄 Updating server stats...');
      let totalUpdated = 0;
      for (const [guildId, guild] of client.guilds.cache) {
        try {
          const { updated } = await refreshCommand.updateServerStats(guild);
          totalUpdated += updated;
        } catch (error) {
          console.error(`Failed to update stats for guild ${guildId}:`, error);
        }
      }
      if (totalUpdated > 0) {
        console.log(`📊 Updated ${totalUpdated} stats panels`);
      }
    } catch (error) {
      console.error('Failed to update server stats:', error);
    }
  }, 10 * 60 * 1000); // 10 minutes

  console.log('✔ Periodic tasks started');
}

// Graceful shutdown
async function shutdown(signal: string) {
  console.log(`\n⚠️ Received ${signal}, shutting down gracefully...`);

  try {
    // Destroy AutoModMonitor
    if (autoModMonitor) {
      autoModMonitor.destroy();
      console.log('✔ AutoMod Monitor destroyed');
    }

    // Destroy Discord client
    client.destroy();
    console.log('✔ Discord client destroyed');

    // Disconnect Prisma
    await prisma.$disconnect();
    console.log('✔ Database disconnected');

    console.log('👋 Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('✖ Error during shutdown:', error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Main startup
async function main() {
  try {
    console.log('🚀 Starting Anti-Nuke Bot...');

    // Test database connection
    await prisma.$connect();
    console.log('✔ Database connected');

    // Register commands
    registerCommands();

    // Setup event handlers
    setupEventHandlers();

    // Login to Discord
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error('✖ Failed to start bot:', error);
    process.exit(1);
  }
}

// Start the bot
main();
