/**
 * Nuke Command - Delete and recreate a channel with all settings
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  TextChannel,
  VoiceChannel,
  CategoryChannel,
  OverwriteResolvable,
} from 'discord.js';
import { EmbedColors } from '../../types';
import { CustomEmojis } from '../../utils/emoji';

export const data = new SlashCommandBuilder()
  .setName('nuke')
  .setDescription('Delete and recreate this channel (preserves all settings)')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction) {
  const channel = interaction.channel as TextChannel;
  
  if (!channel || !interaction.guild) {
    const errorEmbed = new EmbedBuilder()
      .setColor(EmbedColors.ERROR)
      .setDescription(`${CustomEmojis.CROSS} This command must be used in a server channel.`);
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    return;
  }

  // Check bot permissions
  const botMember = interaction.guild.members.me;
  if (!botMember?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    const errorEmbed = new EmbedBuilder()
      .setColor(EmbedColors.ERROR)
      .setDescription(`${CustomEmojis.CROSS} I need the **Manage Channels** permission to nuke channels.`);
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    return;
  }

  // Create confirmation embed
  const confirmEmbed = new EmbedBuilder()
    .setColor(EmbedColors.WARNING)
    .setTitle(`${CustomEmojis.CAUTION} Channel Nuke Confirmation`)
    .setDescription(
      `This will **delete** and **recreate** ${channel} with the same settings.\n\n` +
      `${CustomEmojis.CAUTION} **Warning:** All messages will be permanently deleted!`
    )
    .setFooter({ text: 'You have 30 seconds to confirm' })
    .setTimestamp();

  // Create buttons
  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`nuke_confirm_${interaction.user.id}`)
        .setLabel('Continue')
        .setStyle(ButtonStyle.Danger)
        .setEmoji(CustomEmojis.TICK),
      new ButtonBuilder()
        .setCustomId(`nuke_cancel_${interaction.user.id}`)
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(CustomEmojis.CROSS)
    );

  const response = await interaction.reply({
    embeds: [confirmEmbed],
    components: [row],
    fetchReply: true,
  });

  // Wait for button interaction
  try {
    const buttonInteraction = await response.awaitMessageComponent({
      filter: i => i.user.id === interaction.user.id && (i.customId.startsWith('nuke_confirm_') || i.customId.startsWith('nuke_cancel_')),
      time: 30000,
    });

    if (buttonInteraction.customId.startsWith('nuke_cancel_')) {
      const cancelEmbed = new EmbedBuilder()
        .setColor(EmbedColors.INFO)
        .setDescription(`${CustomEmojis.CROSS} Channel nuke cancelled.`);
      await buttonInteraction.update({ embeds: [cancelEmbed], components: [] });
      return;
    }

    // User confirmed - proceed with nuke
    const processingEmbed = new EmbedBuilder()
      .setColor(EmbedColors.WARNING)
      .setDescription(`${CustomEmojis.SETTING} Nuking channel in 3 seconds...`);
    await buttonInteraction.update({ embeds: [processingEmbed], components: [] });

    // Wait 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Save channel settings
    const channelData = {
      name: channel.name,
      type: channel.type,
      topic: (channel as TextChannel).topic || undefined,
      nsfw: (channel as TextChannel).nsfw || false,
      rateLimitPerUser: (channel as TextChannel).rateLimitPerUser || 0,
      parent: channel.parent,
      position: channel.position,
      permissionOverwrites: channel.permissionOverwrites.cache.map(overwrite => ({
        id: overwrite.id,
        type: overwrite.type,
        allow: overwrite.allow.bitfield.toString(),
        deny: overwrite.deny.bitfield.toString(),
      })),
    };

    // Delete the channel
    await channel.delete(`Nuked by ${interaction.user.tag}`);

    // Create new channel
    const newChannel = await interaction.guild.channels.create({
      name: channelData.name,
      type: channelData.type,
      topic: channelData.topic,
      nsfw: channelData.nsfw,
      rateLimitPerUser: channelData.rateLimitPerUser,
      parent: channelData.parent,
      position: channelData.position,
      permissionOverwrites: channelData.permissionOverwrites.map(ow => ({
        id: ow.id,
        type: ow.type,
        allow: BigInt(ow.allow),
        deny: BigInt(ow.deny),
      })) as OverwriteResolvable[],
      reason: `Channel nuked by ${interaction.user.tag}`,
    });

    // Send completion message in new channel
    if (newChannel.isTextBased()) {
      const successEmbed = new EmbedBuilder()
        .setColor(EmbedColors.SUCCESS)
        .setTitle(`${CustomEmojis.TICK} Channel Nuked Successfully`)
        .setDescription(`This channel has been recreated by ${interaction.user}.`)
        .setFooter({ text: `Nuked by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      await (newChannel as TextChannel).send({ embeds: [successEmbed] });
    }
  } catch (error: any) {
    if (error.message?.includes('time')) {
      // Timeout
      const timeoutEmbed = new EmbedBuilder()
        .setColor(EmbedColors.ERROR)
        .setDescription(`${CustomEmojis.CROSS} Confirmation timed out. Channel nuke cancelled.`);
      await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
    } else {
      console.error('Nuke error:', error);
      const errorEmbed = new EmbedBuilder()
        .setColor(EmbedColors.ERROR)
        .setDescription(`${CustomEmojis.CROSS} Failed to nuke channel: ${error.message || 'Unknown error'}`);
      
      try {
        await interaction.editReply({ embeds: [errorEmbed], components: [] });
      } catch {
        // Channel might have been deleted
      }
    }
  }
}
