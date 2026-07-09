# Luli Crush

A Candy Crush–style **match-3** adventure starring Pomeranians, rendered with **WebGL2**. Story mode, specials, combos — works on desktop and mobile.

## Play

```bash
cd pomeranian-match3
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

## Story mode

Eight chapters with rising difficulty (more colors, higher goals, fewer moves):

1. Park Debut → 8. Luli Legend

## Specials

- **Match 4** → striped pom (clears a row or column)
- **Match 5** → rainbow pom (swap with a color to clear all of that color)
- **L / T shapes** → bomb pom (clears a 3×3 blast)
- Specials chain when hit by other blasts

## Abilities (earn with fluff)

Match poms to fill the **Fluff** meter and gain charges. Clear story levels to unlock more powers:

| Ability | Unlock | Effect |
|---------|--------|--------|
| Puppy Shuffle | Lv 1 | Reshuffle the board |
| Treat Bomb | Lv 2 | Place a bomb pom |
| Zoomies | Lv 4 | Clear a row + column |
| Super Bark | Lv 6 | Clear one whole color |

## Sound

Cute procedural dog SFX (yips, barks, woofs) via Web Audio — tap once to unlock audio on mobile. Mute with the speaker button.

## How to play

- **Tap** a Pomeranian, then tap an adjacent one to swap — or **swipe**
- Reach the **score goal** before you run out of **moves**
- Combos spawn floating text, bursts, and screen shake

## Tech

- Vite + TypeScript
- WebGL2 sprite batching with procedural Pomeranian atlas (8 looks + specials)
- DOM/canvas effects layer for text + particles
- Touch + mouse / pointer events

## Build

```bash
npm run build
npm run preview
```
