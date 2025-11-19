/**
 * Nick Command - Change a member's nickname
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
import { LoggingService } from '../../services/LoggingService';

export const data = new SlashCommandBuilder()
  .setName('nick')
  .setDescription('Change a member\'s nickname')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The member to change nickname')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('nickname')
      .setDescription('New nickname (leave empty to reset)')
      .setRequired(false)
      .setMaxLength(32)
  )
  .addStringOption(option =>
    option
      .setName('reason')
      .setDescription('Reason for the change')
      .setRequired(false)
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  services: { loggingService: LoggingService }
): Promise<void> {
  await interaction.deferReply();

  const user = interaction.options.getUser('user', true);
  const nickname = interaction.options.getString('nickname');
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const guild = interaction.guild!;
  const moderator = interaction.member as any;

  // Get member
  let target;
  try {
    target = await guild.members.fetch(user.id);
  } catch {
    await interaction.editReply({
      content: '❌ User is not a member of this server.',
    });
    return;
  }

  // Check permissions
  const moderatorCheck = canModerate(moderator, target, PermissionFlagsBits.ManageNicknames);
  if (!moderatorCheck.allowed) {
    await interaction.editReply({
      content: `❌ ${moderatorCheck.reason}`,
    });
    return;
  }

  const botCheck = botCanModerate(guild.members.me!, target, PermissionFlagsBits.ManageNicknames);
  if (!botCheck.allowed) {
    await interaction.editReply({
      content: `❌ ${botCheck.reason}`,
    });
    return;
  }

  // Store old nickname
  const oldNickname = target.nickname || target.user.username;

  // Change nickname
  try {
    await target.setNickname(nickname, reason);

    const embed = new EmbedBuilder()
      .setTitle('<:tcet_tick:1437995479567962184> Nickname Changed')
      .setDescription(`${user.tag}'s nickname has been changed.`)
      .setColor(EmbedColors.SUCCESS)
      .addFields(
        { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Old Nickname', value: oldNickname, inline: true },
        { name: 'New Nickname', value: nickname || user.username, inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Send to logging channel
    await services.loggingService.logModeration(guild.id, {
      action: 'Nickname Change',
      target: user,
      moderator: interaction.user,
      reason: `${oldNickname} → ${nickname || user.username}`,
    });
  } catch (error: any) {
    await interaction.editReply({
      content: `❌ Failed to change nickname: ${error.message}`,
    });
  }
}
