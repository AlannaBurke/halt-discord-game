# HALT Go (Minigame) — Game Design Document

## Overview

HALT Go is a minigame module within the HALT Bot. It is a simultaneous multiplayer drafting and combo-scoring Discord game inspired by [Sushi Go](https://youtu.be/-WO1cP9wzrw), themed around adorable rescue animals. Players build card collections over synchronized phases, with automatic scoring after each round. 3 rounds total, highest score wins.

Built for [Helping All Little Things (HALT)](https://helpingalllittlethings.org), a small animal rescue organization.

## Core Structure

- **Players**: 2-10 (human players, plus an optional computer opponent)
- **Rounds**: 3 total
- **Phases per round**: 7
- **Cards per phase**: `8 - (phaseNumber - 1)` choices, pick 1
- **Cards per round**: 7 selected cards per player
- **Selection**: Simultaneous (all players pick at the same time via DMs)
- **Timer**: 60 seconds per phase — auto-random-select if a player doesn't pick in time

## Card Types & Scoring

| Card | Emoji | Scoring Rule |
|------|-------|-------------|
| Rat | 🐀 | Scaling set: 1=1, 2=3, 3=6, 4=10, 5+=15 pts |
| Gerbil | 🐹 | Majority bonus: Most=+6, 2nd most=+3, tied=split |
| Pregnant Hamster | 🤰 | Swap: Remove this card, receive 2 new random cards |
| Hay | 🌾 | Multiplier: Triples the value of the next Rabbit, Guinea Pig, or Chinchilla |
| Guinea Pig | 🐹 | Flat: 3 points each (9 with Hay) |
| Rabbit | 🐰 | Flat: 2 points each (6 with Hay) |
| Chinchilla | 🐭 | Flat: 1 point each (3 with Hay) |
| Degu | 🐿️ | Set bonus: 3 Degu = 10 points, otherwise 0 |
| Sanctuary Cat | 🐱 | End-game (after all 3 rounds): Most=+6, Least=-6, tied=split |

## Scoring Flow

1. **After each round (Phases 1-7 complete)**: Count cards, apply flat points, apply Hay multipliers, score Rat sets, determine Gerbil majority, check Degu sets, update running total, clear round cards.
2. **After Round 3**: Apply Sanctuary Cat end-game bonus/penalty across all 3 rounds combined, then determine the winner.

## Card Generation

- Cards are randomly generated each phase (not drawn from a fixed deck)
- Weighted probability system ensures balanced gameplay:

| Card | Weight | Approximate % |
|------|--------|---------------|
| Rat | 14 | 14% |
| Gerbil | 12 | 12% |
| Pregnant Hamster | 6 | 6% |
| Hay | 10 | 10% |
| Guinea Pig | 12 | 12% |
| Rabbit | 14 | 14% |
| Chinchilla | 14 | 14% |
| Degu | 10 | 10% |
| Sanctuary Cat | 8 | 8% |

## Discord Integration

- **Lobby system**: `/game` creates a lobby with Join, Start, and Computer Player toggle buttons
- **DM-based card selection**: Cards are sent as images via DM with button-based selection
- **Card images**: Kawaii-style art rendered into Discord-sized cards with frames, names, and scoring text
- **Timer system**: 60-second countdown per phase with auto-select fallback
- **Score display**: Embed-based score tables after each round
- **Collectible gallery**: End-of-game image showing all cards collected, sent to channel and DM
- **Computer player (HALTbot)**: Optional AI opponent that picks cards randomly with a short delay

## Art Style

- Adorable Kawaii style inspired by Sushi Go's aesthetic
- Soft watercolor textures with pastel color palettes
- Each card type has a distinct color theme (pink for Rat, gold for Gerbil, mint for Pregnant Hamster, etc.)
- Cards rendered at 2x resolution (480x680) then downscaled to 240x340 for crisp text
- Custom card images can be uploaded via the settings dashboard

## Settings Dashboard

An optional web-based admin panel for managing the game:

- Discord OAuth2 authentication with role-based access control
- Upload custom card images for any of the 9 card types
- Auto-regeneration of Discord-sized cards with frames and text
- Preview original, custom, and final Discord card versions
- Gameplay rules reference and complete setup guide
