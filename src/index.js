const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  MessageFlags,
  AttachmentBuilder,
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
const {
  generateSelectionImage,
  generateCollectibleGallery,
  cleanupTempFiles,
} = require('./ui/cardRenderer');

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
  try {
    if (interaction.isChatInputCommand()) {
      await handleSlashCommand(interaction);
    } else if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
    }
  } catch (error) {
    console.error('Interaction error:', error);
    try {
      const reply = { content: '❌ Something went wrong!', flags: MessageFlags.Ephemeral };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    } catch (e) {
      console.error('Failed to send error reply:', e.message);
    }
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
      await interaction.reply({ content: 'Unknown command!', flags: MessageFlags.Ephemeral });
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
    return interaction.reply({ content: `❌ ${result.message}`, flags: MessageFlags.Ephemeral });
  }

  const game = result.game;

  // Store the channel ID so event handlers can fetch it fresh
  game._discordChannelId = channelId;

  // Set up game event handlers
  setupGameEvents(game);

  // Send lobby embed
  const embed = createLobbyEmbed(game);
  const buttons = createLobbyButtons(channelId, game.computerEnabled);

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
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

// ============================================================
// /status — Check game status
// ============================================================
async function handleStatusCommand(interaction) {
  const game = gameManager.getGame(interaction.channelId);
  if (!game) {
    return interaction.reply({ content: '❌ No active game in this channel.', flags: MessageFlags.Ephemeral });
  }

  const status = game.getStatus();
  const playerList = status.players
    .map(p => `${p.username}: ${p.totalScore} pts`)
    .join('\n');

  await interaction.reply({
    content: `**Game Status:** ${status.state}\n**Round:** ${status.currentRound} | **Phase:** ${status.currentPhase}\n**Players:**\n${playerList}`,
    flags: MessageFlags.Ephemeral,
  });
}

// ============================================================
// Button Interaction Handler
// ============================================================
async function handleButtonInteraction(interaction) {
  const customId = interaction.customId;

  if (customId.startsWith('join_game_')) {
    await handleJoinButton(interaction);
  } else if (customId.startsWith('toggle_computer_')) {
    await handleToggleComputerButton(interaction);
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
    return interaction.reply({ content: `❌ ${result.message}`, flags: MessageFlags.Ephemeral });
  }

  // Update the lobby embed
  const game = result.game;
  const embed = createLobbyEmbed(game);
  const buttons = createLobbyButtons(channelId, game.computerEnabled);

  await interaction.update({
    embeds: [embed],
    components: [buttons],
  });
}

// ============================================================
// Toggle Computer Player Button
// ============================================================
async function handleToggleComputerButton(interaction) {
  const channelId = interaction.customId.replace('toggle_computer_', '');
  const userId = interaction.user.id;

  const game = gameManager.getGame(channelId);
  if (!game) {
    return interaction.reply({ content: '❌ Game not found!', flags: MessageFlags.Ephemeral });
  }

  const result = game.toggleComputer(userId);

  if (!result.success) {
    return interaction.reply({ content: `❌ ${result.message}`, flags: MessageFlags.Ephemeral });
  }

  // Update the lobby embed with new player list and button state
  const embed = createLobbyEmbed(game);
  const buttons = createLobbyButtons(channelId, game.computerEnabled);

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
    return interaction.reply({ content: '❌ Game not found!', flags: MessageFlags.Ephemeral });
  }

  const result = game.startGame(userId);

  if (!result.success) {
    return interaction.reply({ content: `❌ ${result.message}`, flags: MessageFlags.Ephemeral });
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
    return interaction.reply({ content: '❌ Game not found!', flags: MessageFlags.Ephemeral });
  }

  // Verify phase matches
  if (game.currentPhase !== phase) {
    return interaction.reply({ content: '❌ This phase has already ended!', flags: MessageFlags.Ephemeral });
  }

  const player = game.players.get(userId);
  if (!player) {
    return interaction.reply({ content: '❌ You are not in this game!', flags: MessageFlags.Ephemeral });
  }

  const result = game.selectCard(userId, cardIndex);

  if (!result.success) {
    return interaction.reply({ content: `❌ ${result.message}`, flags: MessageFlags.Ephemeral });
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
    const lastTwo = player.roundCards.slice(-2);
    embeds.push(createPregnantHamsterEmbed(lastTwo));
  }

  await interaction.update({
    embeds,
    components: disabledButtons,
  });
}

// ============================================================
// Helper: Get a channel by ID with proper permissions
// ============================================================
async function getChannel(channelId) {
  try {
    return await client.channels.fetch(channelId);
  } catch (error) {
    console.error(`Failed to fetch channel ${channelId}:`, error.message);
    return null;
  }
}

// ============================================================
// Game Event Handlers
// ============================================================
function setupGameEvents(game) {
  // Round Start
  game.on('roundStart', async ({ round, totalRounds }) => {
    try {
      const channel = await getChannel(game._discordChannelId);
      if (!channel) return;
      const embed = createRoundStartEmbed(round, totalRounds);
      await channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error in roundStart handler:', error.message);
    }
  });

  // Phase Start — send DMs with card images to all players
  game.on('phaseStart', async ({ round, phase, totalPhases }) => {
    try {
      const channel = await getChannel(game._discordChannelId);
      if (!channel) return;

      // Announce in channel
      const channelEmbed = createPhaseAnnouncementEmbed(round, phase, totalPhases);
      await channel.send({ embeds: [channelEmbed] });

      // Send DMs to each player with card images (skip computer player)
      for (const player of game.players.values()) {
        // Skip the computer player — it auto-selects in Game.js
        if (game.isComputerPlayer(player.userId)) continue;

        try {
          // Get or create DM channel
          const user = await client.users.fetch(player.userId);
          if (!player.dmChannel) {
            player.dmChannel = await user.createDM();
          }

          // Generate the card selection image
          const selectionFilename = `sel_${game.channelId}_${player.userId}_r${round}_p${phase}.png`;
          const selectionImagePath = await generateSelectionImage(
            player.currentChoices,
            selectionFilename
          );

          const embed = createCardSelectionEmbed(player, round, phase);
          const buttons = createCardSelectionButtons(
            player.currentChoices,
            game.channelId,
            phase
          );

          // Build message with card image
          const messagePayload = {
            embeds: [embed],
            components: buttons,
          };

          // Attach the card image if generated successfully
          if (selectionImagePath) {
            const attachment = new AttachmentBuilder(selectionImagePath, { name: 'cards.png' });
            embed.setImage('attachment://cards.png');
            messagePayload.files = [attachment];
          }

          await player.dmChannel.send(messagePayload);
        } catch (error) {
          console.error(`Failed to DM ${player.username}:`, error.message);
          try {
            await channel.send({
              content: `⚠️ Could not DM **${player.username}**! Please make sure your DMs are open.`,
            });
          } catch (e) {
            console.error('Failed to send DM warning:', e.message);
          }
        }
      }
    } catch (error) {
      console.error('Error in phaseStart handler:', error.message);
    }
  });

  // Player Selected — update channel with progress
  game.on('playerSelected', async ({ userId, username, phase }) => {
    // Intentionally quiet — no channel spam
  });

  // Player Auto-Selected (timer expired)
  game.on('playerAutoSelected', async ({ userId, username }) => {
    try {
      const channel = await getChannel(game._discordChannelId);
      if (!channel) return;
      await channel.send({
        content: `⏱️ **${username}** ran out of time — a card was randomly selected!`,
      });
    } catch (error) {
      console.error('Error in playerAutoSelected handler:', error.message);
    }
  });

  // Pregnant Hamster resolved
  game.on('pregnantHamsterResolved', async ({ userId, username, newCards }) => {
    try {
      const channel = await getChannel(game._discordChannelId);
      if (!channel) return;
      await channel.send({
        content: `🤰 **${username}** played a Pregnant Hamster and received 2 new cards!`,
      });
    } catch (error) {
      console.error('Error in pregnantHamsterResolved handler:', error.message);
    }
  });

  // Phase End
  game.on('phaseEnd', async ({ round, phase }) => {
    try {
      const channel = await getChannel(game._discordChannelId);
      if (!channel) return;
      await channel.send({
        content: `✅ Phase ${phase} complete! All players have selected.`,
      });
    } catch (error) {
      console.error('Error in phaseEnd handler:', error.message);
    }
  });

  // Round End — show scores
  game.on('roundEnd', async ({ round, results }) => {
    try {
      const channel = await getChannel(game._discordChannelId);
      if (!channel) return;
      const embed = createRoundScoreEmbed(round, results);
      await channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error in roundEnd handler:', error.message);
    }
  });

  // Game End — show final results + collectible galleries
  game.on('gameEnd', async ({ results }) => {
    try {
      const channel = await getChannel(game._discordChannelId);
      if (!channel) return;

      // Send the main results embed
      const embed = createGameEndEmbed(results);
      await channel.send({ embeds: [embed] });

      // Generate and send collectible galleries for each player
      for (const playerResult of results) {
        try {
          const player = game.players.get(playerResult.userId);
          if (!player) continue;

          const galleryFilename = `gallery_${game.channelId}_${player.userId}.png`;
          const galleryPath = await generateCollectibleGallery(
            player.username,
            player.allCards,
            playerResult.totalScore,
            galleryFilename
          );

          if (galleryPath) {
            const attachment = new AttachmentBuilder(galleryPath, { name: `${player.username}_collection.png` });

            // Send to channel
            await channel.send({
              content: `🎴 **${player.username}'s Card Collection** — ${player.allCards.length} cards collected!`,
              files: [attachment],
            });

            // Also DM the player their collection (skip computer player)
            if (!game.isComputerPlayer(player.userId)) {
              try {
                const user = await client.users.fetch(player.userId);
                const dmChannel = player.dmChannel || await user.createDM();
                const dmAttachment = new AttachmentBuilder(galleryPath, { name: `${player.username}_collection.png` });
                await dmChannel.send({
                  content: `🎴 **Your HALT Go Collection!**\nYou collected **${player.allCards.length} cards** and scored **${playerResult.totalScore} points**!\nSave this image as a keepsake! 🐾`,
                  files: [dmAttachment],
                });
              } catch (dmError) {
                console.error(`Failed to DM collection to ${player.username}:`, dmError.message);
              }
            }
          }
        } catch (galleryError) {
          console.error(`Failed to generate gallery for ${playerResult.username}:`, galleryError.message);
        }
      }

      // Clean up temp files after a delay
      setTimeout(() => {
        cleanupTempFiles(`sel_${game.channelId}_`);
        cleanupTempFiles(`gallery_${game.channelId}_`);
      }, 60000);

    } catch (error) {
      console.error('Error in gameEnd handler:', error.message);
    }
  });

  // Lobby Timeout
  game.on('lobbyTimeout', async () => {
    try {
      const channel = await getChannel(game._discordChannelId);
      if (!channel) return;
      await channel.send({
        content: '⏱️ Game lobby timed out! Use `/game` to start a new one.',
      });
    } catch (error) {
      console.error('Error in lobbyTimeout handler:', error.message);
    }
  });
}

// ============================================================
// Login
// ============================================================
client.login(process.env.DISCORD_TOKEN);
