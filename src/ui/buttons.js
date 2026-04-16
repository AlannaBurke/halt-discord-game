const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { CARD_INFO } = require('../utils/constants');

/**
 * Create lobby action buttons (Join + Start + Computer Player toggle)
 * @param {string} channelId - Used as part of custom ID
 * @param {boolean} computerEnabled - Whether the computer player is currently enabled
 */
function createLobbyButtons(channelId, computerEnabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`join_game_${channelId}`)
      .setLabel('🎮 Join Game')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`toggle_computer_${channelId}`)
      .setLabel(computerEnabled ? '🤖 Computer: ON' : '🤖 Computer: OFF')
      .setStyle(computerEnabled ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`start_game_${channelId}`)
      .setLabel('▶️ Start Game')
      .setStyle(ButtonStyle.Success),
  );
}

/**
 * Create card selection buttons for a player's DM
 * @param {string[]} cards - Array of card types
 * @param {string} gameChannelId - Channel ID of the game
 * @param {number} phase - Current phase number
 */
function createCardSelectionButtons(cards, gameChannelId, phase) {
  // Discord allows max 5 buttons per row, so we may need multiple rows
  const rows = [];
  let currentRow = new ActionRowBuilder();
  let buttonsInRow = 0;

  for (let i = 0; i < cards.length; i++) {
    const info = CARD_INFO[cards[i]];
    const button = new ButtonBuilder()
      .setCustomId(`select_card_${gameChannelId}_${phase}_${i}`)
      .setLabel(`${info.emoji} ${info.name}`)
      .setStyle(ButtonStyle.Secondary);

    currentRow.addComponents(button);
    buttonsInRow++;

    if (buttonsInRow >= 5 || i === cards.length - 1) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder();
      buttonsInRow = 0;
    }
  }

  return rows;
}

/**
 * Create disabled card selection buttons (after selection)
 * @param {string[]} cards - Array of card types
 * @param {number} selectedIndex - Index of the selected card
 * @param {string} gameChannelId
 * @param {number} phase
 */
function createDisabledCardButtons(cards, selectedIndex, gameChannelId, phase) {
  const rows = [];
  let currentRow = new ActionRowBuilder();
  let buttonsInRow = 0;

  for (let i = 0; i < cards.length; i++) {
    const info = CARD_INFO[cards[i]];
    const isSelected = i === selectedIndex;
    const button = new ButtonBuilder()
      .setCustomId(`select_card_${gameChannelId}_${phase}_${i}`)
      .setLabel(`${isSelected ? '✅ ' : ''}${info.emoji} ${info.name}`)
      .setStyle(isSelected ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(true);

    currentRow.addComponents(button);
    buttonsInRow++;

    if (buttonsInRow >= 5 || i === cards.length - 1) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder();
      buttonsInRow = 0;
    }
  }

  return rows;
}

module.exports = {
  createLobbyButtons,
  createCardSelectionButtons,
  createDisabledCardButtons,
};
