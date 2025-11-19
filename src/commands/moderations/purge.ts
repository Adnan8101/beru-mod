/**
 * Purge Command - Bulk delete messages from a channel
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  TextChannel,
} from 'discord.js';
import { EmbedColors } from '../../types';
import { CustomEmojis } from '../../utils/emoji';

export const data = new SlashCommandBuilder()
  .setName('purge')
  .setDescription('Bulk delete recent messages from this channel')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .addSubcommand(sub =>
    sub
      .setName('all')
      .setDescription('Delete recent messages')
      .addIntegerOption(opt => opt.setName('amount').setDescription('Number of messages (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
  )
  .addSubcommand(sub =>
    sub
      .setName('bots')
      .setDescription('Delete recent messages from bots')
      .addIntegerOption(opt => opt.setName('amount').setDescription('Number of messages (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
  )
  .addSubcommand(sub =>
    sub
      .setName('human')
      .setDescription('Delete recent messages from human users')
      .addIntegerOption(opt => opt.setName('amount').setDescription('Number of messages (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const channel = interaction.channel as TextChannel;
  if (!channel || !channel.permissionsFor) {
    const errorEmbed = new EmbedBuilder()
      .setColor(EmbedColors.ERROR)
      .setDescription(`${CustomEmojis.CROSS} This command must be used in a text channel.`);
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  // Determine mode and amount
  let mode: 'all' | 'bots' | 'human' = 'all';
  let amount: number | null = null;

  try {
    const sub = interaction.options.getSubcommand(false);
    if (sub) {
      mode = sub as any;
      amount = interaction.options.getInteger('amount', true);
    }
  } catch {
    // For prefix: check if first arg is a subcommand or a number
    const firstArg = interaction.options.getString('mode');
    if (firstArg === 'bots' || firstArg === 'human') {
      mode = firstArg;
      amount = interaction.options.getInteger('amount');
    } else {
      // Direct number
      amount = interaction.options.getInteger('amount');
    }
  }

  if (!amount) {
    const errorEmbed = new EmbedBuilder()
      .setColor(EmbedColors.ERROR)
      .setTitle(`${CustomEmojis.CROSS} Invalid Usage`)
      .setDescription('You must specify an amount to purge.')
      .addFields(
        { name: 'Syntax', value: '`/purge <all|bots|human> <amount>`\n`.purge [bots|human] <amount>`', inline: false },
        { name: 'Examples', value: '`/purge all 50`\n`.purge bots 30`\n`.purge 25`', inline: false }
      );
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  amount = Math.max(1, Math.min(100, amount));

  // Permission checks for bot
  const botMember = interaction.guild?.members.me;
  if (!botMember) {
    const errorEmbed = new EmbedBuilder()
      .setColor(EmbedColors.ERROR)
      .setDescription(`${CustomEmojis.CROSS} Unable to determine bot permissions.`);
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  if (!botMember.permissions.has(PermissionFlagsBits.ManageMessages)) {
    const errorEmbed = new EmbedBuilder()
      .setColor(EmbedColors.ERROR)
      .setDescription(`${CustomEmojis.CROSS} I need the **Manage Messages** permission to purge messages.`);
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  try {
    const fetched = await channel.messages.fetch({ limit: amount });

    let toDelete = fetched.filter(m => true);

    if (mode === 'bots') {
      toDelete = toDelete.filter(m => m.author.bot);
    } else if (mode === 'human') {
      toDelete = toDelete.filter(m => !m.author.bot);
    }

    const messagesArray = Array.from(toDelete.values()).slice(0, amount);

    // Bulk delete - Discord ignores messages older than 14 days when using bulkDelete
    const bulkDeletable = messagesArray.filter(m => Date.now() - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000);
    const older = messagesArray.filter(m => Date.now() - m.createdTimestamp >= 14 * 24 * 60 * 60 * 1000);

    let deletedCount = 0;

    if (bulkDeletable.length > 0) {
      const res = await channel.bulkDelete(bulkDeletable, true);
      deletedCount += res.size;
    }

    if (older.length > 0) {
      const results = await Promise.allSettled(older.map(m => m.delete()));
      for (const r of results) {
        if (r.status === 'fulfilled') deletedCount++;
      }
    }

    const successEmbed = new EmbedBuilder()
      .setColor(EmbedColors.SUCCESS)
      .setDescription(`${CustomEmojis.TICK} Purged **${deletedCount}** message${deletedCount !== 1 ? 's' : ''} from ${channel}`);

    await interaction.editReply({ embeds: [successEmbed] });
  } catch (error: any) {
    console.error('Purge error:', error);
    const errorEmbed = new EmbedBuilder()
      .setColor(EmbedColors.ERROR)
      .setDescription(`${CustomEmojis.CROSS} Failed to purge messages: ${error.message || 'Unknown error'}`);
    await interaction.editReply({ embeds: [errorEmbed] });
  }
}
