const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');

const scale = 15;
const LOGICAL_WIDTH  = canvas.width  / scale;
const LOGICAL_HEIGHT = canvas.height / scale;

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

function lineDDA(x1, y1, x2, y2, color = 'black') {
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

// 1. Создание матриц
function translation(tx, ty) {
  return [
    [1, 0, tx],
    [0, 1, ty],
    [0, 0, 1]
  ];
}

function scaling(sx, sy) {
  return [
    [sx, 0, 0],
    [0, sy, 0],
    [0, 0, 1]
  ];
}

function rotation(degrees) {
  const angle = degrees * Math.PI / 180;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [
    [c, -s, 0],
    [s,  c, 0],
    [0,  0, 1]
  ];
}

// 2. Умножение матриц 3x3
function multiplyMatrices(a, b) {
  const result = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return result;
}

// 3. Применение матрицы к точке
function transformPoint(m, p) {
  return {
    x: m[0][0] * p.x + m[0][1] * p.y + m[0][2],
    y: m[1][0] * p.x + m[1][1] * p.y + m[1][2]
  };
}

function getFinalMatrix() {
  const tx = Number(document.querySelector('#tx').value);
  const ty = Number(document.querySelector('#ty').value);
  const sx = Number(document.querySelector('#sx').value);
  const sy = Number(document.querySelector('#sy').value);
  const angle = Number(document.querySelector('#angle').value);
  const cx = Number(document.querySelector('#cx').value);
  const cy = Number(document.querySelector('#cy').value);
  const mode = document.querySelector('input[name="mode"]:checked').value;

  // Матрицы для работы вокруг центра (cx, cy)
  // Чтобы повернуть/масштабировать вокруг центра, нужно:
  // 1. Перенести центр в (0,0): T(-cx, -cy)
  // 2. Сделать преобразование: R или S
  // 3. Вернуть центр обратно: T(cx, cy)
  const toOrigin = translation(-cx, -cy);
  const backFromOrigin = translation(cx, cy);
  
  const R = rotation(angle);
  const S = scaling(sx, sy);
  const T = translation(tx, ty);

  // Сначала объединяем масштаб и поворот вокруг центра
  // M_transform = T(cx,cy) * R * S * T(-cx,-cy)
  let M_transform = multiplyMatrices(backFromOrigin, R);
  M_transform = multiplyMatrices(M_transform, S);
  M_transform = multiplyMatrices(M_transform, toOrigin);

  // Теперь добавляем перенос (T) в зависимости от режима
  if (mode === 'A') {
    // Сначала поворот/масштаб, потом перенос: M = T * M_transform
    return multiplyMatrices(T, M_transform);
  } else {
    // Сначала перенос, потом поворот/масштаб: M = M_transform * T
    return multiplyMatrices(M_transform, T);
  }
}

// Исходный многоугольник (например, квадрат или произвольная фигура)
const originalPolygon = [
  { x: 10, y: 10 },
  { x: 30, y: 10 },
  { x: 30, y: 20 },
  { x: 10, y: 20 }
];

function drawPolygon(points, color) {
  if (points.length === 0) return;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    lineDDA(Math.round(a.x), Math.round(a.y), Math.round(b.x), Math.round(b.y), color);
  }
}

function drawCenter(cx, cy) {
  // Рисуем крестик в центре
  lineDDA(cx - 1, cy, cx + 1, cy, 'blue');
  lineDDA(cx, cy - 1, cx, cy + 1, 'blue');
}

function render() {
  clearCanvas();
  drawGrid();

  const matrix = getFinalMatrix();

  // 1. Отрисовка исходной фигуры (серый)
  drawPolygon(originalPolygon, '#aaa');

  // 2. Вычисление новых координат
  const transformedPolygon = originalPolygon.map(p => transformPoint(matrix, p));

  // 3. Отрисовка преобразованной фигуры (красный)
  drawPolygon(transformedPolygon, '#e6194b');

  // 4. Отрисовка центра
  const cx = Number(document.querySelector('#cx').value);
  const cy = Number(document.querySelector('#cy').value);
  drawCenter(cx, cy);

  // 5. Обновление таблицы
  updateTable(originalPolygon, transformedPolygon);

  // 6. Обновление вывода матрицы
  updateMatrixDisplay(matrix);
}

function updateTable(orig, trans) {
  const tbody = document.querySelector('#vertices-table tbody');
  tbody.innerHTML = '';
  for (let i = 0; i < orig.length; i++) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>P${i}</td>
      <td>${orig[i].x.toFixed(1)}</td>
      <td>${orig[i].y.toFixed(1)}</td>
      <td>${trans[i].x.toFixed(1)}</td>
      <td>${trans[i].y.toFixed(1)}</td>
    `;
    tbody.appendChild(tr);
  }
}

function updateMatrixDisplay(m) {
  const div = document.querySelector('#matrix-display');
  div.innerHTML = ''; // Очищаем
  let html = '<table>';
  for (let i = 0; i < 3; i++) {
    html += '<tr>';
    for (let j = 0; j < 3; j++) {
      html += `<td>${m[i][j].toFixed(2)}</td>`;
    }
    html += '</tr>';
  }
  html += '</table>';
  div.innerHTML = html;
}

// Обработчики кнопок
document.querySelector('#applyBtn').addEventListener('click', render);
document.querySelector('#resetBtn').addEventListener('click', () => {
  // Сброс полей
  document.querySelector('#tx').value = 0;
  document.querySelector('#ty').value = 0;
  document.querySelector('#sx').value = 1;
  document.querySelector('#sy').value = 1;
  document.querySelector('#angle').value = 0;
  // Сброс центра обратно на дефолтные значения
  document.querySelector('#cx').value = 20; 
  document.querySelector('#cy').value = 15; 
  
  render();
});

// Первичный рендер
render();
