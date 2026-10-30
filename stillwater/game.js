(function () {
  const { key, createBoard, findPath, visibleAt, turnCell } = Rules;

  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d');
  const ui = {
    title: document.getElementById('level-title'),
    count: document.getElementById('level-count'),
    hint: document.getElementById('hint'),
    overlay: document.getElementById('win'),
    winTitle: document.getElementById('win-title'),
    winText: document.getElementById('win-text'),
    next: document.getElementById('next'),
  };

  const PALETTES = {
    sand: { top: '#f7ecd6', left: '#e0c89f', right: '#c4a77c', accent: '#c9893a' },
    sea: { top: '#eaf6f2', left: '#aed8ca', right: '#8bbcae', accent: '#2f8f83' },
    dusk: { top: '#f5e9f1', left: '#d2b5cd', right: '#b193ae', accent: '#8f5fa0' },
  };
  const INK = '#2b3a3a';
  const HALF_PI = Math.PI / 2;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const DRAG_PX_PER_QUARTER = 160; // finger travel that turns the world a quarter
  const TAP_SLOP = 8; // px of movement before a press counts as a swipe

  // Scaled in resize(). Units are screen pixels.
  let W = 34; // half width of a stone
  let H = 17; // half height of a stone
  let Z = 26; // height of one step
  let originX = 0;
  let originY = 0;

  let levelIndex = 0;
  let level;
  let board;
  let world; // { sections: [quarter turns], axes } as the board was last built
  let palette;
  let goalKey;
  let player; // { x, y, h, key }; x/y/h are floats while walking
  let angle = 0; // drawn angle of the world
  let targetAngle = 0; // angle the world is turning to
  let sectionTurns = []; // total quarter turns each section has made, for animation
  let sectionAngle = []; // drawn angle of each section
  let bridgeTurn = []; // drawn angle of each bridge
  let viewShown = {}; // fade of stones that exist only in some views, by key
  let busy = false; // walking, or a bridge or section is turning
  let finished = false;
  let drag = null; // { id, x, startAngle, moved } while a finger is down
  let time = 0;

  // Logical view 0..3 for an angle.
  function viewOf(a) {
    return ((Math.round(a / HALF_PI) % 4) + 4) % 4;
  }

  function view() {
    return viewOf(targetAngle);
  }

  // The stone under the player must stay in place, or the player would float.
  function canStandAt(rot) {
    return visibleAt(board.cells.get(player.key), rot);
  }

  // Rotate a grid position around the middle of the board by the drawn angle.
  function toView(x, y) {
    const c = (level.size - 1) / 2;
    const dx = x - c;
    const dy = y - c;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return { rx: dx * cos - dy * sin, ry: dx * sin + dy * cos };
  }

  function project(x, y, h) {
    const v = toView(x, y);
    return {
      sx: originX + (v.rx - v.ry) * W,
      sy: originY + (v.rx + v.ry) * H - h * Z,
      depth: v.rx + v.ry,
    };
  }

  // Where a stone is drawn right now. A section turns smoothly about its pivot.
  function pose(cell) {
    if (cell.section !== undefined) {
      const [px, py] = level.sections[cell.section].pivot;
      const [bx, by] = cell.base;
      const a = sectionAngle[cell.section];
      const dx = bx - px;
      const dy = by - py;
      return {
        x: px + dx * Math.cos(a) - dy * Math.sin(a),
        y: py + dx * Math.sin(a) + dy * Math.cos(a),
        h: cell.h,
        turn: 0,
      };
    }
    return {
      x: cell.x,
      y: cell.y,
      h: cell.h,
      turn: cell.bridge ? bridgeTurn[cell.index] : 0,
    };
  }

  // Stones that only exist in some views fade in where they are.
  function alphaOf(cell) {
    return cell.rots ? viewShown[cell.key] : 1;
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const n = level ? level.size : 4;
    const s = Math.min((w * 0.9) / (n * 68), (h * 0.7) / (n * 34 + 80));
    const scale = Math.min(2.2, Math.max(0.3, s));
    W = 34 * scale;
    H = 17 * scale;
    Z = 26 * scale;
    originX = w / 2;
    originY = h * 0.46;
  }

  function rebuild() {
    board = createBoard(level, world);
  }

  function loadLevel(index) {
    levelIndex = index;
    level = LEVELS[index];
    palette = PALETTES[level.palette];
    goalKey = key(level.goal[0], level.goal[1]);

    world = createBoard(level).world;
    rebuild();

    sectionTurns = (level.sections || []).map(() => 0);
    sectionAngle = (level.sections || []).map(() => 0);
    bridgeTurn = world.axes.split('').map((a) => (a === 'x' ? 0 : HALF_PI));

    viewShown = {};
    for (const cell of board.cells.values()) {
      if (cell.rots) viewShown[cell.key] = visibleAt(cell, 0) ? 1 : 0;
    }

    const startCell = board.cells.get(key(level.start[0], level.start[1]));
    player = { x: startCell.x, y: startCell.y, h: startCell.h, key: startCell.key };

    angle = 0;
    targetAngle = 0;
    busy = false;
    finished = false;
    drag = null;

    ui.title.textContent = level.name;
    ui.count.textContent = `${index + 1} / ${LEVELS.length}`;
    ui.hint.textContent = level.hint;
    ui.overlay.classList.remove('show');
    resize();
  }

  function ease(t) {
    return t * t * (3 - 2 * t);
  }

  function animate(ms, step) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      function frame(now) {
        const t = Math.min(1, (now - t0) / ms);
        step(ease(t));
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      }
      requestAnimationFrame(frame);
    });
  }

  // The door a step from `a` to `b` goes through, if it goes through one.
  function doorBetween(a, b) {
    for (const [dx, dy] of DIRS) {
      const door = board.cells.get(key(a.x + dx, a.y + dy));
      if (door && door.door === b.key) return door;
    }
    return null;
  }

  function moveTo(from, to, ms) {
    return animate(ms, (t) => {
      player.x = from.x + (to.x - from.x) * t;
      player.y = from.y + (to.y - from.y) * t;
      player.h = from.h + (to.h - from.h) * t;
    });
  }

  function standOn(cell) {
    player.x = cell.x;
    player.y = cell.y;
    player.h = cell.h;
    player.key = cell.key;
  }

  async function walk(path) {
    busy = true;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1];
      const b = path[i];
      const door = doorBetween(a, b);
      if (door) {
        // Walk into the door, then step out of the other one.
        await moveTo(a, door, 200);
        await animate(160, () => {});
        standOn(b);
      } else {
        await moveTo(a, b, 240);
        standOn(b);
      }
    }
    busy = false;
    if (player.key === goalKey) finish();
  }

  function finish() {
    finished = true;
    const last = levelIndex === LEVELS.length - 1;
    ui.winTitle.textContent = last ? 'The monument is quiet' : 'Level complete';
    ui.winText.textContent = last
      ? 'You found every path. Thank you for walking with us.'
      : 'Breathe. The next place is waiting.';
    ui.next.textContent = last ? 'Play again' : 'Continue';
    ui.overlay.classList.add('show');
  }

  // Buttons and keys turn the world a quarter at a time.
  function turn(direction) {
    if (busy || finished) return;
    const next = targetAngle + direction * HALF_PI;
    if (!canStandAt(viewOf(next))) return;
    targetAngle = next;
  }

  // Tapping a bridge turns it, unless you are standing on it.
  async function turnBridge(cell) {
    if (busy || finished || cell.key === player.key) return;
    const axes = world.axes.split('');
    axes[cell.index] = axes[cell.index] === 'x' ? 'y' : 'x';
    world.axes = axes.join('');
    rebuild();
    busy = true;
    await animate(320, () => {});
    busy = false;
  }

  // Tapping a knob turns its section a quarter, unless you are standing on the section.
  async function turnSection(i) {
    if (busy || finished) return;
    if (board.cells.get(player.key).section === i) return;
    world.sections[i] = (world.sections[i] + 1) % 4;
    sectionTurns[i] += 1;
    rebuild();
    busy = true;
    await animate(320, () => {});
    busy = false;
  }

  // Find the visible stone under the pointer, nearest to the viewer.
  function cellAt(px, py) {
    let best = null;
    let bestDepth = -Infinity;
    const current = view();
    for (const cell of board.cells.values()) {
      if (!visibleAt(cell, current)) continue;
      const q = pose(cell);
      const p = project(q.x, q.y, q.h);
      if (Math.abs(px - p.sx) / W + Math.abs(py - p.sy) / H <= 1 && p.depth > bestDepth) {
        best = cell;
        bestDepth = p.depth;
      }
    }
    return best;
  }

  // Index of the knob under the pointer, or -1.
  function knobAt(px, py) {
    return (level.sections || []).findIndex((section) => {
      const p = project(section.knob[0], section.knob[1], section.knob[2]);
      return Math.hypot(px - p.sx, py - p.sy) < W * 0.45;
    });
  }

  function tapAt(x, y) {
    if (busy || finished) return;

    const knob = knobAt(x, y);
    if (knob !== -1) {
      turnSection(knob);
      return;
    }

    const cell = cellAt(x, y);
    if (!cell) return;
    if (cell.bridge) {
      turnBridge(cell);
      return;
    }
    // Tapping a door walks through it.
    const target = cell.door ? board.cells.get(cell.door) : cell;
    if (target.key === player.key) return;
    const path = findPath(board, player.key, target.key, view());
    if (path) walk(path);
  }

  // Touch and mouse: a short press is a tap, a sideways drag turns the world.
  canvas.addEventListener('pointerdown', (e) => {
    if (busy || finished) return;
    canvas.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, x: e.clientX, startAngle: targetAngle, moved: false };
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < TAP_SLOP) return;
    drag.moved = true;
    const candidate = drag.startAngle + (dx / DRAG_PX_PER_QUARTER) * HALF_PI;
    // Follow the finger, but never into a view that would drop the player.
    if (canStandAt(viewOf(candidate))) {
      targetAngle = candidate;
      angle = candidate;
    }
  });

  function endPress(e, cancelled) {
    if (!drag || e.pointerId !== drag.id) return;
    const press = drag;
    drag = null;

    if (!press.moved) {
      if (!cancelled) tapAt(e.clientX, e.clientY);
      return;
    }
    // Let go: snap to the nearest quarter turn, or return if that would strand the player.
    const snapped = Math.round(targetAngle / HALF_PI) * HALF_PI;
    targetAngle = !cancelled && canStandAt(viewOf(snapped)) ? snapped : press.startAngle;
  }

  canvas.addEventListener('pointerup', (e) => endPress(e, false));
  canvas.addEventListener('pointercancel', (e) => endPress(e, true));

  document.getElementById('rot-left').addEventListener('click', () => turn(-1));
  document.getElementById('rot-right').addEventListener('click', () => turn(1));
  document.getElementById('restart').addEventListener('click', () => loadLevel(levelIndex));
  ui.next.addEventListener('click', () => {
    loadLevel(levelIndex === LEVELS.length - 1 ? 0 : levelIndex + 1);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'q' || e.key === 'ArrowLeft') turn(-1);
    if (e.key === 'e' || e.key === 'ArrowRight') turn(1);
    if (e.key === 'r') loadLevel(levelIndex);
  });
  window.addEventListener('resize', resize);

  // Drawing

  function tilePath(points) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
  }

  // Footprint of a drawn stone in grid units, counter-clockwise. A bridge is a
  // thin plank along its axis.
  function footprint(q, isBridge) {
    if (!isBridge) {
      return [[q.x - 0.5, q.y - 0.5], [q.x + 0.5, q.y - 0.5],
        [q.x + 0.5, q.y + 0.5], [q.x - 0.5, q.y + 0.5]];
    }
    const c = Math.cos(q.turn);
    const s = Math.sin(q.turn);
    return [[-0.5, -0.16], [0.5, -0.16], [0.5, 0.16], [-0.5, 0.16]].map(([u, v]) => [
      q.x + u * c - v * s,
      q.y + u * s + v * c,
    ]);
  }

  // A world direction turned into view coordinates, the same turn as toView().
  function viewDirection(nx, ny) {
    return {
      rx: nx * Math.cos(angle) - ny * Math.sin(angle),
      ry: nx * Math.sin(angle) + ny * Math.cos(angle),
    };
  }

  // Draws a slab with its top at height h and its base just under the ground.
  // Only faces that point toward the viewer are drawn.
  function drawBlock(corners, h, alpha) {
    const top = corners.map(([x, y]) => project(x, y, h));
    const base = corners.map(([x, y]) => project(x, y, -0.6));

    ctx.globalAlpha = alpha;
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      // Outward normal of edge i for a counter-clockwise footprint.
      const ex = corners[j][0] - corners[i][0];
      const ey = corners[j][1] - corners[i][1];
      const n = viewDirection(ey, -ex);
      if (n.rx + n.ry <= 0) continue;

      tilePath([
        [top[i].sx, top[i].sy], [top[j].sx, top[j].sy],
        [base[j].sx, base[j].sy], [base[i].sx, base[i].sy],
      ]);
      ctx.fillStyle = Math.abs(n.rx) >= Math.abs(n.ry) ? palette.right : palette.left;
      ctx.fill();
    }

    tilePath(top.map((p) => [p.sx, p.sy]));
    ctx.fillStyle = palette.top;
    ctx.fill();
    ctx.strokeStyle = 'rgba(43, 58, 58, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawCell(cell, alpha) {
    const q = pose(cell);
    drawBlock(footprint(q, cell.bridge), q.h, alpha);

    const { sx, sy } = project(q.x, q.y, q.h);
    ctx.globalAlpha = alpha;
    if (cell.key === goalKey) drawGoal(sx, sy);
    if (cell.door) drawDoor(sx, sy);
    ctx.globalAlpha = 1;
  }

  function drawGoal(sx, sy) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 2.2);
    ctx.beginPath();
    ctx.ellipse(sx, sy, W * (0.42 + 0.06 * pulse), H * (0.42 + 0.06 * pulse), 0, 0, Math.PI * 2);
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 2 * (W / 34);
    ctx.globalAlpha *= 0.55 + 0.35 * pulse;
    ctx.stroke();
  }

  function drawDoor(sx, sy) {
    ctx.beginPath();
    ctx.ellipse(sx, sy, W * 0.22, H * 0.22, 0, 0, Math.PI * 2);
    ctx.fillStyle = INK;
    ctx.globalAlpha *= 0.8;
    ctx.fill();
  }

  // A knob sits beside its section: a hub with four short arms.
  function drawKnob(section) {
    const s = W / 34;
    const { sx, sy } = project(section.knob[0], section.knob[1], section.knob[2]);
    ctx.strokeStyle = palette.right;
    ctx.fillStyle = palette.accent;
    ctx.lineWidth = 3 * s;
    ctx.lineCap = 'round';
    for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      ctx.beginPath();
      ctx.moveTo(sx, sy - 4 * s);
      ctx.lineTo(sx + ax * 12 * s, sy - 4 * s + ay * 12 * s);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(sx, sy - 4 * s, 7 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  // A ladder runs along the edge shared by two neighbouring stones.
  function drawLadder(a, b) {
    const s = W / 34;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const px = -(b.y - a.y) * 0.3;
    const py = (b.x - a.x) * 0.3;
    const hi = Math.max(a.h, b.h);
    const lo = Math.min(a.h, b.h);

    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6 * s;
    ctx.globalAlpha = 0.75;

    const left = [mx + px, my + py];
    const right = [mx - px, my - py];
    const railTop = project(left[0], left[1], hi);
    const railBottom = project(left[0], left[1], lo);
    const otherTop = project(right[0], right[1], hi);
    const otherBottom = project(right[0], right[1], lo);

    ctx.beginPath();
    ctx.moveTo(railTop.sx, railTop.sy);
    ctx.lineTo(railBottom.sx, railBottom.sy);
    ctx.moveTo(otherTop.sx, otherTop.sy);
    ctx.lineTo(otherBottom.sx, otherBottom.sy);
    ctx.stroke();

    for (let i = 1; i < 5; i++) {
      const t = i / 5;
      const h = hi + (lo - hi) * t;
      const l = project(left[0], left[1], h);
      const r = project(right[0], right[1], h);
      ctx.beginPath();
      ctx.moveTo(l.sx, l.sy);
      ctx.lineTo(r.sx, r.sy);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawPlayer() {
    const { sx, sy } = project(player.x, player.y, player.h);
    const s = W / 34;
    const bob = busy ? 0 : Math.sin(time * 2.4) * 0.9 * s;
    const x = sx;
    const y = sy + bob;

    ctx.lineJoin = 'round';

    // Dress
    ctx.beginPath();
    ctx.moveTo(x - 8 * s, y);
    ctx.lineTo(x - 4 * s, y - 28 * s);
    ctx.lineTo(x + 4 * s, y - 28 * s);
    ctx.lineTo(x + 8 * s, y);
    ctx.closePath();
    ctx.fillStyle = '#fffdf7';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4 * s;
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.arc(x, y - 34 * s, 6 * s, 0, Math.PI * 2);
    ctx.fillStyle = '#fffdf7';
    ctx.fill();
    ctx.stroke();

    // Hat
    ctx.beginPath();
    ctx.moveTo(x - 8 * s, y - 37 * s);
    ctx.lineTo(x + 14 * s, y - 52 * s);
    ctx.lineTo(x + 5 * s, y - 34 * s);
    ctx.closePath();
    ctx.fillStyle = INK;
    ctx.fill();
  }

  function drawScene() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#d7ece4');
    sky.addColorStop(1, '#f6efdf');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Painter's order: far things first. The player is slotted in with its stone.
    const items = [];
    for (const cell of board.cells.values()) {
      const alpha = alphaOf(cell);
      if (alpha <= 0.01) continue;
      const q = pose(cell);
      items.push({
        depth: project(q.x, q.y, q.h).depth,
        draw: () => drawCell(cell, alpha),
      });
    }
    for (const [a, b] of board.ladders) {
      const ca = board.cells.get(a);
      const cb = board.cells.get(b);
      items.push({
        depth: project((ca.x + cb.x) / 2, (ca.y + cb.y) / 2, Math.max(ca.h, cb.h)).depth,
        draw: () => drawLadder(ca, cb),
      });
    }
    for (const section of level.sections || []) {
      const { sx, sy } = project(section.knob[0], section.knob[1], section.knob[2]);
      items.push({
        depth: project(section.knob[0], section.knob[1], section.knob[2]).depth + 0.2,
        draw: () => drawKnob(section),
      });
    }
    items.push({
      depth: project(player.x, player.y, player.h).depth + 0.5,
      draw: drawPlayer,
    });
    items.sort((p, q) => p.depth - q.depth);
    for (const item of items) item.draw();
  }

  function frame(now) {
    time = now / 1000;

    // Ease the world toward its target angle.
    const diff = targetAngle - angle;
    angle = Math.abs(diff) < 0.0005 ? targetAngle : angle + diff * 0.14;

    // Sections, bridges and fading stones move toward their current state.
    (level.sections || []).forEach((section, i) => {
      const target = sectionTurns[i] * HALF_PI;
      sectionAngle[i] += (target - sectionAngle[i]) * 0.2;
      if (Math.abs(target - sectionAngle[i]) < 0.001) sectionAngle[i] = target;
    });
    world.axes.split('').forEach((a, i) => {
      const target = a === 'x' ? 0 : HALF_PI;
      bridgeTurn[i] += (target - bridgeTurn[i]) * 0.2;
      if (Math.abs(target - bridgeTurn[i]) < 0.001) bridgeTurn[i] = target;
    });
    const current = view();
    for (const cell of board.cells.values()) {
      if (!cell.rots) continue;
      const target = visibleAt(cell, current) ? 1 : 0;
      const shown = viewShown[cell.key] + (target - viewShown[cell.key]) * 0.12;
      viewShown[cell.key] = Math.abs(target - shown) < 0.001 ? target : shown;
    }

    drawScene();
    requestAnimationFrame(frame);
  }

  // ?level=3 opens a specific level, handy for jumping ahead while testing.
  const requested = parseInt(new URLSearchParams(window.location.search).get('level'), 10);
  loadLevel(Number.isInteger(requested) ? Math.min(LEVELS.length, Math.max(1, requested)) - 1 : 0);
  requestAnimationFrame(frame);
})();
