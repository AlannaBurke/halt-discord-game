# HALT Go

A simultaneous multiplayer card drafting Discord game with adorable rescue animals — inspired by [Sushi Go](https://youtu.be/-WO1cP9wzrw)!

Built for [Helping All Little Things](https://helpingalllittlethings.org).

## How It Works

Players join a lobby, then draft adorable animal cards over **3 rounds** of **7 phases** each. All players pick at the same time — no waiting for turns! After each round, scores are automatically calculated based on card combinations. The player with the highest score after 3 rounds wins.

At the end of the game, every player receives a personalized **collectible gallery** image showing all the cards they collected.

## Card Types

| Card | Scoring | Strategy |
|------|---------|----------|
| Rat | Scaling set: 1=1, 2=3, 3=6, 4=10, 5+=15 pts | High reward for collecting many; caps at 5 |
| Gerbil | Majority bonus: Most=+6, 2nd=+3 pts | Compete for the most across all players |
| Pregnant Hamster | Swap this card for 2 new random cards | Gamble: lose 1 known card, gain 2 random |
| Hay | Triples the value of the next Guinea Pig, Rabbit, or Chinchilla | Best combo: Hay + Guinea Pig = 9 pts |
| Guinea Pig | 3 points each (9 with Hay) | Reliable points, excellent Hay target |
| Rabbit | 2 points each (6 with Hay) | Solid mid-tier value |
| Chinchilla | 1 point each (3 with Hay) | Common, low value alone |
| Degu | Set of 3 = 10 points, otherwise 0 | All-or-nothing: commit to 3 or skip |
| Sanctuary Cat | End-game: Most=+6, Least=-6 | Scored after all 3 rounds combined |

## Phase Structure

Each round has 7 phases. The number of cards to choose from shrinks each phase:

| Phase | Cards Available |
|-------|----------------|
| 1 | 8 cards |
| 2 | 7 cards |
| 3 | 6 cards |
| 4 | 5 cards |
| 5 | 4 cards |
| 6 | 3 cards |
| 7 | 2 cards |

## Requirements

- **Node.js** v18 or later
- **pnpm** (recommended) or npm
- A Discord bot application (see setup below)

This project uses **@napi-rs/canvas** for rendering card images in Discord. It ships pre-built binaries for macOS (Intel and Apple Silicon), Linux, and Windows — no extra system dependencies needed.

## Setup

### 1. Create a Discord Application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** and name it (e.g., "HALT Go")
3. Go to the **Bot** tab and click **Reset Token** — copy and save this token (this is your `DISCORD_TOKEN`)
4. Under **Privileged Gateway Intents**, enable **Message Content Intent**
5. Go to the **OAuth2** tab:
   - Copy the **Client ID** (this is your `CLIENT_ID`)
   - Click **Reset Secret** and copy the Client Secret (this is your `CLIENT_SECRET`, needed for the settings dashboard)
   - Under **Redirects**, click **Add Redirect** and enter: `http://localhost:3000/auth/callback`
   - Click **Save Changes**

### 2. Invite the Bot to Your Server

1. Still on the **OAuth2** page, scroll to **OAuth2 URL Generator**
2. Under **Scopes**, check **bot** and **applications.commands**
3. Under **Bot Permissions**, check:
   - Send Messages
   - Embed Links
   - Attach Files
   - Use Slash Commands
   - Read Message History
4. Copy the generated URL and open it in your browser to invite the bot to your server

### 3. Get Your Guild ID (Optional but Recommended)

Using a Guild ID makes slash commands register instantly instead of waiting up to an hour.

1. In Discord, go to **User Settings** (gear icon) > **App Settings** > **Advanced** and enable **Developer Mode**
2. Right-click your **server name** in the left sidebar and click **Copy Server ID** — this is your `GUILD_ID`

### 4. Get the Admin Role ID (for Settings Dashboard)

1. In Discord, click your **server name** at the top of the channel list, then click **Server Settings**
2. Click **Roles** in the left sidebar
3. Create a new role (e.g., "Bot Admin") or use an existing one
4. With Developer Mode enabled, right-click the role name and click **Copy Role ID** — this is your `SETTINGS_ADMIN_ROLE_ID`
5. Assign this role to yourself (and anyone else who should access settings) via **Server Settings > Members**

### 5. Install and Configure

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

```env
# Required for the bot
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_client_id
GUILD_ID=your_guild_id

# Required for the settings dashboard (optional feature)
SETTINGS_ENABLED=true
CLIENT_SECRET=your_client_secret
SETTINGS_ADMIN_ROLE_ID=your_role_id
SETTINGS_PORT=3000
SETTINGS_REDIRECT_URI=http://localhost:3000/auth/callback
SESSION_SECRET=any-random-string-here

# Fundraiser (optional)
FUNDRAISER_ENABLED=true
FUNDRAISER_GOAL_AMOUNT=500
FUNDRAISER_GOAL_LABEL=HALT Fundraiser
FUNDRAISER_PAYPAL_LINK=https://paypal.me/yourlink
FUNDRAISER_CASHAPP_TAG=$YourCashTag
FUNDRAISER_ANNOUNCEMENT_CHANNEL_ID=your_channel_id
```

### 6. Deploy Commands and Start

```bash
# Register slash commands with Discord
pnpm run deploy

# Start the bot (and settings dashboard if enabled)
pnpm start
```

You should see:

```
Logged in as HALT-GO#1234
Serving 1 guilds
Settings dashboard running at http://localhost:3000
```

## Commands

| Command | Description |
|---------|-------------|
| `/game` | Create a new game lobby in the current channel |
| `/help` | View the rules and card descriptions |
| `/status` | Check the status of the current game |
| `/donate` | Show donation options for the active fundraiser |
| `/fundraiser` | Check the current fundraiser progress with thermometer graphic |
| `/donated <amount>` | Report a CashApp donation for admin verification |
| `/confirm <id>` | Admin: Confirm a pending CashApp donation |
| `/deny <id>` | Admin: Deny a pending CashApp donation |
| `/pending` | Admin: View all pending CashApp donations |

## How to Play

1. Someone uses `/game` to create a lobby
2. Other players click **Join Game** (2-10 players)
3. (Optional) The host can click the **Computer** button to toggle HALTbot, a computer opponent that picks cards randomly — great for testing or solo play
4. The host clicks **Start Game** when everyone is ready
5. Each phase, check your **DMs** for card choices displayed as images
6. Click a button to pick your card (60-second timer, auto-selects if you don't pick)
7. After all 7 phases, round scores are shown in the channel
8. After 3 rounds, final scores (including Sanctuary Cat bonuses) determine the winner
9. Every player receives a collectible gallery image of their full card collection

**Important:** Players must have DMs enabled for the server. In Discord: right-click the server icon > **Privacy Settings** > enable **Direct Messages**.

## Custom Discord Emojis (Optional)

HALT Go includes a set of adorable custom emoji images that you can upload to your Discord server. When uploaded, the bot automatically detects them and uses them everywhere in place of the default Unicode emojis — buttons, embeds, scoring breakdowns, and more!

Each emoji features the animal on a bright colored circle that matches its card color:

<p align="center">
  <img src="assets/emojis/halt_rat.png" width="64" alt="Rat" />
  <img src="assets/emojis/halt_gerbil.png" width="64" alt="Gerbil" />
  <img src="assets/emojis/halt_hamster.png" width="64" alt="Pregnant Hamster" />
  <img src="assets/emojis/halt_hay.png" width="64" alt="Hay" />
  <img src="assets/emojis/halt_guineapig.png" width="64" alt="Guinea Pig" />
  <img src="assets/emojis/halt_rabbit.png" width="64" alt="Rabbit" />
  <img src="assets/emojis/halt_chinchilla.png" width="64" alt="Chinchilla" />
  <img src="assets/emojis/halt_degu.png" width="64" alt="Degu" />
  <img src="assets/emojis/halt_cat.png" width="64" alt="Sanctuary Cat" />
</p>

### How to Upload

1. In Discord, go to **Server Settings** > **Emoji**
2. Click **Upload Emoji**
3. Upload each image from `assets/emojis/`. The filenames are already set to the correct Discord emoji names:

| Preview | File | Discord Name | Card | Color |
|---------|------|--------------|------|-------|
| <img src="assets/emojis/halt_rat.png" width="24" /> | `halt_rat.png` | `:halt_rat:` | Rat | Hot Pink |
| <img src="assets/emojis/halt_gerbil.png" width="24" /> | `halt_gerbil.png` | `:halt_gerbil:` | Gerbil | Sky Blue |
| <img src="assets/emojis/halt_hamster.png" width="24" /> | `halt_hamster.png` | `:halt_hamster:` | Pregnant Hamster | Mint Green |
| <img src="assets/emojis/halt_hay.png" width="24" /> | `halt_hay.png` | `:halt_hay:` | Hay | Sunny Yellow |
| <img src="assets/emojis/halt_guineapig.png" width="24" /> | `halt_guineapig.png` | `:halt_guineapig:` | Guinea Pig | Coral Orange |
| <img src="assets/emojis/halt_rabbit.png" width="24" /> | `halt_rabbit.png` | `:halt_rabbit:` | Rabbit | Lavender Purple |
| <img src="assets/emojis/halt_chinchilla.png" width="24" /> | `halt_chinchilla.png` | `:halt_chinchilla:` | Chinchilla | Teal |
| <img src="assets/emojis/halt_degu.png" width="24" /> | `halt_degu.png` | `:halt_degu:` | Degu | Crimson Red |
| <img src="assets/emojis/halt_cat.png" width="24" /> | `halt_cat.png` | `:halt_cat:` | Sanctuary Cat | Lime Green |

The names must match exactly (they are case-sensitive). When you upload a file named `halt_rat.png`, Discord will automatically set the emoji name to `halt_rat`.

After uploading, restart the bot and you should see `Loaded 9 custom emojis from [server name]` in the console. If an emoji is missing or misnamed, the bot falls back to the default Unicode emoji for that card.

## Fundraiser System (Optional)

HALT Go includes a built-in fundraiser system that lets your community donate to a cause and track progress with a visual thermometer graphic. The fundraiser supports two donation methods:

- **PayPal** — Users click a link to donate directly. The bot provides the link via `/donate`.
- **CashApp** — Users send money via CashApp, then self-report with `/donated <amount>`. Admins verify pending donations with `/confirm` or `/deny`.

When a donation is confirmed, the bot posts a celebration announcement with a thermometer progress graphic in the configured announcement channel.

To enable the fundraiser, set `FUNDRAISER_ENABLED=true` in your `.env` and configure the goal amount, labels, and payment links. You can also manage everything from the **Fundraiser** page in the settings dashboard.

## Settings Dashboard (Optional)

HALT Go includes a web-based settings dashboard with four pages:

### How to Play Page
Complete gameplay rules reference including card types, scoring mechanics, phase structure, and strategy tips.

### Card Manager Page
Upload custom images for any of the 9 card types. When you upload a new image, the Discord-sized card is automatically regenerated with the frame, title, and scoring text. You can preview original, custom, and Discord-rendered versions side by side, and reset any card back to the default art. Changes take effect immediately in the next game.

### Fundraiser Page
Configure and manage the fundraiser for your Discord server. Enable/disable the fundraiser, set the goal amount and label, provide PayPal and CashApp links, and set the announcement channel. You can also view current progress, approve/deny pending CashApp donations, and view the list of recent donations.

### Setup Guide Page
Step-by-step instructions for setting up the bot and dashboard, including how to find your Guild ID, Role ID, and all Discord Developer Portal configuration.

### Dashboard Access

The dashboard uses Discord OAuth2 for authentication. Only users who are members of your server **and** have the configured admin role can log in. Set `SETTINGS_ENABLED=true` in your `.env` to enable it.

## Project Structure

```
halt-discord-game/
├── src/
│   ├── index.js                  # Bot entry point + settings server startup
│   ├── commands/
│   │   └── deploy-commands.js    # Slash command registration
│   ├── game/
│   │   ├── Game.js               # Single game instance (+ computer player)
│   │   ├── GameManager.js        # Manages active games
│   │   ├── Player.js             # Player state
│   │   ├── CardGenerator.js      # Weighted random card generation
│   │   └── Scoring.js            # All scoring logic
│   ├── fundraiser/
│   │   ├── Fundraiser.js         # Fundraiser engine (donations, config, persistence)
│   │   ├── fundraiserEmbeds.js   # Fundraiser Discord embed builders
│   │   └── thermometer.js        # Thermometer progress graphic generator
│   ├── ui/
│   │   ├── embeds.js             # Discord embed builders
│   │   ├── buttons.js            # Button component builders
│   │   └── cardRenderer.js       # Card image compositing (hand, selection, gallery)
│   ├── settings/
│   │   ├── server.js             # Express settings dashboard server
│   │   ├── cardPipeline.js       # Card regeneration pipeline
│   │   └── public/
│   │       └── index.html        # Settings dashboard SPA (4 pages incl. fundraiser)
│   └── utils/
│       └── constants.js          # Card types, scoring tables, config
├── assets/
│   ├── cards/
│   │   ├── *.png                 # Original kawaii card art (9 cards)
│   │   ├── custom/               # User-uploaded custom card art
│   │   └── discord/              # Discord-sized cards with frames & scoring text
│   └── emojis/                   # Custom Discord emoji images (128x128)
├── test/
│   ├── test-engine.js            # Core engine tests
│   └── test-scoring-edge-cases.js  # 39 comprehensive scoring tests
├── scripts/
│   └── generate-cards.py         # Offline card image generation (Python/Pillow)
├── .env.example                  # Environment variable template with documentation
├── GAME_DESIGN.md                # Game design document
├── ARCHITECTURE.md               # Technical architecture
├── package.json
└── README.md
```

## Updating After Pulling Changes

After pulling new changes, always run:

```bash
pnpm install
```

This ensures any new or updated dependencies are installed before starting the bot.

## Troubleshooting

**"Missing Access" error** — The bot doesn't have permission to send messages in the channel. Right-click the channel > Edit Channel > Permissions > add the bot and grant Send Messages, Embed Links, Attach Files, and Read Message History.

**"Cannot find module '@napi-rs/canvas'"** — Run `pnpm install` to install the native canvas dependency.

**Slash commands not appearing** — Run `pnpm run deploy` to register commands. With a `GUILD_ID`, commands appear instantly. Without it, global commands can take up to 1 hour.

**Bot not receiving DMs** — Players need DMs enabled for the server. Right-click the server icon > Privacy Settings > enable Direct Messages.

**Settings dashboard login fails** — Verify your `CLIENT_SECRET` is correct, the redirect URI in `.env` exactly matches what's in the Developer Portal, you have the admin role assigned, and `GUILD_ID` matches the server where you have the role.

## Contributing

Found a bug or have a feature idea? [Open an issue on GitHub](https://github.com/AlannaBurke/halt-discord-game/issues).

## License

MIT — Built with love for rescue animals everywhere.
