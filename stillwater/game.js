(function () {
  const { key, createBoard, findPath, visibleAt } = Rules;

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
  const DRAG_PX_PER_QUARTER = 160; // finger travel that turns the world a quarter
  const TAP_SLOP = 8; // px of movement before a press counts as a swipe

  // Scaled in resize(). Units are screen pixels.
  let W = 34; // half width of a tile
  let H = 17; // half height of a tile
  let Z = 26; // height of one step
  let originX = 0;
  let originY = 0;

  let levelIndex = 0;
  let level;
  let board;
  let palette;
  let goalKey;
  let player; // { x, y, h, key }; x/y/h are floats while walking
  let angle = 0; // drawn angle of the world
  let targetAngle = 0; // angle the world is turning to
  let busy = false; // walking
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

  // Where a stone is drawn. Pieces slide from `from` to their place as `shown` goes 0 to 1.
  function pose(cell) {
    if (!cell.rots) return { x: cell.x, y: cell.y, h: cell.h, alpha: 1 };
    const e = ease(cell.shown);
    return {
      x: cell.from[0] + (cell.x - cell.from[0]) * e,
      y: cell.from[1] + (cell.y - cell.from[1]) * e,
      h: cell.from[2] + (cell.h - cell.from[2]) * e,
      alpha: 0.4 + 0.6 * e,
    };
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

  function loadLevel(index) {
    levelIndex = index;
    level = LEVELS[index];
    board = createBoard(level);
    palette = PALETTES[level.palette];
    goalKey = key(level.goal[0], level.goal[1]);

    for (const cell of board.cells.values()) {
      if (cell.rots) cell.shown = visibleAt(cell, 0) ? 1 : 0;
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

  // Walk along real, connected stones only. Every step is a short slide.
  async function walk(path) {
    busy = true;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1];
      const b = path[i];
      await animate(240, (t) => {
        player.x = a.x + (b.x - a.x) * t;
        player.y = a.y + (b.y - a.y) * t;
        player.h = a.h + (b.h - a.h) * t;
      });
      player.x = b.x;
      player.y = b.y;
      player.h = b.h;
      player.key = b.key;
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

  // Find the visible stone whose top face is under the pointer, nearest to the viewer.
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

  function tapAt(x, y) {
    if (busy || finished) return;
    const cell = cellAt(x, y);
    if (!cell || cell.key === player.key) return;
    const path = findPath(board, player.key, cell.key, view());
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

  function drawTile(q, cell) {
    const { sx, sy } = project(q.x, q.y, q.h);
    const dz = (q.h + 0.6) * Z; // slab goes down to just under ground

    ctx.globalAlpha = q.alpha;

    tilePath([[sx - W, sy], [sx, sy + H], [sx, sy + H + dz], [sx - W, sy + dz]]);
    ctx.fillStyle = palette.left;
    ctx.fill();

    tilePath([[sx, sy + H], [sx + W, sy], [sx + W, sy + dz], [sx, sy + H + dz]]);
    ctx.fillStyle = palette.right;
    ctx.fill();

    tilePath([[sx, sy - H], [sx + W, sy], [sx, sy + H], [sx - W, sy]]);
    ctx.fillStyle = palette.top;
    ctx.fill();
    ctx.strokeStyle = 'rgba(43, 58, 58, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (cell.key === goalKey) drawGoal(sx, sy);
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

    // Painter's order: far stones first. The player is slotted in with its stone.
    const items = [];
    for (const cell of board.cells.values()) {
      const q = pose(cell);
      items.push({ depth: project(q.x, q.y, q.h).depth, draw: () => drawTile(q, cell) });
    }
    items.push({ depth: project(player.x, player.y, player.h).depth + 0.5, draw: drawPlayer });
    items.sort((a, b) => a.depth - b.depth);
    for (const item of items) item.draw();
  }

  function frame(now) {
    time = now / 1000;

    // Ease the world toward its target angle.
    const diff = targetAngle - angle;
    angle = Math.abs(diff) < 0.0005 ? targetAngle : angle + diff * 0.14;

    // Pieces slide in or out as the view changes.
    const current = view();
    for (const cell of board.cells.values()) {
      if (!cell.rots) continue;
      const target = visibleAt(cell, current) ? 1 : 0;
      cell.shown += (target - cell.shown) * 0.12;
      if (Math.abs(target - cell.shown) < 0.001) cell.shown = target;
    }

    drawScene();
    requestAnimationFrame(frame);
  }

  // ?level=3 opens a specific level, handy for jumping ahead while testing.
  const requested = parseInt(new URLSearchParams(window.location.search).get('level'), 10);
  loadLevel(Number.isInteger(requested) ? Math.min(LEVELS.length, Math.max(1, requested)) - 1 : 0);
  requestAnimationFrame(frame);
})();
