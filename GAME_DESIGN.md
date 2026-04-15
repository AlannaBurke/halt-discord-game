# Rescue Draft Game — Design Document

## Overview
A simultaneous multiplayer drafting and combo-scoring Discord game inspired by Sushi Go, themed around adorable rescue animals. Players build card collections over synchronized phases, with automatic scoring after each round. 3 rounds total, highest score wins.

## Core Structure
- **Players**: Any number (multiplayer)
- **Rounds**: 3 total
- **Phases per round**: 7
- **Cards per phase**: `8 - (phaseNumber - 1)` choices, pick 1
- **Cards per round**: 7 selected cards per player
- **Selection**: Simultaneous (all players at once)
- **Timer**: Optional fallback — auto-random-select if player doesn't pick

## Card Types & Scoring

| Card | Emoji | Scoring Rule |
|------|-------|-------------|
| Rat | 🐀 | Scaling set: 1→1, 2→3, 3→6, 4→10, 5+→15 |
| Gerbil | 🐹 | Majority bonus: Most→+6, 2nd→+3, tied→split |
| Pregnant Hamster | 🐹 | Swap: Remove card, get 2 random new cards |
| Hay | 🌾 | Multiplier: Triples next Rabbit/Guinea Pig/Chinchilla |
| Guinea Pig | 🐹 | Flat: 3 points each |
| Rabbit | 🐰 | Flat: 2 points each |
| Chinchilla | 🐭 | Flat: 1 point each |
| Degus | 🐿 | Set bonus: 3 Degus = 10 points, else 0 |
| Sanctuary Cat | 🐱 | End-game: Most→+6, Least→-6, tied→split |

## Scoring Flow
1. After Phase 7: count cards, apply rules, update total, clear round cards
2. After Round 3: apply Sanctuary Cat bonus, determine winner

## Card Generation
- Cards are randomly generated each phase (not from a fixed deck)
- Need weighted probability system for balanced gameplay

## Discord Integration Needs
- Game lobby/join system
- Card display with adorable art
- Button-based card selection
- Timer system
- Score display between rounds
- Final results display

## Art Style
- Adorable Kawaii style (Sushi Go inspired)
- Soft watercolor textures, pastel palettes
- Watermark: helpingalllittlethings.org
