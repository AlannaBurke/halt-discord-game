const {
  CARD_TYPES,
  RAT_SCORE_TABLE,
  FLAT_POINTS,
  HAY_TARGETS,
} = require('../utils/constants');

class Scoring {
  /**
   * Calculate round score for a single player
   * @param {Player} player - The player to score
   * @param {Player[]} allPlayers - All players (needed for Gerbil majority)
   * @returns {{ total: number, breakdown: Object }} Score and breakdown
   */
  static calculateRoundScore(player, allPlayers) {
    const counts = player.getCardCounts();
    const breakdown = {};
    let total = 0;

    // --- Rats: Scaling set score ---
    const ratCount = counts[CARD_TYPES.RAT] || 0;
    const ratScore = RAT_SCORE_TABLE[Math.min(ratCount, 5)];
    breakdown.rats = { count: ratCount, points: ratScore };
    total += ratScore;

    // --- Flat value cards (Guinea Pig, Rabbit, Chinchilla) ---
    // Apply Hay multiplier logic
    const hayCount = counts[CARD_TYPES.HAY] || 0;
    let hayMultipliersRemaining = hayCount;

    // Process flat-value cards, applying hay multipliers to highest-value first
    for (const cardType of [CARD_TYPES.GUINEA_PIG, CARD_TYPES.RABBIT, CARD_TYPES.CHINCHILLA]) {
      const count = counts[cardType] || 0;
      const basePoints = FLAT_POINTS[cardType];
      let cardTotal = 0;
      let multiplied = 0;

      for (let i = 0; i < count; i++) {
        if (hayMultipliersRemaining > 0) {
          cardTotal += basePoints * 3;
          hayMultipliersRemaining--;
          multiplied++;
        } else {
          cardTotal += basePoints;
        }
      }

      const cardName = cardType.replace('_', ' ');
      breakdown[cardType] = {
        count,
        basePoints,
        multiplied,
        points: cardTotal,
      };
      total += cardTotal;
    }

    // Track hay usage
    breakdown.hay = {
      count: hayCount,
      used: hayCount - hayMultipliersRemaining,
      points: 0, // Hay itself doesn't score, it multiplies
    };

    // --- Degus: Set of 3 = 10 points ---
    const degusCount = counts[CARD_TYPES.DEGUS] || 0;
    const degusSets = Math.floor(degusCount / 3);
    const degusScore = degusSets * 10;
    breakdown.degus = { count: degusCount, sets: degusSets, points: degusScore };
    total += degusScore;

    // --- Gerbils: Majority bonus ---
    const gerbilCount = counts[CARD_TYPES.GERBIL] || 0;
    const gerbilScore = Scoring.calculateGerbilScore(player, allPlayers);
    breakdown.gerbils = { count: gerbilCount, points: gerbilScore };
    total += gerbilScore;

    // --- Pregnant Hamster: Already resolved during drafting (no end-of-round score) ---
    const pregCount = counts[CARD_TYPES.PREGNANT_HAMSTER] || 0;
    breakdown.pregnant_hamster = { count: pregCount, points: 0 };

    // --- Sanctuary Cats: Tracked but scored only at end of game ---
    const catCount = counts[CARD_TYPES.SANCTUARY_CAT] || 0;
    breakdown.sanctuary_cat = { count: catCount, points: 0, note: 'Scored at end of game' };

    return { total, breakdown };
  }

  /**
   * Calculate Gerbil majority bonus for a player
   * Most gerbils → +6, Second most → +3, ties split (round down)
   * @param {Player} player
   * @param {Player[]} allPlayers
   * @returns {number} Gerbil bonus points
   */
  static calculateGerbilScore(player, allPlayers) {
    const playerCount = player.countCard(CARD_TYPES.GERBIL);

    // Get all gerbil counts
    const allCounts = allPlayers.map(p => ({
      userId: p.userId,
      count: p.countCard(CARD_TYPES.GERBIL),
    }));

    // Sort descending
    const sorted = [...new Set(allCounts.map(p => p.count))].sort((a, b) => b - a);

    if (sorted.length === 0 || sorted[0] === 0) return 0;

    const highestCount = sorted[0];
    const secondCount = sorted.length > 1 ? sorted[1] : 0;

    // Count how many players are tied at each level
    const tiedForFirst = allCounts.filter(p => p.count === highestCount).length;
    const tiedForSecond = secondCount > 0
      ? allCounts.filter(p => p.count === secondCount).length
      : 0;

    if (playerCount === highestCount && highestCount > 0) {
      if (tiedForFirst > 1) {
        // Split first + second place points among tied players
        return Math.floor((6 + 3) / tiedForFirst);
      }
      return 6;
    }

    if (playerCount === secondCount && secondCount > 0) {
      return Math.floor(3 / tiedForSecond);
    }

    return 0;
  }

  /**
   * Calculate end-of-game Sanctuary Cat bonuses
   * Most cats → +6, Least cats → -6, ties split
   * @param {Player[]} allPlayers
   * @returns {Object} Map of userId to cat bonus points
   */
  static calculateSanctuaryCatBonus(allPlayers) {
    const bonuses = {};

    const catCounts = allPlayers.map(p => ({
      userId: p.userId,
      count: p.sanctuaryCats,
    }));

    const counts = catCounts.map(p => p.count);
    const maxCats = Math.max(...counts);
    const minCats = Math.min(...counts);

    // If everyone has the same count, no bonus/penalty
    if (maxCats === minCats) {
      for (const p of allPlayers) {
        bonuses[p.userId] = 0;
      }
      return bonuses;
    }

    const tiedForMost = catCounts.filter(p => p.count === maxCats).length;
    const tiedForLeast = catCounts.filter(p => p.count === minCats).length;

    for (const p of catCounts) {
      if (p.count === maxCats) {
        bonuses[p.userId] = Math.floor(6 / tiedForMost);
      } else if (p.count === minCats) {
        bonuses[p.userId] = -Math.floor(6 / tiedForLeast);
      } else {
        bonuses[p.userId] = 0;
      }
    }

    return bonuses;
  }
}

module.exports = Scoring;
