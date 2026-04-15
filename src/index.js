const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
} = require('discord.js');
require('dotenv').config();

const GameManager = require('./game/GameManager');
const { CARD_INFO, CARD_TYPES } = require('./utils/constants');
const {
  createLobbyEmbed,
  createRoundStartEmbed,
  createPhaseAnnouncementEmbed,
  createCardSelectionEmbed,
  createCardSelectedEmbed,
  createPregnantHamsterEmbed,
  createRoundScoreEmbed,
  createGameEndEmbed,
  createWaitingEmbed,
  createHelpEmbed,
} = require('./ui/embeds');
const {
  createLobbyButtons,
  createCardSelectionButtons,
  createDisabledCardButtons,
} = require('./ui/buttons');

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [
    Partials.Channel, // Required for DM interactions
  ],
});

// Game manager instance
const gameManager = new GameManager();

// ============================================================
// Bot Ready
// ============================================================
client.once(Events.ClientReady, (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
  console.log(`📊 Serving ${c.guilds.cache.size} guilds`);
});

// ============================================================
// Slash Command Handler
// ============================================================
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    await handleSlashCommand(interaction);
  } else if (interaction.isButton()) {
    await handleButtonInteraction(interaction);
  }
});

async function handleSlashCommand(interaction) {
  const { commandName } = interaction;

  switch (commandName) {
    case 'game':
      await handleGameCommand(interaction);
      break;
    case 'help':
      await handleHelpCommand(interaction);
      break;
    case 'status':
      await handleStatusCommand(interaction);
      break;
    default:
      await interaction.reply({ content: 'Unknown command!', ephemeral: true });
  }
}

// ============================================================
// /game — Create a new game
// ============================================================
async function handleGameCommand(interaction) {
  const channelId = interaction.channelId;
  const userId = interaction.user.id;
  const username = interaction.user.displayName || interaction.user.username;

  const result = gameManager.createGame(channelId, userId, username);

  if (!result.success) {
    return interaction.reply({ content: `❌ ${result.message}`, ephemeral: true });
  }

  const game = result.game;

  // Set up game event handlers
  setupGameEvents(game, interaction.channel);

  // Send lobby embed
  const embed = createLobbyEmbed(game);
  const buttons = createLobbyButtons(channelId);

  await interaction.reply({
    embeds: [embed],
    components: [buttons],
  });
}

// ============================================================
// /help — Show rules
// ============================================================
async function handleHelpCommand(interaction) {
  const embed = createHelpEmbed();
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// ============================================================
// /status — Check game status
// ============================================================
async function handleStatusCommand(interaction) {
  const game = gameManager.getGame(interaction.channelId);
  if (!game) {
    return interaction.reply({ content: '❌ No active game in this channel.', ephemeral: true });
  }

  const status = game.getStatus();
  const playerList = status.players
    .map(p => `${p.username}: ${p.totalScore} pts`)
    .join('\n');

  await interaction.reply({
    content: `**Game Status:** ${status.state}\n**Round:** ${status.currentRound} | **Phase:** ${status.currentPhase}\n**Players:**\n${playerList}`,
    ephemeral: true,
  });
}

// ============================================================
// Button Interaction Handler
// ============================================================
async function handleButtonInteraction(interaction) {
  const customId = interaction.customId;

  if (customId.startsWith('join_game_')) {
    await handleJoinButton(interaction);
  } else if (customId.startsWith('start_game_')) {
    await handleStartButton(interaction);
  } else if (customId.startsWith('select_card_')) {
    await handleCardSelectButton(interaction);
  }
}

// ============================================================
// Join Game Button
// ============================================================
async function handleJoinButton(interaction) {
  const channelId = interaction.customId.replace('join_game_', '');
  const userId = interaction.user.id;
  const username = interaction.user.displayName || interaction.user.username;

  const result = gameManager.joinGame(channelId, userId, username);

  if (!result.success) {
    return interaction.reply({ content: `❌ ${result.message}`, ephemeral: true });
  }

  // Update the lobby embed
  const game = result.game;
  const embed = createLobbyEmbed(game);
  const buttons = createLobbyButtons(channelId);

  await interaction.update({
    embeds: [embed],
    components: [buttons],
  });
}

// ============================================================
// Start Game Button
// ============================================================
async function handleStartButton(interaction) {
  const channelId = interaction.customId.replace('start_game_', '');
  const userId = interaction.user.id;

  const game = gameManager.getGame(channelId);
  if (!game) {
    return interaction.reply({ content: '❌ Game not found!', ephemeral: true });
  }

  const result = game.startGame(userId);

  if (!result.success) {
    return interaction.reply({ content: `❌ ${result.message}`, ephemeral: true });
  }

  // Disable lobby buttons
  await interaction.update({
    components: [],
  });
}

// ============================================================
// Card Selection Button (from DMs)
// ============================================================
async function handleCardSelectButton(interaction) {
  // Parse: select_card_{channelId}_{phase}_{cardIndex}
  const parts = interaction.customId.split('_');
  const cardIndex = parseInt(parts[parts.length - 1]);
  const phase = parseInt(parts[parts.length - 2]);
  const channelId = parts.slice(2, parts.length - 2).join('_');

  const userId = interaction.user.id;
  const game = gameManager.getGame(channelId);

  if (!game) {
    return interaction.reply({ content: '❌ Game not found!', ephemeral: true });
  }

  // Verify phase matches
  if (game.currentPhase !== phase) {
    return interaction.reply({ content: '❌ This phase has already ended!', ephemeral: true });
  }

  const player = game.players.get(userId);
  if (!player) {
    return interaction.reply({ content: '❌ You are not in this game!', ephemeral: true });
  }

  const result = game.selectCard(userId, cardIndex);

  if (!result.success) {
    return interaction.reply({ content: `❌ ${result.message}`, ephemeral: true });
  }

  // Update the DM with selected card and disabled buttons
  const selectedEmbed = createCardSelectedEmbed(
    result.card,
    player,
    game.currentRound,
    game.currentPhase
  );
  const disabledButtons = createDisabledCardButtons(
    player.currentChoices,
    cardIndex,
    channelId,
    phase
  );

  // If Pregnant Hamster was selected, also show the resolution
  const embeds = [selectedEmbed];
  if (result.card === CARD_TYPES.PREGNANT_HAMSTER) {
    // The new cards were already added by the game engine
    // Find the last 2 cards added (they're the pregnancy result)
    const lastTwo = player.roundCards.slice(-2);
    embeds.push(createPregnantHamsterEmbed(lastTwo));
  }

  await interaction.update({
    embeds,
    components: disabledButtons,
  });
}

// ============================================================
// Game Event Handlers
// ============================================================
function setupGameEvents(game, channel) {
  // Round Start
  game.on('roundStart', async ({ round, totalRounds }) => {
    const embed = createRoundStartEmbed(round, totalRounds);
    await channel.send({ embeds: [embed] });
  });

  // Phase Start — send DMs to all players
  game.on('phaseStart', async ({ round, phase, totalPhases }) => {
    // Announce in channel
    const channelEmbed = createPhaseAnnouncementEmbed(round, phase, totalPhases);
    await channel.send({ embeds: [channelEmbed] });

    // Send DMs to each player
    for (const player of game.players.values()) {
      try {
        // Get or create DM channel
        const user = await client.users.fetch(player.userId);
        if (!player.dmChannel) {
          player.dmChannel = await user.createDM();
        }

        const embed = createCardSelectionEmbed(player, round, phase);
        const buttons = createCardSelectionButtons(
          player.currentChoices,
          game.channelId,
          phase
        );

        await player.dmChannel.send({
          embeds: [embed],
          components: buttons,
        });
      } catch (error) {
        console.error(`Failed to DM ${player.username}:`, error.message);
        // Notify in channel
        await channel.send({
          content: `⚠️ Could not DM **${player.username}**! Please make sure your DMs are open.`,
        });
      }
    }
  });

  // Player Selected — update channel with progress
  game.on('playerSelected', async ({ userId, username, phase }) => {
    const waiting = game.getWaitingPlayers();
    if (waiting.length > 0) {
      // Don't spam — only update periodically
      // Could add a debounce here if needed
    }
  });

  // Player Auto-Selected (timer expired)
  game.on('playerAutoSelected', async ({ userId, username }) => {
    await channel.send({
      content: `⏱️ **${username}** ran out of time — a card was randomly selected!`,
    });
  });

  // Pregnant Hamster resolved
  game.on('pregnantHamsterResolved', async ({ userId, username, newCards }) => {
    // The DM update is handled in the button interaction
    // Just announce in channel
    await channel.send({
      content: `🤰 **${username}** played a Pregnant Hamster and received 2 new cards!`,
    });
  });

  // Phase End
  game.on('phaseEnd', async ({ round, phase }) => {
    await channel.send({
      content: `✅ Phase ${phase} complete! All players have selected.`,
    });
  });

  // Round End — show scores
  game.on('roundEnd', async ({ round, results }) => {
    const embed = createRoundScoreEmbed(round, results);
    await channel.send({ embeds: [embed] });
  });

  // Game End — show final results
  game.on('gameEnd', async ({ results }) => {
    const embed = createGameEndEmbed(results);
    await channel.send({ embeds: [embed] });
  });

  // Lobby Timeout
  game.on('lobbyTimeout', async () => {
    await channel.send({
      content: '⏱️ Game lobby timed out! Use `/game` to start a new one.',
    });
  });
}

// ============================================================
// Login
// ============================================================
client.login(process.env.DISCORD_TOKEN);
