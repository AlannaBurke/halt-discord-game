/**
 * Fundraiser Thermometer Graphic Generator
 *
 * Creates a cute, colorful fundraiser progress thermometer image
 * for Discord donation announcements and progress displays.
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

// Register fonts (may already be registered by cardRenderer, but safe to call again)
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
  goalLine: '#4A4A4A',
  titleText: '#4A4A4A',
  amountText: '#FF69B4',
  subtitleText: '#888888',
  footerText: '#CCAACC',
  milestoneText: '#AAAAAA',
  donorText: '#5CDB95',
  white: '#FFFFFF',
};

/**
 * Generate a fundraiser thermometer graphic
 *
 * @param {Object} opts
 * @param {string} opts.title - Fundraiser title (e.g., "Hero & Ziggy's Birthday Fundraiser")
 * @param {number} opts.goalAmount - Goal amount in dollars
 * @param {number} opts.totalRaised - Total raised so far
 * @param {string} opts.currencySymbol - Currency symbol (default '$')
 * @param {number} opts.donorCount - Number of unique donors
 * @param {number} opts.donationCount - Total number of donations
 * @param {string|null} opts.latestDonor - Name of latest donor (or null/anonymous)
 * @param {number|null} opts.latestAmount - Latest donation amount
 * @param {boolean} opts.isAnonymous - Whether latest donor is anonymous
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
    filename = 'thermometer.png',
  } = opts;

  // Render at 2x for crisp text
  const S = 2;

  // Layout dimensions (1x values, scaled by S)
  const WIDTH = 500 * S;
  const HEIGHT = 380 * S;
  const PADDING = 24 * S;
  const CORNER_R = 16 * S;

  // Thermometer dimensions
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

  // ---- Thermometer background ----
  // Tube background
  ctx.fillStyle = COLORS.thermometerBg;
  ctx.beginPath();
  roundRect(ctx, THERM_X, THERM_Y, THERM_W, THERM_H, THERM_R);
  ctx.fill();

  // Bulb background
  ctx.beginPath();
  ctx.arc(BULB_X, BULB_Y, BULB_R, 0, Math.PI * 2);
  ctx.fill();

  // ---- Thermometer fill ----
  const fillWidth = Math.max(0, Math.min(THERM_W * (progress / 100), THERM_W));

  if (fillWidth > 0) {
    // Gradient fill
    const gradient = ctx.createLinearGradient(THERM_X, 0, THERM_X + THERM_W, 0);
    gradient.addColorStop(0, COLORS.thermometerFill);
    gradient.addColorStop(1, COLORS.thermometerFillEnd);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    roundRect(ctx, THERM_X, THERM_Y, fillWidth, THERM_H, THERM_R);
    ctx.fill();
  }

  // Bulb fill (always filled — it's the "mercury" base)
  ctx.fillStyle = COLORS.thermometerBulb;
  ctx.beginPath();
  ctx.arc(BULB_X, BULB_Y, BULB_R, 0, Math.PI * 2);
  ctx.fill();

  // Bulb percentage text
  ctx.fillStyle = COLORS.white;
  ctx.font = `bold ${14 * S}px "NotoSans-Bold", "Noto Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.round(progress)}%`, BULB_X, BULB_Y);
  ctx.textBaseline = 'alphabetic';

  // ---- Goal marker ----
  const goalX = THERM_X + THERM_W;
  ctx.strokeStyle = COLORS.goalLine;
  ctx.lineWidth = 2 * S;
  ctx.setLineDash([4 * S, 4 * S]);
  ctx.beginPath();
  ctx.moveTo(goalX, THERM_Y - 10 * S);
  ctx.lineTo(goalX, THERM_Y + THERM_H + 10 * S);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = `${11 * S}px "NotoSans-Medium", "Noto Sans", sans-serif`;
  ctx.fillStyle = COLORS.goalLine;
  ctx.textAlign = 'center';
  ctx.fillText('GOAL', goalX, THERM_Y - 14 * S);

  // ---- Milestone markers ----
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

  // ---- Stats row ----
  const statsY = THERM_Y + THERM_H + 50 * S;

  // Donors
  ctx.textAlign = 'center';
  ctx.font = `bold ${20 * S}px "NotoSans-Bold", "Noto Sans", sans-serif`;
  ctx.fillStyle = COLORS.titleText;
  ctx.fillText(`${donorCount}`, WIDTH * 0.3, statsY);
  ctx.font = `${11 * S}px "NotoSans-Regular", "Noto Sans", sans-serif`;
  ctx.fillStyle = COLORS.subtitleText;
  ctx.fillText('donors', WIDTH * 0.3, statsY + 18 * S);

  // Donations
  ctx.font = `bold ${20 * S}px "NotoSans-Bold", "Noto Sans", sans-serif`;
  ctx.fillStyle = COLORS.titleText;
  ctx.fillText(`${donationCount}`, WIDTH * 0.5, statsY);
  ctx.font = `${11 * S}px "NotoSans-Regular", "Noto Sans", sans-serif`;
  ctx.fillStyle = COLORS.subtitleText;
  ctx.fillText('donations', WIDTH * 0.5, statsY + 18 * S);

  // Remaining
  const remaining = Math.max(0, goalAmount - totalRaised);
  ctx.font = `bold ${20 * S}px "NotoSans-Bold", "Noto Sans", sans-serif`;
  ctx.fillStyle = remaining > 0 ? COLORS.titleText : COLORS.donorText;
  ctx.fillText(remaining > 0 ? `${currencySymbol}${remaining.toFixed(0)}` : 'DONE!', WIDTH * 0.7, statsY);
  ctx.font = `${11 * S}px "NotoSans-Regular", "Noto Sans", sans-serif`;
  ctx.fillStyle = COLORS.subtitleText;
  ctx.fillText(remaining > 0 ? 'to go' : 'goal reached!', WIDTH * 0.7, statsY + 18 * S);

  // ---- Latest donation announcement ----
  if (latestDonor || latestAmount) {
    const announceY = statsY + 55 * S;
    const donorName = isAnonymous ? 'Anonymous' : (latestDonor || 'Someone');
    const amountStr = latestAmount ? `${currencySymbol}${latestAmount.toFixed(2)}` : '';

    // Announcement box
    ctx.fillStyle = '#FFF0F5';
    ctx.beginPath();
    roundRect(ctx, PADDING + 20 * S, announceY - 18 * S, WIDTH - PADDING * 2 - 40 * S, 48 * S, 10 * S);
    ctx.fill();

    ctx.strokeStyle = '#FFD1E8';
    ctx.lineWidth = 1.5 * S;
    ctx.beginPath();
    roundRect(ctx, PADDING + 20 * S, announceY - 18 * S, WIDTH - PADDING * 2 - 40 * S, 48 * S, 10 * S);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = `${13 * S}px "NotoSans-Medium", "Noto Sans", sans-serif`;
    ctx.fillStyle = COLORS.donorText;
    ctx.fillText(`${donorName} donated ${amountStr}`, WIDTH / 2, announceY + 4 * S);

    ctx.font = `${10 * S}px "NotoSans-Regular", "Noto Sans", sans-serif`;
    ctx.fillStyle = COLORS.subtitleText;
    ctx.fillText('Thank you for helping our little friends!', WIDTH / 2, announceY + 22 * S);
  }

  // ---- Footer ----
  ctx.fillStyle = COLORS.footerText;
  ctx.font = `${10 * S}px "NotoSans-Regular", "Noto Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('HALT Go \u2022 helpingalllittlethings.org', WIDTH / 2, HEIGHT - PADDING);

  // ---- Try to add a cute emoji in the corner ----
  try {
    const emojiPath = path.join(EMOJIS_DIR, 'halt_hamster.png');
    if (fs.existsSync(emojiPath)) {
      const emoji = await loadImage(emojiPath);
      const emojiSize = 40 * S;
      ctx.drawImage(emoji, WIDTH - PADDING - emojiSize, PADDING - 4 * S, emojiSize, emojiSize);
    }
  } catch (e) {
    // Skip emoji decoration if not available
  }

  try {
    const emojiPath2 = path.join(EMOJIS_DIR, 'halt_rat.png');
    if (fs.existsSync(emojiPath2)) {
      const emoji2 = await loadImage(emojiPath2);
      const emojiSize = 40 * S;
      ctx.drawImage(emoji2, PADDING, PADDING - 4 * S, emojiSize, emojiSize);
    }
  } catch (e) {
    // Skip
  }

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
    filename = 'mini_therm.png',
  } = opts;

  const S = 2;
  const WIDTH = 400 * S;
  const HEIGHT = 80 * S;
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

  // Amount text
  ctx.textAlign = 'left';
  ctx.font = `bold ${16 * S}px "NotoSans-Bold", "Noto Sans", sans-serif`;
  ctx.fillStyle = COLORS.amountText;
  ctx.fillText(`${currencySymbol}${totalRaised.toFixed(2)}`, PADDING, PADDING + 16 * S);

  ctx.font = `${11 * S}px "NotoSans-Regular", "Noto Sans", sans-serif`;
  ctx.fillStyle = COLORS.subtitleText;
  ctx.textAlign = 'right';
  ctx.fillText(`of ${currencySymbol}${goalAmount.toFixed(2)}`, WIDTH - PADDING, PADDING + 16 * S);

  // Progress bar
  const barY = PADDING + 28 * S;
  const barH = 18 * S;
  const barW = WIDTH - PADDING * 2;
  const barR = 9 * S;

  ctx.fillStyle = COLORS.thermometerBg;
  ctx.beginPath();
  roundRect(ctx, PADDING, barY, barW, barH, barR);
  ctx.fill();

  if (progress > 0) {
    const fillW = Math.max(barR * 2, barW * (progress / 100));
    const gradient = ctx.createLinearGradient(PADDING, 0, PADDING + barW, 0);
    gradient.addColorStop(0, COLORS.thermometerFill);
    gradient.addColorStop(1, COLORS.thermometerFillEnd);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    roundRect(ctx, PADDING, barY, fillW, barH, barR);
    ctx.fill();
  }

  // Percentage
  ctx.textAlign = 'center';
  ctx.font = `bold ${10 * S}px "NotoSans-Bold", "Noto Sans", sans-serif`;
  ctx.fillStyle = progress > 15 ? COLORS.white : COLORS.titleText;
  const textX = progress > 15
    ? PADDING + (barW * (progress / 100)) / 2
    : PADDING + barW * (progress / 100) + 20 * S;
  ctx.fillText(`${Math.round(progress)}%`, textX, barY + barH / 2 + 4 * S);

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
