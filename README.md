# 🐾 HALT Go

A simultaneous multiplayer card drafting Discord game with adorable rescue animals — inspired by [Sushi Go](https://youtu.be/-WO1cP9wzrw)!

Built for [Helping All Little Things](https://helpingalllittlethings.org).

## How It Works

Players join a lobby, then draft adorable animal cards over **3 rounds** of **7 phases** each. All players pick at the same time — no waiting for turns! After each round, scores are automatically calculated based on card combinations. The player with the highest score after 3 rounds wins.

## Card Types

| Card | Scoring |
|------|---------|
| 🐀 **Rat** | Scaling set: 1→1, 2→3, 3→6, 4→10, 5+→15 pts |
| 🐹 **Gerbil** | Majority bonus: Most→+6, 2nd→+3 pts |
| 🤰 **Pregnant Hamster** | Swap this card for 2 new random cards |
| 🌾 **Hay** | Triples the value of the next Guinea Pig, Rabbit, or Chinchilla |
| 🐹 **Guinea Pig** | 3 points each |
| 🐰 **Rabbit** | 2 points each |
| 🐭 **Chinchilla** | 1 point each |
| 🐿️ **Degus** | Set of 3 = 10 points, otherwise 0 |
| 🐱 **Sanctuary Cat** | End-game: Most→+6, Least→-6 |

## Phase Structure

Each round has 7 phases with shrinking card selections:

| Phase | Cards Shown |
|-------|-------------|
| 1 | 8 cards |
| 2 | 7 cards |
| 3 | 6 cards |
| 4 | 5 cards |
| 5 | 4 cards |
| 6 | 3 cards |
| 7 | 2 cards |

## Setup

### 1. Create a Discord Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** and name it (e.g., "HALT Go")
3. Go to the **Bot** tab and click **Reset Token** — copy and save this token
4. Under **Privileged Gateway Intents**, enable **Message Content Intent**
5. Go to the **OAuth2** tab, select **bot** and **applications.commands** scopes
6. Under Bot Permissions, select:
   - Send Messages
   - Embed Links
   - Use Slash Commands
   - Read Message History
7. Copy the generated URL and use it to invite the bot to your server

### 2. Configure the Bot

```bash
# Clone the repository
git clone https://github.com/AlannaBurke/halt-discord-game.git
cd halt-discord-game

# Install dependencies
pnpm install

# Copy and edit the environment file
cp .env.example .env
```

Edit `.env` with your values:

```
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_client_id
GUILD_ID=your_test_server_id  # Optional: for instant command deployment
```

### 3. Deploy Commands & Start

```bash
# Register slash commands with Discord
pnpm run deploy

# Start the bot
pnpm start
```

## Commands

| Command | Description |
|---------|-------------|
| `/game` | Create a new game lobby in the current channel |
| `/help` | View the rules and card descriptions |
| `/status` | Check the status of the current game |

## How to Play

1. Someone uses `/game` to create a lobby
2. Other players click **Join Game**
3. The host clicks **Start Game** when everyone is ready
4. Each phase, check your **DMs** for card choices
5. Click a button to pick your card
6. After all 7 phases, round scores are shown
7. After 3 rounds, final scores (including Sanctuary Cat bonuses) determine the winner!

## Project Structure

```
halt-discord-game/
├── src/
│   ├── index.js              # Bot entry point
│   ├── commands/
│   │   └── deploy-commands.js # Slash command registration
│   ├── game/
│   │   ├── Game.js           # Single game instance
│   │   ├── GameManager.js    # Manages active games
│   │   ├── Player.js         # Player state
│   │   ├── CardGenerator.js  # Weighted random card generation
│   │   └── Scoring.js        # All scoring logic
│   ├── ui/
│   │   ├── embeds.js         # Discord embed builders
│   │   └── buttons.js        # Button component builders
│   └── utils/
│       └── constants.js      # Card types, scoring tables, config
├── assets/
│   └── cards/                # Adorable kawaii card art (9 cards)
├── test/
│   ├── test-engine.js        # Core engine tests
│   └── test-scoring-edge-cases.js  # Comprehensive scoring tests
├── .env.example
├── package.json
└── README.md
```

## License

MIT — Built with love for rescue animals everywhere. 🐾
