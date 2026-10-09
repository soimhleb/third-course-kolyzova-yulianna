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

function lineDDA(x1, y1, x2, y2) {
  const steps = [];
  const dx = x2 - x1;
  const dy = y2 - y1;
  const n = Math.max(Math.abs(dx), Math.abs(dy));

  if (n === 0) {
    putPixel(x1, y1);
    steps.push({ px: x1, py: y1 });
    return steps;
  }

  const xStep = dx / n;
  const yStep = dy / n;
  let x = x1;
  let y = y1;

  for (let i = 0; i <= n; i += 1) {
    const px = Math.round(x);
    const py = Math.round(y);
    putPixel(px, py);
    steps.push({ px, py });
    x += xStep;
    y += yStep;
  }
  return steps;
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

const x1Input = document.querySelector('#x1');
const y1Input = document.querySelector('#y1');
const x2Input = document.querySelector('#x2');
const y2Input = document.querySelector('#y2');
const buildBtn = document.querySelector('#build');
const pixelsEl = document.querySelector('#pixels');
const stepsBody = document.querySelector('#steps tbody');
const compareBtn = document.querySelector('#compare');
const compareResult = document.querySelector('#compareResult');
const benchmarkBtn = document.querySelector('#benchmark');
const benchmarkResult = document.querySelector('#benchmarkResult');

function lineBresenham(x1, y1, x2, y2) {
  const steps = [];

  let x = x1;
  let y = y1;

  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);

  const sx = x1 < x2 ? 1 : -1;
  const sy = y1 < y2 ? 1 : -1;

  let error = dx - dy;
  let i = 0;

  while (true) {
    putPixel(x, y);
  
    const error2 = 2 * error;
  
    let movedX = false;
    let movedY = false;
  
    if (error2 > -dy) movedX = true;
    if (error2 < dx) movedY = true;
  
    steps.push({ i, x, y, error, error2, movedX, movedY });
  
    if (x === x2 && y === y2) break;
  
    if (movedX) { error -= dy; x += sx; }
    if (movedY) { error += dx; y += sy; }
  
    i += 1;
  }

  return steps;
}

function getSelectedAlgo() {
  const checked = document.querySelector('input[name="algo"]:checked');
  return checked.value; // 'dda' или 'bresenham'
}

function build() {
  const x1 = Number(x1Input.value);
  const y1 = Number(y1Input.value);
  const x2 = Number(x2Input.value);
  const y2 = Number(y2Input.value);

  clearCanvas();
  drawGrid();

  const algo = getSelectedAlgo();
  const steps = algo === 'dda'
    ? lineDDA(x1, y1, x2, y2)
    : lineBresenham(x1, y1, x2, y2);

  // Список пикселей (общий для обоих алгоритмов)
  pixelsEl.innerHTML = '';
  for (const s of steps) {
    const li = document.createElement('li');
    const px = s.px !== undefined ? s.px : s.x;
    const py = s.py !== undefined ? s.py : s.y;
    li.textContent = `(${px}, ${py})`;
    pixelsEl.appendChild(li);
  }

  // Таблица шагов Брезенхема (только когда выбран он)
  stepsBody.innerHTML = '';
  if (algo === 'bresenham') {
    for (const s of steps) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${s.i}</td>
        <td>${s.x}</td>
        <td>${s.y}</td>
        <td>${s.error}</td>
        <td>${s.error2}</td>
        <td>${s.movedX ? 'да' : '—'}</td>
        <td>${s.movedY ? 'да' : '—'}</td>
      `;
      stepsBody.appendChild(tr);
    }
  }
}

buildBtn.addEventListener('click', build);

// Перестройка при смене алгоритма
for (const radio of document.querySelectorAll('input[name="algo"]')) {
  radio.addEventListener('change', build);
}

build(); // первая отрисовка

function compareAlgorithms() {
  const x1 = Number(x1Input.value);
  const y1 = Number(y1Input.value);
  const x2 = Number(x2Input.value);
  const y2 = Number(y2Input.value);

  // Собираем пиксели ЦДА
  const ddaSteps = lineDDA(x1, y1, x2, y2);
  const ddaSet = new Set(ddaSteps.map(s => `${s.px},${s.py}`));

  // Собираем пиксели Брезенхема
  const brSteps = lineBresenham(x1, y1, x2, y2);
  const brSet = new Set(brSteps.map(s => `${s.x},${s.y}`));

  // Ищем различия
  const onlyDDA = [...ddaSet].filter(p => !brSet.has(p));
  const onlyBr = [...brSet].filter(p => !ddaSet.has(p));

  const total = new Set([...ddaSet, ...brSet]).size;
  const same = ddaSet.size === brSet.size && onlyDDA.length === 0;

  compareResult.innerHTML = `
    <p>Пикселей ЦДА: <b>${ddaSet.size}</b></p>
    <p>Пикселей Брезенхема: <b>${brSet.size}</b></p>
    <p>Всего уникальных пикселей: <b>${total}</b></p>
    <p><b>${same ? 'Наборы совпали' : 'Наборы отличаются'}</b></p>
    ${onlyDDA.length ? `<p>Только у ЦДА: ${onlyDDA.join(', ')}</p>` : ''}
    ${onlyBr.length ? `<p>Только у Брезенхема: ${onlyBr.join(', ')}</p>` : ''}
  `;
}

compareBtn.addEventListener('click', compareAlgorithms);

function generateRandomSegment() {
  return {
    x1: Math.floor(Math.random() * LOGICAL_WIDTH),
    y1: Math.floor(Math.random() * LOGICAL_HEIGHT),
    x2: Math.floor(Math.random() * LOGICAL_WIDTH),
    y2: Math.floor(Math.random() * LOGICAL_HEIGHT),
  };
}

function benchmarkAlgo(fn, segments) {
  const start = performance.now();
  for (const s of segments) {
    fn(s.x1, s.y1, s.x2, s.y2);
  }
  return performance.now() - start;
}

function runBenchmark() {
  const N = 10000;
  const RUNS = 5;

  const lines = [];
  for (let i = 0; i < N; i += 1) {
    lines.push(generateRandomSegment());
  }

  // Рисование в canvas сильно влияет на скорость,
  // поэтому замеряем только вычисления — временно
  // подменяем putPixel на пустышку.
  const realPutPixel = putPixel;

  // Сохраняем «результат», чтобы браузер не оптимизировал вызовы в ничто
  let sink = 0;

  putPixel = () => { sink += 1; };
  const ddaTimes = [];
  const brTimes = [];

  for (let r = 0; r < RUNS; r += 1) {
    ddaTimes.push(benchmarkAlgo(lineDDA, lines));
    brTimes.push(benchmarkAlgo(lineBresenham, lines));
  }

  putPixel = realPutPixel;

  const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  const min = arr => Math.min(...arr);
  const max = arr => Math.max(...arr);

  benchmarkResult.textContent = `
Прогонов: ${RUNS}, отрезков в каждом: ${N}
(allowed sink: ${sink})

ЦДА:
  среднее: ${avg(ddaTimes).toFixed(2)} мс
  минимум: ${min(ddaTimes).toFixed(2)} мс
  максимум: ${max(ddaTimes).toFixed(2)} мс
  все замеры: ${ddaTimes.map(t => t.toFixed(2)).join(', ')}

Брезенхем:
  среднее: ${avg(brTimes).toFixed(2)} мс
  минимум: ${min(brTimes).toFixed(2)} мс
  максимум: ${max(brTimes).toFixed(2)} мс
  все замеры: ${brTimes.map(t => t.toFixed(2)).join(', ')}
  `.trim();
}

benchmarkBtn.addEventListener('click', runBenchmark);
