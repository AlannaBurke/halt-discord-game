const { EventEmitter } = require('events');
const Player = require('./Player');
const CardGenerator = require('./CardGenerator');
const Scoring = require('./Scoring');
const { CARD_TYPES, GAME_CONFIG } = require('../utils/constants');

/**
 * Game states
 */
const GameState = {
  LOBBY: 'lobby',
  PLAYING: 'playing',
  ROUND_SCORING: 'round_scoring',
  GAME_OVER: 'game_over',
};

class Game extends EventEmitter {
  /**
   * @param {string} channelId - Discord channel where game was started
   * @param {string} hostId - Discord user ID of the host
   * @param {string} hostUsername - Discord username of the host
   */
  constructor(channelId, hostId, hostUsername) {
    super();
    this.channelId = channelId;
    this.hostId = hostId;
    this.state = GameState.LOBBY;
    this.cardGenerator = new CardGenerator();

    // Game progress
    this.currentRound = 0;
    this.currentPhase = 0;

    // Players
    this.players = new Map();
    this.addPlayer(hostId, hostUsername);

    // Computer player
    this.computerEnabled = false;
    this.computerPlayerId = 'computer_player';
    this.computerPlayerName = '🤖 HALTbot';

    // Phase timer
    this.phaseTimer = null;
    this.phaseTimerExpiry = null;

    // Lobby timer
    this.lobbyTimer = null;
  }

  /**
   * Add a player to the game
   * @param {string} userId
   * @param {string} username
   * @returns {{ success: boolean, message: string }}
   */
  addPlayer(userId, username) {
    if (this.state !== GameState.LOBBY) {
      return { success: false, message: 'Game has already started!' };
    }
    if (this.players.has(userId)) {
      return { success: false, message: 'You have already joined this game!' };
    }
    if (this.players.size >= GAME_CONFIG.MAX_PLAYERS) {
      return { success: false, message: `Game is full! (max ${GAME_CONFIG.MAX_PLAYERS} players)` };
    }

    this.players.set(userId, new Player(userId, username));
    return { success: true, message: `${username} joined the game!` };
  }

  /**
   * Start the game (host only)
   * @param {string} userId - Must be the host
   * @returns {{ success: boolean, message: string }}
   */
  /**
   * Toggle the computer player on/off
   * @param {string} userId - Must be the host
   * @returns {{ success: boolean, message: string, enabled: boolean }}
   */
  toggleComputer(userId) {
    if (userId !== this.hostId) {
      return { success: false, message: 'Only the host can toggle the computer player!' };
    }
    if (this.state !== GameState.LOBBY) {
      return { success: false, message: 'Cannot change settings after the game has started!' };
    }

    this.computerEnabled = !this.computerEnabled;

    if (this.computerEnabled) {
      // Add computer player
      if (!this.players.has(this.computerPlayerId)) {
        this.players.set(this.computerPlayerId, new Player(this.computerPlayerId, this.computerPlayerName));
      }
    } else {
      // Remove computer player
      this.players.delete(this.computerPlayerId);
    }

    return { success: true, message: this.computerEnabled ? 'Computer player added!' : 'Computer player removed!', enabled: this.computerEnabled };
  }

  /**
   * Check if a player is the computer
   * @param {string} userId
   * @returns {boolean}
   */
  isComputerPlayer(userId) {
    return userId === this.computerPlayerId;
  }

  startGame(userId) {
    if (userId !== this.hostId) {
      return { success: false, message: 'Only the host can start the game!' };
    }
    if (this.players.size < GAME_CONFIG.MIN_PLAYERS) {
      return { success: false, message: `Need at least ${GAME_CONFIG.MIN_PLAYERS} players to start!` };
    }
    if (this.state !== GameState.LOBBY) {
      return { success: false, message: 'Game has already started!' };
    }

    this.state = GameState.PLAYING;
    this.clearLobbyTimer();
    this.startRound();
    return { success: true, message: 'Game started!' };
  }

  /**
   * Start a new round
   */
  startRound() {
    this.currentRound++;
    this.currentPhase = 0;

    // Reset all players' round cards
    for (const player of this.players.values()) {
      player.roundCards = [];
    }

    this.emit('roundStart', {
      round: this.currentRound,
      totalRounds: GAME_CONFIG.TOTAL_ROUNDS,
    });

    this.startPhase();
  }

  /**
   * Start a new phase within the current round
   */
  startPhase() {
    this.currentPhase++;

    // Generate cards for each player
    for (const player of this.players.values()) {
      const cards = this.cardGenerator.generatePhaseCards(this.currentPhase);
      player.setChoices(cards);
    }

    // Start phase timer
    this.startPhaseTimer();

    this.emit('phaseStart', {
      round: this.currentRound,
      phase: this.currentPhase,
      totalPhases: GAME_CONFIG.PHASES_PER_ROUND,
    });

    // Auto-select for computer player after a short random delay
    if (this.computerEnabled && this.players.has(this.computerPlayerId)) {
      const delay = 1000 + Math.floor(Math.random() * 3000); // 1-4 seconds
      setTimeout(() => {
        const computer = this.players.get(this.computerPlayerId);
        if (computer && !computer.hasSelected && this.state === GameState.PLAYING) {
          const randomIndex = Math.floor(Math.random() * computer.currentChoices.length);
          this.selectCard(this.computerPlayerId, randomIndex);
        }
      }, delay);
    }
  }

  /**
   * Handle a player's card selection
   * @param {string} userId
   * @param {number} cardIndex - Index of selected card
   * @returns {{ success: boolean, message: string, card?: string }}
   */
  selectCard(userId, cardIndex) {
    if (this.state !== GameState.PLAYING) {
      return { success: false, message: 'Game is not in progress!' };
    }

    const player = this.players.get(userId);
    if (!player) {
      return { success: false, message: 'You are not in this game!' };
    }

    if (player.hasSelected) {
      return { success: false, message: 'You have already selected a card this phase!' };
    }

    try {
      const selectedCard = player.selectCard(cardIndex);

      // Handle Pregnant Hamster immediate effect
      if (selectedCard === CARD_TYPES.PREGNANT_HAMSTER) {
        this.resolvePregnantHamster(player);
      }

      this.emit('playerSelected', {
        userId,
        username: player.username,
        phase: this.currentPhase,
      });

      // Check if all players have selected
      if (this.allPlayersSelected()) {
        this.endPhase();
      }

      return { success: true, message: 'Card selected!', card: selectedCard };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Resolve Pregnant Hamster effect: remove it, add 2 random cards
   * @param {Player} player
   */
  resolvePregnantHamster(player) {
    player.removeCard(CARD_TYPES.PREGNANT_HAMSTER);
    const newCards = this.cardGenerator.generateCards(2);
    player.addCards(newCards);

    this.emit('pregnantHamsterResolved', {
      userId: player.userId,
      username: player.username,
      newCards,
    });
  }

  /**
   * Check if all players have made their selection
   * @returns {boolean}
   */
  allPlayersSelected() {
    for (const player of this.players.values()) {
      if (!player.hasSelected) return false;
    }
    return true;
  }

  /**
   * Get list of players who haven't selected yet
   * @returns {string[]} Array of usernames
   */
  getWaitingPlayers() {
    const waiting = [];
    for (const player of this.players.values()) {
      if (!player.hasSelected) {
        waiting.push(player.username);
      }
    }
    return waiting;
  }

  /**
   * End the current phase
   */
  endPhase() {
    this.clearPhaseTimer();

    this.emit('phaseEnd', {
      round: this.currentRound,
      phase: this.currentPhase,
    });

    if (this.currentPhase >= GAME_CONFIG.PHASES_PER_ROUND) {
      this.endRound();
    } else {
      // Short delay before next phase
      setTimeout(() => this.startPhase(), 2000);
    }
  }

  /**
   * End the current round and calculate scores
   */
  endRound() {
    this.state = GameState.ROUND_SCORING;
    const allPlayersArray = Array.from(this.players.values());
    const roundResults = [];

    for (const player of allPlayersArray) {
      const { total, breakdown } = Scoring.calculateRoundScore(player, allPlayersArray);
      player.endRound(total, breakdown);
      roundResults.push({
        userId: player.userId,
        username: player.username,
        roundScore: total,
        totalScore: player.totalScore,
        breakdown,
      });
    }

    // Sort by total score descending
    roundResults.sort((a, b) => b.totalScore - a.totalScore);

    this.emit('roundEnd', {
      round: this.currentRound,
      results: roundResults,
    });

    if (this.currentRound >= GAME_CONFIG.TOTAL_ROUNDS) {
      // Apply end-game bonuses
      setTimeout(() => this.endGame(), 3000);
    } else {
      // Start next round after a delay
      this.state = GameState.PLAYING;
      setTimeout(() => this.startRound(), 5000);
    }
  }

  /**
   * End the game, apply final bonuses, determine winner
   */
  endGame() {
    this.state = GameState.GAME_OVER;
    const allPlayersArray = Array.from(this.players.values());

    // Calculate Sanctuary Cat bonuses
    const catBonuses = Scoring.calculateSanctuaryCatBonus(allPlayersArray);

    // Apply bonuses
    for (const player of allPlayersArray) {
      const bonus = catBonuses[player.userId] || 0;
      player.totalScore += bonus;
    }

    // Build final results
    const finalResults = allPlayersArray.map(p => ({
      userId: p.userId,
      username: p.username,
      totalScore: p.totalScore,
      sanctuaryCats: p.sanctuaryCats,
      catBonus: catBonuses[p.userId] || 0,
      roundScores: p.roundScores,
    }));

    // Sort by total score descending
    finalResults.sort((a, b) => b.totalScore - a.totalScore);

    this.emit('gameEnd', { results: finalResults });
  }

  /**
   * Start the phase timer
   */
  startPhaseTimer() {
    this.clearPhaseTimer();
    this.phaseTimerExpiry = Date.now() + (GAME_CONFIG.PHASE_TIMER_SECONDS * 1000);

    this.phaseTimer = setTimeout(() => {
      // Auto-select for players who haven't picked
      for (const player of this.players.values()) {
        if (!player.hasSelected) {
          player.autoSelect();

          // Handle Pregnant Hamster if auto-selected
          if (player.selectedCard === CARD_TYPES.PREGNANT_HAMSTER) {
            this.resolvePregnantHamster(player);
          }

          this.emit('playerAutoSelected', {
            userId: player.userId,
            username: player.username,
          });
        }
      }
      this.endPhase();
    }, GAME_CONFIG.PHASE_TIMER_SECONDS * 1000);
  }

  /**
   * Clear the phase timer
   */
  clearPhaseTimer() {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
  }

  /**
   * Start the lobby timeout
   */
  startLobbyTimer() {
    this.lobbyTimer = setTimeout(() => {
      if (this.state === GameState.LOBBY) {
        this.state = GameState.GAME_OVER;
        this.emit('lobbyTimeout');
      }
    }, GAME_CONFIG.LOBBY_TIMEOUT_SECONDS * 1000);
  }

  /**
   * Clear the lobby timer
   */
  clearLobbyTimer() {
    if (this.lobbyTimer) {
      clearTimeout(this.lobbyTimer);
      this.lobbyTimer = null;
    }
  }

  /**
   * Get remaining time on phase timer in seconds
   * @returns {number}
   */
  getPhaseTimeRemaining() {
    if (!this.phaseTimerExpiry) return 0;
    return Math.max(0, Math.ceil((this.phaseTimerExpiry - Date.now()) / 1000));
  }

  /**
   * Get game status summary
   * @returns {Object}
   */
  getStatus() {
    return {
      state: this.state,
      channelId: this.channelId,
      hostId: this.hostId,
      playerCount: this.players.size,
      players: Array.from(this.players.values()).map(p => ({
        userId: p.userId,
        username: p.username,
        totalScore: p.totalScore,
      })),
      currentRound: this.currentRound,
      currentPhase: this.currentPhase,
      timeRemaining: this.getPhaseTimeRemaining(),
    };
  }

  /**
   * Clean up timers
   */
  destroy() {
    this.clearPhaseTimer();
    this.clearLobbyTimer();
    this.removeAllListeners();
  }
}

Game.GameState = GameState;

module.exports = Game;
