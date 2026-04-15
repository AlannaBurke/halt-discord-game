const { CARD_TYPES, CARD_WEIGHTS } = require('../utils/constants');

class CardGenerator {
  constructor() {
    // Build weighted pool for efficient random selection
    this.weightedPool = [];
    this.totalWeight = 0;

    for (const [cardType, weight] of Object.entries(CARD_WEIGHTS)) {
      this.totalWeight += weight;
      this.weightedPool.push({
        type: cardType,
        cumulativeWeight: this.totalWeight,
      });
    }
  }

  /**
   * Generate a single random card based on weights
   * @returns {string} Card type
   */
  generateCard() {
    const roll = Math.random() * this.totalWeight;
    for (const entry of this.weightedPool) {
      if (roll < entry.cumulativeWeight) {
        return entry.type;
      }
    }
    // Fallback (shouldn't happen)
    return this.weightedPool[this.weightedPool.length - 1].type;
  }

  /**
   * Generate multiple unique-ish cards for a phase selection
   * Cards can repeat since they're randomly generated (not from a deck)
   * @param {number} count - Number of cards to generate
   * @returns {string[]} Array of card types
   */
  generateCards(count) {
    const cards = [];
    for (let i = 0; i < count; i++) {
      cards.push(this.generateCard());
    }
    return cards;
  }

  /**
   * Generate cards for a specific phase
   * Phase 1 = 8 cards, Phase 2 = 7, ..., Phase 7 = 2
   * @param {number} phaseNumber - Current phase (1-7)
   * @returns {string[]} Array of card types
   */
  generatePhaseCards(phaseNumber) {
    const count = 8 - (phaseNumber - 1);
    return this.generateCards(count);
  }
}

module.exports = CardGenerator;
