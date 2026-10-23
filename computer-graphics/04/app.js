const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');

const scale = 15;
const LOGICAL_WIDTH  = canvas.width  / scale; // 40
const LOGICAL_HEIGHT = canvas.height / scale; // 30

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

function lineDDA(x1, y1, x2, y2, color = 'black') {
  const steps = []; // массив для таблицы

  // Разность координат - насколько нужно сместиться по каждой оси, чтобы попасть из начала в конец
  const dx = x2 - x1;
  const dy = y2 - y1;
  const n = Math.max(Math.abs(dx), Math.abs(dy)); // количество шагов

  // Особый случай: начало и конец совпадают (рисуем один пиксель)
  if (n === 0) {
    putPixel(x1, y1, color);
    steps.push({ i: 0, x: x1, y: y1, px: x1, py: y1 });
    return steps;
  }

  // Приращение на один шаг
  const xStep = dx / n;
  const yStep = dy / n;

  // Текущая позиция
  let x = x1;
  let y = y1;

  // Закрашиваем точки
  for (let i = 0; i <= n; i += 1) {
    
    // Округление до целых координат пикселя
    const px = Math.round(x);
    const py = Math.round(y);

    putPixel(px, py, color); // закрашиваем пиксель

    steps.push({ i, x, y, px, py }); // записываем данные шага в журнал

    // Сдвигаемся на приращение
    x += xStep;
    y += yStep;
  }

  return steps; // возвращаем журнал
}

const INSIDE = 0; // 0000
const LEFT   = 1; // 0001
const RIGHT  = 2; // 0010
const BOTTOM = 4; // 0100
const TOP    = 8; // 1000

function getCode(x, y, rect) {
  let code = INSIDE;

  if (x < rect.xmin) code |= LEFT;
  else if (x > rect.xmax) code |= RIGHT;

  if (y < rect.ymin) code |= TOP;
  else if (y > rect.ymax) code |= BOTTOM;

  return code;
}

function clipLine(x1, y1, x2, y2, rect) {
  let code1 = getCode(x1, y1, rect);
  let code2 = getCode(x2, y2, rect);

  const steps = [];
  let accepted = false;
  let iteration = 0;

  while (true) {
    steps.push({
      i: iteration,
      x1, y1, code1,
      x2, y2, code2,
      action: '' // заполним ниже
    });

    if ((code1 | code2) === 0) {
      steps[steps.length - 1].action = 'ACCEPT';
      accepted = true;
      break;
    }

    if ((code1 & code2) !== 0) {
      steps[steps.length - 1].action = 'REJECT';
      break;
    }

    const codeOut = code1 !== 0 ? code1 : code2;

    let x, y;
    let action;

    if (codeOut & TOP) {
      const t = (rect.ymin - y1) / (y2 - y1);
      x = x1 + t * (x2 - x1);
      y = rect.ymin;
      action = 'пересечение TOP';
    } else if (codeOut & BOTTOM) {
      const t = (rect.ymax - y1) / (y2 - y1);
      x = x1 + t * (x2 - x1);
      y = rect.ymax;
      action = 'пересечение BOTTOM';
    } else if (codeOut & RIGHT) {
      const t = (rect.xmax - x1) / (x2 - x1);
      x = rect.xmax;
      y = y1 + t * (y2 - y1);
      action = 'пересечение RIGHT';
    } else {
      const t = (rect.xmin - x1) / (x2 - x1);
      x = rect.xmin;
      y = y1 + t * (y2 - y1);
      action = 'пересечение LEFT';
    }

    steps[steps.length - 1].action = action;

    if (codeOut === code1) {
      x1 = x; y1 = y;
      code1 = getCode(x1, y1, rect);
    } else {
      x2 = x; y2 = y;
      code2 = getCode(x2, y2, rect);
    }

    iteration += 1;
  }
  return { accepted, x1, y1, x2, y2, steps };
}

const xminInput = document.querySelector('#xmin');
const yminInput = document.querySelector('#ymin');
const xmaxInput = document.querySelector('#xmax');
const ymaxInput = document.querySelector('#ymax');
const x1Input = document.querySelector('#x1');
const y1Input = document.querySelector('#y1');
const x2Input = document.querySelector('#x2');
const y2Input = document.querySelector('#y2');
const buildBtn = document.querySelector('#build');
const polylineBtn = document.querySelector('#polylineBtn');
const randomBtn = document.querySelector('#randomBtn');
const errorEl = document.querySelector('#error');
const codeAEl = document.querySelector('#codeA');
const codeBEl = document.querySelector('#codeB');
const stepsBody = document.querySelector('#steps tbody');
const statsEl = document.querySelector('#stats');

function getRect() {
  return {
    xmin: Number(xminInput.value),
    ymin: Number(yminInput.value),
    xmax: Number(xmaxInput.value),
    ymax: Number(ymaxInput.value)
  };
}

function drawRect(rect, color = 'blue') {
  // рисуем прямоугольник через lineDDA
  lineDDA(rect.xmin, rect.ymin, rect.xmax, rect.ymin, color);
  lineDDA(rect.xmax, rect.ymin, rect.xmax, rect.ymax, color);
  lineDDA(rect.xmax, rect.ymax, rect.xmin, rect.ymax, color);
  lineDDA(rect.xmin, rect.ymax, rect.xmin, rect.ymin, color);
}

function formatCode(code) {
  return code.toString(2).padStart(4, '0');
}

function build() {
  statsEl.textContent = '';
  const rect = getRect();

  if (rect.xmin >= rect.xmax || rect.ymin >= rect.ymax) {
    errorEl.textContent = 'Окно должно удовлетворять xmin < xmax и ymin < ymax';
    return;
  }
  errorEl.textContent = '';

  const x1 = Number(x1Input.value);
  const y1 = Number(y1Input.value);
  const x2 = Number(x2Input.value);
  const y2 = Number(y2Input.value);

  clearCanvas();
  drawGrid();
  drawRect(rect, '#4363d8');

  // Исходный отрезок — серый
  lineDDA(x1, y1, x2, y2, '#aaa');

  // Коды концов
  const c1 = getCode(x1, y1, rect);
  const c2 = getCode(x2, y2, rect);
  codeAEl.textContent = formatCode(c1);
  codeBEl.textContent = formatCode(c2);

  // Отсечение
  const result = clipLine(x1, y1, x2, y2, rect);
  // Таблица
  stepsBody.innerHTML = '';
  for (const s of result.steps) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.i}</td>
      <td>(${s.x1.toFixed(1)}, ${s.y1.toFixed(1)})</td>
      <td>${formatCode(s.code1)}</td>
      <td>(${s.x2.toFixed(1)}, ${s.y2.toFixed(1)})</td>
      <td>${formatCode(s.code2)}</td>
      <td>${s.action}</td>
    `;
    stepsBody.appendChild(tr);
  }
  
  if (result.accepted) {
  lineDDA(result.x1, result.y1, result.x2, result.y2, '#e6194b');
  } else {
    errorEl.textContent = 'Отрезок полностью вне окна (REJECT)';
  }
}

const points = [
  { x: 2, y: 5 },
  { x: 12, y: 2 },
  { x: 20, y: 18 },
  { x: 30, y: 8 },
  { x: 36, y: 22 }
];

// Ломаная
function drawPolyline() {
  const rect = getRect();
  if (rect.xmin >= rect.xmax || rect.ymin >= rect.ymax) return;

  clearCanvas();
  drawGrid();
  drawRect(rect, '#4363d8');
  stepsBody.innerHTML = '';
  errorEl.textContent = '';
  statsEl.textContent = '';

  // Исходная ломаная — серая
  for (let i = 0; i < points.length - 1; i += 1) {
    lineDDA(points[i].x, points[i].y, points[i+1].x, points[i+1].y, '#aaa');
  }

  // Отсечённая ломаная — красная
  for (let i = 0; i < points.length - 1; i += 1) {
    const r = clipLine(points[i].x, points[i].y, points[i+1].x, points[i+1].y, rect);
    if (r.accepted) {
      lineDDA(r.x1, r.y1, r.x2, r.y2, '#e6194b');
    }
  }
}

polylineBtn.addEventListener('click', drawPolyline);

// Случайные отрезки и статистика
function randomSegments() {
  const rect = getRect();
  if (rect.xmin >= rect.xmax || rect.ymin >= rect.ymax) return;

  clearCanvas();
  drawGrid();
  drawRect(rect, '#4363d8');
  stepsBody.innerHTML = '';
  errorEl.textContent = '';

  const N = 200;
  let accepted = 0, clipped = 0, rejected = 0;

  for (let i = 0; i < N; i += 1) {
    const x1 = Math.random() * LOGICAL_WIDTH;
    const y1 = Math.random() * LOGICAL_HEIGHT;
    const x2 = Math.random() * LOGICAL_WIDTH;
    const y2 = Math.random() * LOGICAL_HEIGHT;

    const c1 = getCode(x1, y1, rect);
    const c2 = getCode(x2, y2, rect);

    // Быстрая проверка: обе внутри — принят без изменений
    if ((c1 | c2) === 0) {
      accepted += 1;
      lineDDA(x1, y1, x2, y2, '#3cb44b'); // зелёный
      continue;
    }

    // Обе снаружи с общей стороной — отброшен
    if ((c1 & c2) !== 0) {
      rejected += 1;
      // можно не рисовать, чтобы не засорять
      continue;
    }

    // Иначе — пробуем отсечь
    const r = clipLine(x1, y1, x2, y2, rect);
    if (r.accepted) {
      clipped += 1;
      lineDDA(r.x1, r.y1, r.x2, r.y2, '#e6194b');
    } else {
      rejected += 1;
    }
  }

  statsEl.textContent =
    `Всего отрезков: ${N}\n` +
    `Принято без изменения: ${accepted}\n` +
    `Отсечено: ${clipped}\n` +
    `Отброшено: ${rejected}`;
}

randomBtn.addEventListener('click', randomSegments);

// Обработчики и первичный запуск
buildBtn.addEventListener('click', build);
build();
