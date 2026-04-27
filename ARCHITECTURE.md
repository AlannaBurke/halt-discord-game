# Technical Architecture

## Stack

- **Language**: JavaScript/Node.js
- **Discord Library**: discord.js v14
- **Runtime**: Node.js 18+
- **Package Manager**: pnpm
- **Card Rendering**: @napi-rs/canvas (native image compositing)
- **Settings Dashboard**: Express.js + Discord OAuth2
- **File Uploads**: multer

## Project Structure

```
halt-discord-game/
├── src/
│   ├── index.js                  # Bot entry point + settings server startup
│   ├── commands/
│   │   └── deploy-commands.js    # Slash command registration (/game, /help, /status, fundraiser cmds)
│   ├── fundraiser/
│   │   ├── Fundraiser.js         # Fundraiser engine (donations, config, persistence)
│   │   ├── fundraiserEmbeds.js   # Fundraiser Discord embed builders
│   │   ├── thermometer.js        # Thermometer progress graphic generator
│   │   ├── paypalWebhook.js      # PayPal webhook handler (auto-track donations)
│   │   └── patreonWebhook.js     # Patreon webhook handler (auto-track pledges)
│   ├── game/
│   │   ├── GameManager.js        # Manages active games across channels
│   │   ├── Game.js               # Single game instance (lobby, rounds, phases, computer player)
│   │   ├── Player.js             # Player state (cards, scores, allCards tracking)
│   │   ├── CardGenerator.js      # Weighted random card generation
│   │   └── Scoring.js            # All scoring logic (rats, gerbils, hay, degu, cats)
│   ├── ui/
│   │   ├── embeds.js             # Discord embed builders (10 embed types)
│   │   ├── buttons.js            # Button component builders (lobby, selection, computer toggle)
│   │   └── cardRenderer.js       # Runtime card image compositing (hand, selection, gallery)
│   ├── settings/
│   │   ├── server.js             # Express settings dashboard (OAuth2, upload API, fundraiser API, role check)
│   │   ├── cardPipeline.js       # Card regeneration pipeline (generates Discord-sized cards)
│   │   └── public/
│   │       └── index.html        # Settings dashboard SPA (gameplay, card manager, fundraiser, setup guide)
│   └── utils/
│       └── constants.js          # Card types, scoring tables, weights, game config
├── assets/
│   └── cards/
│       ├── *.png                 # Original kawaii card art (9 cards)
│       ├── custom/               # User-uploaded custom card art
│       └── discord/              # Discord-sized cards with frames, titles, scoring text
├── scripts/
│   └── generate-cards.py         # Offline card image generation (Python/Pillow, 2x render)
├── test/
│   ├── test-engine.js            # Core engine tests
│   └── test-scoring-edge-cases.js  # 39 comprehensive scoring edge case tests
├── .env.example                  # Environment variable template with documentation
├── package.json
├── GAME_DESIGN.md                # Game design document
├── ARCHITECTURE.md               # This file
└── README.md                     # Setup and usage guide
```

## Game Flow

1. Player runs `/game` in a channel — creates a lobby with Join, Start, and Computer Player toggle buttons
2. Other players click **Join Game** to join (2-10 players)
3. Host optionally toggles **Computer Player** (HALTbot) for testing or solo play
4. Host clicks **Start Game** — begins Round 1, Phase 1
5. Each phase:
   - Bot announces the phase in the game channel
   - Bot DMs each human player a card selection image with buttons
   - Computer player (if enabled) auto-selects randomly after a 1-4 second delay
   - Players click a button to choose a card
   - 60-second timer auto-selects randomly if a player doesn't pick
6. After Phase 7: Bot posts round scores in the channel
7. After Round 3: Bot applies Sanctuary Cat end-game bonuses, posts final scores, and sends collectible gallery images to each player

## Key Design Decisions

- **DM-based card selection** — Keeps choices private from other players
- **Channel-based announcements** — Scores, phase progress, and game events are visible to all
- **Button interactions** — Card selection via Discord buttons (not text commands)
- **Card images via @napi-rs/canvas** — Runtime compositing of card art into selection displays and collectible galleries
- **2x render pipeline** — Cards rendered at 480x680 then downscaled to 240x340 for crisp text at Discord embed sizes
- **Image cache with invalidation** — Card images are cached in memory and cleared when custom images are uploaded via the settings dashboard
- **Event-driven game engine** — `Game` emits events (`roundStart`, `phaseStart`, `gameEnd`, etc.) that the bot listens to for Discord interactions
- **Computer player** — HALTbot is a special player flagged as `isComputer: true`, skipping all DM interactions
- **Optional settings dashboard** — Runs alongside the bot on a configurable port, disabled by default
- **Fundraiser Module** — A built-in donation tracking system with self-reporting and admin verification flows, persisted to a local JSON file (`data/fundraiser.json`) for simplicity without requiring a database.
- **Webhook Integrations** — Optional auto-tracking of PayPal donations and Patreon pledges. The PayPal webhook uses the postback verification method, while Patreon uses HMAC-MD5 signature verification. Both webhook endpoints are mounted before `express.json()` to preserve the raw request body for signature verification.

## Module Relationships

```
index.js
  ├── GameManager (singleton)
  │     └── Game (per channel)
  │           └── Player (per user)
  ├── CardGenerator (used by Game)
  ├── Scoring (used by Game)
  ├── Embeds + Buttons (UI layer)
  ├── CardRenderer (image compositing)
  ├── Fundraiser (singleton)
  │     ├── Thermometer (image generation)
  │     └── FundraiserEmbeds (UI layer)
  └── Settings Server (optional)
        ├── CardPipeline (regeneration)
        ├── Fundraiser API
        ├── PayPal Webhook (/webhooks/paypal)
        └── Patreon Webhook (/webhooks/patreon)
```
