# Technical Architecture

## Stack
- **Language**: JavaScript/Node.js
- **Discord Library**: discord.js v14
- **Runtime**: Node.js 22
- **Package Manager**: pnpm

## Project Structure
```
rescue-game/
├── bot/
│   ├── index.js              # Bot entry point
│   ├── commands/
│   │   ├── game.js           # /game start, /game join, /game status
│   │   └── help.js           # /help command
│   ├── game/
│   │   ├── GameManager.js    # Manages active games
│   │   ├── Game.js           # Single game instance
│   │   ├── Player.js         # Player state
│   │   ├── CardGenerator.js  # Random card generation with weights
│   │   └── Scoring.js        # All scoring logic
│   ├── ui/
│   │   ├── embeds.js         # Discord embed builders
│   │   ├── buttons.js        # Button/component builders
│   │   └── cardDisplay.js    # Card art display helpers
│   └── utils/
│       ├── constants.js      # Card types, scoring tables, config
│       └── timer.js          # Phase timer utility
├── assets/
│   └── cards/                # Card art images
├── package.json
├── .env.example
└── README.md
```

## Game Flow (Discord)
1. Player runs `/game start` → creates lobby, shows join button
2. Other players click "Join Game" button
3. Host clicks "Start Game" → begins Round 1, Phase 1
4. Each phase: Bot DMs each player their card choices as buttons
5. Player clicks a card button to select
6. Bot waits for all players (with optional timer)
7. After Phase 7: Bot posts round scores in channel
8. After Round 3: Bot posts final scores + Sanctuary Cat bonus

## Key Design Decisions
- DM-based card selection (private choices)
- Channel-based announcements (scores, phase progress)
- Button interactions for card selection (not text commands)
- Ephemeral messages where appropriate
- Card images as embed thumbnails/images
