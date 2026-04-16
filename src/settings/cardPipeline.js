/**
 * Card Regeneration Pipeline
 *
 * Generates Discord-sized card images (240x340) from either custom or original art.
 * Uses @napi-rs/canvas for Node.js-native image processing.
 * Mirrors the Python generate-cards.py logic but runs at runtime.
 */

const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');
const fs = require('fs');

// Paths
const ASSETS_DIR = path.join(__dirname, '../../assets/cards');
const CUSTOM_DIR = path.join(__dirname, '../../assets/cards/custom');
const DISCORD_DIR = path.join(__dirname, '../../assets/cards/discord');

// Register fonts
try {
  GlobalFonts.registerFromPath('/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf', 'NotoSans-Bold');
  GlobalFonts.registerFromPath('/usr/share/fonts/truetype/noto/NotoSans-Medium.ttf', 'NotoSans-Medium');
  GlobalFonts.registerFromPath('/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf', 'NotoSans-Regular');
} catch (e) {
  // Fonts may not be available on all systems; fall back to system fonts
  console.warn('Could not register Noto Sans fonts, using system defaults');
}

// Render at 2x for crisp text
const SCALE = 2;
const CARD_W = 240 * SCALE;
const CARD_H = 340 * SCALE;
const CORNER_RADIUS = 16 * SCALE;
const BORDER_WIDTH = 4 * SCALE;
const ART_TOP = 54 * SCALE;
const ART_BOTTOM = 88 * SCALE;
const ART_PADDING = 20 * SCALE;
const FINAL_W = 240;
const FINAL_H = 340;

// Card definitions (matches Python script)
const CARD_DEFS = {
  rat: { name: 'Rat', scoring: ['1=1  2=3  3=6', '4=10  5+=15'], color: '#E8A0BF', border: '#C47A9A' },
  gerbil: { name: 'Gerbil', scoring: ['Most: +6 pts', '2nd most: +3 pts'], color: '#F5D5A0', border: '#D4B070' },
  pregnant_hamster: { name: 'Pregnant Hamster', scoring: ['Swap for', '2 random cards!'], color: '#B8E8D0', border: '#8CC8A8' },
  hay: { name: 'Hay', scoring: ['Triples next', 'GP / Rabbit / Chin'], color: '#E8E0A0', border: '#C8C070' },
  guinea_pig: { name: 'Guinea Pig', scoring: ['3 points each'], color: '#D4A574', border: '#B08050' },
  rabbit: { name: 'Rabbit', scoring: ['2 points each'], color: '#D4B8E8', border: '#A888C8' },
  chinchilla: { name: 'Chinchilla', scoring: ['1 point each'], color: '#C8B8D8', border: '#9888B8' },
  degus: { name: 'Degus', scoring: ['Set of 3 = 10 pts', 'Otherwise 0'], color: '#C8B090', border: '#A89070' },
  sanctuary_cat: { name: 'Sanctuary Cat', scoring: ['End: Most +6', 'Least -6'], color: '#F0D8A0', border: '#D0B870' },
};

/**
 * Parse hex color to rgba string
 */
function hexToRgba(hex, alpha = 1) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Draw a rounded rectangle on a canvas context
 */
function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
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
 * Find the source image for a card (custom first, then original)
 */
function findSourceImage(cardId) {
  // Check for custom image
  const extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
  for (const ext of extensions) {
    const customPath = path.join(CUSTOM_DIR, `${cardId}${ext}`);
    if (fs.existsSync(customPath)) return customPath;
  }
  // Fall back to original
  const originalPath = path.join(ASSETS_DIR, `${cardId}.png`);
  if (fs.existsSync(originalPath)) return originalPath;
  return null;
}

/**
 * Regenerate a single card's Discord-sized image
 * @param {string} cardId - The card type ID
 * @returns {Promise<string>} Path to the generated image
 */
async function regenerateCard(cardId) {
  const def = CARD_DEFS[cardId];
  if (!def) throw new Error(`Unknown card ID: ${cardId}`);

  const canvas = createCanvas(CARD_W, CARD_H);
  const ctx = canvas.getContext('2d');

  // Clear
  ctx.clearRect(0, 0, CARD_W, CARD_H);

  // Draw border (outer rounded rect)
  ctx.fillStyle = def.border;
  roundedRect(ctx, 0, 0, CARD_W, CARD_H, CORNER_RADIUS);
  ctx.fill();

  // Draw inner white background
  const m = BORDER_WIDTH;
  ctx.fillStyle = '#FFFFFF';
  roundedRect(ctx, m, m, CARD_W - m * 2, CARD_H - m * 2, CORNER_RADIUS - 2);
  ctx.fill();

  // Draw colored header bar
  ctx.fillStyle = def.color;
  roundedRect(ctx, m, m, CARD_W - m * 2, ART_TOP - m, CORNER_RADIUS - 2);
  ctx.fill();
  // Square off bottom of header
  ctx.fillRect(m, ART_TOP - CORNER_RADIUS, CARD_W - m * 2, CORNER_RADIUS);

  // Draw colored footer bar
  const footerTop = CARD_H - ART_BOTTOM;
  ctx.fillStyle = def.color;
  roundedRect(ctx, m, footerTop, CARD_W - m * 2, ART_BOTTOM - m, CORNER_RADIUS - 2);
  ctx.fill();
  // Square off top of footer
  ctx.fillRect(m, footerTop, CARD_W - m * 2, CORNER_RADIUS);

  // Load and draw the source art
  const sourcePath = findSourceImage(cardId);
  if (sourcePath) {
    try {
      const art = await loadImage(sourcePath);

      // Calculate art area
      const artAreaW = CARD_W - ART_PADDING * 2;
      const artAreaH = CARD_H - ART_TOP - ART_BOTTOM - 10 * SCALE;

      // Fit maintaining aspect ratio
      const artRatio = art.width / art.height;
      const areaRatio = artAreaW / artAreaH;

      let newW, newH;
      if (artRatio > areaRatio) {
        newW = artAreaW;
        newH = Math.round(artAreaW / artRatio);
      } else {
        newH = artAreaH;
        newW = Math.round(artAreaH * artRatio);
      }

      const artX = (CARD_W - newW) / 2;
      const artY = ART_TOP + (artAreaH - newH) / 2 + 5 * SCALE;

      ctx.drawImage(art, artX, artY, newW, newH);
    } catch (e) {
      console.error(`Failed to load art for ${cardId}:`, e.message);
    }
  }

  // Draw card name (header)
  const isLongName = cardId === 'pregnant_hamster' || cardId === 'sanctuary_cat';
  const nameFontSize = isLongName ? 20 * SCALE : 28 * SCALE;
  ctx.font = `bold ${nameFontSize}px "NotoSans-Bold", "Noto Sans", sans-serif`;
  ctx.fillStyle = '#373737';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(def.name, CARD_W / 2, (m + ART_TOP) / 2);

  // Draw scoring text (footer)
  const scoreFontSize = 18 * SCALE;
  ctx.font = `500 ${scoreFontSize}px "NotoSans-Medium", "Noto Sans", sans-serif`;
  ctx.fillStyle = '#3C3C3C';
  const lineHeight = 24 * SCALE;
  const totalTextH = def.scoring.length * lineHeight;
  const scoreStartY = footerTop + (ART_BOTTOM - m - totalTextH) / 2 - 4 * SCALE + lineHeight / 2;

  for (let i = 0; i < def.scoring.length; i++) {
    ctx.fillText(def.scoring[i], CARD_W / 2, scoreStartY + i * lineHeight);
  }

  // Draw subtle branding
  const brandFontSize = 12 * SCALE;
  ctx.font = `${brandFontSize}px "NotoSans-Regular", "Noto Sans", sans-serif`;
  ctx.fillStyle = hexToRgba(def.border, 0.55);
  ctx.fillText('HALT Go', CARD_W / 2, CARD_H - m - 9 * SCALE);

  // Apply rounded corners by compositing
  const maskCanvas = createCanvas(CARD_W, CARD_H);
  const maskCtx = maskCanvas.getContext('2d');
  roundedRect(maskCtx, 0, 0, CARD_W, CARD_H, CORNER_RADIUS);
  maskCtx.fill();

  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(maskCanvas, 0, 0);
  ctx.globalCompositeOperation = 'source-over';

  // Downscale to final size
  const finalCanvas = createCanvas(FINAL_W, FINAL_H);
  const finalCtx = finalCanvas.getContext('2d');
  finalCtx.drawImage(canvas, 0, 0, FINAL_W, FINAL_H);

  // Save
  const outputPath = path.join(DISCORD_DIR, `${cardId}.png`);
  const buffer = finalCanvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);

  console.log(`  Regenerated Discord card: ${cardId} -> ${outputPath}`);
  return outputPath;
}

/**
 * Regenerate all cards
 */
async function regenerateAllCards() {
  console.log('Regenerating all Discord card images...');
  for (const cardId of Object.keys(CARD_DEFS)) {
    await regenerateCard(cardId);
  }
  console.log('All cards regenerated!');
}

module.exports = { regenerateCard, regenerateAllCards, findSourceImage };
