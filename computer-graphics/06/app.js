const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');

const scale = 15;
const LOGICAL_WIDTH  = canvas.width  / scale; // 40
const LOGICAL_HEIGHT = canvas.height / scale; // 30

// --- Базовые функции отрисовки (без сетки-массива) ---

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

// Рисует линию сразу на Canvas (цвет можно менять)
function lineDDA(x1, y1, x2, y2, color = '#333') {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const n = Math.max(Math.abs(dx), Math.abs(dy));
  if (n === 0) { putPixel(x1, y1, color); return; }

  const xStep = dx / n;
  const yStep = dy / n;
  let x = x1, y = y1;

  for (let i = 0; i <= n; i += 1) {
    putPixel(Math.round(x), Math.round(y), color);
    x += xStep;
    y += yStep;
  }
}

// Вспомогательная функция: рисует контур многоугольника
function drawPolygon(points, color) {
  if (points.length === 0) return;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    lineDDA(a.x, a.y, b.x, b.y, color);
  }
}

// Рисует прямоугольное окно
function drawRect(rect, color) {
  lineDDA(rect.xmin, rect.ymin, rect.xmax, rect.ymin, color);
  lineDDA(rect.xmax, rect.ymin, rect.xmax, rect.ymax, color);
  lineDDA(rect.xmax, rect.ymax, rect.xmin, rect.ymax, color);
  lineDDA(rect.xmin, rect.ymax, rect.xmin, rect.ymin, color);
}

// --- Математика алгоритма Сазерленда-Ходжмана ---

function intersectVertical(a, b, xBoundary) {
  const t = (xBoundary - a.x) / (b.x - a.x);
  return { x: xBoundary, y: a.y + t * (b.y - a.y) };
}

function intersectHorizontal(a, b, yBoundary) {
  const t = (yBoundary - a.y) / (b.y - a.y);
  return { x: a.x + t * (b.x - a.x), y: yBoundary };
}

function clipAgainstBoundary(polygon, isInside, getIntersection) {
  const output = [];
  if (polygon.length === 0) return output;

  let s = polygon[polygon.length - 1]; // S — последняя вершина

  for (const p of polygon) {
    const sInside = isInside(s);
    const pInside = isInside(p);

    if (sInside && pInside) {
      output.push(p);
    } else if (sInside && !pInside) {
      output.push(getIntersection(s, p));
    } else if (!sInside && pInside) {
      output.push(getIntersection(s, p));
      output.push(p);
    }
    s = p;
  }
  return output;
}

function clipPolygon(polygon, rect) {
  const stages = {};
  stages.original = polygon;

  stages.left = clipAgainstBoundary(stages.original, p => p.x >= rect.xmin, (a, b) => intersectVertical(a, b, rect.xmin));
  stages.right = clipAgainstBoundary(stages.left, p => p.x <= rect.xmax, (a, b) => intersectVertical(a, b, rect.xmax));
  stages.top = clipAgainstBoundary(stages.right, p => p.y >= rect.ymin, (a, b) => intersectHorizontal(a, b, rect.ymin));
  stages.bottom = clipAgainstBoundary(stages.top, p => p.y <= rect.ymax, (a, b) => intersectHorizontal(a, b, rect.ymax));

  return stages;
}

// --- Связь с интерфейсом (DOM) ---

const xminInput = document.querySelector('#xmin');
const xmaxInput = document.querySelector('#xmax');
const yminInput = document.querySelector('#ymin');
const ymaxInput = document.querySelector('#ymax');
const stageSelect = document.querySelector('#stageSelect');
const buildBtn = document.querySelector('#buildBtn');
const errorEl = document.querySelector('#error');
const resultsTbody = document.querySelector('#resultsTable tbody');

// Исходный невыпуклый многоугольник (L-форма), который выходит за границы окна
const testPolygon = [
  { x: 5, y: 5 }, { x: 25, y: 5 }, { x: 25, y: 15 }, 
  { x: 35, y: 15 }, { x: 35, y: 25 }, { x: 5, y: 25 }
];

function build() {
  const rect = {
    xmin: Number(xminInput.value),
    xmax: Number(xmaxInput.value),
    ymin: Number(yminInput.value),
    ymax: Number(ymaxInput.value)
  };

  // Проверка окна
  if (rect.xmin >= rect.xmax || rect.ymin >= rect.ymax) {
    errorEl.textContent = 'Ошибка: xmin < xmax и ymin < ymax';
    return;
  }
  errorEl.textContent = '';

  // Запуск отсечения
  const stages = clipPolygon(testPolygon, rect);

  // Заполнение таблицы промежуточных результатов
  resultsTbody.innerHTML = '';
  const stageNames = ['original', 'left', 'right', 'top', 'bottom'];
  const stageLabels = ['Исходный', 'После LEFT', 'После RIGHT', 'После TOP', 'После BOTTOM'];

  stageNames.forEach((key, index) => {
    const pts = stages[key];
    const tr = document.createElement('tr');
    
    // Форматируем координаты для таблицы
    const coordsStr = pts.map(p => `(${p.x.toFixed(1)}, ${p.y.toFixed(1)})`).join(', ') || '—';
    
    tr.innerHTML = `
      <td>${stageLabels[index]}</td>
      <td>${pts.length}</td>
      <td>${coordsStr}</td>
    `;
    resultsTbody.appendChild(tr);
  });

  // Отрисовка Canvas
  clearCanvas();
  drawGrid();

  // 1. Исходный многоугольник (серый)
  drawPolygon(testPolygon, '#aaa');

  // 2. Окно отсечения (синий)
  drawRect(rect, '#4363d8');

  // 3. Выбранный этап (красный)
  const selectedStage = stageSelect.value;
  drawPolygon(stages[selectedStage], '#e6194b');
}

// Слушатели событий
buildBtn.addEventListener('click', build);
stageSelect.addEventListener('change', build);

// Первичный запуск
build();