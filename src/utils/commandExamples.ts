/**
 * Command Usage Examples - Provides help text for prefix commands
 */

export const COMMAND_EXAMPLES: Record<string, string> = {
  ban: '!ban @rex raider',
  unban: '!unban 123456789 unbanned',
  kick: '!kick @rex disrupting',
  mute: '!mute @rex 10m spamming',
  unmute: '!unmute @rex',
  warn: '!warn @rex breaking rules',
  checkwarn: '!checkwarn @rex',
  quarantine: '!quarantine add @rex',
  channel: '!channel lock',
  softban: '!softban @rex 1d raiding',
  nick: '!nick @rex NewName',
  role: '!role @rex @ModRole',
  setprefix: '!setprefix ?',
};

export function getCommandUsage(commandName: string, prefix: string = '!'): string {
  const example = COMMAND_EXAMPLES[commandName];
  if (!example) {
    return `${prefix}${commandName}`;
  }
  return example.replace(/!/g, prefix);
}

export function formatMissingOptionError(optionName: string, commandName: string, prefix: string = '!'): string {
  const usage = getCommandUsage(commandName, prefix);
  
  const optionMessages: Record<string, string> = {
    user: '❌ Please mention a user.',
    user_id: '❌ Please provide a user ID.',
    role: '❌ Please mention a role.',
    channel: '❌ Please mention a channel.',
    duration: '❌ Please provide a duration (e.g., 5m, 1h, 2d).',
    prefix: '❌ Please provide a prefix.',
    nickname: '❌ Please provide a nickname.',
  };
  
  const message = optionMessages[optionName] || `❌ Missing required option: ${optionName}`;
  
  return `${message}\n\n**Example:** \`${usage}\``;
}
