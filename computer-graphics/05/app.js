const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');

const scale = 15;
const LOGICAL_WIDTH  = canvas.width  / scale; // 40
const LOGICAL_HEIGHT = canvas.height / scale; // 30

const EMPTY  = 0;
const BORDER = 1;
const FILL   = 2;

// Логический растр: grid[y][x]
let baseGrid = [];
let fillOrder = [];      // порядок закраски flood fill
let currentPolygon = []; // вершины текущего многоугольника
let seedX = null, seedY = null;

function createGrid() {
  return Array.from({ length: LOGICAL_HEIGHT }, () =>
    new Array(LOGICAL_WIDTH).fill(EMPTY)
  );
}

function putPixel(x, y, color = 'black') {
  ctx.fillStyle = color;
  ctx.fillRect(x * scale, y * scale, scale, scale);
}

function clearCanvas() {
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawGrid() {
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  for (let x = 0; x <= LOGICAL_WIDTH; x += 1) {
    ctx.beginPath(); ctx.moveTo(x * scale, 0); ctx.lineTo(x * scale, canvas.height); ctx.stroke();
  }
  for (let y = 0; y <= LOGICAL_HEIGHT; y += 1) {
    ctx.beginPath(); ctx.moveTo(0, y * scale); ctx.lineTo(canvas.width, y * scale); ctx.stroke();
  }
}

function plotGrid(x, y, value) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= LOGICAL_WIDTH || y >= LOGICAL_HEIGHT) return;
  baseGrid[y][x] = value;
}

function lineDDA(x1, y1, x2, y2, value = BORDER) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const n = Math.max(Math.abs(dx), Math.abs(dy));

  if (n === 0) {
    plotGrid(x1, y1, value);
    return;
  }

  const xStep = dx / n;
  const yStep = dy / n;
  let x = x1, y = y1;

  for (let i = 0; i <= n; i += 1) {
    plotGrid(Math.round(x), Math.round(y), value);
    x += xStep;
    y += yStep;
  }
}

function drawPolygonOutline(points, isClosed = true) {
  for (let i = 0; i < points.length; i += 1) {
    // Если контур разомкнут и это последняя точка — прерываем цикл (не замыкаем)
    if (!isClosed && i === points.length - 1) break; 
    
    const a = points[i];
    const b = points[(i + 1) % points.length];
    lineDDA(a.x, a.y, b.x, b.y, BORDER);
  }
}

function renderAll(fillCells = [], color = '#e6194b') {
  clearCanvas();
  drawGrid();

  // Заливка
  for (const [x, y] of fillCells) {
    putPixel(x, y, color);
  }
  
  // Контур
  for (let y = 0; y < LOGICAL_HEIGHT; y += 1) {
    for (let x = 0; x < LOGICAL_WIDTH; x += 1) {
      if (baseGrid[y][x] === BORDER) putPixel(x, y, '#333');
    }
  }

  // Точка старта
  if (seedX !== null && seedY !== null) {
    putPixel(seedX, seedY, '#4363d8');
  }
}

function floodFill(startX, startY) {
  const order = [];
  if (startX < 0 || startY < 0 ||
      startX >= LOGICAL_WIDTH || startY >= LOGICAL_HEIGHT) return order;
  if (baseGrid[startY][startX] !== EMPTY) return order;

  // копия сетки, чтобы не портить baseGrid
  const visited = baseGrid.map(row => row.slice());

  // стек точек
  const stack = [[startX, startY]];

  while (stack.length > 0) {
    const [x, y] = stack.pop();

    if (x < 0 || y < 0 || x >= LOGICAL_WIDTH || y >= LOGICAL_HEIGHT) continue;
    if (visited[y][x] !== EMPTY) continue; // уже граница или уже закрашено

    visited[y][x] = FILL;
    order.push([x, y]);

    // 4-связность
    stack.push([x + 1, y]);
    stack.push([x - 1, y]);
    stack.push([x, y + 1]);
    stack.push([x, y - 1]);
  }

  return order;
}

function getIntersections(points, y) {
  const xs = [];

  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];

    // Горизонтальное ребро пропускаем
    if (a.y === b.y) continue;

    const yMin = Math.min(a.y, b.y);
    const yMax = Math.max(a.y, b.y);

    // Правило обработки вершин: включаем нижнюю границу, исключаем верхнюю
    if (y < yMin || y >= yMax) continue;

    const x = a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y);
    xs.push(x);
  }

  xs.sort((p, q) => p - q);
  return xs;
}

function scanlineFill(points) {
  const filled = [];
  const rows = [];

  // Ограничиваем yMin и yMax рамками сетки (от 0 до LOGICAL_HEIGHT - 1)
  const yMin = Math.max(0, Math.floor(Math.min(...points.map(p => p.y))));
  const yMax = Math.min(LOGICAL_HEIGHT - 1, Math.ceil(Math.max(...points.map(p => p.y))));

  for (let y = yMin; y <= yMax; y += 1) {
    const xs = getIntersections(points, y);
    const intervals = [];

    // Пары: [xs[0]..xs[1]], [xs[2]..xs[3]], ...
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const xStart = Math.ceil(xs[i]);
      const xEnd = Math.floor(xs[i + 1]);

      for (let x = xStart; x <= xEnd; x += 1) {
        if (x >= 0 && x < LOGICAL_WIDTH) {
          // Не закрашиваем, если это граница
          if (baseGrid[y][x] !== BORDER) {
            filled.push([x, y]);
          }
        }
      }
      intervals.push([xStart, xEnd]);
    }

    rows.push({ y, xs, intervals });
  }

  return { filled, rows };
}

const PRESETS = {
  rect: [
    { x: 8, y: 8 }, { x: 30, y: 8 },
    { x: 30, y: 22 }, { x: 8, y: 22 },
  ],
  triangle: [
    { x: 20, y: 4 }, { x: 35, y: 26 }, { x: 5, y: 26 },
  ],
  pentagon: [
    { x: 20, y: 4 }, { x: 34, y: 14 }, { x: 28, y: 27 },
    { x: 12, y: 27 }, { x: 6, y: 14 },
  ],
  concave: [ // L-форма, невыпуклый
    { x: 6, y: 6 }, { x: 22, y: 6 }, { x: 22, y: 15 },
    { x: 34, y: 15 }, { x: 34, y: 25 }, { x: 6, y: 25 },
  ],
  open: [ // разомкнутый: не хватает одной стороны
    { x: 8, y: 8 }, { x: 30, y: 8 }, { x: 30, y: 22 },
    // нет замыкающего ребра к (8,22)
  ],
};

const presetSelect = document.querySelector('#presetSelect');
const buildBtn = document.querySelector('#buildBtn');
const floodBtn = document.querySelector('#floodBtn');
const scanBtn = document.querySelector('#scanBtn');
const compareBtn = document.querySelector('#compareBtn');
const benchBtn = document.querySelector('#benchBtn');
const stepSlider = document.querySelector('#stepSlider');
const stepLabel = document.querySelector('#stepLabel');
const rowYInput = document.querySelector('#rowY');
const rowBtn = document.querySelector('#rowBtn');
const rowInfo = document.querySelector('#rowInfo');
const statsEl = document.querySelector('#stats');
const errorEl = document.querySelector('#error');

let scanResult = null;

function buildContour() {
  baseGrid = createGrid();
  fillOrder = [];
  scanResult = null;
  seedX = null;
  seedY = null;

  currentPolygon = PRESETS[presetSelect.value];
  const isOpen = presetSelect.value === 'open';
  drawPolygonOutline(currentPolygon, !isOpen);

  stepSlider.max = 0;
  stepSlider.value = 0;
  stepLabel.textContent = '0 / 0';
  rowInfo.textContent = '';
  statsEl.textContent = '';
  errorEl.textContent = '';

  renderAll();
}

buildBtn.addEventListener('click', buildContour);

floodBtn.addEventListener('click', () => {
  if (seedX === null || seedY === null) {
    errorEl.textContent = 'Сначала кликните по Canvas, чтобы задать стартовую точку';
    return;
  }
  errorEl.textContent = '';

  fillOrder = floodFill(seedX, seedY);

  if (fillOrder.length === 0) {
    errorEl.textContent = 'Стартовая точка на границе или вне области';
    return;
  }

  stepSlider.max = fillOrder.length;
  stepSlider.value = fillOrder.length;
  stepLabel.textContent = `${fillOrder.length} / ${fillOrder.length}`;

  renderAll(fillOrder);
  statsEl.textContent = `Flood Fill: закрашено пикселей — ${fillOrder.length}`;
});

stepSlider.addEventListener('input', () => {
  const n = Number(stepSlider.value);
  stepLabel.textContent = `${n} / ${fillOrder.length}`;
  renderAll(fillOrder.slice(0, n));
});

scanBtn.addEventListener('click', () => {
  scanResult = scanlineFill(currentPolygon);
  renderAll(scanResult.filled);
  statsEl.textContent = `Scanline Fill: закрашено пикселей — ${scanResult.filled.length}`;
});

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  seedX = Math.floor(px / scale);
  seedY = Math.floor(py / scale);

  fillOrder = [];
  stepSlider.max = 0;
  stepSlider.value = 0;
  stepLabel.textContent = '0 / 0';

  renderAll();
  errorEl.textContent = '';
});

rowBtn.addEventListener('click', () => {
  if (!currentPolygon.length) {
    errorEl.textContent = 'Сначала постройте контур';
    return;
  }

  const y = Number(rowYInput.value);
  const xs = getIntersections(currentPolygon, y);

  const intervals = [];
  for (let i = 0; i + 1 < xs.length; i += 2) {
    intervals.push([Math.ceil(xs[i]), Math.floor(xs[i + 1])]);
  }

  rowInfo.textContent =
    `y = ${y}\n` +
    `Пересечения X: ${xs.map(v => v.toFixed(2)).join(', ') || '—'}\n` +
    `Интервалы: ${intervals.map(([a, b]) => `${a}..${b}`).join(', ') || '—'}`;
});

compareBtn.addEventListener('click', () => {
  if (seedX === null) {
    errorEl.textContent = 'Задайте стартовую точку для Flood Fill';
    return;
  }

  const floodCells = floodFill(seedX, seedY);
  const scan = scanlineFill(currentPolygon);

  // Множество пикселей, закрашенных scanline
  const scanSet = new Set(scan.filled.map(([x, y]) => `${x},${y}`));
  const floodSet = new Set(floodCells.map(([x, y]) => `${x},${y}`));

  let onlyFlood = 0, onlyScan = 0;
  for (const p of floodSet) if (!scanSet.has(p)) onlyFlood += 1;
  for (const p of scanSet) if (!floodSet.has(p)) onlyScan += 1;

  renderAll(scan.filled, '#3cb44b'); // зелёным — scanline

  statsEl.textContent =
    `Flood Fill: ${floodCells.length} пикселей\n` +
    `Scanline Fill: ${scan.filled.length} пикселей\n` +
    `Только у flood: ${onlyFlood}\n` +
    `Только у scanline: ${onlyScan}\n\n` +
    `Обычно различия — на границе: flood fill закрашивает всё до контура,\n` +
    `scanline считает по формуле и округляет ceil/floor — на 1–2 пикселя\n` +
    `у границы может отличаться.`;
});

benchBtn.addEventListener('click', () => {
  const RUNS = 5;
  const floodTimes = [], scanTimes = [];

  for (let r = 0; r < RUNS; r += 1) {
    let t = performance.now();
    floodFill(seedX ?? 20, seedY ?? 15);
    floodTimes.push(performance.now() - t);

    t = performance.now();
    scanlineFill(currentPolygon);
    scanTimes.push(performance.now() - t);
  }

  const avg = a => a.reduce((s, v) => s + v, 0) / a.length;
  statsEl.textContent =
    `Прогонов: ${RUNS}\n\n` +
    `Flood Fill: среднее ${avg(floodTimes).toFixed(2)} мс, ` +
    `разброс ${Math.min(...floodTimes).toFixed(2)}–${Math.max(...floodTimes).toFixed(2)} мс\n` +
    `Scanline:   среднее ${avg(scanTimes).toFixed(2)} мс, ` +
    `разброс ${Math.min(...scanTimes).toFixed(2)}–${Math.max(...scanTimes).toFixed(2)} мс`;
});

// первичная отрисовка
buildContour();
