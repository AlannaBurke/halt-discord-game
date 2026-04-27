/**
 * HALT Bot Fundraiser Module
 *
 * Manages donation tracking, goal progress, and persistence.
 * Stores data in a local JSON file for simplicity.
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

const DATA_DIR = path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'fundraiser.json');

// Default configuration
const DEFAULT_CONFIG = {
  enabled: false,
  goalAmount: 500,
  goalLabel: "Hero & Ziggy's Birthday Fundraiser",
  paypalLink: '',
  cashappTag: '',
  announcementChannelId: '',
  currency: 'USD',
  currencySymbol: '$',
};

class Fundraiser extends EventEmitter {
  constructor() {
    super();
    this._ensureDataDir();
    this._data = this._load();
  }

  // ============================================================
  // Persistence
  // ============================================================

  _ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  _load() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const data = JSON.parse(raw);
        // Merge with defaults for any missing fields
        return {
          config: { ...DEFAULT_CONFIG, ...data.config },
          donations: data.donations || [],
          pendingDonations: data.pendingDonations || [],
        };
      }
    } catch (err) {
      console.error('Failed to load fundraiser data:', err.message);
    }

    return {
      config: { ...DEFAULT_CONFIG },
      donations: [],
      pendingDonations: [],
    };
  }

  _save() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this._data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save fundraiser data:', err.message);
    }
  }

  // ============================================================
  // Configuration
  // ============================================================

  get config() {
    return { ...this._data.config };
  }

  get isEnabled() {
    return this._data.config.enabled;
  }

  updateConfig(updates) {
    this._data.config = { ...this._data.config, ...updates };
    this._save();
    return this.config;
  }

  // ============================================================
  // Donations
  // ============================================================

  /**
   * Record a confirmed donation
   * @param {Object} opts
   * @param {string} opts.userId - Discord user ID
   * @param {string} opts.username - Display name
   * @param {number} opts.amount - Donation amount
   * @param {string} opts.method - 'paypal' or 'cashapp'
   * @param {boolean} opts.anonymous - Whether to hide the donor name
   * @param {string} [opts.confirmedBy] - Admin who confirmed (for CashApp)
   * @returns {Object} donation record
   */
  addDonation({ userId, username, amount, method, anonymous = false, confirmedBy = null, paypalCaptureId = null }) {
    const donation = {
      id: this._generateId(),
      userId,
      username,
      amount: parseFloat(amount),
      method,
      anonymous,
      confirmedBy,
      timestamp: new Date().toISOString(),
    };

    // Store PayPal capture ID for deduplication
    if (paypalCaptureId) {
      donation.paypalCaptureId = paypalCaptureId;
    }

    this._data.donations.push(donation);
    this._save();

    this.emit('donation', donation);
    return donation;
  }

  /**
   * Submit a pending CashApp donation for admin verification
   */
  addPendingDonation({ userId, username, amount, anonymous = false, note = '' }) {
    const pending = {
      id: this._generateId(),
      userId,
      username,
      amount: parseFloat(amount),
      method: 'cashapp',
      anonymous,
      note,
      timestamp: new Date().toISOString(),
    };

    this._data.pendingDonations.push(pending);
    this._save();

    this.emit('pendingDonation', pending);
    return pending;
  }

  /**
   * Approve a pending donation (admin action)
   */
  approvePending(pendingId, adminUsername) {
    const idx = this._data.pendingDonations.findIndex(p => p.id === pendingId);
    if (idx === -1) return null;

    const pending = this._data.pendingDonations.splice(idx, 1)[0];
    const donation = this.addDonation({
      userId: pending.userId,
      username: pending.username,
      amount: pending.amount,
      method: 'cashapp',
      anonymous: pending.anonymous,
      confirmedBy: adminUsername,
    });

    return donation;
  }

  /**
   * Deny a pending donation (admin action)
   */
  denyPending(pendingId) {
    const idx = this._data.pendingDonations.findIndex(p => p.id === pendingId);
    if (idx === -1) return null;

    const denied = this._data.pendingDonations.splice(idx, 1)[0];
    this._save();
    return denied;
  }

  /**
   * Get all confirmed donations
   */
  getDonations() {
    return [...this._data.donations];
  }

  /**
   * Get all pending donations
   */
  getPendingDonations() {
    return [...this._data.pendingDonations];
  }

  /**
   * Get the total amount raised
   */
  getTotalRaised() {
    return this._data.donations.reduce((sum, d) => sum + d.amount, 0);
  }

  /**
   * Get the number of unique donors
   */
  getDonorCount() {
    const unique = new Set(this._data.donations.map(d => d.userId));
    return unique.size;
  }

  /**
   * Get progress as a percentage (0-100, can exceed 100)
   */
  getProgress() {
    const goal = this._data.config.goalAmount;
    if (goal <= 0) return 100;
    return (this.getTotalRaised() / goal) * 100;
  }

  /**
   * Get a full status summary
   */
  getStatus() {
    const config = this.config;
    return {
      enabled: config.enabled,
      goalLabel: config.goalLabel,
      goalAmount: config.goalAmount,
      currency: config.currency,
      currencySymbol: config.currencySymbol,
      totalRaised: this.getTotalRaised(),
      progress: this.getProgress(),
      donorCount: this.getDonorCount(),
      donationCount: this._data.donations.length,
      pendingCount: this._data.pendingDonations.length,
      paypalLink: config.paypalLink,
      cashappTag: config.cashappTag,
      announcementChannelId: config.announcementChannelId,
    };
  }

  /**
   * Get recent donations (last N)
   */
  getRecentDonations(count = 5) {
    return this._data.donations.slice(-count).reverse();
  }

  /**
   * Reset all donations (admin action)
   */
  resetDonations() {
    this._data.donations = [];
    this._data.pendingDonations = [];
    this._save();
  }

  // ============================================================
  // Helpers
  // ============================================================

  _generateId() {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}

// Singleton instance
const fundraiser = new Fundraiser();

module.exports = fundraiser;
