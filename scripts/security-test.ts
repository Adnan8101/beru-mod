/**
 * Security Test Script
 * Simulates attacks to test Antinuke and Automod features
 * 
 * Usage: npx ts-node scripts/security-test.ts
 */

import { Client, GatewayIntentBits, TextChannel, PermissionFlagsBits, ChannelType } from 'discord.js';
import * as readline from 'readline';

import * as dotenv from 'dotenv';
dotenv.config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query: string): Promise<string> => {
    return new Promise((resolve) => {
        rl.question(query, resolve);
    });
};

async function main() {
    console.log('🛡️  Beru Security Test Script 🛡️');
    console.log('-----------------------------------');

    // Get configuration
    let token = process.env.TEST_BOT_TOKEN;
    if (!token) {
        token = await question('Enter TEST BOT Token (Secondary Bot): ');
    } else {
        console.log('✔ Using TEST_BOT_TOKEN from .env');
    }

    let guildId = process.env.TEST_GUILD_ID;
    if (!guildId) {
        guildId = await question('Enter Target Guild ID: ');
    } else {
        console.log('✔ Using TEST_GUILD_ID from .env');
    }

    token = token?.trim();
    guildId = guildId?.trim();

    if (!token || !guildId) {
        console.error('❌ Token and Guild ID are required.');
        process.exit(1);
    }

    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
        ]
    });

    try {
        console.log('🔄 Connecting to Discord...');
        await client.login(token);
        console.log(`✔ Connected as ${client.user?.tag}`);

        const guild = await client.guilds.fetch(guildId);
        if (!guild) {
            console.error('❌ Guild not found. Make sure the test bot is in the server.');
            process.exit(1);
        }
        console.log(`✔ Target Guild: ${guild.name}`);

        // Main Menu
        while (true) {
            console.log('\nSelect Test Mode:');
            console.log('1. Antinuke Test (Channels, Roles, Bans)');
            console.log('2. Automod Test (Spam, Links, Mentions)');
            console.log('3. Exit');

            const choice = await question('Enter choice (1-3): ');

            switch (choice) {
                case '1':
                    await runAntinukeTest(guild);
                    break;
                case '2':
                    await runAutomodTest(guild);
                    break;
                case '3':
                    console.log('👋 Exiting...');
                    client.destroy();
                    process.exit(0);
                    break;
                default:
                    console.log('❌ Invalid choice.');
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

async function askCount(query: string): Promise<number> {
    const answer = await question(query);
    const count = parseInt(answer);
    return isNaN(count) || count < 1 ? 1 : count;
}

async function runAntinukeTest(guild: any) {
    console.log('\n💥 Starting Antinuke Test...');
    console.log('⚠️  WARNING: This will create/delete channels and roles. Ensure the main bot has higher role hierarchy.');

    const confirm = await question('Type "yes" to proceed: ');
    if (confirm.toLowerCase() !== 'yes') return;

    try {
        // Ask for counts
        const channelCount = await askCount('How many channels to create/delete? (Default: 1): ');
        const roleCount = await askCount('How many roles to create/delete? (Default: 1): ');

        // 1. Channel Create/Delete
        console.log(`\n[1/3] Testing Channel Protection (${channelCount} times)...`);
        const createdChannels = [];

        for (let i = 0; i < channelCount; i++) {
            try {
                const channel = await guild.channels.create({
                    name: `antinuke-test-${i + 1}`,
                    type: ChannelType.GuildText,
                    reason: `Antinuke Test: Channel Create ${i + 1}`
                });
                createdChannels.push(channel);
                console.log(`✔ Created channel "${channel.name}"`);
            } catch (e) {
                console.log(`✖ Failed to create channel ${i + 1}:`, e);
            }
            await new Promise(r => setTimeout(r, 500));
        }

        console.log('Waiting 2s before deletion...');
        await new Promise(r => setTimeout(r, 2000));

        for (const channel of createdChannels) {
            try {
                await channel.delete('Antinuke Test: Channel Delete');
                console.log(`✔ Deleted channel "${channel.name}"`);
            } catch (e) {
                console.log(`✖ Failed to delete ${channel.name}`);
            }
            await new Promise(r => setTimeout(r, 500));
        }

        // 2. Role Create/Delete
        console.log(`\n[2/3] Testing Role Protection (${roleCount} times)...`);
        const createdRoles = [];

        for (let i = 0; i < roleCount; i++) {
            try {
                const role = await guild.roles.create({
                    name: `antinuke-test-role-${i + 1}`,
                    reason: `Antinuke Test: Role Create ${i + 1}`
                });
                createdRoles.push(role);
                console.log(`✔ Created role "${role.name}"`);
            } catch (e) {
                console.log(`✖ Failed to create role ${i + 1}:`, e);
            }
            await new Promise(r => setTimeout(r, 500));
        }

        console.log('Waiting 2s before deletion...');
        await new Promise(r => setTimeout(r, 2000));

        for (const role of createdRoles) {
            try {
                await role.delete('Antinuke Test: Role Delete');
                console.log(`✔ Deleted role "${role.name}"`);
            } catch (e) {
                console.log(`✖ Failed to delete ${role.name}`);
            }
            await new Promise(r => setTimeout(r, 500));
        }

        // 3. Role Update (Dangerous Perms)
        console.log('\n[3/3] Testing Dangerous Permissions (1 time)...');
        const permRole = await guild.roles.create({
            name: 'antinuke-perm-test',
            reason: 'Antinuke Test: Perm Setup'
        });

        await new Promise(r => setTimeout(r, 1000));

        try {
            await permRole.setPermissions([PermissionFlagsBits.ManageChannels], 'Antinuke Test: Giving ManageChannels');
            console.log('✔ Added ManageChannels permission to role');
        } catch (e) {
            console.log('✖ Failed to add ManageChannels perm (Test bot might lack permissions)');
        }

        await new Promise(r => setTimeout(r, 2000));
        await permRole.delete().catch(() => { });

        console.log('\n✅ Antinuke Test Complete. Check bot logs for actions.');

    } catch (error) {
        console.error('❌ Antinuke Test Failed:', error);
    }
}

async function runAutomodTest(guild: any) {
    console.log('\n🤖 Starting Automod Test...');

    const channelId = await question('Enter Channel ID to spam in: ');
    const channel = await guild.channels.fetch(channelId);

    if (!channel || !channel.isTextBased()) {
        console.error('❌ Invalid channel.');
        return;
    }

    try {
        // 1. Spam Test
        const spamCount = await askCount('Enter total spam messages (Default: 6): ');
        const spamDelay = await askCount('Enter delay between messages in ms (Default: 500): ');

        console.log(`\n[1/4] Testing Anti-Spam (Sending ${spamCount} messages with ${spamDelay}ms delay)...`);
        for (let i = 0; i < spamCount; i++) {
            await channel.send(`Spam test message ${i + 1} - ${Date.now()}`);
            await new Promise(r => setTimeout(r, spamDelay));
        }
        console.log('✔ Sent spam messages');

        await new Promise(r => setTimeout(r, 2000));

        // 2. Mass Mention
        console.log('\n[2/4] Testing Mass Mention...');
        const mentions = Array(6).fill(`<@${guild.ownerId}>`).join(' ');
        await channel.send(`Mass mention test: ${mentions}`);
        console.log('✔ Sent mass mention message');

        await new Promise(r => setTimeout(r, 2000));

        // 3. Anti-Link
        console.log('\n[3/4] Testing Anti-Link...');
        await channel.send('Check out this link: https://google.com');
        console.log('✔ Sent external link');

        await new Promise(r => setTimeout(r, 2000));

        // 4. Anti-Invite
        console.log('\n[4/4] Testing Anti-Invite...');
        await channel.send('Join my server: https://discord.gg/example');
        console.log('✔ Sent discord invite');

        console.log('\n✅ Automod Test Complete. Check channel for deletions/warns.');

    } catch (error) {
        console.error('❌ Automod Test Failed:', error);
    }
}

main();
