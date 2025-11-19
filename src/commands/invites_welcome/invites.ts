import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  Message, 
  EmbedBuilder,
  User
} from 'discord.js';
import { SlashCommand, PrefixCommand } from '../../types';
import { DatabaseManager } from '../../utils/DatabaseManager';

const slashCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('invites')
    .setDescription('Check your invite statistics')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to check invites for (optional)')
        .setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({ content: 'This command can only be used in a server!', ephemeral: true });
      return;
    }

    try {
      const db = DatabaseManager.getInstance();
      
      const regularInvites = db.getUserInviteCount(guild.id, targetUser.id);
      const leftInvites = db.getUserLeftCount(guild.id, targetUser.id);
      const fakeInvites = db.getUserFakeCount(guild.id, targetUser.id);
      const bonusInvites = db.getUserBonusInvites(guild.id, targetUser.id);
      const totalInvites = regularInvites + bonusInvites - leftInvites - fakeInvites;

      const embed = new EmbedBuilder()
        .setColor(0x00AE86)
        .setAuthor({
          name: targetUser.username,
          iconURL: targetUser.displayAvatarURL()
        })
        .setDescription(
          `You currently have **${totalInvites}** invites. ` +
          `(${regularInvites} regular, ${leftInvites} left, ${fakeInvites} fake, ${bonusInvites} bonus)`
        )
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: 'Invite Statistics' });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching invite data:', error);
      await interaction.reply({ 
        content: 'An error occurred while fetching invite statistics.', 
        ephemeral: true 
      });
    }
  },
};

const prefixCommand: PrefixCommand = {
  name: 'invites',
  aliases: ['inv', 'invitecount'],
  description: 'Check your invite statistics',
  usage: 'invites [user]',
  example: 'invites @user',

  async execute(message: Message, args: string[]): Promise<void> {
    const guild = message.guild;
    if (!guild) {
      await message.reply('This command can only be used in a server!');
      return;
    }

    let targetUser = message.author;

    if (args.length > 0) {
      const userMention = args[0];
      const userId = userMention.replace(/[<@!>]/g, '');
      
      try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member) {
          targetUser = member.user;
        } else {
          await message.reply('User not found in this server!');
          return;
        }
      } catch (error) {
        await message.reply('Invalid user mentioned!');
        return;
      }
    }

    try {
      const db = DatabaseManager.getInstance();
      
      const regularInvites = db.getUserInviteCount(guild.id, targetUser.id);
      const leftInvites = db.getUserLeftCount(guild.id, targetUser.id);
      const fakeInvites = db.getUserFakeCount(guild.id, targetUser.id);
      const bonusInvites = db.getUserBonusInvites(guild.id, targetUser.id);
      const totalInvites = regularInvites + bonusInvites - leftInvites - fakeInvites;

      const embed = new EmbedBuilder()
        .setColor(0x00AE86)
        .setAuthor({
          name: targetUser.username,
          iconURL: targetUser.displayAvatarURL()
        })
        .setDescription(
          `You currently have **${totalInvites}** invites. ` +
          `(${regularInvites} regular, ${leftInvites} left, ${fakeInvites} fake, ${bonusInvites} bonus)`
        )
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: 'Invite Statistics' });

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching invite data:', error);
      await message.reply('An error occurred while fetching invite statistics.');
    }
  },
};

export const data = slashCommand.data;
export const execute = slashCommand.execute;
export { slashCommand, prefixCommand };
