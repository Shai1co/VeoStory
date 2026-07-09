# Pom Crush

A Candy Crush–style **match-3** game starring Pomeranians, rendered with **WebGL2**. Works on desktop and mobile browsers.

## Play

```bash
cd pomeranian-match3
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

## How to play

- **Tap** a Pomeranian, then tap an adjacent one to swap
- Or **swipe** between adjacent tiles
- Match **3 or more** of the same fluff to clear them
- Reach the **score goal** before you run out of **moves**
- Use **Hint** if you’re stuck; the board reshuffles when no moves remain

## Tech

- Vite + TypeScript
- WebGL2 sprite batching with a procedural Pomeranian atlas
- Touch + mouse / pointer events
- Responsive layout with safe-area insets for mobile

## Build

```bash
npm run build
npm run preview
```
