const canvas = document.querySelector('#canvas');
const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');

// Один логический пиксель = 15 реальных пикселей экрана.
// Canvas 600x450 = логическая область 40x30.
const scale = 15;

const LOGICAL_WIDTH  = canvas.width  / scale; // 40
const LOGICAL_HEIGHT = canvas.height / scale; // 30

function putPixel(x, y, color = 'black') { // рисует квадрат размером scale * scale
  ctx.fillStyle = color;
  ctx.fillRect(x * scale, y * scale, scale, scale);
}

function clearCanvas() {
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Рисуем сетку для наглядности
function drawGrid() {
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;

  for (let x = 0; x <= LOGICAL_WIDTH; x += 1) {
    ctx.beginPath();
    ctx.moveTo(x * scale, 0);
    ctx.lineTo(x * scale, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y <= LOGICAL_HEIGHT; y += 1) {
    ctx.beginPath();
    ctx.moveTo(0, y * scale);
    ctx.lineTo(canvas.width, y * scale);
    ctx.stroke();
  }
}

const cxInput = document.querySelector('#cx');
const cyInput = document.querySelector('#cy');
const rInput  = document.querySelector('#r');
const buildBtn = document.querySelector('#build');
const symmetryCheckbox = document.querySelector('#symmetryMode');
const errorEl = document.querySelector('#error');
const stepsBody = document.querySelector('#steps tbody');
const compareBtn = document.querySelector('#compare');
const compareResult = document.querySelector('#compareResult');
const benchmarkBtn = document.querySelector('#benchmark');
const benchmarkResult = document.querySelector('#benchmarkResult');

function plot8(cx, cy, x, y, color = 'black') {
  putPixel(cx + x, cy + y, color);
  putPixel(cx + y, cy + x, color);
  putPixel(cx - x, cy + y, color);
  putPixel(cx - y, cy + x, color);
  putPixel(cx + x, cy - y, color);
  putPixel(cx + y, cy - x, color);
  putPixel(cx - x, cy - y, color);
  putPixel(cx - y, cy - x, color);
}

function circleMidpoint(cx, cy, r) {
  const steps = [];

  let x = 0;
  let y = r;
  let d = 1 - r;
  let i = 0;

  while (x <= y) {
    const dBefore = d;
    const yBefore = y;

    plot8(cx, cy, x, y);

    let choice;
    if (d < 0) {
      d += 2 * x + 3;
      choice = 'E';
    } else {
      d += 2 * (x - y) + 5;
      y -= 1;
      choice = 'SE';
    }

    steps.push({ i, x, y: yBefore, dBefore, choice, dAfter: d });

    x += 1;
    i += 1;
  }

  return steps;
}

function circleFormula(cx, cy, r) {
  const points = [];
  const xMax = Math.floor(r / Math.SQRT2);

  for (let x = 0; x <= xMax; x += 1) {
    const y = Math.round(Math.sqrt(r * r - x * x));
    points.push({ x, y });
    plot8(cx, cy, x, y);
  }

  return points;
}

function build() {
  const cx = Number(cxInput.value);
  const cy = Number(cyInput.value);
  const r  = Number(rInput.value);

  if (!Number.isFinite(r) || r <= 0) {
    showError('Радиус должен быть положительным числом');
    return;
  }

  if (cx - r < 0 || cx + r >= LOGICAL_WIDTH ||
      cy - r < 0 || cy + r >= LOGICAL_HEIGHT) {
    showError('Окружность выходит за границы — часть может не отобразиться');
  } else {
    showError('');
  }

  clearCanvas();
  drawGrid();

  const steps = circleMidpoint(cx, cy, r);

  // Таблица шагов
  stepsBody.innerHTML = '';
  for (const s of steps) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.i}</td>
      <td>${s.x}</td>
      <td>${s.y}</td>
      <td>${s.dBefore}</td>
      <td>${s.choice}</td>
      <td>${s.dAfter}</td>
    `;
    stepsBody.appendChild(tr);
  }

  // Режим симметрии - перекрываем точки цветными
  if (symmetryCheckbox.checked) {
    drawSymmetryHighlight(cx, cy, steps);
  }
}

function showError(text) {
  errorEl.textContent = text;
}

function drawSymmetryHighlight(cx, cy, steps) {
  const palette = [
    '#e6194b', '#3cb44b', '#ffe119', '#4363d8',
    '#f58231', '#911eb4', '#46f0f0', '#f032e6',
  ];
  for (let i = 0; i < steps.length; i += 1) {
    const s = steps[i];
    plot8(cx, cy, s.x, s.y, palette[i % palette.length]);
  }
}

buildBtn.addEventListener('click', build);
symmetryCheckbox.addEventListener('change', build);

build();

function collectMidpointPoints(r) {
  const points = [];
  let x = 0, y = r, d = 1 - r;
  while (x <= y) {
    points.push({ x, y });
    if (d < 0) {
      d += 2 * x + 3;
    } else {
      d += 2 * (x - y) + 5;
      y -= 1;
    }
    x += 1;
  }
  return points;
}

function collectFormulaPoints(r) {
  const points = [];
  const xMax = Math.floor(r / Math.SQRT2);
  for (let x = 0; x <= xMax; x += 1) {
    points.push({ x, y: Math.round(Math.sqrt(r * r - x * x)) });
  }
  return points;
}

function compareAlgorithms() {
  const r = Number(rInput.value);
  if (!Number.isFinite(r) || r <= 0) {
    compareResult.textContent = 'Введите положительный радиус';
    return;
  }

  const midPoints = collectMidpointPoints(r);
  const formPoints = collectFormulaPoints(r);

  const midSet = new Set(midPoints.map(p => `${p.x},${p.y}`));
  const formSet = new Set(formPoints.map(p => `${p.x},${p.y}`));

  const onlyMid = [...midSet].filter(p => !formSet.has(p));
  const onlyForm = [...formSet].filter(p => !midSet.has(p));
  const same = onlyMid.length === 0 && onlyForm.length === 0;

  compareResult.innerHTML = `
    <p>Базовых точек midpoint: <b>${midSet.size}</b></p>
    <p>Базовых точек через формулу: <b>${formSet.size}</b></p>
    <p><b>${same ? 'Наборы совпали' : 'Наборы отличаются'}</b></p>
    ${onlyMid.length ? `<p>Только у midpoint: ${onlyMid.join(', ')}</p>` : ''}
    ${onlyForm.length ? `<p>Только у формулы: ${onlyForm.join(', ')}</p>` : ''}
  `;
}

compareBtn.addEventListener('click', compareAlgorithms);

function runBenchmark() {
  const N = 1000;
  const RUNS = 5;
  const radii = [5, 10, 20, 50, 100];

  const realPutPixel = putPixel;
  let sink = 0;
  putPixel = () => { sink += 1; };

  const midTimes = [];
  const formTimes = [];

  for (let run = 0; run < RUNS; run += 1) {
    let start = performance.now();
    for (let i = 0; i < N; i += 1) {
      const r = radii[i % radii.length];
      circleMidpoint(0, 0, r);
    }
    midTimes.push(performance.now() - start);

    start = performance.now();
    for (let i = 0; i < N; i += 1) {
      const r = radii[i % radii.length];
      circleFormula(0, 0, r);
    }
    formTimes.push(performance.now() - start);
  }

  putPixel = realPutPixel;

  const avg = a => a.reduce((s, v) => s + v, 0) / a.length;
  const min = a => Math.min(...a);
  const max = a => Math.max(...a);

  benchmarkResult.textContent = `
Прогонов: ${RUNS}, окружностей в каждом: ${N}
(sink: ${sink})

Midpoint:
  среднее: ${avg(midTimes).toFixed(2)} мс
  минимум: ${min(midTimes).toFixed(2)} мс
  максимум: ${max(midTimes).toFixed(2)} мс

Формула + sqrt:
  среднее: ${avg(formTimes).toFixed(2)} мс
  минимум: ${min(formTimes).toFixed(2)} мс
  максимум: ${max(formTimes).toFixed(2)} мс
  `.trim();
}

benchmarkBtn.addEventListener('click', runBenchmark);
