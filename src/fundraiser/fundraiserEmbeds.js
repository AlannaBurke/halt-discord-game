/**
 * Fundraiser Embed Builders
 *
 * Creates Discord embeds for all fundraiser interactions:
 * - Donate prompt (with PayPal/CashApp info)
 * - Progress display (with thermometer image)
 * - Donation announcement
 * - Pending donation list (admin)
 * - Confirmation/denial results
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// ============================================================
// /donate — Show donation options
// ============================================================

/**
 * Create the donate embed showing payment options
 * @param {Object} config - Fundraiser config
 * @returns {{ embed: EmbedBuilder, components: ActionRowBuilder[] }}
 */
function createDonateEmbed(config) {
  const {
    goalLabel = 'Fundraiser',
    goalAmount = 500,
    currencySymbol = '$',
    paypalLink = '',
    cashappTag = '',
  } = config;

  let description = `Help us reach our **${currencySymbol}${goalAmount.toFixed(2)}** goal for **${goalLabel}**!\n\n`;
  description += `Every donation helps our little friends get the care they deserve. 🐾\n\n`;

  if (paypalLink) {
    description += `💙 **PayPal:** [Click here to donate](${paypalLink})\n`;
  }
  if (cashappTag) {
    description += `💚 **CashApp:** Send to **${cashappTag}**\n`;
    description += `After sending via CashApp, use \`/donated\` to report your donation so we can confirm it!\n`;
  }

  if (!paypalLink && !cashappTag) {
    description += `⚠️ No payment methods have been configured yet. Please check back later!`;
  }

  description += `\nUse \`/fundraiser\` to check current progress anytime!`;

  const embed = new EmbedBuilder()
    .setTitle(`🎉 ${goalLabel}`)
    .setDescription(description)
    .setColor(0xFF69B4) // Hot pink
    .setFooter({ text: 'Helping All Little Things • HALT Bot' })
    .setTimestamp();

  // Build button row
  const components = [];
  const row = new ActionRowBuilder();
  let hasButtons = false;

  if (paypalLink) {
    row.addComponents(
      new ButtonBuilder()
        .setLabel('Donate via PayPal')
        .setStyle(ButtonStyle.Link)
        .setURL(paypalLink)
        .setEmoji('💙')
    );
    hasButtons = true;
  }

  if (hasButtons) {
    components.push(row);
  }

  return { embed, components };
}

// ============================================================
// /fundraiser — Show current progress
// ============================================================

/**
 * Create the fundraiser progress embed
 * @param {Object} status - From fundraiser.getStatus()
 * @returns {EmbedBuilder}
 */
function createFundraiserProgressEmbed(status) {
  const {
    goalLabel,
    goalAmount,
    currencySymbol,
    totalRaised,
    progress,
    donorCount,
    donationCount,
    pendingCount,
  } = status;

  const progressBar = generateProgressBar(progress);
  const remaining = Math.max(0, goalAmount - totalRaised);

  let description = `**${goalLabel}**\n\n`;
  description += `${progressBar}\n`;
  description += `**${currencySymbol}${totalRaised.toFixed(2)}** raised of **${currencySymbol}${goalAmount.toFixed(2)}** goal\n\n`;

  if (progress >= 100) {
    description += `🎉 **Goal reached!** Thank you to all our amazing donors!\n\n`;
  } else {
    description += `Only **${currencySymbol}${remaining.toFixed(2)}** to go!\n\n`;
  }

  description += `👥 **${donorCount}** donor${donorCount !== 1 ? 's' : ''} • `;
  description += `💝 **${donationCount}** donation${donationCount !== 1 ? 's' : ''}`;

  if (pendingCount > 0) {
    description += `\n⏳ **${pendingCount}** pending confirmation`;
  }

  const embed = new EmbedBuilder()
    .setTitle('🌡️ Fundraiser Progress')
    .setDescription(description)
    .setColor(progress >= 100 ? 0x5CDB95 : 0xFF69B4)
    .setFooter({ text: 'Helping All Little Things • HALT Bot • Use /donate to contribute!' })
    .setTimestamp();

  return embed;
}

// ============================================================
// Donation Announcement (posted to announcement channel)
// ============================================================

/**
 * Create the donation announcement embed
 * @param {Object} donation - Donation record
 * @param {Object} status - Current fundraiser status
 * @returns {EmbedBuilder}
 */
function createDonationAnnouncementEmbed(donation, status) {
  const { currencySymbol, goalLabel, totalRaised, goalAmount, progress } = status;
  const donorName = donation.anonymous ? 'Anonymous' : donation.username;
  const progressBar = generateProgressBar(progress);

  let description = '';

  if (donation.anonymous) {
    description += `An **anonymous donor** just contributed **${currencySymbol}${donation.amount.toFixed(2)}**! 🎉\n\n`;
  } else {
    description += `**${donorName}** just donated **${currencySymbol}${donation.amount.toFixed(2)}**! 🎉\n\n`;
  }

  description += `${progressBar}\n`;
  description += `**${currencySymbol}${totalRaised.toFixed(2)}** / ${currencySymbol}${goalAmount.toFixed(2)}\n\n`;

  if (progress >= 100) {
    description += `🏆 **We reached our goal!** Thank you everyone! 🐾`;
  } else {
    const remaining = Math.max(0, goalAmount - totalRaised);
    description += `Only **${currencySymbol}${remaining.toFixed(2)}** to go! Use \`/donate\` to help! 🐾`;
  }

  const embed = new EmbedBuilder()
    .setTitle(`💝 New Donation for ${goalLabel}!`)
    .setDescription(description)
    .setColor(0x5CDB95) // Mint green for celebration
    .setFooter({ text: 'Helping All Little Things • Every donation counts!' })
    .setTimestamp();

  return embed;
}

// ============================================================
// /donated — CashApp self-report confirmation
// ============================================================

/**
 * Create the "donation reported" embed (shown to the user after /donated)
 * @param {Object} pending - Pending donation record
 * @param {string} currencySymbol
 * @returns {EmbedBuilder}
 */
function createDonationReportedEmbed(pending, currencySymbol = '$') {
  return new EmbedBuilder()
    .setTitle('📝 Donation Reported!')
    .setDescription(
      `Thank you! Your CashApp donation of **${currencySymbol}${pending.amount.toFixed(2)}** has been submitted for verification.\n\n` +
      `An admin will confirm your donation shortly. Once confirmed, it will be added to the fundraiser total and announced!\n\n` +
      `**Donation ID:** \`${pending.id}\`\n` +
      `**Anonymous:** ${pending.anonymous ? 'Yes' : 'No'}`
    )
    .setColor(0xFFD166) // Sunny yellow — pending
    .setFooter({ text: 'Helping All Little Things • Thank you for your generosity!' })
    .setTimestamp();
}

// ============================================================
// /confirm — Admin confirmation result
// ============================================================

/**
 * Create the confirmation success embed (shown to admin)
 * @param {Object} donation - The confirmed donation
 * @param {string} currencySymbol
 * @returns {EmbedBuilder}
 */
function createDonationConfirmedEmbed(donation, currencySymbol = '$') {
  const donorName = donation.anonymous ? 'Anonymous' : donation.username;
  return new EmbedBuilder()
    .setTitle('✅ Donation Confirmed!')
    .setDescription(
      `**${donorName}**'s CashApp donation of **${currencySymbol}${donation.amount.toFixed(2)}** has been confirmed and added to the fundraiser total.\n\n` +
      `The donation will be announced in the fundraiser channel.`
    )
    .setColor(0x5CDB95)
    .setTimestamp();
}

// ============================================================
// /deny — Admin denial result
// ============================================================

/**
 * Create the denial embed (shown to admin)
 * @param {Object} denied - The denied pending donation
 * @param {string} currencySymbol
 * @returns {EmbedBuilder}
 */
function createDonationDeniedEmbed(denied, currencySymbol = '$') {
  return new EmbedBuilder()
    .setTitle('❌ Donation Denied')
    .setDescription(
      `The pending donation of **${currencySymbol}${denied.amount.toFixed(2)}** from **${denied.username}** has been denied and removed.\n\n` +
      `**Donation ID:** \`${denied.id}\``
    )
    .setColor(0xE63946) // Crimson red
    .setTimestamp();
}

// ============================================================
// Pending Donations List (for admin reference)
// ============================================================

/**
 * Create an embed listing all pending CashApp donations
 * @param {Object[]} pendingDonations
 * @param {string} currencySymbol
 * @returns {EmbedBuilder}
 */
function createPendingDonationsEmbed(pendingDonations, currencySymbol = '$') {
  if (pendingDonations.length === 0) {
    return new EmbedBuilder()
      .setTitle('⏳ Pending Donations')
      .setDescription('No pending donations to review!')
      .setColor(0x87CEEB);
  }

  const list = pendingDonations.map((p, i) => {
    const name = p.anonymous ? 'Anonymous' : p.username;
    const date = new Date(p.timestamp).toLocaleDateString();
    return `**${i + 1}.** ${name} — **${currencySymbol}${p.amount.toFixed(2)}** (${date})\n   ID: \`${p.id}\`${p.note ? `\n   Note: ${p.note}` : ''}`;
  }).join('\n\n');

  return new EmbedBuilder()
    .setTitle(`⏳ Pending Donations (${pendingDonations.length})`)
    .setDescription(
      `Use \`/confirm <id>\` to approve or \`/deny <id>\` to reject.\n\n${list}`
    )
    .setColor(0xFFD166)
    .setFooter({ text: 'HALT Bot Fundraiser • Admin View' })
    .setTimestamp();
}

// ============================================================
// Helpers
// ============================================================

/**
 * Generate a text-based progress bar for embeds
 * @param {number} progress - Percentage (0-100+)
 * @returns {string}
 */
function generateProgressBar(progress) {
  const filled = Math.min(Math.round(progress / 5), 20);
  const empty = 20 - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `\`${bar}\` **${Math.round(progress)}%**`;
}

module.exports = {
  createDonateEmbed,
  createFundraiserProgressEmbed,
  createDonationAnnouncementEmbed,
  createDonationReportedEmbed,
  createDonationConfirmedEmbed,
  createDonationDeniedEmbed,
  createPendingDonationsEmbed,
};
