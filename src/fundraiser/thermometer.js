/**
 * Fundraiser Thermometer Graphic Generator
 *
 * Creates cute, colorful fundraiser progress thermometer images
 * for Discord donation announcements and progress displays.
 *
 * Supports dual goals:
 *   - Dollar goal: total donations raised
 *   - Patreon pledge goal: number of new Patreon signups
 *
 * Uses @napi-rs/canvas for server-side rendering at 2x for crisp text.
 */

const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');
const fs = require('fs');

const TEMP_DIR = path.join(__dirname, '../../temp');
const EMOJIS_DIR = path.join(__dirname, '../../assets/emojis');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Register fonts
const FONT_DIR = '/usr/share/fonts/truetype/noto';
try {
  GlobalFonts.registerFromPath(path.join(FONT_DIR, 'NotoSans-Bold.ttf'), 'NotoSans-Bold');
  GlobalFonts.registerFromPath(path.join(FONT_DIR, 'NotoSans-SemiBold.ttf'), 'NotoSans-SemiBold');
  GlobalFonts.registerFromPath(path.join(FONT_DIR, 'NotoSans-Medium.ttf'), 'NotoSans-Medium');
  GlobalFonts.registerFromPath(path.join(FONT_DIR, 'NotoSans-Regular.ttf'), 'NotoSans-Regular');
} catch (e) {
  // Already registered or not available
}

// Colors
const COLORS = {
  background: '#FFF8F0',
  border: '#E8A0BF',
  thermometerBg: '#F0E6EF',
  thermometerFill: '#FF69B4',     // Hot pink gradient start
  thermometerFillEnd: '#E8A0BF',  // Gradient end
  thermometerBulb: '#FF69B4',
  // Patreon-themed colors
  patreonFill: '#FF424D',         // Patreon coral
  patreonFillEnd: '#F96854',      // Patreon coral lighter
  patreonBulb: '#FF424D',
  goalLine: '#4A4A4A',
  titleText: '#4A4A4A',
  amountText: '#FF69B4',
  patreonAmountText: '#FF424D',
  subtitleText: '#888888',
  footerText: '#CCAACC',
  milestoneText: '#AAAAAA',
  donorText: '#5CDB95',
  white: '#FFFFFF',
};

/**
 * Generate a fundraiser thermometer graphic with optional Patreon pledge bar
 *
 * @param {Object} opts
 * @param {string} opts.title - Fundraiser title
 * @param {number} opts.goalAmount - Dollar goal amount
 * @param {number} opts.totalRaised - Total raised so far
 * @param {string} opts.currencySymbol - Currency symbol (default '$')
 * @param {number} opts.donorCount - Number of unique donors
 * @param {number} opts.donationCount - Total number of donations
 * @param {string|null} opts.latestDonor - Name of latest donor
 * @param {number|null} opts.latestAmount - Latest donation amount
 * @param {boolean} opts.isAnonymous - Whether latest donor is anonymous
 * @param {number} opts.patreonPledgeGoal - Target number of Patreon pledges (0 = disabled)
 * @param {number} opts.patreonPledgeCount - Current number of Patreon pledges
 * @param {string|null} opts.latestPatron - Name of latest Patreon patron (for pledge announcements)
 * @param {boolean} opts.isPatreonAnnouncement - Whether this is a Patreon pledge announcement
 * @param {string} opts.filename - Output filename
 * @returns {Promise<string>} Path to the generated image
 */
async function generateThermometer(opts) {
  const {
    title = "Fundraiser",
    goalAmount = 500,
    totalRaised = 0,
    currencySymbol = '$',
    donorCount = 0,
    donationCount = 0,
    latestDonor = null,
    latestAmount = null,
    isAnonymous = false,
    patreonPledgeGoal = 0,
    patreonPledgeCount = 0,
    latestPatron = null,
    isPatreonAnnouncement = false,
    filename = 'thermometer.png',
  } = opts;

  const showPatreon = patreonPledgeGoal > 0;

  // Render at 2x for crisp text
  const S = 2;

  // Layout dimensions — taller when showing Patreon bar
  const WIDTH = 500 * S;
  const BASE_HEIGHT = showPatreon ? 460 : 380;
  const HEIGHT = BASE_HEIGHT * S;
  const PADDING = 24 * S;
  const CORNER_R = 16 * S;

  // Dollar thermometer dimensions
  const THERM_X = 60 * S;
  const THERM_Y = 100 * S;
  const THERM_W = 380 * S;
  const THERM_H = 40 * S;
  const THERM_R = 20 * S;
  const BULB_R = 35 * S;
  const BULB_X = THERM_X - 10 * S;
  const BULB_Y = THERM_Y + THERM_H / 2;

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // ---- Background ----
  ctx.fillStyle = COLORS.background;
  ctx.beginPath();
  roundRect(ctx, 0, 0, WIDTH, HEIGHT, CORNER_R);
  ctx.fill();

  // ---- Border ----
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 3 * S;
  ctx.beginPath();
  roundRect(ctx, 2 * S, 2 * S, WIDTH - 4 * S, HEIGHT - 4 * S, CORNER_R);
  ctx.stroke();

  // ---- Title ----
  ctx.fillStyle = COLORS.titleText;
  ctx.font = `bold ${22 * S}px "NotoSans-Bold", "Noto Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(title, WIDTH / 2, PADDING + 28 * S);

  // ---- Subtitle: raised / goal ----
  const progress = Math.min((totalRaised / goalAmount) * 100, 100);
  const raisedStr = `${currencySymbol}${totalRaised.toFixed(2)}`;
  const goalStr = `${currencySymbol}${goalAmount.toFixed(2)}`;

  ctx.font = `bold ${28 * S}px "NotoSans-Bold", "Noto Sans", sans-serif`;
  ctx.fillStyle = COLORS.amountText;
  ctx.fillText(raisedStr, WIDTH / 2, PADDING + 68 * S);

  ctx.font = `${14 * S}px "NotoSans-Regular", "Noto Sans", sans-serif`;
  ctx.fillStyle = COLORS.subtitleText;
  ctx.fillText(`raised of ${goalStr} goal`, WIDTH / 2, PADDING + 88 * S);

  // ---- Dollar Thermometer ----
  drawThermometerBar(ctx, {
    x: THERM_X, y: THERM_Y, w: THERM_W, h: THERM_H, r: THERM_R,
    bulbX: BULB_X, bulbY: BULB_Y, bulbR: BULB_R,
    progress,
    fillColor: COLORS.thermometerFill,
    fillEndColor: COLORS.thermometerFillEnd,
    bulbColor: COLORS.thermometerBulb,
    S,
  });

  // ---- Dollar milestone markers ----
  const milestones = [0.25, 0.5, 0.75];
  ctx.font = `${9 * S}px "NotoSans-Regular", "Noto Sans", sans-serif`;
  ctx.fillStyle = COLORS.milestoneText;
  ctx.textAlign = 'center';

  for (const m of milestones) {
    const mx = THERM_X + THERM_W * m;
    ctx.strokeStyle = '#DDDDDD';
    ctx.lineWidth = 1 * S;
    ctx.beginPath();
    ctx.moveTo(mx, THERM_Y + THERM_H + 2 * S);
    ctx.lineTo(mx, THERM_Y + THERM_H + 8 * S);
    ctx.stroke();
    ctx.fillText(`${currencySymbol}${(goalAmount * m).toFixed(0)}`, mx, THERM_Y + THERM_H + 20 * S);
  }

  // Goal marker for dollar bar
  drawGoalMarker(ctx, THERM_X + THERM_W, THERM_Y, THERM_H, S);

  // ---- Patreon Pledge Bar (if enabled) ----
  let patreonBarBottom = THERM_Y + THERM_H + 30 * S;

  if (showPatreon) {
    const PATREON_Y = THERM_Y + THERM_H + 46 * S;
    const PATREON_H = 30 * S;
    const PATREON_R = 15 * S;
    const PATREON_BULB_R = 26 * S;
    const PATREON_BULB_X = THERM_X - 10 * S;
    const PATREON_BULB_Y = PATREON_Y + PATREON_H / 2;

    // Label
    ctx.textAlign = 'left';
    ctx.font = `bold ${11 * S}px "NotoSans-Bold", "Noto Sans", sans-serif`;
    ctx.fillStyle = COLORS.patreonAmountText;
    ctx.fillText('PATREON PLEDGES', THERM_X + 50 * S, PATREON_Y - 6 * S);

    ctx.textAlign = 'right';
    ctx.font = `${11 * S}px "NotoSans-Regular", "Noto Sans", sans-serif`;
    ctx.fillStyle = COLORS.subtitleText;
    ctx.fillText(`${patreonPledgeCount} of ${patreonPledgeGoal}`, THERM_X + THERM_W, PATREON_Y - 6 * S);

    const patreonProgress = Math.min((patreonPledgeCount / patreonPledgeGoal) * 100, 100);

    drawThermometerBar(ctx, {
      x: THERM_X, y: PATREON_Y, w: THERM_W, h: PATREON_H, r: PATREON_R,
      bulbX: PATREON_BULB_X, bulbY: PATREON_BULB_Y, bulbR: PATREON_BULB_R,
      progress: patreonProgress,
      fillColor: COLORS.patreonFill,
      fillEndColor: COLORS.patreonFillEnd,
      bulbColor: COLORS.patreonBulb,
      S,
    });

    // Goal marker for Patreon bar
    drawGoalMarker(ctx, THERM_X + THERM_W, PATREON_Y, PATREON_H, S);

    patreonBarBottom = PATREON_Y + PATREON_H + 20 * S;
  }

  // ---- Stats row ----
  const statsY = patreonBarBottom + 30 * S;

  if (showPatreon) {
    // 4-column stats when Patreon is active
    // Donors
    ctx.textAlign = 'center';
    ctx.font = `bold ${18 * S}px "NotoSans-Bold", "Noto Sans", sans-serif`;
    ctx.fillStyle = COLORS.titleText;
    ctx.fillText(`${donorCount}`, WIDTH * 0.15, statsY);
    ctx.font = `${10 * S}px "NotoSans-Regular", "Noto Sans", sans-serif`;
    ctx.fillStyle = COLORS.subtitleText;
    ctx.fillText('donors', WIDTH * 0.15, statsY + 16 * S);

    // Donations
    ctx.font = `bold ${18 * S}px "NotoSans-Bold", "Noto Sans", sans-serif`;
    ctx.fillStyle = COLORS.titleText;
    ctx.fillText(`${donationCount}`, WIDTH * 0.38, statsY);
    ctx.font = `${10 * S}px "NotoSans-Regular", "Noto Sans", sans-serif`;
    ctx.fillStyle = COLORS.subtitleText;
    ctx.fillText('donations', WIDTH * 0.38, statsY + 16 * S);

    // Patrons
    ctx.font = `bold ${18 * S}px "NotoSans-Bold", "Noto Sans", sans-serif`;
    ctx.fillStyle = COLORS.patreonAmountText;
    ctx.fillText(`${patreonPledgeCount}`, WIDTH * 0.62, statsY);
    ctx.font = `${10 * S}px "NotoSans-Regular", "Noto Sans", sans-serif`;
    ctx.fillStyle = COLORS.subtitleText;
    ctx.fillText('patrons', WIDTH * 0.62, statsY + 16 * S);

    // Remaining
    const remaining = Math.max(0, goalAmount - totalRaised);
    ctx.font = `bold ${18 * S}px "NotoSans-Bold", "Noto Sans", sans-serif`;
    ctx.fillStyle = remaining > 0 ? COLORS.titleText : COLORS.donorText;
    ctx.fillText(remaining > 0 ? `${currencySymbol}${remaining.toFixed(0)}` : 'DONE!', WIDTH * 0.85, statsY);
    ctx.font = `${10 * S}px "NotoSans-Regular", "Noto Sans", sans-serif`;
    ctx.fillStyle = COLORS.subtitleText;
    ctx.fillText(remaining > 0 ? 'to go' : 'goal reached!', WIDTH * 0.85, statsY + 16 * S);
  } else {
    // 3-column stats (original layout)
    ctx.textAlign = 'center';
    ctx.font = `bold ${20 * S}px "NotoSans-Bold", "Noto Sans", sans-serif`;
    ctx.fillStyle = COLORS.titleText;
    ctx.fillText(`${donorCount}`, WIDTH * 0.3, statsY);
    ctx.font = `${11 * S}px "NotoSans-Regular", "Noto Sans", sans-serif`;
    ctx.fillStyle = COLORS.subtitleText;
    ctx.fillText('donors', WIDTH * 0.3, statsY + 18 * S);

    ctx.font = `bold ${20 * S}px "NotoSans-Bold", "Noto Sans", sans-serif`;
    ctx.fillStyle = COLORS.titleText;
    ctx.fillText(`${donationCount}`, WIDTH * 0.5, statsY);
    ctx.font = `${11 * S}px "NotoSans-Regular", "Noto Sans", sans-serif`;
    ctx.fillStyle = COLORS.subtitleText;
    ctx.fillText('donations', WIDTH * 0.5, statsY + 18 * S);

    const remaining = Math.max(0, goalAmount - totalRaised);
    ctx.font = `bold ${20 * S}px "NotoSans-Bold", "Noto Sans", sans-serif`;
    ctx.fillStyle = remaining > 0 ? COLORS.titleText : COLORS.donorText;
    ctx.fillText(remaining > 0 ? `${currencySymbol}${remaining.toFixed(0)}` : 'DONE!', WIDTH * 0.7, statsY);
    ctx.font = `${11 * S}px "NotoSans-Regular", "Noto Sans", sans-serif`;
    ctx.fillStyle = COLORS.subtitleText;
    ctx.fillText(remaining > 0 ? 'to go' : 'goal reached!', WIDTH * 0.7, statsY + 18 * S);
  }

  // ---- Latest donation / pledge announcement ----
  const hasAnnouncement = latestDonor || latestAmount || (isPatreonAnnouncement && latestPatron);
  if (hasAnnouncement) {
    const announceY = statsY + 50 * S;

    let announceLine1, announceLine2;

    if (isPatreonAnnouncement && latestPatron) {
      const patronName = isAnonymous ? 'Anonymous' : latestPatron;
      announceLine1 = `${patronName} became a Patreon supporter!`;
      announceLine2 = latestAmount
        ? `Plus a ${currencySymbol}${latestAmount.toFixed(2)} additional donation!`
        : 'Thank you for supporting our little friends!';
    } else {
      const donorName = isAnonymous ? 'Anonymous' : (latestDonor || 'Someone');
      const amountStr = latestAmount ? `${currencySymbol}${latestAmount.toFixed(2)}` : '';
      announceLine1 = `${donorName} donated ${amountStr}`;
      announceLine2 = 'Thank you for helping our little friends!';
    }

    // Announcement box
    const boxColor = isPatreonAnnouncement ? '#FFF0F0' : '#FFF0F5';
    const borderColor = isPatreonAnnouncement ? '#FFD1D1' : '#FFD1E8';

    ctx.fillStyle = boxColor;
    ctx.beginPath();
    roundRect(ctx, PADDING + 20 * S, announceY - 18 * S, WIDTH - PADDING * 2 - 40 * S, 48 * S, 10 * S);
    ctx.fill();

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5 * S;
    ctx.beginPath();
    roundRect(ctx, PADDING + 20 * S, announceY - 18 * S, WIDTH - PADDING * 2 - 40 * S, 48 * S, 10 * S);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = `${13 * S}px "NotoSans-Medium", "Noto Sans", sans-serif`;
    ctx.fillStyle = isPatreonAnnouncement ? COLORS.patreonAmountText : COLORS.donorText;
    ctx.fillText(announceLine1, WIDTH / 2, announceY + 4 * S);

    ctx.font = `${10 * S}px "NotoSans-Regular", "Noto Sans", sans-serif`;
    ctx.fillStyle = COLORS.subtitleText;
    ctx.fillText(announceLine2, WIDTH / 2, announceY + 22 * S);
  }

  // ---- Footer ----
  ctx.fillStyle = COLORS.footerText;
  ctx.font = `${10 * S}px "NotoSans-Regular", "Noto Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('HALT Bot \u2022 helpingalllittlethings.org', WIDTH / 2, HEIGHT - PADDING);

  // ---- Emoji decorations ----
  await drawEmojiDecoration(ctx, EMOJIS_DIR, WIDTH, PADDING, S);

  // ---- Downscale to 1x ----
  const finalW = Math.round(WIDTH / S);
  const finalH = Math.round(HEIGHT / S);
  const finalCanvas = createCanvas(finalW, finalH);
  const finalCtx = finalCanvas.getContext('2d');
  finalCtx.drawImage(canvas, 0, 0, finalW, finalH);

  // Save
  const outputPath = path.join(TEMP_DIR, filename);
  const buffer = finalCanvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);

  return outputPath;
}

/**
 * Generate a simple progress-only thermometer (smaller, for quick status checks)
 */
async function generateMiniThermometer(opts) {
  const {
    goalAmount = 500,
    totalRaised = 0,
    currencySymbol = '$',
    patreonPledgeGoal = 0,
    patreonPledgeCount = 0,
    filename = 'mini_therm.png',
  } = opts;

  const showPatreon = patreonPledgeGoal > 0;
  const S = 2;
  const WIDTH = 400 * S;
  const HEIGHT = (showPatreon ? 130 : 80) * S;
  const PADDING = 16 * S;

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  const progress = Math.min((totalRaised / goalAmount) * 100, 100);

  // Background
  ctx.fillStyle = COLORS.background;
  ctx.beginPath();
  roundRect(ctx, 0, 0, WIDTH, HEIGHT, 12 * S);
  ctx.fill();

  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 2 * S;
  ctx.beginPath();
  roundRect(ctx, 1 * S, 1 * S, WIDTH - 2 * S, HEIGHT - 2 * S, 12 * S);
  ctx.stroke();

  // Dollar amount text
  ctx.textAlign = 'left';
  ctx.font = `bold ${16 * S}px "NotoSans-Bold", "Noto Sans", sans-serif`;
  ctx.fillStyle = COLORS.amountText;
  ctx.fillText(`${currencySymbol}${totalRaised.toFixed(2)}`, PADDING, PADDING + 16 * S);

  ctx.font = `${11 * S}px "NotoSans-Regular", "Noto Sans", sans-serif`;
  ctx.fillStyle = COLORS.subtitleText;
  ctx.textAlign = 'right';
  ctx.fillText(`of ${currencySymbol}${goalAmount.toFixed(2)}`, WIDTH - PADDING, PADDING + 16 * S);

  // Dollar progress bar
  const barY = PADDING + 28 * S;
  const barH = 18 * S;
  const barW = WIDTH - PADDING * 2;
  const barR = 9 * S;

  drawSimpleBar(ctx, {
    x: PADDING, y: barY, w: barW, h: barH, r: barR,
    progress,
    fillColor: COLORS.thermometerFill,
    fillEndColor: COLORS.thermometerFillEnd,
    S,
  });

  // Dollar percentage
  ctx.textAlign = 'center';
  ctx.font = `bold ${10 * S}px "NotoSans-Bold", "Noto Sans", sans-serif`;
  ctx.fillStyle = progress > 15 ? COLORS.white : COLORS.titleText;
  const textX = progress > 15
    ? PADDING + (barW * (progress / 100)) / 2
    : PADDING + barW * (progress / 100) + 20 * S;
  ctx.fillText(`${Math.round(progress)}%`, textX, barY + barH / 2 + 4 * S);

  // Patreon pledge bar (if enabled)
  if (showPatreon) {
    const pBarY = barY + barH + 16 * S;
    const patreonProgress = Math.min((patreonPledgeCount / patreonPledgeGoal) * 100, 100);

    // Label
    ctx.textAlign = 'left';
    ctx.font = `bold ${10 * S}px "NotoSans-Bold", "Noto Sans", sans-serif`;
    ctx.fillStyle = COLORS.patreonAmountText;
    ctx.fillText(`${patreonPledgeCount} patrons`, PADDING, pBarY - 2 * S);

    ctx.textAlign = 'right';
    ctx.font = `${10 * S}px "NotoSans-Regular", "Noto Sans", sans-serif`;
    ctx.fillStyle = COLORS.subtitleText;
    ctx.fillText(`of ${patreonPledgeGoal} goal`, WIDTH - PADDING, pBarY - 2 * S);

    const pBarActualY = pBarY + 6 * S;

    drawSimpleBar(ctx, {
      x: PADDING, y: pBarActualY, w: barW, h: barH, r: barR,
      progress: patreonProgress,
      fillColor: COLORS.patreonFill,
      fillEndColor: COLORS.patreonFillEnd,
      S,
    });

    // Patreon percentage
    ctx.textAlign = 'center';
    ctx.font = `bold ${10 * S}px "NotoSans-Bold", "Noto Sans", sans-serif`;
    ctx.fillStyle = patreonProgress > 15 ? COLORS.white : COLORS.titleText;
    const pTextX = patreonProgress > 15
      ? PADDING + (barW * (patreonProgress / 100)) / 2
      : PADDING + barW * (patreonProgress / 100) + 20 * S;
    ctx.fillText(`${Math.round(patreonProgress)}%`, pTextX, pBarActualY + barH / 2 + 4 * S);
  }

  // Downscale
  const finalW = Math.round(WIDTH / S);
  const finalH = Math.round(HEIGHT / S);
  const finalCanvas = createCanvas(finalW, finalH);
  const finalCtx = finalCanvas.getContext('2d');
  finalCtx.drawImage(canvas, 0, 0, finalW, finalH);

  const outputPath = path.join(TEMP_DIR, filename);
  const buffer = finalCanvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);

  return outputPath;
}

// ============================================================
// Drawing Helpers
// ============================================================

/**
 * Draw a thermometer bar with bulb
 */
function drawThermometerBar(ctx, opts) {
  const { x, y, w, h, r, bulbX, bulbY, bulbR, progress, fillColor, fillEndColor, bulbColor, S } = opts;

  // Tube background
  ctx.fillStyle = COLORS.thermometerBg;
  ctx.beginPath();
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();

  // Bulb background
  ctx.beginPath();
  ctx.arc(bulbX, bulbY, bulbR, 0, Math.PI * 2);
  ctx.fill();

  // Tube fill
  const fillWidth = Math.max(0, Math.min(w * (progress / 100), w));
  if (fillWidth > 0) {
    const gradient = ctx.createLinearGradient(x, 0, x + w, 0);
    gradient.addColorStop(0, fillColor);
    gradient.addColorStop(1, fillEndColor);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    roundRect(ctx, x, y, fillWidth, h, r);
    ctx.fill();
  }

  // Bulb fill
  ctx.fillStyle = bulbColor;
  ctx.beginPath();
  ctx.arc(bulbX, bulbY, bulbR, 0, Math.PI * 2);
  ctx.fill();

  // Bulb percentage text
  ctx.fillStyle = COLORS.white;
  ctx.font = `bold ${Math.round(bulbR * 0.7)}px "NotoSans-Bold", "Noto Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.round(progress)}%`, bulbX, bulbY);
  ctx.textBaseline = 'alphabetic';
}

/**
 * Draw a simple progress bar (no bulb)
 */
function drawSimpleBar(ctx, opts) {
  const { x, y, w, h, r, progress, fillColor, fillEndColor, S } = opts;

  ctx.fillStyle = COLORS.thermometerBg;
  ctx.beginPath();
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();

  if (progress > 0) {
    const fillW = Math.max(r * 2, w * (progress / 100));
    const gradient = ctx.createLinearGradient(x, 0, x + w, 0);
    gradient.addColorStop(0, fillColor);
    gradient.addColorStop(1, fillEndColor);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    roundRect(ctx, x, y, fillW, h, r);
    ctx.fill();
  }
}

/**
 * Draw a goal marker (dashed line with "GOAL" label)
 */
function drawGoalMarker(ctx, goalX, thermY, thermH, S) {
  ctx.strokeStyle = COLORS.goalLine;
  ctx.lineWidth = 2 * S;
  ctx.setLineDash([4 * S, 4 * S]);
  ctx.beginPath();
  ctx.moveTo(goalX, thermY - 10 * S);
  ctx.lineTo(goalX, thermY + thermH + 10 * S);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = `${11 * S}px "NotoSans-Medium", "Noto Sans", sans-serif`;
  ctx.fillStyle = COLORS.goalLine;
  ctx.textAlign = 'center';
  ctx.fillText('GOAL', goalX, thermY - 14 * S);
}

/**
 * Draw emoji decorations in the corners
 */
async function drawEmojiDecoration(ctx, emojisDir, WIDTH, PADDING, S) {
  try {
    const emojiPath = path.join(emojisDir, 'halt_hamster.png');
    if (fs.existsSync(emojiPath)) {
      const emoji = await loadImage(emojiPath);
      const emojiSize = 40 * S;
      ctx.drawImage(emoji, WIDTH - PADDING - emojiSize, PADDING - 4 * S, emojiSize, emojiSize);
    }
  } catch (e) { /* skip */ }

  try {
    const emojiPath2 = path.join(emojisDir, 'halt_rat.png');
    if (fs.existsSync(emojiPath2)) {
      const emoji2 = await loadImage(emojiPath2);
      const emojiSize = 40 * S;
      ctx.drawImage(emoji2, PADDING, PADDING - 4 * S, emojiSize, emojiSize);
    }
  } catch (e) { /* skip */ }
}

/**
 * Helper: draw a rounded rectangle path
 */
function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

module.exports = { generateThermometer, generateMiniThermometer };
