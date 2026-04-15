const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder()
    .setName('game')
    .setDescription('Start a new Rescue Draft game in this channel'),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Learn how to play Rescue Draft'),

  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Check the status of the current game'),
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
