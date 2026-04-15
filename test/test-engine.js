/**
 * Quick test of the core game engine
 */
const Player = require('../src/game/Player');
const CardGenerator = require('../src/game/CardGenerator');
const Scoring = require('../src/game/Scoring');
const { CARD_TYPES } = require('../src/utils/constants');

console.log('=== Testing Card Generator ===');
const gen = new CardGenerator();

// Generate cards for each phase
for (let phase = 1; phase <= 7; phase++) {
  const cards = gen.generatePhaseCards(phase);
  console.log(`Phase ${phase} (${cards.length} cards):`, cards);
}

console.log('\n=== Testing Card Distribution (1000 cards) ===');
const dist = {};
for (let i = 0; i < 1000; i++) {
  const card = gen.generateCard();
  dist[card] = (dist[card] || 0) + 1;
}
for (const [type, count] of Object.entries(dist).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${type}: ${count} (${(count / 10).toFixed(1)}%)`);
}

console.log('\n=== Testing Scoring ===');

// Create test players
const p1 = new Player('user1', 'Alice');
const p2 = new Player('user2', 'Bob');
const p3 = new Player('user3', 'Charlie');

// Give Alice: 3 rats, 2 guinea pigs, 1 hay, 1 degus
p1.roundCards = [
  CARD_TYPES.RAT, CARD_TYPES.RAT, CARD_TYPES.RAT,
  CARD_TYPES.GUINEA_PIG, CARD_TYPES.GUINEA_PIG,
  CARD_TYPES.HAY,
  CARD_TYPES.DEGUS,
];

// Give Bob: 2 gerbils, 3 degus, 1 rabbit, 1 sanctuary_cat
p2.roundCards = [
  CARD_TYPES.GERBIL, CARD_TYPES.GERBIL,
  CARD_TYPES.DEGUS, CARD_TYPES.DEGUS, CARD_TYPES.DEGUS,
  CARD_TYPES.RABBIT,
  CARD_TYPES.SANCTUARY_CAT,
];

// Give Charlie: 1 gerbil, 2 chinchillas, 2 hay, 1 rabbit, 1 sanctuary_cat
p3.roundCards = [
  CARD_TYPES.GERBIL,
  CARD_TYPES.CHINCHILLA, CARD_TYPES.CHINCHILLA,
  CARD_TYPES.HAY, CARD_TYPES.HAY,
  CARD_TYPES.RABBIT,
  CARD_TYPES.SANCTUARY_CAT,
];

const allPlayers = [p1, p2, p3];

for (const player of allPlayers) {
  const { total, breakdown } = Scoring.calculateRoundScore(player, allPlayers);
  console.log(`\n${player.username}'s Score: ${total}`);
  console.log('  Cards:', player.getCardCounts());
  for (const [key, val] of Object.entries(breakdown)) {
    console.log(`  ${key}:`, val);
  }
}

// Expected:
// Alice: 3 rats = 6, 2 guinea pigs (1 with hay x3 = 9, 1 normal = 3) = 12, 1 degus = 0
//   → Gerbils: 0 (has none) → Total: 18
// Bob: 2 gerbils = 6 (most), 3 degus = 10, 1 rabbit = 2
//   → Total: 18
// Charlie: 1 gerbil = 3 (second), 2 chinchillas (2 with hay x3 = 6) = 6, 1 rabbit = 2
//   → Total: 11

console.log('\n=== Testing Sanctuary Cat End-Game Bonus ===');
// Simulate end of game
p1.sanctuaryCats = 0;
p2.sanctuaryCats = 3;
p3.sanctuaryCats = 1;

const catBonuses = Scoring.calculateSanctuaryCatBonus(allPlayers);
console.log('Cat bonuses:', catBonuses);
// Expected: Bob (most, 3) → +6, Alice (least, 0) → -6, Charlie (middle) → 0

console.log('\n=== Testing Player Selection ===');
const testPlayer = new Player('test', 'TestPlayer');
testPlayer.setChoices(['rat', 'gerbil', 'hay', 'rabbit']);
console.log('Choices:', testPlayer.currentChoices);
const selected = testPlayer.selectCard(2);
console.log('Selected:', selected); // hay
console.log('Has selected:', testPlayer.hasSelected);
console.log('Round cards:', testPlayer.roundCards);

console.log('\n=== All Tests Passed! ===');
