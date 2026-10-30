// Pure movement rules for Stillwater. No DOM access, so it can be tested in Node.
//
// A cell is { x, y, h, key, rots, from }.
//  - Fixed stones have no `rots` and are always there.
//  - Pieces have `rots`: the views in which they are slid into place. Out of
//    place they sit at `from`, and they cannot be walked on.
// Turning the world never changes the grid, only which pieces are in place.

(function (root) {
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  const key = (x, y) => x + ',' + y;

  const visibleAt = (cell, rot) => !cell.rots || cell.rots.includes(rot);

  function createBoard(level) {
    const cells = new Map();
    const add = (x, y, h, rots, from) => {
      cells.set(key(x, y), { x, y, h, key: key(x, y), rots, from });
    };
    for (const [x, y, h] of level.tiles) add(x, y, h);
    for (const piece of level.pieces || []) {
      add(piece.at[0], piece.at[1], piece.at[2], piece.rots, piece.from);
    }
    return { cells };
  }

  // Cells you can step to from `cell` in view `rot`.
  function neighbors(board, cell, rot) {
    const out = [];
    for (const [dx, dy] of DIRS) {
      const next = board.cells.get(key(cell.x + dx, cell.y + dy));
      // Only flat ground: a step up or down is never walkable.
      if (next && visibleAt(next, rot) && next.h === cell.h) out.push(next);
    }
    return out;
  }

  // Shortest walk from one cell to another in view `rot`, or null if none.
  function findPath(board, fromKey, toKey, rot) {
    const start = board.cells.get(fromKey);
    const goal = board.cells.get(toKey);
    if (!start || !goal || !visibleAt(goal, rot)) return null;

    const parent = new Map([[fromKey, null]]);
    const queue = [start];

    for (let i = 0; i < queue.length; i++) {
      const cell = queue[i];
      if (cell.key === toKey) {
        const path = [];
        for (let k = toKey; k !== null; k = parent.get(k)) {
          path.unshift(board.cells.get(k));
        }
        return path;
      }
      for (const next of neighbors(board, cell, rot)) {
        if (!parent.has(next.key)) {
          parent.set(next.key, cell.key);
          queue.push(next);
        }
      }
    }
    return null;
  }

  // Can the level be finished at all? Searches (cell, view) states. A turn
  // moves the view one quarter either way, and is only allowed if the cell
  // you stand on stays in place.
  function solve(level) {
    const board = createBoard(level);
    const startKey = key(level.start[0], level.start[1]);
    const goalKey = key(level.goal[0], level.goal[1]);
    const seen = new Set([startKey + '|0']);
    const queue = [{ cell: board.cells.get(startKey), rot: 0 }];

    for (let i = 0; i < queue.length; i++) {
      const { cell, rot } = queue[i];
      if (cell.key === goalKey) return true;

      const next = [];
      for (const turned of [(rot + 1) % 4, (rot + 3) % 4]) {
        if (visibleAt(cell, turned)) next.push({ cell, rot: turned });
      }
      for (const n of neighbors(board, cell, rot)) next.push({ cell: n, rot });

      for (const state of next) {
        const id = state.cell.key + '|' + state.rot;
        if (!seen.has(id)) {
          seen.add(id);
          queue.push(state);
        }
      }
    }
    return false;
  }

  const api = { key, visibleAt, createBoard, neighbors, findPath, solve };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.Rules = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
