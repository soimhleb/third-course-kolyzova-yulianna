// Состояние программы в одной переменной
let value = 0;

// Ссылки на DOM-элементы
const valueEl   = document.querySelector('#value');
const messageEl = document.querySelector('#message');

const increaseBtn = document.querySelector('#increase');
const decreaseBtn = document.querySelector('#decrease');
const resetBtn    = document.querySelector('#reset');

// Функция обновления интерфейса
function render() {
  // обновляем число
  valueEl.textContent = value;

  // обновляем сообщение в зависимости от знака
  if (value > 0) {
    messageEl.textContent = 'Число положительное';
  } else if (value < 0) {
    messageEl.textContent = 'Число отрицательное';
  } else {
    messageEl.textContent = 'Число равно нулю';
  }
}

// Обработчики событий
increaseBtn.addEventListener('click', () => {
  value += 1;
  render();
});

decreaseBtn.addEventListener('click', () => {
  value -= 1;
  render();
});

resetBtn.addEventListener('click', () => {
  value = 0;
  render();
});

// Первичный вывод на экран
render();
