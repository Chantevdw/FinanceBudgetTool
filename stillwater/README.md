# Stillwater

A small, calm isometric puzzle prototype inspired by *Monument Valley*. Plain HTML, CSS and JavaScript with no build step.

## Play

Open `index.html` in a browser (or serve the folder with any static server). Use `?level=3` to jump to a level.

- Tap a stone to walk there. You can climb or drop one step at a time.
- Turn the world with the buttons, the `Q`/`E` keys, or the arrow keys.
- Some bridges only appear from certain angles. Reach the gold ring to finish a level.

## Files

| File | Purpose |
| --- | --- |
| `levels.js` | Level data: tiles (x, y, height), start, goal, and angle-dependent links |
| `rules.js` | Pure movement rules (neighbors, pathfinding, solvability check). No DOM |
| `game.js` | Rendering, animation, input |
| `index.html` | Page shell and styles |
| `test-levels.js` | Checks every level is solvable: `node stillwater/test-levels.js` |

## Adding a level

Append an entry to `LEVELS` in `levels.js`:

```js
{
  name: 'Your Level',
  hint: 'Optional hint shown under the title.',
  palette: 'sea', // 'sand', 'sea' or 'dusk' (see PALETTES in game.js)
  size: 5,
  start: [0, 0],
  goal: [4, 4],
  tiles: [[0, 0, 0], [1, 0, 0] /* ... */],
  // A link joins two tiles only while the world is at one of these angles.
  links: [{ a: [0, 2], b: [2, 2], rots: [1] }],
}
```

Then run `node stillwater/test-levels.js` to confirm it can be finished.

## Ideas for next steps

- Moving platforms and pushable blocks
- Sound and a soft ambient track
- Hand-drawn textures, decorative landmarks, and a title screen
- Level select and progress saved in `localStorage`
