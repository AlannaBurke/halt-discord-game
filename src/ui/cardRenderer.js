const { createCanvas, loadImage } = require('@napi-rs/canvas');
const path = require('path');
const fs = require('fs');
const { CARD_INFO } = require('../utils/constants');

const DISCORD_CARDS_DIR = path.join(__dirname, '../../assets/cards/discord');
const TEMP_DIR = path.join(__dirname, '../../temp');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Card dimensions
const CARD_W = 240;
const CARD_H = 340;

// Cache loaded card images
const cardImageCache = new Map();

/**
 * Load a card image (with caching)
 * @param {string} cardType
 * @returns {Promise<Image>}
 */
async function loadCardImage(cardType) {
  if (cardImageCache.has(cardType)) {
    return cardImageCache.get(cardType);
  }

  const imgPath = path.join(DISCORD_CARDS_DIR, `${cardType}.png`);
  if (!fs.existsSync(imgPath)) {
    console.error(`Card image not found: ${imgPath}`);
    return null;
  }

  const img = await loadImage(imgPath);
  cardImageCache.set(cardType, img);
  return img;
}

/**
 * Generate a composite image of multiple cards (a player's hand)
 * Cards are displayed side by side with slight overlap for larger hands.
 *
 * @param {string[]} cardTypes - Array of card type strings
 * @param {string} filename - Output filename (without path)
 * @returns {Promise<string>} Path to the generated image
 */
async function generateHandImage(cardTypes, filename) {
  if (!cardTypes || cardTypes.length === 0) return null;

  // Calculate overlap based on number of cards
  let overlap;
  if (cardTypes.length <= 3) {
    overlap = 0;
  } else if (cardTypes.length <= 5) {
    overlap = 20;
  } else {
    overlap = 40;
  }

  const padding = 10;
  const totalW = padding * 2 + CARD_W + (cardTypes.length - 1) * (CARD_W - overlap);
  const totalH = padding * 2 + CARD_H;

  const canvas = createCanvas(totalW, totalH);
  const ctx = canvas.getContext('2d');

  // Transparent background
  ctx.clearRect(0, 0, totalW, totalH);

  // Draw each card
  for (let i = 0; i < cardTypes.length; i++) {
    const img = await loadCardImage(cardTypes[i]);
    if (img) {
      const x = padding + i * (CARD_W - overlap);
      const y = padding;
      ctx.drawImage(img, x, y, CARD_W, CARD_H);
    }
  }

  // Save to temp file
  const outputPath = path.join(TEMP_DIR, filename);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);

  return outputPath;
}

/**
 * Generate a selection display: cards laid out for choosing
 * Each card has a number label below it.
 *
 * @param {string[]} cardTypes - Array of card type strings
 * @param {string} filename - Output filename
 * @returns {Promise<string>} Path to the generated image
 */
async function generateSelectionImage(cardTypes, filename) {
  if (!cardTypes || cardTypes.length === 0) return null;

  const gap = 8;
  const labelHeight = 0; // No labels needed since buttons handle selection
  const padding = 8;

  // For many cards, scale them down
  let scale = 1;
  if (cardTypes.length > 5) {
    scale = 0.75;
  } else if (cardTypes.length > 6) {
    scale = 0.65;
  }

  const scaledW = Math.round(CARD_W * scale);
  const scaledH = Math.round(CARD_H * scale);

  const totalW = padding * 2 + cardTypes.length * scaledW + (cardTypes.length - 1) * gap;
  const totalH = padding * 2 + scaledH + labelHeight;

  const canvas = createCanvas(totalW, totalH);
  const ctx = canvas.getContext('2d');

  // Transparent background
  ctx.clearRect(0, 0, totalW, totalH);

  // Draw each card
  for (let i = 0; i < cardTypes.length; i++) {
    const img = await loadCardImage(cardTypes[i]);
    if (img) {
      const x = padding + i * (scaledW + gap);
      const y = padding;
      ctx.drawImage(img, x, y, scaledW, scaledH);
    }
  }

  // Save to temp file
  const outputPath = path.join(TEMP_DIR, filename);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);

  return outputPath;
}

/**
 * Generate a collectible card gallery for end-of-game.
 * Shows all cards a player collected across all rounds, grouped nicely.
 *
 * @param {string} playerName - Player's display name
 * @param {Object[]} roundScores - Array of { score, cards } per round
 * @param {number} totalScore - Final total score
 * @param {string} filename - Output filename
 * @returns {Promise<string>} Path to the generated image
 */
async function generateCollectibleGallery(playerName, allCards, totalScore, filename) {
  if (!allCards || allCards.length === 0) return null;

  // Sort cards by type for a nice display
  const sortOrder = [
    'rat', 'gerbil', 'pregnant_hamster', 'hay',
    'guinea_pig', 'rabbit', 'chinchilla', 'degus', 'sanctuary_cat',
  ];
  const sorted = [...allCards].sort((a, b) => sortOrder.indexOf(a) - sortOrder.indexOf(b));

  // Layout: up to 7 cards per row
  const maxPerRow = 7;
  const scale = 0.7;
  const scaledW = Math.round(CARD_W * scale);
  const scaledH = Math.round(CARD_H * scale);
  const gap = 6;
  const padding = 16;
  const headerHeight = 50;
  const footerHeight = 30;

  const rows = Math.ceil(sorted.length / maxPerRow);
  const maxCols = Math.min(sorted.length, maxPerRow);

  const totalW = padding * 2 + maxCols * scaledW + (maxCols - 1) * gap;
  const totalH = padding * 2 + headerHeight + rows * scaledH + (rows - 1) * gap + footerHeight;

  const canvas = createCanvas(totalW, totalH);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#FFF8F0';
  ctx.beginPath();
  roundRect(ctx, 0, 0, totalW, totalH, 16);
  ctx.fill();

  // Border
  ctx.strokeStyle = '#E8A0BF';
  ctx.lineWidth = 3;
  ctx.beginPath();
  roundRect(ctx, 1, 1, totalW - 2, totalH - 2, 16);
  ctx.stroke();

  // Header text
  ctx.fillStyle = '#4A4A4A';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${playerName}'s Collection`, totalW / 2, padding + 24);

  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#888888';
  ctx.fillText(`${sorted.length} cards • ${totalScore} points`, totalW / 2, padding + 42);

  // Draw cards
  for (let i = 0; i < sorted.length; i++) {
    const row = Math.floor(i / maxPerRow);
    const col = i % maxPerRow;
    const cardsInRow = Math.min(maxPerRow, sorted.length - row * maxPerRow);
    const rowOffset = (maxCols - cardsInRow) * (scaledW + gap) / 2;

    const img = await loadCardImage(sorted[i]);
    if (img) {
      const x = padding + rowOffset + col * (scaledW + gap);
      const y = padding + headerHeight + row * (scaledH + gap);
      ctx.drawImage(img, x, y, scaledW, scaledH);
    }
  }

  // Footer
  ctx.fillStyle = '#CCAACC';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HALT Go • helpingalllittlethings.org', totalW / 2, totalH - padding);

  // Save
  const outputPath = path.join(TEMP_DIR, filename);
  const buffer = canvas.toBuffer('image/png');
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

/**
 * Clean up temp files for a specific game
 * @param {string} prefix - Filename prefix to clean
 */
function cleanupTempFiles(prefix) {
  try {
    const files = fs.readdirSync(TEMP_DIR);
    for (const file of files) {
      if (file.startsWith(prefix)) {
        fs.unlinkSync(path.join(TEMP_DIR, file));
      }
    }
  } catch (e) {
    // Ignore cleanup errors
  }
}

module.exports = {
  generateHandImage,
  generateSelectionImage,
  generateCollectibleGallery,
  cleanupTempFiles,
};
