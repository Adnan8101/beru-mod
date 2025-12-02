import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Message,
  EmbedBuilder
} from 'discord.js';
import { SlashCommand, PrefixCommand } from '../../types';
import { DatabaseManager } from '../../utils/DatabaseManager';

const slashCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('leave-test')
    .setDescription('Test the leave message with your account'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild;
    const user = interaction.user;

    if (!guild) {
      await interaction.reply({ content: 'This command can only be used in a server!', ephemeral: true });
      return;
    }

    try {
      const db = DatabaseManager.getInstance();
      const welcomeConfig = await db.getWelcomeConfig(guild.id);

      if (!welcomeConfig || !welcomeConfig.leaveChannelId) {
        await interaction.reply({
          content: '❌ Leave channel not setup! Use `/leave` to set a channel first.',
          ephemeral: true
        });
        return;
      }

      const leaveChannel = await guild.channels.fetch(welcomeConfig.leaveChannelId).catch(() => null);
      if (!leaveChannel || !leaveChannel.isTextBased()) {
        await interaction.reply({
          content: '❌ Leave channel not found or is not a text channel!',
          ephemeral: true
        });
        return;
      }

      // Simulate invite data for the test
      const inviteData = await db.getInviteData(guild.id, user.id);
      let inviterName = 'UnKnown';

      if (inviteData && inviteData.inviterId) {
        const inviter = await guild.members.fetch(inviteData.inviterId).catch(() => null);
        if (inviter) {
          inviterName = inviter.user.username;
        }
      }

      // Check if it was a vanity invite
      const isVanity = inviteData?.isVanity || false;
      const leaveMessage = isVanity
        ? `**${user.username}** left the server. They joined using the **vanity invite**.`
        : `**${user.username}** left the server. They joined using the **${inviterName}** link.`;

      // Send the test leave message
      await leaveChannel.send(leaveMessage);

      await interaction.reply({
        content: `<:tcet_tick:1437995479567962184> Test leave message sent to ${leaveChannel.toString()}!`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Error sending test leave:', error);
      await interaction.reply({
        content: 'An error occurred while sending the test leave message.',
        ephemeral: true
      });
    }
  },
};

const prefixCommand: PrefixCommand = {
  name: 'leave-test',
  aliases: ['leavetest', 'testleave'],
  description: 'Test the leave message with your account',
  usage: 'leave-test',
  example: 'leave-test',

  async execute(message: Message, args: string[]): Promise<void> {
    const guild = message.guild;
    const user = message.author;

    if (!guild) {
      await message.reply('This command can only be used in a server!');
      return;
    }

    try {
      const db = DatabaseManager.getInstance();
      const welcomeConfig = await db.getWelcomeConfig(guild.id);

      if (!welcomeConfig || !welcomeConfig.leaveChannelId) {
        await message.reply('❌ Leave channel not setup! Use `leave #channel` to set a channel first.');
        return;
      }

      const leaveChannel = await guild.channels.fetch(welcomeConfig.leaveChannelId).catch(() => null);
      if (!leaveChannel || !leaveChannel.isTextBased()) {
        await message.reply('❌ Leave channel not found or is not a text channel!');
        return;
      }

      // Simulate invite data for the test
      const inviteData = await db.getInviteData(guild.id, user.id);
      let inviterName = 'UnKnown';

      if (inviteData && inviteData.inviterId) {
        const inviter = await guild.members.fetch(inviteData.inviterId).catch(() => null);
        if (inviter) {
          inviterName = inviter.user.username;
        }
      }

      // Check if it was a vanity invite
      const isVanity = inviteData?.isVanity || false;
      const leaveMessage = isVanity
        ? `**${user.username}** left the server. They joined using the **vanity invite**.`
        : `**${user.username}** left the server. They joined using the **${inviterName}** link.`;

      // Send the test leave message
      await leaveChannel.send(leaveMessage);

      await message.reply(`<:tcet_tick:1437995479567962184> Test leave message sent to ${leaveChannel.toString()}!`);
    } catch (error) {
      console.error('Error sending test leave:', error);
      await message.reply('An error occurred while sending the test leave message.');
    }
  },
};

export const data = slashCommand.data;
export const execute = slashCommand.execute;
export { slashCommand, prefixCommand };
