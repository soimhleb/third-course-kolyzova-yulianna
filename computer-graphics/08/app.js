const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');

// --- 1. МАТЕМАТИКА 4x4 ---
function translation3D(tx, ty, tz) {
  return [
    [1, 0, 0, tx],
    [0, 1, 0, ty],
    [0, 0, 1, tz],
    [0, 0, 0, 1]
  ];
}

function scaling3D(sx, sy, sz) {
  return [
    [sx, 0, 0, 0],
    [0, sy, 0, 0],
    [0, 0, sz, 0],
    [0, 0, 0, 1]
  ];
}

function rotationX(degrees) {
  const rad = degrees * Math.PI / 180;
  const c = Math.cos(rad), s = Math.sin(rad);
  return [
    [1, 0, 0, 0],
    [0, c, -s, 0],
    [0, s, c, 0],
    [0, 0, 0, 1]
  ];
}

function rotationY(degrees) {
  const rad = degrees * Math.PI / 180;
  const c = Math.cos(rad), s = Math.sin(rad);
  return [
    [c, 0, s, 0],
    [0, 1, 0, 0],
    [-s, 0, c, 0],
    [0, 0, 0, 1]
  ];
}

function rotationZ(degrees) {
  const rad = degrees * Math.PI / 180;
  const c = Math.cos(rad), s = Math.sin(rad);
  return [
    [c, -s, 0, 0],
    [s, c, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1]
  ];
}

function multiply4(a, b) {
  const res = [[0,0,0,0], [0,0,0,0], [0,0,0,0], [0,0,0,0]];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      for (let k = 0; k < 4; k++) {
        res[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return res;
}

function transform3D(m, p) {
  const v = [p.x, p.y, p.z, 1];
  const r = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      r[i] += m[i][j] * v[j];
    }
  }
  // Возвращаем только x, y, z (w нам пока не нужен, так как перспектива делается отдельно)
  return { x: r[0], y: r[1], z: r[2] };
}

// --- 2. ГЕОМЕТРИЯ ---
const MODELS = {
  cube: {
    vertices: [
      { x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 }, // 0, 1
      { x: 1, y: 1, z: -1 },   { x: -1, y: 1, z: -1 }, // 2, 3
      { x: -1, y: -1, z: 1 },  { x: 1, y: -1, z: 1 },  // 4, 5
      { x: 1, y: 1, z: 1 },    { x: -1, y: 1, z: 1 }   // 6, 7
    ],
    edges: [
      [0,1], [1,2], [2,3], [3,0], // Задняя грань
      [4,5], [5,6], [6,7], [7,4], // Передняя грань
      [0,4], [1,5], [2,6], [3,7]  // Соединения
    ]
  },
  pyramid: {
    vertices: [
      { x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 }, // 0, 1 (основание)
      { x: 1, y: -1, z: 1 },   { x: -1, y: -1, z: 1 }, // 2, 3 (основание)
      { x: 0, y: 1, z: 0 }                             // 4 (вершина)
    ],
    edges: [
      [0,1], [1,2], [2,3], [3,0], // Основание
      [0,4], [1,4], [2,4], [3,4]  // Ребра к вершине
    ]
  }
};

// --- 3. ПРОЕКЦИИ ---
const NEAR = 0.1; // Ближняя плоскость

function clipEdgeNear(a, b) {
  const inA = a.z >= NEAR;
  const inB = b.z >= NEAR;

  if (!inA && !inB) return null; // Оба за плоскостью
  if (inA && inB) return [a, b]; // Оба перед плоскостью

  // Один за, один перед — ищем пересечение
  const t = (NEAR - a.z) / (b.z - a.z);
  const cut = {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
    z: NEAR
  };
  return inA ? [a, cut] : [cut, b];
}

function projectOrtho(p) {
  const scale = 100; // Увеличиваем для наглядности
  return {
    x: canvas.width / 2 + p.x * scale,
    y: canvas.height / 2 - p.y * scale // Y на Canvas идет вниз
  };
}

function projectPerspective(p, focal) {
  if (p.z <= NEAR) return null;
  return {
    x: canvas.width / 2 + focal * p.x / p.z,
    y: canvas.height / 2 - focal * p.y / p.z
  };
}

// --- 4. ОТРИСОВКА ---
let playing = true;
let angleY = 0;
let lastTime = 0;

function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Читаем параметры
  const modelType = document.querySelector('#model-select').value;
  const projType = document.querySelector('#proj-select').value;
  const rx = Number(document.querySelector('#rx').value);
  const ry = Number(document.querySelector('#ry').value) + angleY; // Добавляем анимацию
  const rz = Number(document.querySelector('#rz').value);
  const scale = Number(document.querySelector('#scale').value);
  const tz = Number(document.querySelector('#tz').value);
  const focal = Number(document.querySelector('#focal').value);

  // 2. Собираем матрицу модели: M = T * Rz * Ry * Rx * S
  let M = multiply4(translation3D(0, 0, tz), rotationZ(rz));
  M = multiply4(M, rotationY(ry));
  M = multiply4(M, rotationX(rx));
  M = multiply4(M, scaling3D(scale, scale, scale));

  const geom = MODELS[modelType];

  // 3. Трансформируем все вершины
  const transformed = geom.vertices.map(v => transform3D(M, v));

  // 4. Отрисовка ребер
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;

  for (const [i, j] of geom.edges) {
    const clipped = clipEdgeNear(transformed[i], transformed[j]);
    if (!clipped) continue; // Если оба за near, пропускаем

    const [a, b] = clipped;
    let pa, pb;

    if (projType === 'ortho') {
      pa = projectOrtho(a);
      pb = projectOrtho(b);
    } else {
      pa = projectPerspective(a, focal);
      pb = projectPerspective(b, focal);
    }

    if (pa && pb) {
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }
  }

  // 5. Вывод таблицы для вершины 0
  updateUI(geom.vertices[0], transformed[0], projType, focal, M);
}

function updateUI(vOrig, vTrans, projType, focal, M) {
  document.querySelector('#v-orig').innerHTML = `<td>Исходная</td><td>${vOrig.x.toFixed(2)}</td><td>${vOrig.y.toFixed(2)}</td><td>${vOrig.z.toFixed(2)}</td>`;
  document.querySelector('#v-trans').innerHTML = `<td>После матрицы</td><td>${vTrans.x.toFixed(2)}</td><td>${vTrans.y.toFixed(2)}</td><td>${vTrans.z.toFixed(2)}</td>`;
  
  const proj = projType === 'ortho' ? projectOrtho(vTrans) : projectPerspective(vTrans, focal);
  if (proj) {
    document.querySelector('#v-screen').innerHTML = `<td>Экранная</td><td>${proj.x.toFixed(2)}</td><td>${proj.y.toFixed(2)}</td><td>-</td>`;
  } else {
    document.querySelector('#v-screen').innerHTML = `<td>Экранная</td><td colspan="3">Невидима</td>`;
  }

  // Вывод матрицы
  let html = '<table>';
  for (let i = 0; i < 4; i++) {
    html += '<tr>';
    for (let j = 0; j < 4; j++) {
      html += `<td>${M[i][j].toFixed(2)}</td>`;
    }
    html += '</tr>';
  }
  html += '</table>';
  document.querySelector('#matrix-display').innerHTML = html;
}

// --- 5. АНИМАЦИЯ И СОБЫТИЯ ---
function animate(timestamp) {
  if (lastTime !== 0 && playing) {
    const dt = (timestamp - lastTime) / 1000;
    angleY += 30 * dt; // 30 градусов в секунду
  }
  lastTime = timestamp;
  
  drawScene();
  requestAnimationFrame(animate);
}

// Перерисовка при любом изменении полей
document.querySelectorAll('input, select').forEach(el => {
  el.addEventListener('input', drawScene);
});

document.querySelector('#playBtn').addEventListener('click', (e) => {
  playing = !playing;
  e.target.textContent = playing ? 'Пауза' : 'Играть';
});

document.querySelector('#resetBtn').addEventListener('click', () => {
  document.querySelector('#rx').value = 0;
  document.querySelector('#ry').value = 0;
  document.querySelector('#rz').value = 0;
  document.querySelector('#scale').value = 1;
  document.querySelector('#tz').value = 5;
  document.querySelector('#focal').value = 300;
  document.querySelector('#model-select').value = 'cube';
  document.querySelector('#proj-select').value = 'persp';
  angleY = 0;
  drawScene();
});

// Запуск
requestAnimationFrame(animate);
