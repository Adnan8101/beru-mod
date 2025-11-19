/**
 * SetLimit Command - Configure action limits
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { ConfigService } from '../../services/ConfigService';
import { ProtectionAction, EmbedColors } from '../../types';

export const data = new SlashCommandBuilder()
  .setName('setlimit')
  .setDescription('Configure action limits for anti-nuke protection')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(option =>
    option
      .setName('action')
      .setDescription('The action to set limit for')
      .setRequired(true)
      .addChoices(
        { name: 'Banning Members', value: ProtectionAction.BAN_MEMBERS },
        { name: 'Kicking Members', value: ProtectionAction.KICK_MEMBERS },
        { name: 'Deleting Roles', value: ProtectionAction.DELETE_ROLES },
        { name: 'Creating Roles', value: ProtectionAction.CREATE_ROLES },
        { name: 'Deleting Channels', value: ProtectionAction.DELETE_CHANNELS },
        { name: 'Creating Channels', value: ProtectionAction.CREATE_CHANNELS },
        { name: 'Adding Bots', value: ProtectionAction.ADD_BOTS },
        { name: 'Dangerous Permissions', value: ProtectionAction.DANGEROUS_PERMS },
        { name: 'Giving Admin Roles', value: ProtectionAction.GIVE_ADMIN_ROLE },
        { name: 'Pruning Members', value: ProtectionAction.PRUNE_MEMBERS }
      )
  )
  .addIntegerOption(option =>
    option
      .setName('limit')
      .setDescription('Maximum allowed count before triggering punishment')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(100)
  )
  .addIntegerOption(option =>
    option
      .setName('window_seconds')
      .setDescription('Time window in seconds (default: 10)')
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(3600)
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  services: { configService: ConfigService }
): Promise<void> {
  await interaction.deferReply();

  const action = interaction.options.getString('action', true) as ProtectionAction;
  const limit = interaction.options.getInteger('limit', true);
  const windowSeconds = interaction.options.getInteger('window_seconds') ?? 10;
  const windowMs = windowSeconds * 1000;

  const guildId = interaction.guildId!;

  // Validate that anti-nuke is enabled
  const config = await services.configService.getConfig(guildId);
  if (!config?.enabled) {
    await interaction.editReply({
      content: '❌ Anti-Nuke is not enabled. Use `/antinuke enable` first.',
    });
    return;
  }

  // Check if this protection is active
  if (!config.protections.includes(action)) {
    const embed = new EmbedBuilder()
      .setTitle('⚠️ Warning')
      .setDescription(
        `The protection for **${formatActionName(action)}** is not currently enabled.\n\n` +
        `The limit will be saved, but won't take effect until you enable this protection with \`/antinuke enable\`.`
      )
      .setColor(EmbedColors.WARNING);
    
    await interaction.followUp({ embeds: [embed], ephemeral: true });
  }

  // Warn about very short windows
  if (windowSeconds < 5) {
    const embed = new EmbedBuilder()
      .setTitle('⚠️ Short Time Window')
      .setDescription(
        `You're setting a very short time window (${windowSeconds}s). This may cause false positives for legitimate actions.`
      )
      .setColor(EmbedColors.WARNING);
    
    await interaction.followUp({ embeds: [embed], ephemeral: true });
  }

  // Set the limit
  await services.configService.setLimit(guildId, action, limit, windowMs);

  // Create success embed
  const embed = new EmbedBuilder()
    .setTitle('<:tcet_tick:1437995479567962184> Limit Set')
    .setDescription(`Action limit has been configured successfully.`)
    .setColor(EmbedColors.SUCCESS)
    .addFields(
      { name: 'Action', value: formatActionName(action), inline: true },
      { name: 'Limit', value: `${limit} actions`, inline: true },
      { name: 'Window', value: `${windowSeconds} seconds`, inline: true },
      {
        name: 'Effect',
        value: `Users performing more than **${limit}** ${formatActionName(action).toLowerCase()} within **${windowSeconds}** seconds will trigger the configured punishment.`,
        inline: false,
      }
    )
    .setFooter({
      text: `Configured by ${interaction.user.tag} (${interaction.user.id})`,
    })
    .setTimestamp();

  // Check if punishment is configured
  const punishment = await services.configService.getPunishment(guildId, action);
  if (!punishment) {
    embed.addFields({
      name: '⚠️ Next Step',
      value: `Set a punishment for this action using \`/setpunishment ${action}\``,
      inline: false,
    });
  } else {
    embed.addFields({
      name: 'Current Punishment',
      value: `**${punishment.punishment.toUpperCase()}**${
        punishment.durationSeconds ? ` for ${punishment.durationSeconds}s` : ''
      }`,
      inline: false,
    });
  }

  await interaction.editReply({ embeds: [embed] });
}

function formatActionName(action: ProtectionAction): string {
  const names: Record<ProtectionAction, string> = {
    [ProtectionAction.BAN_MEMBERS]: 'Banning Members',
    [ProtectionAction.KICK_MEMBERS]: 'Kicking Members',
    [ProtectionAction.DELETE_ROLES]: 'Deleting Roles',
    [ProtectionAction.CREATE_ROLES]: 'Creating Roles',
    [ProtectionAction.DELETE_CHANNELS]: 'Deleting Channels',
    [ProtectionAction.CREATE_CHANNELS]: 'Creating Channels',
    [ProtectionAction.ADD_BOTS]: 'Adding Bots',
    [ProtectionAction.DANGEROUS_PERMS]: 'Dangerous Permissions',
    [ProtectionAction.GIVE_ADMIN_ROLE]: 'Giving Admin Roles',
    [ProtectionAction.PRUNE_MEMBERS]: 'Pruning Members',
  };
  return names[action] || action;
}
