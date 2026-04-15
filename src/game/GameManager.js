const Game = require('./Game');

class GameManager {
  constructor() {
    // Map of channelId -> Game
    this.games = new Map();
    // Map of userId -> channelId (track which game a player is in)
    this.playerGames = new Map();
  }

  /**
   * Create a new game in a channel
   * @param {string} channelId
   * @param {string} hostId
   * @param {string} hostUsername
   * @returns {{ success: boolean, message: string, game?: Game }}
   */
  createGame(channelId, hostId, hostUsername) {
    if (this.games.has(channelId)) {
      return { success: false, message: 'A game is already running in this channel!' };
    }
    if (this.playerGames.has(hostId)) {
      return { success: false, message: 'You are already in a game in another channel!' };
    }

    const game = new Game(channelId, hostId, hostUsername);
    this.games.set(channelId, game);
    this.playerGames.set(hostId, channelId);

    game.startLobbyTimer();

    // Clean up when game ends
    game.on('gameEnd', () => {
      setTimeout(() => this.removeGame(channelId), 30000); // Clean up after 30s
    });
    game.on('lobbyTimeout', () => {
      this.removeGame(channelId);
    });

    return { success: true, message: 'Game created!', game };
  }

  /**
   * Join an existing game
   * @param {string} channelId
   * @param {string} userId
   * @param {string} username
   * @returns {{ success: boolean, message: string, game?: Game }}
   */
  joinGame(channelId, userId, username) {
    const game = this.games.get(channelId);
    if (!game) {
      return { success: false, message: 'No game found in this channel!' };
    }
    if (this.playerGames.has(userId)) {
      const existingChannel = this.playerGames.get(userId);
      if (existingChannel === channelId) {
        return { success: false, message: 'You have already joined this game!' };
      }
      return { success: false, message: 'You are already in a game in another channel!' };
    }

    const result = game.addPlayer(userId, username);
    if (result.success) {
      this.playerGames.set(userId, channelId);
    }
    return { ...result, game };
  }

  /**
   * Get the game for a channel
   * @param {string} channelId
   * @returns {Game|null}
   */
  getGame(channelId) {
    return this.games.get(channelId) || null;
  }

  /**
   * Get the game a player is in
   * @param {string} userId
   * @returns {Game|null}
   */
  getPlayerGame(userId) {
    const channelId = this.playerGames.get(userId);
    if (!channelId) return null;
    return this.games.get(channelId) || null;
  }

  /**
   * Remove a game and clean up player tracking
   * @param {string} channelId
   */
  removeGame(channelId) {
    const game = this.games.get(channelId);
    if (!game) return;

    // Remove all player mappings
    for (const userId of game.players.keys()) {
      this.playerGames.delete(userId);
    }

    game.destroy();
    this.games.delete(channelId);
  }

  /**
   * Get count of active games
   * @returns {number}
   */
  getActiveGameCount() {
    return this.games.size;
  }
}

module.exports = GameManager;
