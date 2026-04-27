/**
 * Fundraiser Embed Builders
 *
 * Creates Discord embeds for all fundraiser interactions:
 * - Donate prompt (with PayPal/CashApp/Patreon info)
 * - Progress display (with thermometer image)
 * - Donation announcement
 * - Patreon pledge announcement
 * - Pending donation list (admin)
 * - Pending Patreon pledge list (admin)
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
    patreonLink = '',
    patreonPledgeGoal = 0,
  } = config;

  let description = `Help us reach our **${currencySymbol}${goalAmount.toFixed(2)}** goal for **${goalLabel}**!\n\n`;
  description += `Every donation helps our little friends get the care they deserve. 🐾\n\n`;

  if (paypalLink) {
    description += `💙 **PayPal:** [Click here to donate](${paypalLink})\n`;
  }
  if (cashappTag) {
    description += `💚 **CashApp:** Send to **${cashappTag}**\n`;
    description += `After sending via CashApp, use \`/donated\` to report your donation so we can confirm it!\n\n`;
  }
  if (patreonLink) {
    description += `🧡 **Patreon:** [Become a patron](${patreonLink})\n`;
    description += `After signing up on Patreon, use \`/patron\` to report your pledge so we can confirm it!\n`;
    if (patreonPledgeGoal > 0) {
      description += `We're aiming for **${patreonPledgeGoal} patrons** during this fundraiser!\n\n`;
    }
  }

  if (!paypalLink && !cashappTag && !patreonLink) {
    description += `⚠️ No payment methods have been configured yet. Please check back later!`;
  }

  description += `\nUse \`/fundraiser\` to check current progress anytime!`;

  const embed = new EmbedBuilder()
    .setTitle(`🎉 ${goalLabel}`)
    .setDescription(description)
    .setColor(0xFF69B4)
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

  if (patreonLink) {
    row.addComponents(
      new ButtonBuilder()
        .setLabel('Join on Patreon')
        .setStyle(ButtonStyle.Link)
        .setURL(patreonLink)
        .setEmoji('🧡')
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
 * Create the fundraiser progress embed (supports dual goals)
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
    patreonPledgeGoal,
    patreonPledgeCount,
    pendingPatreonCount,
  } = status;

  const progressBar = generateProgressBar(progress);
  const remaining = Math.max(0, goalAmount - totalRaised);

  let description = `**${goalLabel}**\n\n`;

  // Dollar progress
  description += `💰 **Donation Goal**\n`;
  description += `${progressBar}\n`;
  description += `**${currencySymbol}${totalRaised.toFixed(2)}** raised of **${currencySymbol}${goalAmount.toFixed(2)}** goal\n\n`;

  if (progress >= 100) {
    description += `🎉 **Dollar goal reached!** Thank you to all our amazing donors!\n\n`;
  } else {
    description += `Only **${currencySymbol}${remaining.toFixed(2)}** to go!\n\n`;
  }

  // Patreon pledge progress (if enabled)
  if (patreonPledgeGoal > 0) {
    const patreonProgress = Math.min((patreonPledgeCount / patreonPledgeGoal) * 100, 100);
    const patreonBar = generateProgressBar(patreonProgress);
    const pledgesRemaining = Math.max(0, patreonPledgeGoal - patreonPledgeCount);

    description += `🧡 **Patreon Pledge Goal**\n`;
    description += `${patreonBar}\n`;
    description += `**${patreonPledgeCount}** patron${patreonPledgeCount !== 1 ? 's' : ''} of **${patreonPledgeGoal}** goal\n`;

    if (patreonProgress >= 100) {
      description += `🎉 **Patron goal reached!**\n\n`;
    } else {
      description += `**${pledgesRemaining}** more patron${pledgesRemaining !== 1 ? 's' : ''} needed!\n\n`;
    }
  }

  // Stats
  description += `👥 **${donorCount}** donor${donorCount !== 1 ? 's' : ''} • `;
  description += `💝 **${donationCount}** donation${donationCount !== 1 ? 's' : ''}`;

  if (patreonPledgeGoal > 0) {
    description += ` • 🧡 **${status.patreonPledgeCount}** patron${status.patreonPledgeCount !== 1 ? 's' : ''}`;
  }

  const totalPending = (pendingCount || 0) + (pendingPatreonCount || 0);
  if (totalPending > 0) {
    description += `\n⏳ **${totalPending}** pending confirmation`;
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

  const methodLabel = donation.method === 'patreon' ? 'Patreon donation' : 'donation';

  let description = '';

  if (donation.anonymous) {
    description += `An **anonymous donor** just contributed **${currencySymbol}${donation.amount.toFixed(2)}**! 🎉\n\n`;
  } else {
    description += `**${donorName}** just made a **${currencySymbol}${donation.amount.toFixed(2)}** ${methodLabel}! 🎉\n\n`;
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
    .setColor(0x5CDB95)
    .setFooter({ text: 'Helping All Little Things • Every donation counts!' })
    .setTimestamp();

  return embed;
}

// ============================================================
// Patreon Pledge Announcement
// ============================================================

/**
 * Create the Patreon pledge announcement embed
 * @param {Object} pledge - Patreon pledge record
 * @param {Object} status - Current fundraiser status
 * @returns {EmbedBuilder}
 */
function createPatreonPledgeAnnouncementEmbed(pledge, status) {
  const { currencySymbol, goalLabel, patreonPledgeGoal, patreonPledgeCount } = status;
  const patronName = pledge.anonymous ? 'Anonymous' : pledge.username;

  let description = '';

  if (pledge.anonymous) {
    description += `An **anonymous supporter** just became a Patreon patron! 🧡\n\n`;
  } else {
    description += `**${patronName}** just became a Patreon patron! 🧡\n\n`;
  }

  description += `Monthly pledge: **${currencySymbol}${pledge.pledgeAmountDollars.toFixed(2)}/month**\n`;

  if (pledge.additionalDonation > 0) {
    description += `Plus a **${currencySymbol}${pledge.additionalDonation.toFixed(2)}** additional donation! 🎉\n`;
  }

  if (patreonPledgeGoal > 0) {
    const patreonProgress = Math.min((patreonPledgeCount / patreonPledgeGoal) * 100, 100);
    const patreonBar = generateProgressBar(patreonProgress);
    description += `\n${patreonBar}\n`;
    description += `**${patreonPledgeCount}** / ${patreonPledgeGoal} patrons\n\n`;

    if (patreonProgress >= 100) {
      description += `🏆 **Patron goal reached!** Amazing! 🐾`;
    } else {
      const remaining = Math.max(0, patreonPledgeGoal - patreonPledgeCount);
      description += `**${remaining}** more patron${remaining !== 1 ? 's' : ''} to go! Use \`/donate\` to join! 🐾`;
    }
  }

  const embed = new EmbedBuilder()
    .setTitle(`🧡 New Patron for ${goalLabel}!`)
    .setDescription(description)
    .setColor(0xFF424D) // Patreon coral
    .setFooter({ text: 'Helping All Little Things • Every patron counts!' })
    .setTimestamp();

  return embed;
}

// ============================================================
// /donated — Self-report confirmation
// ============================================================

/**
 * Create the "donation reported" embed (shown to the user after /donated)
 * @param {Object} pending - Pending donation record
 * @param {string} currencySymbol
 * @returns {EmbedBuilder}
 */
function createDonationReportedEmbed(pending, currencySymbol = '$') {
  const methodLabel = pending.method === 'patreon' ? 'Patreon donation' : 'CashApp donation';
  return new EmbedBuilder()
    .setTitle('📝 Donation Reported!')
    .setDescription(
      `Thank you! Your ${methodLabel} of **${currencySymbol}${pending.amount.toFixed(2)}** has been submitted for verification.\n\n` +
      `An admin will confirm your donation shortly. Once confirmed, it will be added to the fundraiser total and announced!\n\n` +
      `**Donation ID:** \`${pending.id}\`\n` +
      `**Anonymous:** ${pending.anonymous ? 'Yes' : 'No'}`
    )
    .setColor(0xFFD166)
    .setFooter({ text: 'Helping All Little Things • Thank you for your generosity!' })
    .setTimestamp();
}

// ============================================================
// /patron — Patreon self-report confirmation
// ============================================================

/**
 * Create the "Patreon pledge reported" embed (shown to the user after /patron)
 * @param {Object} pending - Pending Patreon pledge record
 * @param {string} currencySymbol
 * @returns {EmbedBuilder}
 */
function createPatreonPledgeReportedEmbed(pending, currencySymbol = '$') {
  let desc = `Thank you for becoming a patron! Your pledge of **${currencySymbol}${pending.pledgeAmountDollars.toFixed(2)}/month** has been submitted for verification.\n\n`;

  if (pending.additionalDonation > 0) {
    desc += `Additional donation: **${currencySymbol}${pending.additionalDonation.toFixed(2)}**\n\n`;
  }

  desc += `An admin will confirm your pledge shortly. Once confirmed, it will count toward our patron goal!\n\n`;
  desc += `**Pledge ID:** \`${pending.id}\`\n`;
  desc += `**Anonymous:** ${pending.anonymous ? 'Yes' : 'No'}`;

  return new EmbedBuilder()
    .setTitle('🧡 Patreon Pledge Reported!')
    .setDescription(desc)
    .setColor(0xFF424D)
    .setFooter({ text: 'Helping All Little Things • Thank you for your support!' })
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
  const methodLabel = donation.method === 'patreon' ? 'Patreon' : 'CashApp';
  return new EmbedBuilder()
    .setTitle('✅ Donation Confirmed!')
    .setDescription(
      `**${donorName}**'s ${methodLabel} donation of **${currencySymbol}${donation.amount.toFixed(2)}** has been confirmed and added to the fundraiser total.\n\n` +
      `The donation will be announced in the fundraiser channel.`
    )
    .setColor(0x5CDB95)
    .setTimestamp();
}

/**
 * Create the Patreon pledge confirmation embed (shown to admin)
 * @param {Object} pledge - The confirmed pledge
 * @param {string} currencySymbol
 * @returns {EmbedBuilder}
 */
function createPatreonPledgeConfirmedEmbed(pledge, currencySymbol = '$') {
  const patronName = pledge.anonymous ? 'Anonymous' : pledge.username;
  let desc = `**${patronName}**'s Patreon pledge of **${currencySymbol}${pledge.pledgeAmountDollars.toFixed(2)}/month** has been confirmed!\n\n`;

  if (pledge.additionalDonation > 0) {
    desc += `Additional donation of **${currencySymbol}${pledge.additionalDonation.toFixed(2)}** has been added to the fundraiser total.\n\n`;
  }

  desc += `The pledge will be announced in the fundraiser channel.`;

  return new EmbedBuilder()
    .setTitle('✅ Patreon Pledge Confirmed!')
    .setDescription(desc)
    .setColor(0xFF424D)
    .setTimestamp();
}

// ============================================================
// /deny — Admin denial result
// ============================================================

/**
 * Create the denial embed (shown to admin)
 * @param {Object} denied - The denied pending record
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
    .setColor(0xE63946)
    .setTimestamp();
}

/**
 * Create the Patreon pledge denial embed (shown to admin)
 * @param {Object} denied - The denied pending pledge
 * @param {string} currencySymbol
 * @returns {EmbedBuilder}
 */
function createPatreonPledgeDeniedEmbed(denied, currencySymbol = '$') {
  return new EmbedBuilder()
    .setTitle('❌ Patreon Pledge Denied')
    .setDescription(
      `The pending Patreon pledge of **${currencySymbol}${denied.pledgeAmountDollars.toFixed(2)}/month** from **${denied.username}** has been denied and removed.\n\n` +
      `**Pledge ID:** \`${denied.id}\``
    )
    .setColor(0xE63946)
    .setTimestamp();
}

// ============================================================
// Pending Lists (admin reference)
// ============================================================

/**
 * Create an embed listing all pending donations
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
    const method = p.method === 'patreon' ? ' (Patreon)' : ' (CashApp)';
    return `**${i + 1}.** ${name} — **${currencySymbol}${p.amount.toFixed(2)}**${method} (${date})\n   ID: \`${p.id}\`${p.note ? `\n   Note: ${p.note}` : ''}`;
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

/**
 * Create an embed listing all pending Patreon pledges
 * @param {Object[]} pendingPledges
 * @param {string} currencySymbol
 * @returns {EmbedBuilder}
 */
function createPendingPatreonPledgesEmbed(pendingPledges, currencySymbol = '$') {
  if (pendingPledges.length === 0) {
    return new EmbedBuilder()
      .setTitle('🧡 Pending Patreon Pledges')
      .setDescription('No pending Patreon pledges to review!')
      .setColor(0x87CEEB);
  }

  const list = pendingPledges.map((p, i) => {
    const name = p.anonymous ? 'Anonymous' : p.username;
    const date = new Date(p.timestamp).toLocaleDateString();
    const extra = p.additionalDonation > 0 ? ` + ${currencySymbol}${p.additionalDonation.toFixed(2)} extra` : '';
    return `**${i + 1}.** ${name} — **${currencySymbol}${p.pledgeAmountDollars.toFixed(2)}/mo**${extra} (${date})\n   ID: \`${p.id}\``;
  }).join('\n\n');

  return new EmbedBuilder()
    .setTitle(`🧡 Pending Patreon Pledges (${pendingPledges.length})`)
    .setDescription(
      `Use \`/confirmpatron <id>\` to approve or \`/denypatron <id>\` to reject.\n\n${list}`
    )
    .setColor(0xFF424D)
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
  createPatreonPledgeAnnouncementEmbed,
  createDonationReportedEmbed,
  createPatreonPledgeReportedEmbed,
  createDonationConfirmedEmbed,
  createPatreonPledgeConfirmedEmbed,
  createDonationDeniedEmbed,
  createPatreonPledgeDeniedEmbed,
  createPendingDonationsEmbed,
  createPendingPatreonPledgesEmbed,
};
