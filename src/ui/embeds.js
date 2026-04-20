const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { CARD_INFO, CARD_TYPES, GAME_CONFIG } = require('../utils/constants');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '../../assets/cards');

/**
 * Helper: resolve emoji for a card type.
 * If a getEmoji function is provided, use it; otherwise fall back to CARD_INFO.emoji.
 */
function resolveEmoji(cardType, getEmoji) {
  if (getEmoji) return getEmoji(cardType);
  const info = CARD_INFO[cardType];
  return info ? info.emoji : '❓';
}

/**
 * Create the lobby embed showing game info and players
 */
function createLobbyEmbed(game) {
  const playerList = Array.from(game.players.values())
    .map((p, i) => {
      if (game.isComputerPlayer(p.userId)) return `🤖 ${p.username}`;
      return `${i === 0 ? '👑' : '🎮'} ${p.username}`;
    })
    .join('\n');

  const computerNote = game.computerEnabled
    ? '\n\n🤖 **Computer player enabled** — HALTbot will pick cards randomly.'
    : '';

  return new EmbedBuilder()
    .setTitle('🐾 HALT Go — Lobby')
    .setDescription(
      `**${Array.from(game.players.values())[0].username}** is hosting a game!\n\n` +
      `Click **Join Game** to play!\n` +
      `The host can click **Start Game** when everyone is ready.${computerNote}`
    )
    .addFields(
      {
        name: '👥 Players',
        value: playerList || 'No players yet',
        inline: true,
      },
      {
        name: '📋 Info',
        value: `Players: ${game.players.size}/${GAME_CONFIG.MAX_PLAYERS}\nMin: ${GAME_CONFIG.MIN_PLAYERS} to start\nRounds: ${GAME_CONFIG.TOTAL_ROUNDS}`,
        inline: true,
      }
    )
    .setColor(0xFFB6C1)
    .setFooter({ text: 'Helping All Little Things • HALT Go' })
    .setTimestamp();
}

/**
 * Create the round start announcement embed
 */
function createRoundStartEmbed(round, totalRounds) {
  return new EmbedBuilder()
    .setTitle(`🎯 Round ${round} of ${totalRounds}`)
    .setDescription(
      `A new round begins! You'll draft **${GAME_CONFIG.PHASES_PER_ROUND} cards** over ${GAME_CONFIG.PHASES_PER_ROUND} phases.\n\n` +
      `Each phase, you'll receive cards to choose from.\n` +
      `Check your DMs for your card choices!`
    )
    .setColor(0x87CEEB)
    .setFooter({ text: 'HALT Go • Cards will appear in your DMs' });
}

/**
 * Create the phase announcement embed for the channel
 */
function createPhaseAnnouncementEmbed(round, phase, totalPhases) {
  const cardsShown = 8 - (phase - 1);
  return new EmbedBuilder()
    .setTitle(`📦 Phase ${phase} of ${totalPhases}`)
    .setDescription(
      `**Round ${round}** — Phase ${phase}\n\n` +
      `Each player receives **${cardsShown} cards** to choose from.\n` +
      `Check your DMs and pick a card!\n\n` +
      `⏱️ You have **${GAME_CONFIG.PHASE_TIMER_SECONDS} seconds** to choose.`
    )
    .setColor(0xFFD700)
    .setFooter({ text: 'HALT Go • Pick a card in your DMs!' });
}

/**
 * Create the card selection DM embed for a player
 * @param {object} player
 * @param {number} round
 * @param {number} phase
 * @param {Function} [getEmoji] - Optional custom emoji resolver
 */
function createCardSelectionEmbed(player, round, phase, getEmoji) {
  const cardsShown = player.currentChoices.length;

  // Build card list with emojis and descriptions
  const cardList = player.currentChoices.map((cardType, i) => {
    const info = CARD_INFO[cardType];
    const emoji = resolveEmoji(cardType, getEmoji);
    return `**${i + 1}.** ${emoji} **${info.name}** — ${info.description}`;
  }).join('\n');

  // Show current collection
  const counts = player.getCardCounts();
  const collection = Object.entries(counts)
    .map(([type, count]) => {
      const info = CARD_INFO[type];
      const emoji = resolveEmoji(type, getEmoji);
      return `${emoji} ${info.name} ×${count}`;
    })
    .join(' | ') || 'Empty';

  return new EmbedBuilder()
    .setTitle(`🃏 Round ${round} — Phase ${phase}`)
    .setDescription(
      `Choose one of these **${cardsShown} cards**:\n\n${cardList}`
    )
    .addFields({
      name: '📦 Your Collection',
      value: collection,
    })
    .setColor(0xE8A0BF)
    .setFooter({ text: `Phase ${phase}/7 • Click a button below to pick!` });
}

/**
 * Create embed showing what card was selected
 * @param {string} cardType
 * @param {object} player
 * @param {number} round
 * @param {number} phase
 * @param {Function} [getEmoji] - Optional custom emoji resolver
 */
function createCardSelectedEmbed(cardType, player, round, phase, getEmoji) {
  const info = CARD_INFO[cardType];
  const emoji = resolveEmoji(cardType, getEmoji);

  const counts = player.getCardCounts();
  const collection = Object.entries(counts)
    .map(([type, count]) => {
      const cInfo = CARD_INFO[type];
      const cEmoji = resolveEmoji(type, getEmoji);
      return `${cEmoji} ${cInfo.name} ×${count}`;
    })
    .join(' | ') || 'Empty';

  return new EmbedBuilder()
    .setTitle(`✅ Card Selected!`)
    .setDescription(
      `You picked: ${emoji} **${info.name}**\n\n` +
      `*${info.description}*\n\n` +
      `Waiting for other players...`
    )
    .addFields({
      name: '📦 Your Collection',
      value: collection,
    })
    .setColor(0x90EE90)
    .setFooter({ text: `Round ${round} • Phase ${phase}/7` });
}

/**
 * Create the Pregnant Hamster resolution embed
 * @param {string[]} newCards
 * @param {Function} [getEmoji] - Optional custom emoji resolver
 */
function createPregnantHamsterEmbed(newCards, getEmoji) {
  const cardNames = newCards.map(c => {
    const info = CARD_INFO[c];
    const emoji = resolveEmoji(c, getEmoji);
    return `${emoji} **${info.name}**`;
  }).join(' and ');

  return new EmbedBuilder()
    .setTitle('🤰 Pregnant Hamster!')
    .setDescription(
      `Your Pregnant Hamster was swapped for 2 new cards!\n\n` +
      `You received: ${cardNames}`
    )
    .setColor(0xB8E8D0);
}

/**
 * Create the round scoring embed
 * @param {number} round
 * @param {Array} results
 * @param {Function} [getEmoji] - Optional custom emoji resolver
 */
function createRoundScoreEmbed(round, results, getEmoji) {
  const re = (type) => resolveEmoji(type, getEmoji);

  const scoreBoard = results.map((r, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '▫️';
    return `${medal} **${r.username}** — Round: **+${r.roundScore}** | Total: **${r.totalScore}**`;
  }).join('\n');

  // Build detailed breakdown
  const breakdownLines = results.map(r => {
    const parts = [];
    const b = r.breakdown;
    if (b.rats.points > 0) parts.push(`${re(CARD_TYPES.RAT)} Rats: +${b.rats.points}`);
    if (b.guinea_pig.points > 0) parts.push(`${re(CARD_TYPES.GUINEA_PIG)} Guinea Pigs: +${b.guinea_pig.points}${b.guinea_pig.multiplied > 0 ? ' (hay!)' : ''}`);
    if (b.rabbit.points > 0) parts.push(`${re(CARD_TYPES.RABBIT)} Rabbits: +${b.rabbit.points}${b.rabbit.multiplied > 0 ? ' (hay!)' : ''}`);
    if (b.chinchilla.points > 0) parts.push(`${re(CARD_TYPES.CHINCHILLA)} Chinchillas: +${b.chinchilla.points}${b.chinchilla.multiplied > 0 ? ' (hay!)' : ''}`);
    if (b.degus.points > 0) parts.push(`${re(CARD_TYPES.DEGUS)} Degu: +${b.degus.points}`);
    if (b.gerbils.points > 0) parts.push(`${re(CARD_TYPES.GERBIL)} Gerbils: +${b.gerbils.points}`);
    return `**${r.username}**: ${parts.join(', ') || 'No scoring cards'}`;
  }).join('\n');

  return new EmbedBuilder()
    .setTitle(`📊 Round ${round} Results`)
    .setDescription(scoreBoard)
    .addFields({
      name: '📝 Breakdown',
      value: breakdownLines,
    })
    .setColor(0x87CEEB)
    .setFooter({ text: round < GAME_CONFIG.TOTAL_ROUNDS ? 'Next round starting soon...' : 'Final scoring coming up...' });
}

/**
 * Create the final game results embed
 * @param {Array} results
 * @param {Function} [getEmoji] - Optional custom emoji resolver
 */
function createGameEndEmbed(results, getEmoji) {
  const catEmoji = resolveEmoji(CARD_TYPES.SANCTUARY_CAT, getEmoji);
  const winner = results[0];

  const scoreBoard = results.map((r, i) => {
    const medal = i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : '▫️';
    const catInfo = r.catBonus !== 0
      ? ` (${catEmoji} ${r.catBonus > 0 ? '+' : ''}${r.catBonus})`
      : '';
    return `${medal} **${r.username}** — **${r.totalScore} points**${catInfo}`;
  }).join('\n');

  // Round-by-round breakdown
  const roundBreakdown = results.map(r => {
    const rounds = r.roundScores.map((rs, i) => `R${i + 1}: ${rs.score}`).join(' | ');
    const catStr = r.catBonus !== 0 ? ` | ${catEmoji}: ${r.catBonus > 0 ? '+' : ''}${r.catBonus}` : '';
    return `**${r.username}**: ${rounds}${catStr}`;
  }).join('\n');

  return new EmbedBuilder()
    .setTitle(`🏆 Game Over!`)
    .setDescription(
      `**${winner.username}** wins with **${winner.totalScore} points**! 🎉\n\n` +
      scoreBoard
    )
    .addFields(
      {
        name: '📊 Round Breakdown',
        value: roundBreakdown,
      },
      {
        name: `${catEmoji} Sanctuary Cats`,
        value: results.map(r =>
          `**${r.username}**: ${r.sanctuaryCats} cats (${r.catBonus > 0 ? '+' : ''}${r.catBonus} pts)`
        ).join('\n'),
      }
    )
    .setColor(0xFFD700)
    .setFooter({ text: 'Helping All Little Things • HALT Go • Thanks for playing!' })
    .setTimestamp();
}

/**
 * Create a waiting status embed
 */
function createWaitingEmbed(waitingPlayers) {
  return new EmbedBuilder()
    .setTitle('⏳ Waiting for players...')
    .setDescription(
      `Still waiting on: ${waitingPlayers.join(', ')}`
    )
    .setColor(0xFFA500);
}

/**
 * Create help/rules embed
 * @param {Function} [getEmoji] - Optional custom emoji resolver
 */
function createHelpEmbed(getEmoji) {
  const re = (type) => resolveEmoji(type, getEmoji);

  return new EmbedBuilder()
    .setTitle('🐾 HALT Go — How to Play')
    .setDescription(
      `**HALT Go** is a simultaneous card drafting game where you collect adorable rescue animals!\n\n` +
      `**Setup:** Use \`/game\` to create a lobby, then others join. Host starts when ready.\n\n` +
      `**Gameplay:** Over 3 rounds of 7 phases each, you'll pick cards from shrinking selections sent to your DMs. All players pick at the same time!`
    )
    .addFields(
      {
        name: `${re(CARD_TYPES.RAT)} Rats — Scaling Set`,
        value: '1=1, 2=3, 3=6, 4=10, 5+=15 pts',
        inline: true,
      },
      {
        name: `${re(CARD_TYPES.GERBIL)} Gerbils — Majority`,
        value: 'Most=+6, 2nd=+3 pts',
        inline: true,
      },
      {
        name: `${re(CARD_TYPES.PREGNANT_HAMSTER)} Pregnant Hamster`,
        value: 'Swap for 2 random cards!',
        inline: true,
      },
      {
        name: `${re(CARD_TYPES.HAY)} Hay — Multiplier`,
        value: 'Triples next Guinea Pig, Rabbit, or Chinchilla',
        inline: true,
      },
      {
        name: `${re(CARD_TYPES.GUINEA_PIG)} Guinea Pig`,
        value: '3 points each',
        inline: true,
      },
      {
        name: `${re(CARD_TYPES.RABBIT)} Rabbit`,
        value: '2 points each',
        inline: true,
      },
      {
        name: `${re(CARD_TYPES.CHINCHILLA)} Chinchilla`,
        value: '1 point each',
        inline: true,
      },
      {
        name: `${re(CARD_TYPES.DEGUS)} Degu — Set Bonus`,
        value: '3 Degu = 10 pts, else 0',
        inline: true,
      },
      {
        name: `${re(CARD_TYPES.SANCTUARY_CAT)} Sanctuary Cat`,
        value: 'End-game: Most=+6, Least=-6',
        inline: true,
      }
    )
    .setColor(0xFFB6C1)
    .setFooter({ text: 'Helping All Little Things • HALT Go' });
}

module.exports = {
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
};
