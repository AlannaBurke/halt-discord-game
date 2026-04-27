const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();

const commands = [
  // ---- Game Commands ----
  new SlashCommandBuilder()
    .setName('game')
    .setDescription('Start a new HALT Go game in this channel'),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Learn how to play HALT Go'),

  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Check the status of the current game'),

  // ---- Fundraiser Commands ----
  new SlashCommandBuilder()
    .setName('donate')
    .setDescription('See how to donate to the current fundraiser'),

  new SlashCommandBuilder()
    .setName('fundraiser')
    .setDescription('Check the current fundraiser progress'),

  new SlashCommandBuilder()
    .setName('donated')
    .setDescription('Report a CashApp donation for admin verification')
    .addNumberOption(option =>
      option
        .setName('amount')
        .setDescription('The amount you donated (e.g., 10.00)')
        .setRequired(true)
        .setMinValue(0.01)
    )
    .addBooleanOption(option =>
      option
        .setName('anonymous')
        .setDescription('Hide your name from the announcement? (default: false)')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('patron')
    .setDescription('Report a new Patreon signup for admin verification')
    .addNumberOption(option =>
      option
        .setName('pledge')
        .setDescription('Your monthly pledge amount in dollars (e.g., 5.00)')
        .setRequired(true)
        .setMinValue(1)
    )
    .addNumberOption(option =>
      option
        .setName('extra')
        .setDescription('Additional one-time donation amount (optional)')
        .setRequired(false)
        .setMinValue(0.01)
    )
    .addBooleanOption(option =>
      option
        .setName('anonymous')
        .setDescription('Hide your name from the announcement? (default: false)')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('confirm')
    .setDescription('Confirm a pending donation (admin only)')
    .addStringOption(option =>
      option
        .setName('id')
        .setDescription('The donation ID to confirm')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('deny')
    .setDescription('Deny a pending donation (admin only)')
    .addStringOption(option =>
      option
        .setName('id')
        .setDescription('The donation ID to deny')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('confirmpatron')
    .setDescription('Confirm a pending Patreon pledge (admin only)')
    .addStringOption(option =>
      option
        .setName('id')
        .setDescription('The Patreon pledge ID to confirm')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('denypatron')
    .setDescription('Deny a pending Patreon pledge (admin only)')
    .addStringOption(option =>
      option
        .setName('id')
        .setDescription('The Patreon pledge ID to deny')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('pending')
    .setDescription('View all pending donations and Patreon pledges (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

].map(cmd => cmd.toJSON());

async function deployCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('Started refreshing application (/) commands.');

    if (process.env.GUILD_ID) {
      // Deploy to specific guild (instant, good for testing)
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands },
      );
      console.log(`Successfully registered commands to guild ${process.env.GUILD_ID}`);
    } else {
      // Deploy globally (takes up to 1 hour to propagate)
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands },
      );
      console.log('Successfully registered global commands.');
    }
  } catch (error) {
    console.error('Error deploying commands:', error);
  }
}

deployCommands();
