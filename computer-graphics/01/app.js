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

// Реализация алгоритма ЦДА (вход: две точки в логических координатах; выход: набор пикселей, которые нужно закрасить, чтобы получилась линия)
function lineDDA(x1, y1, x2, y2) {
  const steps = []; // массив для таблицы

  // Разность координат - насколько нужно сместиться по каждой оси, чтобы попасть из начала в конец
  const dx = x2 - x1;
  const dy = y2 - y1;
  const n = Math.max(Math.abs(dx), Math.abs(dy)); // количество шагов

  // Особый случай: начало и конец совпадают (рисуем один пиксель)
  if (n === 0) {
    putPixel(x1, y1);
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

    putPixel(px, py); // закрашиваем пиксель

    steps.push({ i, x, y, px, py }); // записываем данные шага в журнал

    // Сдвигаемся на приращение
    x += xStep;
    y += yStep;
  }

  return steps; // возвращаем журнал
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
const stepsBody = document.querySelector('#steps tbody');

function build() {

  // Читаем значения из полей
  const x1 = Number(x1Input.value);
  const y1 = Number(y1Input.value);
  const x2 = Number(x2Input.value);
  const y2 = Number(y2Input.value);

  clearCanvas(); // стираем всё, что было нарисовано раньше

  // Сетка для наглядности
  drawGrid();

  const steps = lineDDA(x1, y1, x2, y2); // вызываем алгоритм ЦДА

  // Заполняем таблицу
  stepsBody.innerHTML = ''; // очищаем таблицу
  for (const s of steps) {
    const tr = document.createElement('tr'); // новая строка таблицы
    // Заполняем строку пятью ячейками (по одному <td> на столбец таблицы): шаг | x до округления | y до округления | пиксель x | пиксель y
    tr.innerHTML = `
      <td>${s.i}</td>
      <td>${s.x.toFixed(2)}</td>
      <td>${s.y.toFixed(2)}</td>
      <td>${s.px}</td>
      <td>${s.py}</td>
    `;
    stepsBody.appendChild(tr); // прикрепляем строку к таблице
  }
}

buildBtn.addEventListener('click', build);

// Первая отрисовка при открытии страницы
build();
