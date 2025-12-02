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
    .setName('test-welcome')
    .setDescription('Test the welcome message with your account'),

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

      if (!welcomeConfig || !welcomeConfig.welcomeChannelId) {
        await interaction.reply({
          content: '❌ Welcome channel not setup! Use `/welcome` to set a channel first.',
          ephemeral: true
        });
        return;
      }

      const welcomeChannel = await guild.channels.fetch(welcomeConfig.welcomeChannelId).catch(() => null);
      if (!welcomeChannel || !welcomeChannel.isTextBased()) {
        await interaction.reply({
          content: '❌ Welcome channel not found or is not a text channel!',
          ephemeral: true
        });
        return;
      }

      // Simulate invite data for the test
      const inviteData = await db.getInviteData(guild.id, user.id);
      let inviterName = 'UnKnown';
      let newInviteCount = 1;

      if (inviteData && inviteData.inviterId) {
        const inviter = await guild.members.fetch(inviteData.inviterId).catch(() => null);
        if (inviter) {
          inviterName = inviter.user.username;
          newInviteCount = (await db.getUserInviteCount(guild.id, inviteData.inviterId)) + 1;
        }
      }

      // Check if it was a vanity invite
      const isVanity = inviteData?.isVanity || false;
      const welcomeMessage = isVanity
        ? `${user.toString()} has joined using the **vanity invite** and now has ${newInviteCount} invites.`
        : `${user.toString()} has been invited by **${inviterName}** and has now ${newInviteCount} invites.`;

      // Send the test welcome message
      await welcomeChannel.send(welcomeMessage);

      await interaction.reply({
        content: `<:tcet_tick:1437995479567962184> Test welcome message sent to ${welcomeChannel.toString()}!`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Error sending test welcome:', error);
      await interaction.reply({
        content: 'An error occurred while sending the test welcome message.',
        ephemeral: true
      });
    }
  },
};

const prefixCommand: PrefixCommand = {
  name: 'test-welcome',
  aliases: ['testwelcome', 'welcometest'],
  description: 'Test the welcome message with your account',
  usage: 'test-welcome',
  example: 'test-welcome',

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

      if (!welcomeConfig || !welcomeConfig.welcomeChannelId) {
        await message.reply('❌ Welcome channel not setup! Use `welcome #channel` to set a channel first.');
        return;
      }

      const welcomeChannel = await guild.channels.fetch(welcomeConfig.welcomeChannelId).catch(() => null);
      if (!welcomeChannel || !welcomeChannel.isTextBased()) {
        await message.reply('❌ Welcome channel not found or is not a text channel!');
        return;
      }

      // Simulate invite data for the test
      const inviteData = await db.getInviteData(guild.id, user.id);
      let inviterName = 'UnKnown';
      let newInviteCount = 1;

      if (inviteData && inviteData.inviterId) {
        const inviter = await guild.members.fetch(inviteData.inviterId).catch(() => null);
        if (inviter) {
          inviterName = inviter.user.username;
          newInviteCount = (await db.getUserInviteCount(guild.id, inviteData.inviterId)) + 1;
        }
      }

      // Check if it was a vanity invite
      const isVanity = inviteData?.isVanity || false;
      const welcomeMessage = isVanity
        ? `${user.toString()} has joined using the **vanity invite** and now has ${newInviteCount} invites.`
        : `${user.toString()} has been invited by **${inviterName}** and has now ${newInviteCount} invites.`;

      // Send the test welcome message
      await welcomeChannel.send(welcomeMessage);

      await message.reply(`<:tcet_tick:1437995479567962184> Test welcome message sent to ${welcomeChannel.toString()}!`);
    } catch (error) {
      console.error('Error sending test welcome:', error);
      await message.reply('An error occurred while sending the test welcome message.');
    }
  },
};

export const data = slashCommand.data;
export const execute = slashCommand.execute;
export { slashCommand, prefixCommand };
