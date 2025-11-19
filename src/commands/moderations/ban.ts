/**
 * Ban Command - Ban a member from the server
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { EmbedColors } from '../../types';
import { CustomEmojis } from '../../utils/emoji';
import { canModerate, botCanModerate } from '../../utils/moderation';
import { CaseService } from '../../services/CaseService';
import { LoggingService } from '../../services/LoggingService';

export const data = new SlashCommandBuilder()
  .setName('ban')
  .setDescription('Ban a member from the server')
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The user to ban')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('reason')
      .setDescription('Reason for the ban')
      .setRequired(false)
  )
  .addIntegerOption(option =>
    option
      .setName('delete_days')
      .setDescription('Number of days of messages to delete (0-7)')
      .setRequired(false)
      .setMinValue(0)
      .setMaxValue(7)
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  services: { caseService: CaseService; loggingService: LoggingService }
): Promise<void> {
  await interaction.deferReply();

  const user = interaction.options.getUser('user', true);
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const deleteDays = interaction.options.getInteger('delete_days') || 0;
  const guild = interaction.guild!;
  const moderator = interaction.member as any;

  // Try to get member
  let target;
  try {
    target = await guild.members.fetch(user.id);
  } catch {
    // User not in guild, can still ban by ID
    try {
      await guild.bans.create(user.id, { reason, deleteMessageSeconds: deleteDays * 86400 });

      const embed = new EmbedBuilder()
        .setTitle(`${CustomEmojis.TICK} User Banned`)
        .setDescription(`**${user.tag}** has been banned from the server.`)
        .setColor(EmbedColors.SUCCESS)
        .addFields(
          { name: `${CustomEmojis.USER} User`, value: `${user.tag} (${user.id})`, inline: true },
          { name: `${CustomEmojis.STAFF} Moderator`, value: `${interaction.user.tag}`, inline: true },
          { name: 'Reason', value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      // Log case
      await services.caseService.createCase({
        guildId: guild.id,
        targetId: user.id,
        moderatorId: interaction.user.id,
        action: 'ban',
        reason,
      });

      return;
    } catch (error: any) {
      const errorEmbed = new EmbedBuilder()
        .setColor(EmbedColors.ERROR)
        .setDescription(`${CustomEmojis.CROSS} Failed to ban user: ${error.message}`);
      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }
  }

  // Check permissions
  const moderatorCheck = canModerate(moderator, target, PermissionFlagsBits.BanMembers);
  if (!moderatorCheck.allowed) {
    const errorEmbed = new EmbedBuilder()
      .setColor(EmbedColors.ERROR)
      .setDescription(`${CustomEmojis.CROSS} ${moderatorCheck.reason}`);
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  const botCheck = botCanModerate(guild.members.me!, target, PermissionFlagsBits.BanMembers);
  if (!botCheck.allowed) {
    const errorEmbed = new EmbedBuilder()
      .setColor(EmbedColors.ERROR)
      .setDescription(`${CustomEmojis.CROSS} ${botCheck.reason}`);
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  // Perform ban
  try {
    await target.ban({ reason, deleteMessageSeconds: deleteDays * 86400 });

    const embed = new EmbedBuilder()
      .setTitle(`${CustomEmojis.TICK} Member Banned`)
      .setDescription(`**${target.user.tag}** has been banned from the server.`)
      .setColor(EmbedColors.SUCCESS)
      .addFields(
        { name: `${CustomEmojis.USER} User`, value: `${target.user.tag} (${target.id})`, inline: true },
        { name: `${CustomEmojis.STAFF} Moderator`, value: `${interaction.user.tag}`, inline: true },
        { name: 'Reason', value: reason, inline: false },
        { name: `${CustomEmojis.FILES} Messages Deleted`, value: `${deleteDays} day${deleteDays !== 1 ? 's' : ''}`, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Log case
    const modCase = await services.caseService.createCase({
      guildId: guild.id,
      targetId: target.id,
      moderatorId: interaction.user.id,
      action: 'ban',
      reason,
    });

    // Send to logging channel
    await services.loggingService.logModeration(guild.id, {
      action: 'Ban',
      target: target.user,
      moderator: interaction.user,
      reason,
      caseNumber: modCase.caseNumber,
    });
  } catch (error: any) {
    const errorEmbed = new EmbedBuilder()
      .setColor(EmbedColors.ERROR)
      .setDescription(`${CustomEmojis.CROSS} Failed to ban member: ${error.message}`);
    await interaction.editReply({ embeds: [errorEmbed] });
  }
}
