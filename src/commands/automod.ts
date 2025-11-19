/**
 * AutoMod Command - Comprehensive automod system (FIXED VERSION)
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  ButtonStyle,
  ComponentType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  MessageComponentInteraction,
} from 'discord.js';
import { EmbedColors } from '../types';
import { CustomEmojis } from '../utils/emoji';
import { AutoModService } from '../services/AutoModService';

export const data = new SlashCommandBuilder()
  .setName('automod')
  .setDescription('Configure server automod system')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sub =>
    sub
      .setName('setup')
      .setDescription('Setup and configure automod features')
  )
  .addSubcommand(sub =>
    sub
      .setName('disable')
      .setDescription('Disable automod features')
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  services: { autoModService: AutoModService }
) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'setup') {
    await handleSetup(interaction, services.autoModService);
  } else if (subcommand === 'disable') {
    await handleDisable(interaction, services.autoModService);
  }
}

async function handleSetup(interaction: ChatInputCommandInteraction, autoModService: AutoModService) {
  const guildId = interaction.guild!.id;

  // Get all configs to show current status
  const antiSpamConfig = await autoModService.getConfig(guildId, 'anti_spam');
  const massMentionConfig = await autoModService.getConfig(guildId, 'mass_mention');
  const serverInviteConfig = await autoModService.getConfig(guildId, 'server_invite');
  const antiLinkConfig = await autoModService.getConfig(guildId, 'anti_link');

  const embed = new EmbedBuilder()
    .setColor(EmbedColors.INFO)
    .setTitle(`${CustomEmojis.SETTING} AutoMod Setup`)
    .setDescription('Select an automod feature to configure:')
    .addFields(
      {
        name: `${CustomEmojis.CAUTION} Anti-Spam`,
        value: antiSpamConfig?.enabled
          ? `${CustomEmojis.TICK} Enabled\n` +
            `Max Messages: ${antiSpamConfig.maxMessages || 5}\n` +
            `Max Lines: ${antiSpamConfig.maxLines || 10}\n` +
            `Time Span: ${(antiSpamConfig.timeSpanMs || 5000) / 1000}s\n` +
            `Action: ${antiSpamConfig.actionType || 'delete'}\n` +
            `Punishment: ${antiSpamConfig.punishmentType || 'timeout'}`
          : `${CustomEmojis.CROSS} Disabled`,
        inline: true,
      },
      {
        name: `${CustomEmojis.USER} Mass Mention`,
        value: massMentionConfig?.enabled
          ? `${CustomEmojis.TICK} Enabled\n` +
            `Max Mentions: ${massMentionConfig.maxMentions || 5}\n` +
            `Action: ${massMentionConfig.actionType || 'delete'}\n` +
            `Punishment: ${massMentionConfig.punishmentType || 'timeout'}`
          : `${CustomEmojis.CROSS} Disabled`,
        inline: true,
      },
      {
        name: `${CustomEmojis.CHANNEL} Server Invite`,
        value: serverInviteConfig?.enabled
          ? `${CustomEmojis.TICK} Enabled\n` +
            `Action: ${serverInviteConfig.actionType || 'delete'}\n` +
            `Punishment: ${serverInviteConfig.punishmentType || 'kick'}`
          : `${CustomEmojis.CROSS} Disabled`,
        inline: true,
      },
      {
        name: `${CustomEmojis.FILES} Anti-Link`,
        value: antiLinkConfig?.enabled
          ? `${CustomEmojis.TICK} Enabled\n` +
            `Action: ${antiLinkConfig.actionType || 'delete'}\n` +
            `Punishment: ${antiLinkConfig.punishmentType || 'timeout'}`
          : `${CustomEmojis.CROSS} Disabled`,
        inline: true,
      }
    )
    .setFooter({ text: 'Select a feature to configure. Use /automod whitelist for whitelist management' });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`automod_feature_${interaction.user.id}`)
    .setPlaceholder('Select an automod feature')
    .addOptions([
      {
        label: 'Anti-Spam',
        value: 'anti_spam',
        description: 'Configure anti-spam protection',
        emoji: CustomEmojis.CAUTION,
      },
      {
        label: 'Mass Mention',
        value: 'mass_mention',
        description: 'Configure mass mention limits',
        emoji: CustomEmojis.USER,
      },
      {
        label: 'Server Invite',
        value: 'server_invite',
        description: 'Block Discord server invites',
        emoji: CustomEmojis.CHANNEL,
      },
      {
        label: 'Anti-Link',
        value: 'anti_link',
        description: 'Block external links',
        emoji: CustomEmojis.FILES,
      },
    ]);

  const saveButton = new ButtonBuilder()
    .setCustomId(`automod_save_all_${interaction.user.id}`)
    .setLabel('Save All')
    .setStyle(ButtonStyle.Success)
    .setEmoji('💾');

  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(saveButton);

  const response = await interaction.reply({
    embeds: [embed],
    components: [selectRow, buttonRow],
  });

  // Wait for selection
  const collector = response.createMessageComponentCollector({
    filter: i => i.user.id === interaction.user.id && (
      i.customId === `automod_feature_${interaction.user.id}` ||
      i.customId === `automod_save_all_${interaction.user.id}`
    ),
  });

  collector.on('collect', async (componentInteraction) => {
    try {
      // Acknowledge interaction immediately to prevent timeout
      if (!componentInteraction.deferred && !componentInteraction.replied) {
        await componentInteraction.deferUpdate().catch(() => {});
      }

      if (componentInteraction.customId === `automod_save_all_${interaction.user.id}`) {
        const saveEmbed = new EmbedBuilder()
          .setColor(EmbedColors.SUCCESS)
          .setDescription(`${CustomEmojis.TICK} All automod configurations have been saved!`);
        await componentInteraction.editReply({ embeds: [saveEmbed], components: [] });
        
        // Refresh the setup menu
        setTimeout(async () => {
          const guildId = componentInteraction.guild!.id;
          const antiSpamConfig = await autoModService.getConfig(guildId, 'anti_spam');
          const massMentionConfig = await autoModService.getConfig(guildId, 'mass_mention');
          const serverInviteConfig = await autoModService.getConfig(guildId, 'server_invite');
          const antiLinkConfig = await autoModService.getConfig(guildId, 'anti_link');

          const embed = new EmbedBuilder()
            .setColor(EmbedColors.INFO)
            .setTitle(`${CustomEmojis.SETTING} AutoMod Setup`)
            .setDescription('Select an automod feature to configure:')
            .addFields(
              {
                name: `${CustomEmojis.CAUTION} Anti-Spam`,
                value: antiSpamConfig?.enabled
                  ? `${CustomEmojis.TICK} Enabled\n` +
                    `Max Messages: ${antiSpamConfig.maxMessages || 5}\n` +
                    `Max Lines: ${antiSpamConfig.maxLines || 10}\n` +
                    `Time Span: ${(antiSpamConfig.timeSpanMs || 5000) / 1000}s\n` +
                    `Action: ${antiSpamConfig.actionType || 'delete'}\n` +
                    `Punishment: ${antiSpamConfig.punishmentType || 'timeout'}`
                  : `${CustomEmojis.CROSS} Disabled`,
                inline: true,
              },
              {
                name: `${CustomEmojis.USER} Mass Mention`,
                value: massMentionConfig?.enabled
                  ? `${CustomEmojis.TICK} Enabled\n` +
                    `Max Mentions: ${massMentionConfig.maxMentions || 5}\n` +
                    `Action: ${massMentionConfig.actionType || 'delete'}\n` +
                    `Punishment: ${massMentionConfig.punishmentType || 'timeout'}`
                  : `${CustomEmojis.CROSS} Disabled`,
                inline: true,
              },
              {
                name: `${CustomEmojis.CHANNEL} Server Invite`,
                value: serverInviteConfig?.enabled
                  ? `${CustomEmojis.TICK} Enabled\n` +
                    `Action: ${serverInviteConfig.actionType || 'delete'}\n` +
                    `Punishment: ${serverInviteConfig.punishmentType || 'kick'}`
                  : `${CustomEmojis.CROSS} Disabled`,
                inline: true,
              },
              {
                name: `${CustomEmojis.FILES} Anti-Link`,
                value: antiLinkConfig?.enabled
                  ? `${CustomEmojis.TICK} Enabled\n` +
                    `Action: ${antiLinkConfig.actionType || 'delete'}\n` +
                    `Punishment: ${antiLinkConfig.punishmentType || 'timeout'}`
                  : `${CustomEmojis.CROSS} Disabled`,
                inline: true,
              }
            )
            .setFooter({ text: 'Select a feature to configure. Use /automod whitelist for whitelist management' });

          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`automod_feature_${componentInteraction.user.id}`)
            .setPlaceholder('Select an automod feature')
            .addOptions([
              {
                label: 'Anti-Spam',
                value: 'anti_spam',
                description: 'Configure anti-spam protection',
                emoji: CustomEmojis.CAUTION,
              },
              {
                label: 'Mass Mention',
                value: 'mass_mention',
                description: 'Configure mass mention limits',
                emoji: CustomEmojis.USER,
              },
              {
                label: 'Server Invite',
                value: 'server_invite',
                description: 'Block Discord server invites',
                emoji: CustomEmojis.CHANNEL,
              },
              {
                label: 'Anti-Link',
                value: 'anti_link',
                description: 'Block external links',
                emoji: CustomEmojis.FILES,
              },
            ]);

          const saveButton = new ButtonBuilder()
            .setCustomId(`automod_save_all_${componentInteraction.user.id}`)
            .setLabel('Save All')
            .setStyle(ButtonStyle.Success)
            .setEmoji('💾');

          const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
          const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(saveButton);

          await componentInteraction.editReply({
            embeds: [embed],
            components: [selectRow, buttonRow],
          });
        }, 2000);
      } else if (componentInteraction.isStringSelectMenu()) {
        const selectedFeature = componentInteraction.values[0];
        await showFeatureConfig(componentInteraction, selectedFeature, autoModService);
      }
    } catch (error) {
      console.error('Error handling automod interaction:', error);
    }
  });
}

async function showFeatureConfig(interaction: MessageComponentInteraction, feature: string, autoModService: AutoModService) {
  const guildId = interaction.guild!.id;

  // Get current config
  const config = await autoModService.getConfig(guildId, feature);

  let embed: EmbedBuilder;

  if (feature === 'anti_spam') {
    embed = new EmbedBuilder()
      .setColor(EmbedColors.INFO)
      .setTitle(`${CustomEmojis.CAUTION} Anti-Spam Configuration`)
      .setDescription('Configure anti-spam protection settings')
      .addFields(
        { name: 'Status', value: config?.enabled ? `${CustomEmojis.TICK} Enabled` : `${CustomEmojis.CROSS} Disabled`, inline: true },
        { name: 'Max Messages', value: `${config?.maxMessages || 5} messages`, inline: true },
        { name: 'Time Span', value: `${(config?.timeSpanMs || 5000) / 1000}s`, inline: true },
        { name: 'Max Lines', value: `${config?.maxLines || 10} lines`, inline: true },
        { name: 'Action', value: config?.actionType || 'delete', inline: true },
        { name: 'Punishment', value: config?.punishmentType || 'timeout', inline: true },
      )
      .setFooter({ text: 'Use buttons below to configure' });
  } else if (feature === 'mass_mention') {
    embed = new EmbedBuilder()
      .setColor(EmbedColors.INFO)
      .setTitle(`${CustomEmojis.USER} Mass Mention Configuration`)
      .setDescription('Configure mass mention limits')
      .addFields(
        { name: 'Status', value: config?.enabled ? `${CustomEmojis.TICK} Enabled` : `${CustomEmojis.CROSS} Disabled`, inline: true },
        { name: 'Max Mentions', value: `${config?.maxMentions || 5} mentions`, inline: true },
        { name: 'Action', value: config?.actionType || 'delete', inline: true },
        { name: 'Punishment', value: config?.punishmentType || 'timeout', inline: true },
      )
      .setFooter({ text: 'Use buttons below to configure' });
  } else {
    embed = new EmbedBuilder()
      .setColor(EmbedColors.INFO)
      .setTitle(`${CustomEmojis.FILES} ${feature === 'server_invite' ? 'Server Invite' : 'Anti-Link'} Configuration`)
      .setDescription(`Configure ${feature === 'server_invite' ? 'server invite' : 'link'} blocking`)
      .addFields(
        { name: 'Status', value: config?.enabled ? `${CustomEmojis.TICK} Enabled` : `${CustomEmojis.CROSS} Disabled`, inline: true },
        { name: 'Action', value: config?.actionType || 'delete', inline: true },
        { name: 'Punishment', value: config?.punishmentType || (feature === 'server_invite' ? 'kick' : 'timeout'), inline: true },
      )
      .setFooter({ text: 'Use buttons below to configure' });
  }

  // First row: 4 buttons (Configure, Action, Punishment, Whitelist)
  const buttonsRow1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`automod_configure_${feature}_${interaction.user.id}`)
      .setLabel('Configure')
      .setStyle(ButtonStyle.Primary)
      .setEmoji(CustomEmojis.SETTING),
    new ButtonBuilder()
      .setCustomId(`automod_action_${feature}_${interaction.user.id}`)
      .setLabel('Action')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('⚙️'),
    new ButtonBuilder()
      .setCustomId(`automod_punishment_${feature}_${interaction.user.id}`)
      .setLabel('Punishment')
      .setStyle(ButtonStyle.Danger)
      .setEmoji(CustomEmojis.CAUTION),
    new ButtonBuilder()
      .setCustomId(`automod_whitelist_info_${feature}_${interaction.user.id}`)
      .setLabel('Whitelist')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(CustomEmojis.TICK)
  );

  // Second row: Enable/Disable button
  const buttonsRow2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`automod_toggle_${feature}_${interaction.user.id}`)
      .setLabel(config?.enabled ? 'Disable' : 'Enable')
      .setStyle(config?.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
      .setEmoji(config?.enabled ? CustomEmojis.CROSS : CustomEmojis.TICK)
  );

  // Third row: Save and Back buttons
  const saveRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`automod_save_feature_${feature}_${interaction.user.id}`)
      .setLabel('Save Configuration')
      .setStyle(ButtonStyle.Success)
      .setEmoji('💾'),
    new ButtonBuilder()
      .setCustomId(`automod_back_home_${interaction.user.id}`)
      .setLabel('Back')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⬅️')
  );

  await interaction.editReply({ embeds: [embed], components: [buttonsRow1, buttonsRow2, saveRow] });

  // Handle button clicks - no time limit for 24/7 activity
  const collector = interaction.message.createMessageComponentCollector({
    filter: (i: any) => i.user.id === interaction.user.id,
  });

  collector.on('collect', async (i: any) => {
    try {
      // Check if interaction is still valid before deferring
      if (!i.customId.includes(feature) && i.customId !== `automod_back_home_${interaction.user.id}`) {
        return;
      }

      // Defer update first to avoid Unknown interaction error
      if (!i.deferred && !i.replied) {
        await i.deferUpdate().catch(() => {});
      }

      if (i.customId.startsWith('automod_configure_')) {
        await handleConfigure(i, feature, autoModService);
      } else if (i.customId.startsWith('automod_action_')) {
        await handleActionSelect(i, feature, autoModService);
      } else if (i.customId.startsWith('automod_punishment_')) {
        await handlePunishment(i, feature, autoModService);
      } else if (i.customId.startsWith('automod_whitelist_info_')) {
        await handleWhitelistInfo(i, feature, autoModService);
      } else if (i.customId.startsWith('automod_toggle_')) {
        await handleToggle(i, feature, autoModService);
      } else if (i.customId.startsWith('automod_save_feature_')) {
        const saveEmbed = new EmbedBuilder()
          .setColor(EmbedColors.SUCCESS)
          .setDescription(`${CustomEmojis.TICK} Configuration for **${feature}** has been saved!`);
        await i.editReply({ embeds: [saveEmbed], components: [] });
        setTimeout(() => {
          showFeatureConfig(i, feature, autoModService);
        }, 2000);
      } else if (i.customId === `automod_back_home_${interaction.user.id}`) {
        collector.stop();
        
        // Recreate the main menu without calling handleSetup
        const guildId = i.guild!.id;
        const antiSpamConfig = await autoModService.getConfig(guildId, 'anti_spam');
        const massMentionConfig = await autoModService.getConfig(guildId, 'mass_mention');
        const serverInviteConfig = await autoModService.getConfig(guildId, 'server_invite');
        const antiLinkConfig = await autoModService.getConfig(guildId, 'anti_link');

        const embed = new EmbedBuilder()
          .setColor(EmbedColors.INFO)
          .setTitle(`${CustomEmojis.SETTING} AutoMod Setup`)
          .setDescription('Select an automod feature to configure:')
          .addFields(
            {
              name: `${CustomEmojis.CAUTION} Anti-Spam`,
              value: antiSpamConfig?.enabled
                ? `${CustomEmojis.TICK} Enabled\n` +
                  `Max Messages: ${antiSpamConfig.maxMessages || 5}\n` +
                  `Max Lines: ${antiSpamConfig.maxLines || 10}\n` +
                  `Time Span: ${(antiSpamConfig.timeSpanMs || 5000) / 1000}s\n` +
                  `Action: ${antiSpamConfig.actionType || 'delete'}\n` +
                  `Punishment: ${antiSpamConfig.punishmentType || 'timeout'}`
                : `${CustomEmojis.CROSS} Disabled`,
              inline: true,
            },
            {
              name: `${CustomEmojis.USER} Mass Mention`,
              value: massMentionConfig?.enabled
                ? `${CustomEmojis.TICK} Enabled\n` +
                  `Max Mentions: ${massMentionConfig.maxMentions || 5}\n` +
                  `Action: ${massMentionConfig.actionType || 'delete'}\n` +
                  `Punishment: ${massMentionConfig.punishmentType || 'timeout'}`
                : `${CustomEmojis.CROSS} Disabled`,
              inline: true,
            },
            {
              name: `${CustomEmojis.CHANNEL} Server Invite`,
              value: serverInviteConfig?.enabled
                ? `${CustomEmojis.TICK} Enabled\n` +
                  `Action: ${serverInviteConfig.actionType || 'delete'}\n` +
                  `Punishment: ${serverInviteConfig.punishmentType || 'kick'}`
                : `${CustomEmojis.CROSS} Disabled`,
              inline: true,
            },
            {
              name: `${CustomEmojis.FILES} Anti-Link`,
              value: antiLinkConfig?.enabled
                ? `${CustomEmojis.TICK} Enabled\n` +
                  `Action: ${antiLinkConfig.actionType || 'delete'}\n` +
                  `Punishment: ${antiLinkConfig.punishmentType || 'timeout'}`
                : `${CustomEmojis.CROSS} Disabled`,
              inline: true,
            }
          )
          .setFooter({ text: 'Select a feature to configure. Use /automod whitelist for whitelist management' });

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`automod_feature_${i.user.id}`)
          .setPlaceholder('Select an automod feature')
          .addOptions([
            {
              label: 'Anti-Spam',
              value: 'anti_spam',
              description: 'Configure anti-spam protection',
              emoji: CustomEmojis.CAUTION,
            },
            {
              label: 'Mass Mention',
              value: 'mass_mention',
              description: 'Configure mass mention limits',
              emoji: CustomEmojis.USER,
            },
            {
              label: 'Server Invite',
              value: 'server_invite',
              description: 'Block Discord server invites',
              emoji: CustomEmojis.CHANNEL,
            },
            {
              label: 'Anti-Link',
              value: 'anti_link',
              description: 'Block external links',
              emoji: CustomEmojis.FILES,
            },
          ]);

        const saveButton = new ButtonBuilder()
          .setCustomId(`automod_save_all_${i.user.id}`)
          .setLabel('Save All')
          .setStyle(ButtonStyle.Success)
          .setEmoji('💾');

        const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
        const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(saveButton);

        await i.editReply({
          embeds: [embed],
          components: [selectRow, buttonRow],
        });
      }
    } catch (error) {
      console.error('Error handling automod interaction:', error);
    }
  });
}

async function handleActionSelect(interaction: MessageComponentInteraction, feature: string, autoModService: AutoModService) {
  const actionSelect = new StringSelectMenuBuilder()
    .setCustomId(`action_select_${feature}_${interaction.user.id}`)
    .setPlaceholder('Select action on violation')
    .addOptions([
      { label: 'Delete', value: 'delete', description: 'Delete the violating message', emoji: '🗑️' },
      { label: 'Warn', value: 'warn', description: 'Warn the user (using warn system)', emoji: '⚠️' },
      { label: 'Delete & Warn', value: 'delete_warn', description: 'Delete message and warn user', emoji: '🚨' },
    ]);

  const promptEmbed = new EmbedBuilder()
    .setColor(EmbedColors.WARNING)
    .setTitle('Select Action')
    .setDescription('Choose what should happen when a violation is detected');

  const backButton = new ButtonBuilder()
    .setCustomId(`action_back_${feature}_${interaction.user.id}`)
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('⬅️');

  await interaction.editReply({ 
    embeds: [promptEmbed], 
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(actionSelect),
      new ActionRowBuilder<ButtonBuilder>().addComponents(backButton)
    ] 
  });

  const selCollector = interaction.message.createMessageComponentCollector({ 
    filter: (sel: any) => sel.user.id === interaction.user.id && 
      (sel.customId === `action_select_${feature}_${interaction.user.id}` || 
       sel.customId === `action_back_${feature}_${interaction.user.id}`),
    time: 60000, 
    max: 1 
  });

  selCollector.on('collect', async (sel: any) => {
    await sel.deferUpdate();
    
    if (sel.customId === `action_back_${feature}_${interaction.user.id}`) {
      await showFeatureConfig(sel, feature, autoModService);
      return;
    }

    const selectedAction = sel.values[0];
    await autoModService.upsertConfig(interaction.guild!.id, feature, { actionType: selectedAction });

    const okEmbed = new EmbedBuilder()
      .setColor(EmbedColors.SUCCESS)
      .setDescription(`${CustomEmojis.TICK} Action set to **${selectedAction.replace('_', ' & ')}**`);
    
    await sel.editReply({ embeds: [okEmbed], components: [] });
    
    setTimeout(() => {
      showFeatureConfig(sel, feature, autoModService);
    }, 2000);
  });
}

async function handleConfigure(interaction: MessageComponentInteraction, feature: string, autoModService: AutoModService) {
  const guildId = interaction.guild!.id;

  if (feature === 'anti_spam') {
    // Show dropdowns for anti-spam config
    const maxMessagesSelect = new StringSelectMenuBuilder()
      .setCustomId(`config_max_messages_${interaction.user.id}`)
      .setPlaceholder('Max messages')
      .addOptions(
        Array.from({ length: 10 }, (_, i) => ({
          label: `${i + 1} messages`,
          value: `${i + 1}`,
        }))
      );

    const maxLinesSelect = new StringSelectMenuBuilder()
      .setCustomId(`config_max_lines_${interaction.user.id}`)
      .setPlaceholder('Max lines')
      .addOptions(
        Array.from({ length: 10 }, (_, i) => ({
          label: `${i + 1} lines`,
          value: `${i + 1}`,
        }))
      );

    const timeButton = new ButtonBuilder()
      .setCustomId(`config_time_span_${interaction.user.id}`)
      .setLabel('Set Time Span')
      .setStyle(ButtonStyle.Primary);

    const backButton = new ButtonBuilder()
      .setCustomId(`config_back_${feature}_${interaction.user.id}`)
      .setLabel('Back')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⬅️');

    const embed = new EmbedBuilder()
      .setColor(EmbedColors.INFO)
      .setTitle(`${CustomEmojis.SETTING} Configure Anti-Spam`)
      .setDescription('Select values for each setting:')
      .addFields(
        { name: 'Max Messages', value: 'Select from dropdown below', inline: true },
        { name: 'Max Lines', value: 'Select from dropdown below', inline: true },
        { name: 'Time Span', value: 'Click button to set (e.g., 5s, 10m)', inline: true },
      );

    await interaction.editReply({
      embeds: [embed],
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(maxMessagesSelect),
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(maxLinesSelect),
        new ActionRowBuilder<ButtonBuilder>().addComponents(timeButton, backButton),
      ],
    });

    // Handle selections
    const collector = interaction.message.createMessageComponentCollector({
      filter: (i: any) => i.user.id === interaction.user.id,
      time: 120000,
    });

    let maxMessages: number | null = null;
    let maxLines: number | null = null;
    let timeSpanMs: number | null = null;

    collector.on('collect', async (i: any) => {
      if (i.customId === `config_back_${feature}_${interaction.user.id}`) {
        await i.deferUpdate();
        await showFeatureConfig(i, feature, autoModService);
        collector.stop();
        return;
      }

      if (i.customId.startsWith('config_max_messages_')) {
        await i.deferUpdate();
        maxMessages = parseInt(i.values[0]);
      } else if (i.customId.startsWith('config_max_lines_')) {
        await i.deferUpdate();
        maxLines = parseInt(i.values[0]);
      } else if (i.customId.startsWith('config_time_span_')) {
        // Show modal for time input
        const modal = new ModalBuilder()
          .setCustomId(`modal_time_span_${i.user.id}`)
          .setTitle('Set Time Span');

        const timeInput = new TextInputBuilder()
          .setCustomId('time_span_input')
          .setLabel('Time Span (e.g., 5s, 10m, 1h)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('5s')
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(timeInput));

        await i.showModal(modal);

        // Wait for modal submit
        const modalSubmit = await i.awaitModalSubmit({ time: 60000 }).catch(() => null);
        if (modalSubmit) {
          const timeValue = modalSubmit.fields.getTextInputValue('time_span_input');
          timeSpanMs = parseTimeToMs(timeValue);
          await modalSubmit.deferUpdate();
        }
      }

      // Save if all values set
      if (maxMessages !== null && maxLines !== null && timeSpanMs !== null) {
        await autoModService.upsertConfig(guildId, feature, {
          maxMessages,
          maxLines,
          timeSpanMs,
          enabled: true,
        });

        const successEmbed = new EmbedBuilder()
          .setColor(EmbedColors.SUCCESS)
          .setDescription(
            `${CustomEmojis.TICK} Anti-spam configuration updated!\n\n` +
            `Max Messages: ${maxMessages}\n` +
            `Max Lines: ${maxLines}\n` +
            `Time Span: ${timeSpanMs / 1000}s`
          );

        await i.editReply({ embeds: [successEmbed], components: [] });

        setTimeout(() => {
          showFeatureConfig(i, feature, autoModService);
        }, 2000);

        collector.stop();
      }
    });
  } else if (feature === 'mass_mention') {
    const maxMentionsSelect = new StringSelectMenuBuilder()
      .setCustomId(`config_max_mentions_${interaction.user.id}`)
      .setPlaceholder('Max mentions')
      .addOptions(
        Array.from({ length: 10 }, (_, i) => ({
          label: `${i + 1} mentions`,
          value: `${i + 1}`,
        }))
      );

    const backButton = new ButtonBuilder()
      .setCustomId(`config_back_${feature}_${interaction.user.id}`)
      .setLabel('Back')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⬅️');

    const embed = new EmbedBuilder()
      .setColor(EmbedColors.INFO)
      .setTitle(`${CustomEmojis.SETTING} Configure Mass Mention`)
      .setDescription('Select maximum mentions allowed per message:');

    await interaction.editReply({
      embeds: [embed],
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(maxMentionsSelect),
        new ActionRowBuilder<ButtonBuilder>().addComponents(backButton)
      ],
    });

    const collector = interaction.message.createMessageComponentCollector({
      filter: (i: any) => i.user.id === interaction.user.id,
      time: 60000,
      max: 1,
    });

    collector.on('collect', async (i: any) => {
      await i.deferUpdate();

      if (i.customId === `config_back_${feature}_${interaction.user.id}`) {
        await showFeatureConfig(i, feature, autoModService);
        return;
      }

      const maxMentions = parseInt(i.values[0]);

      await autoModService.upsertConfig(guildId, feature, {
        maxMentions,
        enabled: true,
      });

      const successEmbed = new EmbedBuilder()
        .setColor(EmbedColors.SUCCESS)
        .setDescription(`${CustomEmojis.TICK} Mass mention limit set to ${maxMentions}!`);

      await i.editReply({ embeds: [successEmbed], components: [] });

      setTimeout(() => {
        showFeatureConfig(i, feature, autoModService);
      }, 2000);
    });
  }
}



async function handlePunishment(interaction: MessageComponentInteraction, feature: string, autoModService: AutoModService) {
  const punishmentSelect = new StringSelectMenuBuilder()
    .setCustomId(`punishment_select_${feature}_${interaction.user.id}`)
    .setPlaceholder('Select punishment type')
    .addOptions([
      { label: 'Timeout', value: 'timeout', description: 'Mute user temporarily', emoji: '⏰' },
      { label: 'Kick', value: 'kick', description: 'Kick from server', emoji: '👢' },
      { label: 'Ban', value: 'ban', description: 'Ban from server', emoji: '🔨' },
    ]);

  const backButton = new ButtonBuilder()
    .setCustomId(`punishment_back_${feature}_${interaction.user.id}`)
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('⬅️');

  const embed = new EmbedBuilder()
    .setColor(EmbedColors.WARNING)
    .setTitle(`${CustomEmojis.CAUTION} Select Punishment`)
    .setDescription('Choose what punishment to apply on violation:');

  await interaction.editReply({
    embeds: [embed],
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(punishmentSelect),
      new ActionRowBuilder<ButtonBuilder>().addComponents(backButton)
    ],
  });

  const collector = interaction.message.createMessageComponentCollector({
    filter: (i: any) => i.user.id === interaction.user.id,
    time: 60000,
    max: 1,
  });

  collector.on('collect', async (i: any) => {
    await i.deferUpdate();

    if (i.customId === `punishment_back_${feature}_${interaction.user.id}`) {
      await showFeatureConfig(i, feature, autoModService);
      return;
    }

    const selectedPunishment = i.values[0];
    await autoModService.upsertConfig(interaction.guild!.id, feature, { punishmentType: selectedPunishment });

    const successEmbed = new EmbedBuilder()
      .setColor(EmbedColors.SUCCESS)
      .setDescription(`${CustomEmojis.TICK} Punishment set to **${selectedPunishment}**`);

    await i.editReply({ embeds: [successEmbed], components: [] });

    setTimeout(() => {
      showFeatureConfig(i, feature, autoModService);
    }, 2000);
  });
}

async function handleWhitelistInfo(interaction: MessageComponentInteraction, feature: string, autoModService: AutoModService) {
  const infoEmbed = new EmbedBuilder()
    .setColor(EmbedColors.INFO)
    .setTitle(`${CustomEmojis.TICK} Whitelist Feature Moved`)
    .setDescription(
      '**The whitelist feature has been moved to slash commands for better functionality!**\n\n' +
      '**Available Commands:**\n' +
      '> `/automod whitelist add` - Add user/role/channel to whitelist\n' +
      '> `/automod whitelist remove` - Remove from whitelist\n' +
      '> `/automod whitelist view` - View all whitelisted entries\n\n' +
      '**Features:**\n' +
      `${CustomEmojis.TICK} Whitelist specific actions\n` +
      `${CustomEmojis.TICK} Global whitelist option\n` +
      `${CustomEmojis.TICK} Support for users, roles, and channels`
    )
    .setFooter({ text: 'Use the button below to return to setup' });

  const backButton = new ButtonBuilder()
    .setCustomId(`whitelist_back_to_setup_${interaction.user.id}`)
    .setLabel('Back to Setup')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('⬅️');

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(backButton);

  await interaction.editReply({ embeds: [infoEmbed], components: [row] });

  // Handle back button
  const backCollector = interaction.message.createMessageComponentCollector({
    filter: (i: any) => i.user.id === interaction.user.id && i.customId === `whitelist_back_to_setup_${interaction.user.id}`,
    max: 1,
  });

  backCollector.on('collect', async (i: any) => {
    await i.deferUpdate();
    await showFeatureConfig(i, feature, autoModService);
  });
}

async function handleToggle(interaction: MessageComponentInteraction, feature: string, autoModService: AutoModService) {
  const config = await autoModService.getConfig(interaction.guild!.id, feature);
  const newStatus = !config?.enabled;

  await autoModService.upsertConfig(interaction.guild!.id, feature, { enabled: newStatus });

  const embed = new EmbedBuilder()
    .setColor(newStatus ? EmbedColors.SUCCESS : EmbedColors.ERROR)
    .setDescription(
      `${newStatus ? CustomEmojis.TICK : CustomEmojis.CROSS} **${feature}** has been ${newStatus ? 'enabled' : 'disabled'}!`
    );

  await interaction.editReply({ embeds: [embed], components: [] });

  setTimeout(() => {
    showFeatureConfig(interaction, feature, autoModService);
  }, 2000);
}

async function handleDisable(interaction: ChatInputCommandInteraction, autoModService: AutoModService) {
  await autoModService.disableAll(interaction.guild!.id);

  const embed = new EmbedBuilder()
    .setColor(EmbedColors.SUCCESS)
    .setDescription(`${CustomEmojis.TICK} All automod features have been disabled!`);

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

function parseTimeToMs(time: string): number {
  const match = time.match(/^(\d+)([smhd])$/);
  if (!match) return 5000;

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 5000;
  }
}
