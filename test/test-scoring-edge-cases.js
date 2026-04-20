/**
 * Test edge cases in scoring logic
 */
const Player = require('../src/game/Player');
const Scoring = require('../src/game/Scoring');
const { CARD_TYPES } = require('../src/utils/constants');

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ ${testName}`);
    passed++;
  } else {
    console.log(`  ❌ ${testName}`);
    failed++;
  }
}

// Helper to create player with specific cards
function makePlayer(id, name, cards) {
  const p = new Player(id, name);
  p.roundCards = [...cards];
  return p;
}

console.log('=== Rat Scoring ===');
{
  const p = makePlayer('1', 'Test', []);
  const all = [p];
  let r;

  // 0 rats = 0
  p.roundCards = [];
  r = Scoring.calculateRoundScore(p, all);
  assert(r.breakdown.rats.points === 0, '0 rats = 0 pts');

  // 1 rat = 1
  p.roundCards = [CARD_TYPES.RAT];
  r = Scoring.calculateRoundScore(p, all);
  assert(r.breakdown.rats.points === 1, '1 rat = 1 pt');

  // 2 rats = 3
  p.roundCards = [CARD_TYPES.RAT, CARD_TYPES.RAT];
  r = Scoring.calculateRoundScore(p, all);
  assert(r.breakdown.rats.points === 3, '2 rats = 3 pts');

  // 5 rats = 15
  p.roundCards = Array(5).fill(CARD_TYPES.RAT);
  r = Scoring.calculateRoundScore(p, all);
  assert(r.breakdown.rats.points === 15, '5 rats = 15 pts');

  // 7 rats = still 15 (capped)
  p.roundCards = Array(7).fill(CARD_TYPES.RAT);
  r = Scoring.calculateRoundScore(p, all);
  assert(r.breakdown.rats.points === 15, '7 rats = 15 pts (capped)');
}

console.log('\n=== Gerbil Majority ===');
{
  // 2 players, clear winner
  const p1 = makePlayer('1', 'A', [CARD_TYPES.GERBIL, CARD_TYPES.GERBIL, CARD_TYPES.GERBIL]);
  const p2 = makePlayer('2', 'B', [CARD_TYPES.GERBIL]);
  let all = [p1, p2];

  let r1 = Scoring.calculateRoundScore(p1, all);
  let r2 = Scoring.calculateRoundScore(p2, all);
  assert(r1.breakdown.gerbils.points === 6, 'Most gerbils = 6 pts');
  assert(r2.breakdown.gerbils.points === 3, 'Second most = 3 pts');

  // Tied for first
  const p3 = makePlayer('3', 'C', [CARD_TYPES.GERBIL, CARD_TYPES.GERBIL]);
  const p4 = makePlayer('4', 'D', [CARD_TYPES.GERBIL, CARD_TYPES.GERBIL]);
  all = [p3, p4];

  r1 = Scoring.calculateRoundScore(p3, all);
  r2 = Scoring.calculateRoundScore(p4, all);
  assert(r1.breakdown.gerbils.points === 4, 'Tied for first (2 players) = 4 pts each (floor(9/2))');
  assert(r2.breakdown.gerbils.points === 4, 'Tied for first (2 players) = 4 pts each');

  // No gerbils at all
  const p5 = makePlayer('5', 'E', [CARD_TYPES.RAT]);
  const p6 = makePlayer('6', 'F', [CARD_TYPES.RAT]);
  all = [p5, p6];

  r1 = Scoring.calculateRoundScore(p5, all);
  assert(r1.breakdown.gerbils.points === 0, 'No gerbils = 0 pts');
}

console.log('\n=== Hay Multiplier ===');
{
  // 1 hay + 1 guinea pig = 9 (3*3)
  const p = makePlayer('1', 'Test', [CARD_TYPES.HAY, CARD_TYPES.GUINEA_PIG]);
  const all = [p];
  let r = Scoring.calculateRoundScore(p, all);
  assert(r.breakdown.guinea_pig.points === 9, '1 hay + 1 guinea pig = 9 pts');

  // 1 hay + 1 rabbit = 6 (2*3)
  p.roundCards = [CARD_TYPES.HAY, CARD_TYPES.RABBIT];
  r = Scoring.calculateRoundScore(p, all);
  assert(r.breakdown.rabbit.points === 6, '1 hay + 1 rabbit = 6 pts');

  // 1 hay + 1 chinchilla = 3 (1*3)
  p.roundCards = [CARD_TYPES.HAY, CARD_TYPES.CHINCHILLA];
  r = Scoring.calculateRoundScore(p, all);
  assert(r.breakdown.chinchilla.points === 3, '1 hay + 1 chinchilla = 3 pts');

  // 2 hay + 1 guinea pig + 1 rabbit = 9 + 6 = 15
  p.roundCards = [CARD_TYPES.HAY, CARD_TYPES.HAY, CARD_TYPES.GUINEA_PIG, CARD_TYPES.RABBIT];
  r = Scoring.calculateRoundScore(p, all);
  assert(r.breakdown.guinea_pig.points === 9, '2 hay: guinea pig gets tripled');
  assert(r.breakdown.rabbit.points === 6, '2 hay: rabbit gets tripled');

  // Hay with no targets = wasted
  p.roundCards = [CARD_TYPES.HAY, CARD_TYPES.HAY, CARD_TYPES.RAT];
  r = Scoring.calculateRoundScore(p, all);
  assert(r.breakdown.hay.used === 0, 'Hay with no targets = 0 used');

  // More hay than targets
  p.roundCards = [CARD_TYPES.HAY, CARD_TYPES.HAY, CARD_TYPES.HAY, CARD_TYPES.RABBIT];
  r = Scoring.calculateRoundScore(p, all);
  assert(r.breakdown.rabbit.points === 6, 'Excess hay: only 1 rabbit tripled');
  assert(r.breakdown.hay.used === 1, 'Only 1 hay used');
}

console.log('\n=== Degu Set Bonus ===');
{
  const p = makePlayer('1', 'Test', []);
  const all = [p];

  // 0 degu = 0
  p.roundCards = [];
  let r = Scoring.calculateRoundScore(p, all);
  assert(r.breakdown.degus.points === 0, '0 degu = 0 pts');

  // 2 degu = 0 (incomplete set)
  p.roundCards = [CARD_TYPES.DEGUS, CARD_TYPES.DEGUS];
  r = Scoring.calculateRoundScore(p, all);
  assert(r.breakdown.degus.points === 0, '2 degu = 0 pts');

  // 3 degu = 10
  p.roundCards = [CARD_TYPES.DEGUS, CARD_TYPES.DEGUS, CARD_TYPES.DEGUS];
  r = Scoring.calculateRoundScore(p, all);
  assert(r.breakdown.degus.points === 10, '3 degu = 10 pts');

  // 6 degu = 20 (2 sets)
  p.roundCards = Array(6).fill(CARD_TYPES.DEGUS);
  r = Scoring.calculateRoundScore(p, all);
  assert(r.breakdown.degus.points === 20, '6 degu = 20 pts (2 sets)');

  // 7 degu = 20 (2 sets, 1 leftover)
  p.roundCards = Array(7).fill(CARD_TYPES.DEGUS);
  r = Scoring.calculateRoundScore(p, all);
  assert(r.breakdown.degus.points === 20, '7 degu = 20 pts (2 sets + 1 leftover)');
}

console.log('\n=== Sanctuary Cat End-Game ===');
{
  const p1 = makePlayer('1', 'A', []);
  const p2 = makePlayer('2', 'B', []);
  const p3 = makePlayer('3', 'C', []);

  // Clear winner and loser
  p1.sanctuaryCats = 5;
  p2.sanctuaryCats = 2;
  p3.sanctuaryCats = 0;

  let bonuses = Scoring.calculateSanctuaryCatBonus([p1, p2, p3]);
  assert(bonuses['1'] === 6, 'Most cats = +6');
  assert(bonuses['2'] === 0, 'Middle cats = 0');
  assert(bonuses['3'] === -6, 'Least cats = -6');

  // All tied
  p1.sanctuaryCats = 3;
  p2.sanctuaryCats = 3;
  p3.sanctuaryCats = 3;

  bonuses = Scoring.calculateSanctuaryCatBonus([p1, p2, p3]);
  assert(bonuses['1'] === 0, 'All tied = 0 for everyone');
  assert(bonuses['2'] === 0, 'All tied = 0');
  assert(bonuses['3'] === 0, 'All tied = 0');

  // Tied for most
  p1.sanctuaryCats = 4;
  p2.sanctuaryCats = 4;
  p3.sanctuaryCats = 1;

  bonuses = Scoring.calculateSanctuaryCatBonus([p1, p2, p3]);
  assert(bonuses['1'] === 3, 'Tied for most (2 way) = +3 each');
  assert(bonuses['2'] === 3, 'Tied for most (2 way) = +3 each');
  assert(bonuses['3'] === -6, 'Alone at least = -6');

  // Tied for least
  p1.sanctuaryCats = 5;
  p2.sanctuaryCats = 1;
  p3.sanctuaryCats = 1;

  bonuses = Scoring.calculateSanctuaryCatBonus([p1, p2, p3]);
  assert(bonuses['1'] === 6, 'Alone at most = +6');
  assert(bonuses['2'] === -3, 'Tied for least (2 way) = -3 each');
  assert(bonuses['3'] === -3, 'Tied for least (2 way) = -3 each');
}

console.log('\n=== Flat Value Cards ===');
{
  const p = makePlayer('1', 'Test', []);
  const all = [p];

  p.roundCards = [CARD_TYPES.GUINEA_PIG, CARD_TYPES.GUINEA_PIG];
  let r = Scoring.calculateRoundScore(p, all);
  assert(r.breakdown.guinea_pig.points === 6, '2 guinea pigs = 6 pts');

  p.roundCards = [CARD_TYPES.RABBIT, CARD_TYPES.RABBIT, CARD_TYPES.RABBIT];
  r = Scoring.calculateRoundScore(p, all);
  assert(r.breakdown.rabbit.points === 6, '3 rabbits = 6 pts');

  p.roundCards = [CARD_TYPES.CHINCHILLA, CARD_TYPES.CHINCHILLA, CARD_TYPES.CHINCHILLA, CARD_TYPES.CHINCHILLA];
  r = Scoring.calculateRoundScore(p, all);
  assert(r.breakdown.chinchilla.points === 4, '4 chinchillas = 4 pts');
}

console.log('\n=== Combined Scoring ===');
{
  // Complex hand: 2 rats, 1 hay, 2 guinea pigs, 1 degu, 1 sanctuary cat
  const p = makePlayer('1', 'Test', [
    CARD_TYPES.RAT, CARD_TYPES.RAT,
    CARD_TYPES.HAY,
    CARD_TYPES.GUINEA_PIG, CARD_TYPES.GUINEA_PIG,
    CARD_TYPES.DEGUS,
    CARD_TYPES.SANCTUARY_CAT,
  ]);
  const all = [p];

  const r = Scoring.calculateRoundScore(p, all);
  // Rats: 2 = 3 pts
  // Hay: 1, applied to first guinea pig = 9, second = 3 → total guinea pig = 12
  // Degu: 1 = 0
  // Sanctuary cat: 0 (end game only)
  const expected = 3 + 12 + 0 + 0;
  assert(r.total === expected, `Combined score = ${expected} (got ${r.total})`);
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
