# EffectDeck - A Functional Effect-Based Deck Builder

An abstract roguelike deck-builder inspired by Effect-TS and functional programming concepts.

## Project Overview

**Goal**: Implement a functional roguelike deck-builder game featuring composable card effects, dependency injection mechanics, and abstract theming.

**Architecture**: Monorepo with shared core package and separate frontend implementations

**Development Tool**: Claude Code  
**Monorepo Tool**: Nx  
**Timeline**: 6-8 weeks for MVP

## Getting Started

```bash
# Clone the repository
git clone https://github.com/aaronmunoz/effectdeck.git
cd effectdeck

# Install dependencies
npm install

# Build all packages
nx run-many --target=build --all

# Run web client
nx serve web

# Run CLI client
nx serve cli
```

## Architecture

- `@effectdeck/core` - Shared game logic and effect system
- `@effectdeck/web` - React web client
- `@effectdeck/cli` - Terminal-based client
- `@effectdeck/server` - Optional multiplayer server

## Development Status

🚧 **In Development** - Phase 1: Monorepo Setup & Core Architecture

## License

MIT