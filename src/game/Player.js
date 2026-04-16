class Player {
  /**
   * @param {string} userId - Discord user ID
   * @param {string} username - Discord username
   */
  constructor(userId, username) {
    this.userId = userId;
    this.username = username;

    // Current round's collected cards
    this.roundCards = [];

    // All sanctuary cats collected across all rounds (scored at end)
    this.sanctuaryCats = 0;

    // Total score across all rounds
    this.totalScore = 0;

    // Score breakdown per round for display
    this.roundScores = [];

    // All cards collected across ALL rounds (for collectible gallery)
    this.allCards = [];

    // Current phase selection state
    this.currentChoices = [];    // Cards offered this phase
    this.hasSelected = false;    // Whether player has picked this phase
    this.selectedCard = null;    // What they picked this phase

    // Message tracking for DM updates
    this.lastDMMessageId = null;
    this.dmChannel = null;
  }

  /**
   * Set the cards offered to this player for the current phase
   * @param {string[]} cards - Array of card types
   */
  setChoices(cards) {
    this.currentChoices = cards;
    this.hasSelected = false;
    this.selectedCard = null;
  }

  /**
   * Player selects a card from their choices
   * @param {number} index - Index of the selected card
   * @returns {string} The selected card type
   */
  selectCard(index) {
    if (index < 0 || index >= this.currentChoices.length) {
      throw new Error('Invalid card selection index');
    }
    if (this.hasSelected) {
      throw new Error('Player has already selected a card this phase');
    }

    this.selectedCard = this.currentChoices[index];
    this.hasSelected = true;
    this.roundCards.push(this.selectedCard);
    return this.selectedCard;
  }

  /**
   * Auto-select a random card (for timer expiry)
   * @returns {string} The randomly selected card type
   */
  autoSelect() {
    if (this.hasSelected) return this.selectedCard;
    const randomIndex = Math.floor(Math.random() * this.currentChoices.length);
    return this.selectCard(randomIndex);
  }

  /**
   * Add cards directly to collection (used by Pregnant Hamster effect)
   * @param {string[]} cards - Cards to add
   */
  addCards(cards) {
    this.roundCards.push(...cards);
  }

  /**
   * Remove a specific card from round collection (used by Pregnant Hamster)
   * @param {string} cardType - Card type to remove
   * @returns {boolean} Whether the card was found and removed
   */
  removeCard(cardType) {
    const index = this.roundCards.indexOf(cardType);
    if (index !== -1) {
      this.roundCards.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Count occurrences of a card type in current round
   * @param {string} cardType - Card type to count
   * @returns {number} Count
   */
  countCard(cardType) {
    return this.roundCards.filter(c => c === cardType).length;
  }

  /**
   * Get a summary of all cards in current round
   * @returns {Object} Map of card type to count
   */
  getCardCounts() {
    const counts = {};
    for (const card of this.roundCards) {
      counts[card] = (counts[card] || 0) + 1;
    }
    return counts;
  }

  /**
   * Add round score and reset for next round
   * @param {number} score - Points earned this round
   * @param {Object} breakdown - Score breakdown details
   */
  endRound(score, breakdown) {
    this.totalScore += score;
    this.roundScores.push({ score, breakdown });
    // Track sanctuary cats across rounds
    this.sanctuaryCats += this.countCard('sanctuary_cat');
    // Save all cards for collectible gallery
    this.allCards.push(...this.roundCards);
    // Clear round cards
    this.roundCards = [];
  }

  /**
   * Reset phase selection state
   */
  resetPhase() {
    this.currentChoices = [];
    this.hasSelected = false;
    this.selectedCard = null;
  }
}

module.exports = Player;
