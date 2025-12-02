/**
 * Help Command - Universal help system with category dropdown
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  Collection,
  PermissionFlagsBits
} from 'discord.js';
import { EmbedColors, SlashCommand, PrefixCommand } from '../types';
import { CustomEmojis } from '../utils/emoji';
import { GuildConfigService } from '../services/GuildConfigService';
import { createInfoEmbed, createUsageEmbed, createErrorEmbed } from '../utils/embedHelpers';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('View bot commands and features')
  .addStringOption(option =>
    option.setName('command')
      .setDescription('Get help for a specific command')
      .setRequired(false)
  );

export const slashCommand: SlashCommand = {
  data: data,
  category: 'moderation',
  syntax: '/help [command]',
  permission: 'None',
  example: '/help ban',
  execute: async (interaction: ChatInputCommandInteraction, services: any) => {
    await execute(interaction, services);
  }
};

// Category configuration
const categoryConfig: Record<string, { name: string; emoji: string; description: string }> = {
  antinuke: {
    name: 'Anti-Nuke',
    emoji: CustomEmojis.CAUTION,
    description: 'Anti-Nuke Protection System'
  },
  moderation: {
    name: 'Moderation',
    emoji: CustomEmojis.STAFF,
    description: 'Moderation Tools'
  },
  automod: {
    name: 'AutoMod',
    emoji: CustomEmojis.SETTING,
    description: 'AutoMod System'
  },
  logging: {
    name: 'Logging',
    emoji: CustomEmojis.LOGGING,
    description: 'Logging System'
  },
  autoresponder: {
    name: 'Auto Responder',
    emoji: CustomEmojis.FILES,
    description: 'Auto Responder System'
  },
  invites_welcome: {
    name: 'Invites & Welcome',
    emoji: '📨',
    description: 'Invites and Welcome System'
  },
  serverstats: {
    name: 'Server Stats',
    emoji: '📊',
    description: 'Server Statistics'
  },
  quarantine: {
    name: 'Quarantine',
    emoji: CustomEmojis.USER,
    description: 'Quarantine System'
  },
  channels: {
    name: 'Channels',
    emoji: CustomEmojis.CHANNEL,
    description: 'Channel Management'
  }
};

export async function execute(
  interaction: ChatInputCommandInteraction,
  services: { guildConfigService: GuildConfigService; commands: Collection<string, any> }
) {
  const prefix = await services.guildConfigService.getPrefix(interaction.guild!.id);
  const commands = services.commands;
  const specificCommand = interaction.options.getString('command');

  if (specificCommand) {
    const cmd = commands.get(specificCommand.toLowerCase()) ||
      commands.find((c: any) => c.prefixCommand?.aliases?.includes(specificCommand.toLowerCase()));

    if (cmd) {
      const commandData = cmd.slashCommand || cmd;
      const help = {
        name: commandData.data?.name || cmd.name,
        description: commandData.data?.description || cmd.description,
        permission: cmd.permission || 'None',
        syntax: cmd.syntax || `/${commandData.data?.name || cmd.name}`,
        examples: cmd.example ? [cmd.example] : (cmd.examples || [])
      };

      const embed = createUsageEmbed(help);
      await interaction.reply({ embeds: [embed] });
      return;
    } else {
      // Command not found, try to find suggestions
      const suggestions: string[] = [];
      const input = specificCommand.toLowerCase();

      commands.forEach((cmd: any) => {
        const cmdName = (cmd.data?.name || cmd.name).toLowerCase();
        const aliases = cmd.prefixCommand?.aliases || [];

        // Check main name
        if (cmdName.includes(input) || input.includes(cmdName)) {
          suggestions.push(cmdName);
        }

        // Check aliases
        aliases.forEach((alias: string) => {
          if (alias.toLowerCase().includes(input) || input.includes(alias.toLowerCase())) {
            suggestions.push(cmdName); // Push main command name
          }
        });
      });

      // Deduplicate and limit
      const uniqueSuggestions = [...new Set(suggestions)].slice(0, 5);

      let errorDescription = `${CustomEmojis.CROSS} Command \`${specificCommand}\` not found.`;

      if (uniqueSuggestions.length > 0) {
        errorDescription += `\n\n**Did you mean:**\n${uniqueSuggestions.map(s => `• \`${prefix}${s}\``).join('\n')}`;
      }

      const errorEmbed = new EmbedBuilder()
        .setColor(EmbedColors.ERROR)
        .setDescription(errorDescription);

      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      return;
    }
  }

  // Group commands by category
  const categories: Record<string, any[]> = {};

  commands.forEach((cmd: any) => {
    // Check if it's a slash command or prefix command wrapper
    const commandData = cmd.slashCommand || cmd;
    const category = commandData.category || 'moderation'; // Default to moderation if missing

    if (!categories[category]) {
      categories[category] = [];
    }

    // Avoid duplicates if both slash and prefix exist (usually they are in the same file/module)
    // We'll use the slash command data primarily
    categories[category].push(commandData);
  });

  // Add fields for each category
  const sortedCategories = Object.keys(categoryConfig).filter(k => categories[k] && categories[k].length > 0);

  const moduleList = sortedCategories.map(key => {
    const config = categoryConfig[key];
    return `${config.emoji} **${config.name}**`;
  }).join('\n');

  const mainEmbed = createInfoEmbed(
    `${CustomEmojis.SETTING} Bot Help & Commands`,
    `Welcome to the help menu! Select a category below to view commands.\n\n` +
    `**Current Prefix:** \`${prefix}\`\n` +
    `**Total Commands:** ${commands.size}\n\n` +
    `**Modules**\n${moduleList}\n\n` +
    `Use slash commands (\`/\`) or prefix commands (\`${prefix}\`)`
  )
    .setFooter({ text: 'Select a category from the dropdown below' })
    .setTimestamp();

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`help_category_${interaction.user.id}`)
    .setPlaceholder('🔍 Select a category to view commands')
    .addOptions(
      {
        label: 'Back to Home',
        value: 'home',
        description: 'Return to the main help menu',
        emoji: '🏠',
      },
      ...sortedCategories.map(key => ({
        label: categoryConfig[key].name,
        value: key,
        description: categoryConfig[key].description,
        emoji: categoryConfig[key].emoji,
      }))
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  const response = await interaction.reply({
    embeds: [mainEmbed],
    components: [row],
  });

  // Handle category selection
  const collector = response.createMessageComponentCollector({
    filter: i => i.user.id === interaction.user.id && i.customId === `help_category_${interaction.user.id}`,
    time: 300000, // 5 minutes
    componentType: ComponentType.StringSelect,
  });

  collector.on('collect', async (i) => {
    const selectedCategory = i.values[0];

    if (selectedCategory === 'home') {
      await i.update({ embeds: [mainEmbed], components: [row] });
      return;
    }

    const config = categoryConfig[selectedCategory];
    const categoryCommands = categories[selectedCategory];

    const embeds: EmbedBuilder[] = [];
    const chunkSize = 25;

    // Split commands into chunks of 25
    for (let i = 0; i < categoryCommands.length; i += chunkSize) {
      const chunk = categoryCommands.slice(i, i + chunkSize);

      const commandList = chunk.map(cmd => {
        const name = cmd.data?.name || cmd.name;
        return `• \`${name}\``;
      }).join('\n');

      const description = i === 0
        ? `${config.description}\n\n**Commands**\n${commandList}`
        : `**Commands (Cont.)**\n${commandList}`;

      const embed = createInfoEmbed(
        `${config.emoji} ${config.name}${i > 0 ? ` (Page ${Math.floor(i / chunkSize) + 1})` : ''}`,
        description
      );

      if (i === 0) {
        embed.setFooter({ text: `Type ${prefix}help <command> for details` });
        embed.setTimestamp();
      }

      embeds.push(embed);
    }

    // Discord allows max 10 embeds per message. 
    // If we have more than 10 embeds (250 commands), we'll just slice to 10.
    if (embeds.length > 10) {
      embeds.length = 10;
      const lastEmbed = embeds[9];
      lastEmbed.setFooter({ text: '⚠️ Too many commands to display. Some are hidden.' });
    }

    await i.update({ embeds: embeds, components: [row] });
  });

  collector.on('end', () => {
    interaction.editReply({ components: [] }).catch(() => { });
  });
}
