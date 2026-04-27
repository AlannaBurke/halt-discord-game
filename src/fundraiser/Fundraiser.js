/**
 * HALT Bot Fundraiser Module
 *
 * Manages donation tracking, Patreon pledge tracking, goal progress,
 * and persistence. Stores data in a local JSON file for simplicity.
 *
 * Supports three donation methods:
 *   - PayPal (auto-tracked via webhook, or manual)
 *   - CashApp (self-reported, admin-verified)
 *   - Patreon (self-reported, admin-verified, or auto-tracked via webhook)
 *
 * Tracks two goals simultaneously:
 *   - Dollar goal: total donations raised across all methods
 *   - Patreon pledge goal: number of new Patreon signups
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
  patreonLink: '',
  patreonPledgeGoal: 0,        // 0 = pledge goal disabled
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
        return {
          config: { ...DEFAULT_CONFIG, ...data.config },
          donations: data.donations || [],
          pendingDonations: data.pendingDonations || [],
          patreonPledges: data.patreonPledges || [],
          pendingPatreonPledges: data.pendingPatreonPledges || [],
        };
      }
    } catch (err) {
      console.error('Failed to load fundraiser data:', err.message);
    }

    return {
      config: { ...DEFAULT_CONFIG },
      donations: [],
      pendingDonations: [],
      patreonPledges: [],
      pendingPatreonPledges: [],
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
  // Donations (PayPal, CashApp, Patreon additional)
  // ============================================================

  /**
   * Record a confirmed donation (any method)
   * @param {Object} opts
   * @param {string} opts.userId - Discord user ID or external ID
   * @param {string} opts.username - Display name
   * @param {number} opts.amount - Donation amount
   * @param {string} opts.method - 'paypal', 'cashapp', or 'patreon'
   * @param {boolean} opts.anonymous - Whether to hide the donor name
   * @param {string} [opts.confirmedBy] - Admin who confirmed
   * @param {string} [opts.paypalCaptureId] - PayPal capture ID for dedup
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

    if (paypalCaptureId) {
      donation.paypalCaptureId = paypalCaptureId;
    }

    this._data.donations.push(donation);
    this._save();

    this.emit('donation', donation);
    return donation;
  }

  /**
   * Submit a pending donation for admin verification (CashApp or Patreon additional)
   */
  addPendingDonation({ userId, username, amount, method = 'cashapp', anonymous = false, note = '' }) {
    const pending = {
      id: this._generateId(),
      userId,
      username,
      amount: parseFloat(amount),
      method,
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
      method: pending.method,
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

  // ============================================================
  // Patreon Pledges
  // ============================================================

  /**
   * Record a confirmed Patreon pledge
   * @param {Object} opts
   * @param {string} opts.userId - Discord user ID or external ID
   * @param {string} opts.username - Display name
   * @param {number} opts.pledgeAmountCents - Monthly pledge in cents
   * @param {number} [opts.additionalDonation] - One-time extra donation
   * @param {boolean} opts.anonymous - Whether to hide the name
   * @param {string} [opts.confirmedBy] - Admin who confirmed
   * @param {string} [opts.patreonMemberId] - Patreon member ID for dedup
   * @returns {Object} pledge record
   */
  addPatreonPledge({ userId, username, pledgeAmountCents, additionalDonation = 0, anonymous = false, confirmedBy = null, patreonMemberId = null }) {
    const pledge = {
      id: this._generateId(),
      userId,
      username,
      pledgeAmountCents: parseInt(pledgeAmountCents) || 0,
      pledgeAmountDollars: (parseInt(pledgeAmountCents) || 0) / 100,
      additionalDonation: parseFloat(additionalDonation) || 0,
      anonymous,
      confirmedBy,
      timestamp: new Date().toISOString(),
    };

    if (patreonMemberId) {
      pledge.patreonMemberId = patreonMemberId;
    }

    this._data.patreonPledges.push(pledge);
    this._save();

    // If there's an additional donation, also record it as a regular donation
    if (pledge.additionalDonation > 0) {
      this.addDonation({
        userId,
        username,
        amount: pledge.additionalDonation,
        method: 'patreon',
        anonymous,
        confirmedBy,
      });
    }

    this.emit('patreonPledge', pledge);
    return pledge;
  }

  /**
   * Submit a pending Patreon pledge for admin verification
   */
  addPendingPatreonPledge({ userId, username, pledgeAmountCents, pledgeAmountDollars, additionalDonation = 0, anonymous = false }) {
    // Accept either dollars (self-report) or cents (webhook)
    let dollars;
    if (pledgeAmountDollars !== undefined && pledgeAmountDollars !== null) {
      dollars = parseFloat(pledgeAmountDollars) || 0;
    } else {
      dollars = (parseInt(pledgeAmountCents) || 0) / 100;
    }
    const cents = Math.round(dollars * 100);

    const pending = {
      id: this._generateId(),
      userId,
      username,
      pledgeAmountCents: cents,
      pledgeAmountDollars: dollars,
      additionalDonation: parseFloat(additionalDonation) || 0,
      anonymous,
      timestamp: new Date().toISOString(),
    };

    this._data.pendingPatreonPledges.push(pending);
    this._save();

    this.emit('pendingPatreonPledge', pending);
    return pending;
  }

  /**
   * Approve a pending Patreon pledge (admin action)
   */
  approvePatreonPledge(pendingId, adminUsername) {
    const idx = this._data.pendingPatreonPledges.findIndex(p => p.id === pendingId);
    if (idx === -1) return null;

    const pending = this._data.pendingPatreonPledges.splice(idx, 1)[0];
    const pledge = this.addPatreonPledge({
      userId: pending.userId,
      username: pending.username,
      pledgeAmountCents: pending.pledgeAmountCents,
      additionalDonation: pending.additionalDonation,
      anonymous: pending.anonymous,
      confirmedBy: adminUsername,
    });

    return pledge;
  }

  /**
   * Deny a pending Patreon pledge (admin action)
   */
  denyPatreonPledge(pendingId) {
    const idx = this._data.pendingPatreonPledges.findIndex(p => p.id === pendingId);
    if (idx === -1) return null;

    const denied = this._data.pendingPatreonPledges.splice(idx, 1)[0];
    this._save();
    return denied;
  }

  /**
   * Get all confirmed Patreon pledges
   */
  getPatreonPledges() {
    return [...this._data.patreonPledges];
  }

  /**
   * Get all pending Patreon pledges
   */
  getPendingPatreonPledges() {
    return [...this._data.pendingPatreonPledges];
  }

  /**
   * Get the total number of confirmed Patreon pledges
   */
  getPatreonPledgeCount() {
    return this._data.patreonPledges.length;
  }

  /**
   * Get Patreon pledge goal progress as a percentage (0-100, can exceed 100)
   */
  getPatreonProgress() {
    const goal = this._data.config.patreonPledgeGoal;
    if (goal <= 0) return 0;
    return (this.getPatreonPledgeCount() / goal) * 100;
  }

  // ============================================================
  // Aggregated Queries
  // ============================================================

  /**
   * Get all confirmed donations
   */
  getDonations() {
    return [...this._data.donations];
  }

  /**
   * Get all pending donations (CashApp + Patreon additional)
   */
  getPendingDonations() {
    return [...this._data.pendingDonations];
  }

  /**
   * Get the total amount raised (all methods)
   */
  getTotalRaised() {
    return this._data.donations.reduce((sum, d) => sum + d.amount, 0);
  }

  /**
   * Get the number of unique donors (across donations)
   */
  getDonorCount() {
    const unique = new Set(this._data.donations.map(d => d.userId));
    return unique.size;
  }

  /**
   * Get dollar goal progress as a percentage (0-100, can exceed 100)
   */
  getProgress() {
    const goal = this._data.config.goalAmount;
    if (goal <= 0) return 100;
    return (this.getTotalRaised() / goal) * 100;
  }

  /**
   * Get a full status summary (includes both goals)
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
      patreonLink: config.patreonLink,
      patreonPledgeGoal: config.patreonPledgeGoal,
      patreonPledgeCount: this.getPatreonPledgeCount(),
      patreonProgress: this.getPatreonProgress(),
      pendingPatreonCount: this._data.pendingPatreonPledges.length,
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
   * Get recent Patreon pledges (last N)
   */
  getRecentPatreonPledges(count = 5) {
    return this._data.patreonPledges.slice(-count).reverse();
  }

  /**
   * Reset all donations and pledges (admin action)
   */
  resetDonations() {
    this._data.donations = [];
    this._data.pendingDonations = [];
    this._data.patreonPledges = [];
    this._data.pendingPatreonPledges = [];
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
