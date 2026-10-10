const API_URL = 'https://cors-anywhere.herokuapp.com/https://jsonplaceholder.typicode.com/users';

const state = {
  users: [],
  isLoading: false,
  error: null,
  filter: ''
};

const loadButton = document.querySelector('#loadButton');
const reloadButton = document.querySelector('#reloadButton');
const filterInput = document.querySelector('#filterInput');

const statusElement = document.querySelector('#status');
const statisticsElement = document.querySelector('#statistics');
const usersElement = document.querySelector('#users');


// 1. Загрузка данных

async function loadUsers() {
  state.isLoading = true;
  state.error = null;
  render();

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const users = await response.json();
    state.users = users;
  } catch (error) {
    state.error = 'Не удалось загрузить данные. Проверьте подключение.';
    console.error(error);
  } finally {
    state.isLoading = false;
    render();
  }
}

// 2. Фильтрация

function getFilteredUsers(users, filter) {
  if (!filter) return users;

  const query = filter.toLowerCase();

  return users.filter(user => {
    return (
      user.name.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  });
}


// 3. Карточка пользователя

function createUserCard(user) {
  const article = document.createElement('article');
  article.className = 'user-card';

  const nameEl = document.createElement('h2');
  nameEl.textContent = user.name;
  article.appendChild(nameEl);

  const usernameEl = document.createElement('p');
  usernameEl.className = 'username';
  usernameEl.textContent = `@${user.username}`;
  article.appendChild(usernameEl);

  const emailEl = document.createElement('p');
  emailEl.textContent = `Email: ${user.email}`;
  article.appendChild(emailEl);

  const cityEl = document.createElement('p');
  cityEl.textContent = `Город: ${user.address.city}`;
  article.appendChild(cityEl);

  const companyEl = document.createElement('p');
  companyEl.textContent = `Компания: ${user.company.name}`;
  article.appendChild(companyEl);

  return article;
}


// 4. Статистика

function getStatistics(users, filteredUsers) {
  const cities = new Set(filteredUsers.map(u => u.address.city));

  return {
    total: users.length,
    visible: filteredUsers.length,
    uniqueCities: cities.size,
  };
}


// 5. Отображение

function render() {
  usersElement.innerHTML = '';
  statisticsElement.textContent = '';
  statusElement.className = '';

  if (state.isLoading) {
    statusElement.textContent = 'Загрузка…';
    statusElement.className = 'loading';
    return;
  }

  if (state.error) {
    statusElement.textContent = state.error;
    statusElement.className = 'error';
    return;
  }

  if (state.users.length === 0) {
    statusElement.textContent = 'Данные ещё не загружены.';
    return;
  }

  statusElement.textContent = '';

  const filtered = getFilteredUsers(state.users, state.filter);

  for (const user of filtered) {
    usersElement.append(createUserCard(user));
  }

  const stats = getStatistics(state.users, filtered);
  statisticsElement.textContent =
    `Всего: ${stats.total} | Показано: ${stats.visible} | Городов: ${stats.uniqueCities}`;
}


// 6. События

loadButton.addEventListener('click', () => {
  loadUsers();
});

reloadButton.addEventListener('click', () => {
  loadUsers();
});

filterInput.addEventListener('input', event => {
  state.filter = event.target.value;
  render();
});

render();
