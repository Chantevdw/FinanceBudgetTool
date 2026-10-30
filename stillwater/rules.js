// Pure movement rules for Stillwater. No DOM access, so it can be tested in Node.
//
// A cell is { x, y, h, key }. The world has four views (rot 0..3). Rotating
// the view never changes the grid itself; it only switches which links are
// active.

(function (root) {
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  const key = (x, y) => x + ',' + y;

  function createBoard(level) {
    const cells = new Map();
    for (const [x, y, h] of level.tiles) {
      cells.set(key(x, y), { x, y, h, key: key(x, y) });
    }
    return { cells, links: level.links || [] };
  }

  // Cells you can step to from `cell` in view `rot`.
  function neighbors(board, cell, rot) {
    const out = [];

    for (const [dx, dy] of DIRS) {
      const next = board.cells.get(key(cell.x + dx, cell.y + dy));
      if (next && Math.abs(next.h - cell.h) <= 1) out.push(next);
    }

    for (const link of board.links) {
      if (!link.rots.includes(rot)) continue;
      const a = key(link.a[0], link.a[1]);
      const b = key(link.b[0], link.b[1]);
      const other = cell.key === a ? b : cell.key === b ? a : null;
      const next = other && board.cells.get(other);
      if (next) out.push(next);
    }

    return out;
  }

  // Shortest walk from one cell to another in view `rot`, or null if none.
  function findPath(board, fromKey, toKey, rot) {
    const start = board.cells.get(fromKey);
    const goal = board.cells.get(toKey);
    if (!start || !goal) return null;

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

  // Can the level be finished at all? Searches (cell, view) states, where a
  // turn moves the view one quarter either way.
  function solve(level) {
    const board = createBoard(level);
    const startKey = key(level.start[0], level.start[1]);
    const goalKey = key(level.goal[0], level.goal[1]);
    const seen = new Set([startKey + '|0']);
    const queue = [{ cell: board.cells.get(startKey), rot: 0 }];

    for (let i = 0; i < queue.length; i++) {
      const { cell, rot } = queue[i];
      if (cell.key === goalKey) return true;

      const next = [{ cell, rot: (rot + 1) % 4 }, { cell, rot: (rot + 3) % 4 }];
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

  const api = { key, createBoard, neighbors, findPath, solve };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.Rules = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
