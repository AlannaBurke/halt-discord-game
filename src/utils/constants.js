// Card type definitions
const CARD_TYPES = {
  RAT: 'rat',
  GERBIL: 'gerbil',
  PREGNANT_HAMSTER: 'pregnant_hamster',
  HAY: 'hay',
  GUINEA_PIG: 'guinea_pig',
  RABBIT: 'rabbit',
  CHINCHILLA: 'chinchilla',
  DEGUS: 'degus',
  SANCTUARY_CAT: 'sanctuary_cat',
};

// Card display info
const CARD_INFO = {
  [CARD_TYPES.RAT]: {
    name: 'Rat',
    emoji: '🐀',
    customEmojiName: 'halt_rat',
    description: 'Scaling set score (1→1, 2→3, 3→6, 4→10, 5+→15)',
    color: '#E8A0BF',
    image: 'rat.png',
  },
  [CARD_TYPES.GERBIL]: {
    name: 'Gerbil',
    emoji: '🐹',
    customEmojiName: 'halt_gerbil',
    description: 'Majority bonus: Most→+6, 2nd→+3',
    color: '#F5D5A0',
    image: 'gerbil.png',
  },
  [CARD_TYPES.PREGNANT_HAMSTER]: {
    name: 'Pregnant Hamster',
    emoji: '🤰',
    customEmojiName: 'halt_hamster',
    description: 'Swap this card for 2 new random cards!',
    color: '#B8E8D0',
    image: 'pregnant_hamster.png',
  },
  [CARD_TYPES.HAY]: {
    name: 'Hay',
    emoji: '🌾',
    customEmojiName: 'halt_hay',
    description: 'Triples the value of next Rabbit, Guinea Pig, or Chinchilla',
    color: '#E8E0A0',
    image: 'hay.png',
  },
  [CARD_TYPES.GUINEA_PIG]: {
    name: 'Guinea Pig',
    emoji: '🐹',
    customEmojiName: 'halt_guineapig',
    description: '3 points each',
    color: '#D4A574',
    image: 'guinea_pig.png',
  },
  [CARD_TYPES.RABBIT]: {
    name: 'Rabbit',
    emoji: '🐰',
    customEmojiName: 'halt_rabbit',
    description: '2 points each',
    color: '#D4B8E8',
    image: 'rabbit.png',
  },
  [CARD_TYPES.CHINCHILLA]: {
    name: 'Chinchilla',
    emoji: '🐭',
    customEmojiName: 'halt_chinchilla',
    description: '1 point each',
    color: '#C8B8D8',
    image: 'chinchilla.png',
  },
  [CARD_TYPES.DEGUS]: {
    name: 'Degu',
    emoji: '🐿️',
    customEmojiName: 'halt_degu',
    description: 'Set of 3 = 10 points, otherwise 0',
    color: '#C8B090',
    image: 'degus.png',
  },
  [CARD_TYPES.SANCTUARY_CAT]: {
    name: 'Sanctuary Cat',
    emoji: '🐱',
    customEmojiName: 'halt_cat',
    description: 'End-game: Most→+6, Least→-6',
    color: '#F0D8A0',
    image: 'sanctuary_cat.png',
  },
};

// Card generation weights (probability distribution)
// Higher weight = more likely to appear
const CARD_WEIGHTS = {
  [CARD_TYPES.RAT]: 14,
  [CARD_TYPES.GERBIL]: 12,
  [CARD_TYPES.PREGNANT_HAMSTER]: 6,
  [CARD_TYPES.HAY]: 10,
  [CARD_TYPES.GUINEA_PIG]: 12,
  [CARD_TYPES.RABBIT]: 14,
  [CARD_TYPES.CHINCHILLA]: 14,
  [CARD_TYPES.DEGUS]: 10,
  [CARD_TYPES.SANCTUARY_CAT]: 8,
};

// Rat scoring table: index = number of rats, value = points
const RAT_SCORE_TABLE = [0, 1, 3, 6, 10, 15];

// Game configuration
const GAME_CONFIG = {
  TOTAL_ROUNDS: 3,
  PHASES_PER_ROUND: 7,
  STARTING_CHOICES: 8,
  PHASE_TIMER_SECONDS: 60,       // seconds per phase selection
  LOBBY_TIMEOUT_SECONDS: 300,     // 5 minutes to start game
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 10,
};

// Flat point values
const FLAT_POINTS = {
  [CARD_TYPES.GUINEA_PIG]: 3,
  [CARD_TYPES.RABBIT]: 2,
  [CARD_TYPES.CHINCHILLA]: 1,
};

// Cards that can be multiplied by Hay
const HAY_TARGETS = [
  CARD_TYPES.RABBIT,
  CARD_TYPES.GUINEA_PIG,
  CARD_TYPES.CHINCHILLA,
];

module.exports = {
  CARD_TYPES,
  CARD_INFO,
  CARD_WEIGHTS,
  RAT_SCORE_TABLE,
  GAME_CONFIG,
  FLAT_POINTS,
  HAY_TARGETS,
};
