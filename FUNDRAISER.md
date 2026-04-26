# HALT Bot Fundraiser System

The HALT Bot includes a built-in fundraiser module designed to help rescue organizations and communities run donation drives. It provides Discord commands for users to discover donation options, report their contributions, and view progress via a dynamically generated thermometer graphic.

## Features

- **Dual Donation Methods**: Support for direct link-based donations (e.g., PayPal) and self-reported manual verification (e.g., CashApp).
- **Thermometer Graphics**: Automatically generates cute, colorful progress thermometers showing the goal, current total, and recent donors.
- **Admin Verification**: Pending CashApp donations enter a queue where admins can approve or deny them.
- **Auto-Announcements**: When a donation is confirmed, the bot automatically posts a celebration message with the thermometer graphic in a designated channel.
- **Web Dashboard**: A dedicated page in the settings dashboard to manage configuration, view progress, approve pending donations, and see donation history.
- **Anonymous Donations**: Users can choose to hide their name from public announcements.

## Configuration

The fundraiser is configured via environment variables in the `.env` file, and can be modified at runtime via the Settings Dashboard.

| Variable | Description |
|----------|-------------|
| `FUNDRAISER_ENABLED` | Set to `true` to enable the fundraiser commands and dashboard page. |
| `FUNDRAISER_GOAL_AMOUNT` | The target amount in dollars (e.g., `500`). |
| `FUNDRAISER_GOAL_LABEL` | The title shown on the thermometer graphic (e.g., `HALT Fundraiser`). |
| `FUNDRAISER_PAYPAL_LINK` | URL for direct donations. Shown as a button when users run `/donate`. |
| `FUNDRAISER_CASHAPP_TAG` | CashApp tag (e.g., `$YourTag`). Shown as instructions in `/donate`. |
| `FUNDRAISER_ANNOUNCEMENT_CHANNEL_ID` | Discord channel ID where confirmed donation celebrations are posted. |

## Commands

### User Commands

- `/donate`
  Shows the active fundraiser goal, the PayPal donation button, and instructions for CashApp donations.
- `/fundraiser`
  Displays the current fundraiser progress, including the generated thermometer graphic and total raised.
- `/donated <amount> [anonymous]`
  Used to self-report a CashApp donation. The donation enters the pending queue for admin verification. If `anonymous` is true, the user's name will not be shown in the public announcement.

### Admin Commands

*Note: Admin commands require the user to have the "Manage Server" (Manage Guild) permission in Discord.*

- `/pending`
  Lists all unverified CashApp donations with their IDs and amounts.
- `/confirm <id>`
  Approves a pending donation. This adds the amount to the total raised and triggers an announcement in the configured channel.
- `/deny <id>`
  Rejects a pending donation. It is removed from the queue and does not count toward the total.

## Web Dashboard

If the Settings Dashboard is enabled (`SETTINGS_ENABLED=true`), admins can access the **Fundraiser** page at `http://localhost:3000/?page=fundraiser` (or your configured URL).

The dashboard provides:
1. **Live Stats**: View total raised, goal amount, donor count, and a visual progress bar.
2. **Configuration**: Toggle the fundraiser on/off, update the goal amount, label, and payment links without restarting the bot.
3. **Pending Queue**: Approve or deny pending CashApp donations with a single click.
4. **Donation History**: View a list of the 10 most recent confirmed donations.
5. **Danger Zone**: Reset all donation data (clears both confirmed and pending donations).

## Technical Implementation

### File Structure

- `src/fundraiser/Fundraiser.js`: Core engine. Handles donation state, pending queues, configuration, and emits events. Persists data to `data/fundraiser.json`.
- `src/fundraiser/thermometer.js`: Uses `@napi-rs/canvas` to generate the thermometer graphics. Renders at 2x resolution for crisp text and downscales before saving.
- `src/fundraiser/fundraiserEmbeds.js`: Builders for all fundraiser-related Discord embeds (progress, announcements, admin queues).
- `src/settings/server.js`: Express routes for the dashboard API (`/api/fundraiser/*`).
- `src/settings/public/index.html`: The frontend SPA containing the Fundraiser UI page.

### Data Persistence

Donation data is stored locally in `data/fundraiser.json`. The structure includes:
- `config`: Runtime configuration (overrides `.env` defaults).
- `donations`: Array of confirmed donation objects.
- `pendingDonations`: Array of unverified CashApp donations.

### Event Flow

1. User runs `/donated 25`.
2. Bot calls `fundraiser.addPendingDonation()`. Data is saved to `fundraiser.json`.
3. Admin runs `/confirm <id>` (or clicks Approve in dashboard).
4. Bot calls `fundraiser.approvePending()`. The pending record is moved to the `donations` array.
5. `Fundraiser.js` emits a `donation` event.
6. `index.js` listens for the `donation` event, generates a new thermometer graphic, and posts it to the `FUNDRAISER_ANNOUNCEMENT_CHANNEL_ID`.
