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
import { EmbedColors } from '../../types';
import { CustomEmojis } from '../../utils/emoji';
import { AutoModService } from '../../services/AutoModService';

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
      .setName('edit')
      .setDescription('View and edit current automod configuration')
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
  } else if (subcommand === 'edit') {
    await handleEdit(interaction, services.autoModService);
  } else if (subcommand === 'disable') {
    await handleDisable(interaction, services.autoModService);
  }
}

async function handleEdit(interaction: ChatInputCommandInteraction, autoModService: AutoModService) {
  const guildId = interaction.guild!.id;

  // Get all configs
  const antiSpamConfig = await autoModService.getConfig(guildId, 'anti_spam');
  const massMentionConfig = await autoModService.getConfig(guildId, 'mass_mention');
  const serverInviteConfig = await autoModService.getConfig(guildId, 'server_invite');
  const antiLinkConfig = await autoModService.getConfig(guildId, 'anti_link');

  const embed = new EmbedBuilder()
    .setColor(EmbedColors.INFO)
    .setTitle(`${CustomEmojis.SETTING} AutoMod Configuration`)
    .setDescription('Current automod settings for this server:')
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
    .setFooter({ text: 'Select a feature to edit or manage global whitelist' });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`automod_edit_feature_${interaction.user.id}`)
    .setPlaceholder('Select a feature to edit')
    .addOptions([
      {
        label: 'Anti-Spam',
        value: 'anti_spam',
        description: 'Edit anti-spam settings',
        emoji: CustomEmojis.CAUTION,
      },
      {
        label: 'Mass Mention',
        value: 'mass_mention',
        description: 'Edit mass mention settings',
        emoji: CustomEmojis.USER,
      },
      {
        label: 'Server Invite',
        value: 'server_invite',
        description: 'Edit server invite blocking',
        emoji: CustomEmojis.CHANNEL,
      },
      {
        label: 'Anti-Link',
        value: 'anti_link',
        description: 'Edit link blocking',
        emoji: CustomEmojis.FILES,
      },
    ]);

  const globalWhitelistButton = new ButtonBuilder()
    .setCustomId(`automod_global_whitelist_${interaction.user.id}`)
    .setLabel('Global Whitelist')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('🌐');

  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(globalWhitelistButton);

  const response = await interaction.reply({
    embeds: [embed],
    components: [selectRow, buttonRow],
    fetchReply: true,
  });

  // Wait for selection
  try {
    const componentInteraction = await response.awaitMessageComponent({
      filter: i => i.user.id === interaction.user.id && (
        i.customId === `automod_edit_feature_${interaction.user.id}` ||
        i.customId === `automod_global_whitelist_${interaction.user.id}`
      ),
      time: 60000,
    });

    if (componentInteraction.customId === `automod_global_whitelist_${interaction.user.id}`) {
      await componentInteraction.deferUpdate();
      await handleGlobalWhitelist(componentInteraction, autoModService);
    } else if (componentInteraction.isStringSelectMenu()) {
      await componentInteraction.deferUpdate();
      const selectedFeature = componentInteraction.values[0];
      await showFeatureConfig(componentInteraction, selectedFeature, autoModService);
    }
  } catch (error) {
    const timeoutEmbed = new EmbedBuilder()
      .setColor(EmbedColors.ERROR)
      .setDescription(`${CustomEmojis.CROSS} Selection timed out.`);
    await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
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
    .setFooter({ text: 'Select a feature to configure or manage global whitelist' });

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

  const globalWhitelistButton = new ButtonBuilder()
    .setCustomId(`automod_global_whitelist_setup_${interaction.user.id}`)
    .setLabel('Global Whitelist')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('🌐');

  const saveButton = new ButtonBuilder()
    .setCustomId(`automod_save_all_${interaction.user.id}`)
    .setLabel('Save All')
    .setStyle(ButtonStyle.Success)
    .setEmoji('💾');

  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(globalWhitelistButton, saveButton);

  const response = await interaction.reply({
    embeds: [embed],
    components: [selectRow, buttonRow],
    fetchReply: true,
  });

  // Wait for selection
  try {
    const componentInteraction = await response.awaitMessageComponent({
      filter: i => i.user.id === interaction.user.id && (
        i.customId === `automod_feature_${interaction.user.id}` ||
        i.customId === `automod_global_whitelist_setup_${interaction.user.id}` ||
        i.customId === `automod_save_all_${interaction.user.id}`
      ),
      time: 60000,
    });

    if (componentInteraction.customId === `automod_save_all_${interaction.user.id}`) {
      await componentInteraction.deferUpdate();
      const saveEmbed = new EmbedBuilder()
        .setColor(EmbedColors.SUCCESS)
        .setDescription(`${CustomEmojis.TICK} All automod configurations have been saved!`);
      await componentInteraction.editReply({ embeds: [saveEmbed], components: [] });
    } else if (componentInteraction.customId === `automod_global_whitelist_setup_${interaction.user.id}`) {
      await componentInteraction.deferUpdate();
      await handleGlobalWhitelist(componentInteraction, autoModService);
    } else if (componentInteraction.isStringSelectMenu()) {
      await componentInteraction.deferUpdate();
      const selectedFeature = componentInteraction.values[0];
      await showFeatureConfig(componentInteraction, selectedFeature, autoModService);
    }
  } catch (error) {
    const timeoutEmbed = new EmbedBuilder()
      .setColor(EmbedColors.ERROR)
      .setDescription(`${CustomEmojis.CROSS} Setup timed out.`);
    await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
  }
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

  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
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
      .setCustomId(`automod_whitelist_${feature}_${interaction.user.id}`)
      .setLabel('Whitelist')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(CustomEmojis.USER),
    new ButtonBuilder()
      .setCustomId(`automod_toggle_${feature}_${interaction.user.id}`)
      .setLabel(config?.enabled ? 'Disable' : 'Enable')
      .setStyle(config?.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
      .setEmoji(config?.enabled ? CustomEmojis.CROSS : CustomEmojis.TICK)
  );

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

  await interaction.editReply({ embeds: [embed], components: [buttons, saveRow] });

  // Handle button clicks
  const collector = interaction.message.createMessageComponentCollector({
    filter: (i: any) => i.user.id === interaction.user.id && i.customId.includes(feature),
    time: 300000, // 5 minutes
  });

  collector.on('collect', async (i: any) => {
    try {
      if (i.customId.startsWith('automod_configure_')) {
        await i.deferUpdate();
        await handleConfigure(i, feature, autoModService);
      } else if (i.customId.startsWith('automod_action_')) {
        await i.deferUpdate();
        await handleActionSelect(i, feature, autoModService);
      } else if (i.customId.startsWith('automod_whitelist_')) {
        await i.deferUpdate();
        await handleWhitelist(i, feature, autoModService);
      } else if (i.customId.startsWith('automod_punishment_')) {
        await i.deferUpdate();
        await handlePunishment(i, feature, autoModService);
      } else if (i.customId.startsWith('automod_toggle_')) {
        await i.deferUpdate();
        await handleToggle(i, feature, autoModService);
      } else if (i.customId.startsWith('automod_save_feature_')) {
        await i.deferUpdate();
        const saveEmbed = new EmbedBuilder()
          .setColor(EmbedColors.SUCCESS)
          .setDescription(`${CustomEmojis.TICK} Configuration for **${feature}** has been saved!`);
        await i.editReply({ embeds: [saveEmbed], components: [] });
        setTimeout(() => {
          showFeatureConfig(i, feature, autoModService);
        }, 2000);
      } else if (i.customId === `automod_back_home_${interaction.user.id}`) {
        await i.deferUpdate();
        await handleEdit(i as any, autoModService);
        collector.stop();
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

async function handleWhitelist(interaction: MessageComponentInteraction, feature: string, autoModService: AutoModService) {
  const guildId = interaction.guild!.id;

  // Get current whitelist
  const whitelists = await autoModService.getWhitelists(guildId, feature);

  const embed = new EmbedBuilder()
    .setColor(EmbedColors.INFO)
    .setTitle(`${CustomEmojis.USER} Whitelist Configuration`)
    .setDescription('Add users, roles, or channels to whitelist:')
    .addFields(
      { name: 'Whitelisted Users', value: whitelists.filter((w: any) => w.targetType === 'user').length.toString() || '0', inline: true },
      { name: 'Whitelisted Roles', value: whitelists.filter((w: any) => w.targetType === 'role').length.toString() || '0', inline: true },
      { name: 'Whitelisted Channels', value: whitelists.filter((w: any) => w.targetType === 'channel').length.toString() || '0', inline: true },
    );

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`whitelist_add_type_${feature}_${interaction.user.id}`)
    .setPlaceholder('Select what to whitelist')
    .addOptions([
      { label: 'User', value: 'user', emoji: CustomEmojis.USER },
      { label: 'Role', value: 'role', emoji: CustomEmojis.ADMIN },
      { label: 'Channel', value: 'channel', emoji: CustomEmojis.CHANNEL },
    ]);

  const backButton = new ButtonBuilder()
    .setCustomId(`automod_back_feature_${feature}_${interaction.user.id}`)
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('⬅️');

  const viewButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`whitelist_view_users_${feature}_${interaction.user.id}`)
      .setLabel('View Users')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(CustomEmojis.USER),
    new ButtonBuilder()
      .setCustomId(`whitelist_view_roles_${feature}_${interaction.user.id}`)
      .setLabel('View Roles')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(CustomEmojis.ADMIN),
    new ButtonBuilder()
      .setCustomId(`whitelist_view_channels_${feature}_${interaction.user.id}`)
      .setLabel('View Channels')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(CustomEmojis.CHANNEL)
  );

  const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(backButton);

  await interaction.editReply({ 
    embeds: [embed], 
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu), 
      viewButtons, 
      backRow
    ] 
  });

  // Handle interactions
  const collector = interaction.message.createMessageComponentCollector({
    filter: (i: any) => i.user.id === interaction.user.id,
    time: 300000,
  });

  collector.on('collect', async (i: any) => {
    try {
      if (i.customId === `whitelist_add_type_${feature}_${interaction.user.id}`) {
        await i.deferUpdate();
        const targetType = i.values[0];
        await showWhitelistSelector(i, feature, targetType, autoModService);
      } else if (i.customId.startsWith(`whitelist_select_${feature}_`)) {
        await i.deferUpdate();
        
        const targetType = i.customId.includes('_users_') ? 'user' : 
                          i.customId.includes('_roles_') ? 'role' : 'channel';
        
        const selectedIds = targetType === 'user' ? i.users?.map((u: any) => u.id) || [] :
                           targetType === 'role' ? i.roles?.map((r: any) => r.id) || [] :
                           i.channels?.map((c: any) => c.id) || [];
        
        let addedCount = 0;
        
        for (const targetId of selectedIds) {
          try {
            await autoModService.addWhitelist(guildId, feature, targetId, targetType, i.user.id);
            addedCount++;
          } catch (error: any) {
            // Ignore duplicates
          }
        }
        
        if (addedCount > 0) {
          const successEmbed = new EmbedBuilder()
            .setColor(EmbedColors.SUCCESS)
            .setDescription(`${CustomEmojis.TICK} Successfully added ${addedCount} ${targetType}${addedCount > 1 ? 's' : ''} to whitelist!`);
          await i.followUp({ embeds: [successEmbed], ephemeral: true });
        }
        
        await handleWhitelist(i, feature, autoModService);
      } else if (i.customId.startsWith('whitelist_view_')) {
        const viewType = i.customId.includes('users') ? 'user' : i.customId.includes('roles') ? 'role' : 'channel';
        const filtered = whitelists.filter((w: any) => w.targetType === viewType);

        if (filtered.length === 0) {
          const infoEmbed = new EmbedBuilder()
            .setColor(EmbedColors.INFO)
            .setDescription(`ℹ️ No ${viewType}s whitelisted for this feature.`);
          await i.reply({ embeds: [infoEmbed], ephemeral: true });
        } else {
          const listEmbed = new EmbedBuilder()
            .setColor(EmbedColors.INFO)
            .setTitle(`${viewType.charAt(0).toUpperCase() + viewType.slice(1)}s Whitelisted`)
            .setDescription(
              filtered.slice(0, 10).map((w: any) => 
                `• <${viewType === 'user' ? '@' : viewType === 'role' ? '@&' : '#'}${w.targetId}>`
              ).join('\n') || 'None'
            );
          await i.reply({ embeds: [listEmbed], ephemeral: true });
        }
      } else if (i.customId === `automod_back_feature_${feature}_${interaction.user.id}`) {
        await i.deferUpdate();
        await showFeatureConfig(i, feature, autoModService);
        collector.stop();
      }
    } catch (error) {
      console.error('Error in whitelist handler:', error);
    }
  });
}

async function showWhitelistSelector(interaction: MessageComponentInteraction, feature: string, targetType: string, autoModService: AutoModService) {
  const embed = new EmbedBuilder()
    .setColor(EmbedColors.INFO)
    .setTitle(`${CustomEmojis.USER} Add ${targetType.charAt(0).toUpperCase() + targetType.slice(1)}s to Whitelist`)
    .setDescription(`Select ${targetType}s from the dropdown below to whitelist them.`);

  let selectMenu: any;
  
  if (targetType === 'user') {
    selectMenu = new UserSelectMenuBuilder()
      .setCustomId(`whitelist_select_${feature}_users_${interaction.user.id}`)
      .setPlaceholder('Select users to whitelist')
      .setMinValues(1)
      .setMaxValues(10);
  } else if (targetType === 'role') {
    selectMenu = new RoleSelectMenuBuilder()
      .setCustomId(`whitelist_select_${feature}_roles_${interaction.user.id}`)
      .setPlaceholder('Select roles to whitelist')
      .setMinValues(1)
      .setMaxValues(10);
  } else {
    selectMenu = new ChannelSelectMenuBuilder()
      .setCustomId(`whitelist_select_${feature}_channels_${interaction.user.id}`)
      .setPlaceholder('Select channels to whitelist')
      .setMinValues(1)
      .setMaxValues(10);
  }

  const backButton = new ButtonBuilder()
    .setCustomId(`whitelist_back_${feature}_${interaction.user.id}`)
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('⬅️');

  const selectRow = new ActionRowBuilder<any>().addComponents(selectMenu);
  const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(backButton);

  await interaction.editReply({ embeds: [embed], components: [selectRow, backRow] });

  const backCollector = interaction.message.createMessageComponentCollector({
    filter: (i: any) => i.user.id === interaction.user.id && i.customId === `whitelist_back_${feature}_${interaction.user.id}`,
    time: 300000,
    max: 1,
  });

  backCollector.on('collect', async (i: any) => {
    await i.deferUpdate();
    await handleWhitelist(i, feature, autoModService);
  });
}

async function handleGlobalWhitelist(interaction: MessageComponentInteraction, autoModService: AutoModService) {
  const guildId = interaction.guild!.id;

  const allWhitelists: any[] = [];
  for (const feature of ['anti_spam', 'mass_mention', 'server_invite', 'anti_link']) {
    const whitelists = await autoModService.getWhitelists(guildId, feature);
    allWhitelists.push(...whitelists.map((w: any) => ({ ...w, feature })));
  }

  const uniqueUsers = new Set(allWhitelists.filter(w => w.targetType === 'user').map(w => w.targetId));
  const uniqueRoles = new Set(allWhitelists.filter(w => w.targetType === 'role').map(w => w.targetId));
  const uniqueChannels = new Set(allWhitelists.filter(w => w.targetType === 'channel').map(w => w.targetId));

  const embed = new EmbedBuilder()
    .setColor(EmbedColors.INFO)
    .setTitle('🌐 Global Whitelist Management')
    .setDescription('Manage entities that bypass ALL automod features at once.')
    .addFields(
      { name: 'Global Users', value: uniqueUsers.size.toString(), inline: true },
      { name: 'Global Roles', value: uniqueRoles.size.toString(), inline: true },
      { name: 'Global Channels', value: uniqueChannels.size.toString(), inline: true },
    );

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`global_whitelist_add_type_${interaction.user.id}`)
    .setPlaceholder('Select what to whitelist globally')
    .addOptions([
      { label: 'User', value: 'user', emoji: CustomEmojis.USER },
      { label: 'Role', value: 'role', emoji: CustomEmojis.ADMIN },
      { label: 'Channel', value: 'channel', emoji: CustomEmojis.CHANNEL },
    ]);

  const removeMenu = new StringSelectMenuBuilder()
    .setCustomId(`global_whitelist_remove_type_${interaction.user.id}`)
    .setPlaceholder('Remove from global whitelist')
    .addOptions([
      { label: 'Remove User', value: 'user', emoji: '🗑️' },
      { label: 'Remove Role', value: 'role', emoji: '🗑️' },
      { label: 'Remove Channel', value: 'channel', emoji: '🗑️' },
    ]);

  const backButton = new ButtonBuilder()
    .setCustomId(`automod_back_home_${interaction.user.id}`)
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('⬅️');

  const components: any[] = [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu),
  ];

  // Only show remove menu if there are entries
  if (uniqueUsers.size > 0 || uniqueRoles.size > 0 || uniqueChannels.size > 0) {
    components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(removeMenu));
  }

  components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(backButton));

  await interaction.editReply({ 
    embeds: [embed], 
    components 
  });

  const collector = interaction.message.createMessageComponentCollector({
    filter: (i: any) => i.user.id === interaction.user.id,
    time: 300000,
  });

  collector.on('collect', async (i: any) => {
    try {
      if (i.customId === `global_whitelist_add_type_${interaction.user.id}`) {
        await i.deferUpdate();
        await showGlobalWhitelistSelector(i, i.values[0], autoModService, 'add');
      } else if (i.customId === `global_whitelist_remove_type_${interaction.user.id}`) {
        await i.deferUpdate();
        await showGlobalWhitelistSelector(i, i.values[0], autoModService, 'remove');
      } else if (i.customId.startsWith('global_whitelist_select_')) {
        await i.deferUpdate();
        
        const targetType = i.customId.includes('_users_') ? 'user' : 
                          i.customId.includes('_roles_') ? 'role' : 'channel';
        
        const selectedIds = targetType === 'user' ? i.users?.map((u: any) => u.id) || [] :
                           targetType === 'role' ? i.roles?.map((r: any) => r.id) || [] :
                           i.channels?.map((c: any) => c.id) || [];
        
        let addedCount = 0;
        
        for (const targetId of selectedIds) {
          try {
            const features = ['anti_spam', 'mass_mention', 'server_invite', 'anti_link'];
            for (const feature of features) {
              await autoModService.addWhitelist(guildId, feature, targetId, targetType, i.user.id);
            }
            addedCount++;
          } catch (error: any) {
            // Ignore errors
          }
        }
        
        if (addedCount > 0) {
          const successEmbed = new EmbedBuilder()
            .setColor(EmbedColors.SUCCESS)
            .setDescription(`${CustomEmojis.TICK} Successfully added ${addedCount} ${targetType}s to global whitelist!`);
          await i.followUp({ embeds: [successEmbed], ephemeral: true });
        }
        
        await handleGlobalWhitelist(i, autoModService);
      } else if (i.customId.startsWith('global_whitelist_remove_select_')) {
        await i.deferUpdate();
        
        const targetType = i.customId.includes('_users_') ? 'user' : 
                          i.customId.includes('_roles_') ? 'role' : 'channel';
        
        const selectedTargetIds = i.values;
        let removedCount = 0;
        
        for (const targetId of selectedTargetIds) {
          try {
            const features = ['anti_spam', 'mass_mention', 'server_invite', 'anti_link'];
            for (const feature of features) {
              await autoModService.removeWhitelist(guildId, feature, targetId);
            }
            removedCount++;
          } catch (error: any) {
            // Ignore errors
          }
        }
        
        if (removedCount > 0) {
          const successEmbed = new EmbedBuilder()
            .setColor(EmbedColors.SUCCESS)
            .setDescription(`${CustomEmojis.TICK} Successfully removed ${removedCount} ${targetType}(s) from global whitelist!`);
          await i.followUp({ embeds: [successEmbed], ephemeral: true });
        }
        
        await handleGlobalWhitelist(i, autoModService);
      } else if (i.customId === `automod_back_home_${interaction.user.id}`) {
        await i.deferUpdate();
        await handleEdit(i as any, autoModService);
        collector.stop();
      }
    } catch (error) {
      console.error('Error in global whitelist:', error);
    }
  });
  
  collector.on('end', () => {
    interaction.editReply({ components: [] }).catch(() => {});
  });
}

async function showGlobalWhitelistSelector(interaction: MessageComponentInteraction, targetType: string, autoModService: AutoModService, mode: 'add' | 'remove' = 'add') {
  const guildId = interaction.guild!.id;
  
  const embed = new EmbedBuilder()
    .setColor(EmbedColors.INFO)
    .setTitle(`🌐 ${mode === 'add' ? 'Add' : 'Remove'} ${targetType.charAt(0).toUpperCase() + targetType.slice(1)}s Globally`)
    .setDescription(`Select ${targetType}s to ${mode === 'add' ? 'whitelist across' : 'remove from'} ALL automod features.`);

  let selectMenu: any;
  
  if (mode === 'add') {
    if (targetType === 'user') {
      selectMenu = new UserSelectMenuBuilder()
        .setCustomId(`global_whitelist_select_users_${interaction.user.id}`)
        .setPlaceholder('Select users')
        .setMinValues(1)
        .setMaxValues(10);
    } else if (targetType === 'role') {
      selectMenu = new RoleSelectMenuBuilder()
        .setCustomId(`global_whitelist_select_roles_${interaction.user.id}`)
        .setPlaceholder('Select roles')
        .setMinValues(1)
        .setMaxValues(10);
    } else {
      selectMenu = new ChannelSelectMenuBuilder()
        .setCustomId(`global_whitelist_select_channels_${interaction.user.id}`)
        .setPlaceholder('Select channels')
        .setMinValues(1)
        .setMaxValues(10);
    }
  } else {
    // For remove mode, show list of current whitelisted items
    const allWhitelists: any[] = [];
    for (const feature of ['anti_spam', 'mass_mention', 'server_invite', 'anti_link']) {
      const whitelists = await autoModService.getWhitelists(guildId, feature);
      allWhitelists.push(...whitelists.map((w: any) => ({ ...w, feature })));
    }

    const filtered = allWhitelists.filter(w => w.targetType === targetType);
    const uniqueTargets = Array.from(new Set(filtered.map(w => w.targetId)));

    if (uniqueTargets.length === 0) {
      const emptyEmbed = new EmbedBuilder()
        .setColor(EmbedColors.INFO)
        .setDescription(`No ${targetType}s found in global whitelist.`);
      await interaction.editReply({ embeds: [emptyEmbed], components: [] });
      
      setTimeout(() => {
        handleGlobalWhitelist(interaction, autoModService);
      }, 2000);
      return;
    }

    const options = uniqueTargets.slice(0, 25).map(targetId => ({
      label: `${targetType.charAt(0).toUpperCase() + targetType.slice(1)} ${targetId}`,
      description: `Remove from all automod features`,
      value: targetId,
    }));

    selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`global_whitelist_remove_select_${targetType}s_${interaction.user.id}`)
      .setPlaceholder(`Select ${targetType}s to remove`)
      .setMinValues(1)
      .setMaxValues(Math.min(options.length, 25))
      .addOptions(options);
  }

  const backButton = new ButtonBuilder()
    .setCustomId(`global_whitelist_back_${interaction.user.id}`)
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('⬅️');

  await interaction.editReply({ 
    embeds: [embed], 
    components: [
      new ActionRowBuilder<any>().addComponents(selectMenu),
      new ActionRowBuilder<ButtonBuilder>().addComponents(backButton)
    ] 
  });

  const backCollector = interaction.message.createMessageComponentCollector({
    filter: (i: any) => i.user.id === interaction.user.id && i.customId === `global_whitelist_back_${interaction.user.id}`,
    time: 300000,
    max: 1,
  });

  backCollector.on('collect', async (i: any) => {
    await i.deferUpdate();
    await handleGlobalWhitelist(i, autoModService);
  });
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
