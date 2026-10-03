const values = [];

// Ссылки на элементы DOM
const numberInput = document.querySelector('#number');
const addBtn      = document.querySelector('#add');
const removeBtn   = document.querySelector('#removeLast');
const clearBtn    = document.querySelector('#clear');
const errorEl     = document.querySelector('#error');
const listEl      = document.querySelector('#list');
const statsEl     = document.querySelector('#stats');

// Добавление числа в массив
function addValue(value) {
  values.push(value);
}

// Удаление последнего элемента в массиве
function removeLastValue() {
  values.pop();
}

// Очистить массив
function clearValues() {
  values.length = 0;
}

// Объект с количеством чисел, их суммой, min, max и средним значением
function getStatistics(values) {
  if (values.length === 0) {
    return { count: 0, sum: 0, min: null, max: null, average: null };
  }

  let sum = 0;
  let min = values[0];
  let max = values[0];

  for (const v of values) {
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
  }

  return {
    count: values.length,
    sum,
    min,
    max,
    average: sum / values.length,
  };
}

function render() {
  // Список чисел
  listEl.innerHTML = ''; // очищаем перед новым наполнением
  for (const v of values) {
    const li = document.createElement('li'); // создаёт новый DOM-элемент
    li.textContent = v;
    listEl.appendChild(li);
  }

  // Статистика
  const s = getStatistics(values);

  statsEl.innerHTML = ''; // очищаем старые строки статистики
  addStatRow('Количество', s.count);
  addStatRow('Сумма', s.sum);
  addStatRow('Среднее', s.average === null ? '—' : s.average.toFixed(2));
  addStatRow('Минимум', s.min === null ? '—' : s.min);
  addStatRow('Максимум', s.max === null ? '—' : s.max);
}

// Вспомогательная функция
function addStatRow(label, value) {
  const li = document.createElement('li');
  li.textContent = `${label}: ${value}`; // шаблонная строка
  statsEl.appendChild(li);
}

// Обработчики кнопок

// Кнопка"Добавить"
addBtn.addEventListener('click', () => {
  const raw = numberInput.value;

  if (raw === '') {
    showError('Введите число');
    return;
  }

  const num = Number(raw);

  if (!Number.isFinite(num)) {
    showError('Это не число');
    return;
  }

  showError('');
  addValue(num);
  numberInput.value = '';
  render();
});

// Кнопка "Удалить последнее"
removeBtn.addEventListener('click', () => {
  removeLastValue();
  render();
});

// Кнопка "Очистить"
clearBtn.addEventListener('click', () => {
  clearValues();
  showError('');
  render();
});

// Вспомогательная функция ошибки
function showError(text) {
  errorEl.textContent = text;
}

render();
