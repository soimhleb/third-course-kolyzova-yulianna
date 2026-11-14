// 1. Состояние (фильтры и пагинация)
let filters = {
  search: '',
  available: '',
  sort: 'id',
  order: 'asc',
  page: 1,
  limit: 5
};

let books = [];
let pagination = { page: 1, limit: 5, total: 0, pages: 0 };

const listEl = document.querySelector('#book-list');
const messageEl = document.querySelector('#message');

// 2. Вспомогательная функция для запросов
async function request(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = `Ошибка HTTP: ${response.status}`;
    try {
      const data = await response.json();
      message = data.error || message;
    } catch (e) {}
    throw new Error(message);
  }
  if (response.status === 204) return null; // Для DELETE
  return response.json();
}

// 3. Вспомогательная функция для сообщений
function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = type;
}

// 4. Формирование URL
function makeUrl() {
  const params = new URLSearchParams();
  params.set('page', filters.page);
  params.set('limit', filters.limit);
  params.set('sort', filters.sort);
  params.set('order', filters.order);
  
  if (filters.search) params.set('search', filters.search);
  if (filters.available !== '') params.set('available', filters.available);
  
  return `/api/books?${params.toString()}`;
}

// 5. Загрузка данных
async function loadBooks() {
  try {
    const data = await request(makeUrl());
    books = data.items;
    pagination = data.pagination;
    render();
    showMessage('', '');
  } catch (error) {
    showMessage('Ошибка загрузки: ' + error.message, 'error');
  }
}

// 6. Отрисовка
function render() {
  listEl.replaceChildren();
  
  if (books.length === 0) {
    showMessage('Ничего не найдено', '');
  } else {
    showMessage('', '');
  }

  for (const book of books) {
    const li = document.createElement('li');
    const info = document.createElement('span');
    // Безопасный вывод текста
    info.textContent = `${book.title} — ${book.author} (${book.available ? 'В наличии' : 'Нет'})`;
    
    const actions = document.createElement('div');
    actions.className = 'actions';
    
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = 'Статус';
    toggleBtn.onclick = () => updateBookStatus(book.id, !book.available);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Удалить';
    deleteBtn.onclick = () => deleteBook(book.id);

    actions.append(toggleBtn, deleteBtn);
    li.append(info, actions);
    listEl.append(li);
  }

  // Обновляем пагинацию
  document.querySelector('#page-info').textContent = 
    `Страница ${pagination.page} из ${pagination.pages || 1} (Всего: ${pagination.total})`;
  
  document.querySelector('#prev-btn').disabled = pagination.page <= 1;
  document.querySelector('#next-btn').disabled = pagination.page >= pagination.pages;
}

// 7. Обработчик формы добавления
document.querySelector('#book-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const title = document.querySelector('#title-input').value.trim();
  const author = document.querySelector('#author-input').value.trim();

  if (!title || !author) {
    showMessage('Заполните название и автора', 'error');
    return;
  }

  try {
    await request('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, author })
    });
    // Очищаем форму
    document.querySelector('#title-input').value = '';
    document.querySelector('#author-input').value = '';
    showMessage('Книга добавлена!', 'success');
    
    // После добавления сбрасываем на 1 страницу, чтобы увидеть новую книгу (если сортировка по id)
    filters.page = 1;
    await loadBooks(); 
  } catch (error) {
    showMessage(error.message, 'error');
  }
});

// 8. Обработчики фильтров
let searchTimeout;
document.querySelector('#search-input').addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    filters.search = e.target.value;
    filters.page = 1; // Сбрасываем на первую страницу!
    loadBooks();
  }, 300); // Задержка (debounce)
});

document.querySelector('#filter-available').addEventListener('change', (e) => {
  filters.available = e.target.value;
  filters.page = 1;
  loadBooks();
});

document.querySelector('#sort-select').addEventListener('change', (e) => {
  filters.sort = e.target.value;
  filters.page = 1;
  loadBooks();
});

// 9. Кнопки пагинации
document.querySelector('#prev-btn').addEventListener('click', () => {
  if (filters.page > 1) {
    filters.page--;
    loadBooks();
  }
});

document.querySelector('#next-btn').addEventListener('click', () => {
  if (filters.page < pagination.pages) {
    filters.page++;
    loadBooks();
  }
});

// 10. Кнопка обновления
document.querySelector('#refresh-btn').addEventListener('click', loadBooks);

// 11. Изменение статуса (PATCH)
async function updateBookStatus(id, newStatus) {
  try {
    await request(`/api/books/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available: newStatus })
    });
    showMessage('Статус обновлён', 'success');
    await loadBooks(); // Перезагружаем текущую страницу
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

// 12. Удаление (DELETE)
async function deleteBook(id) {
  if (!confirm('Вы уверены, что хотите удалить книгу?')) return;
  
  try {
    await request(`/api/books/${id}`, { method: 'DELETE' });
    
    // Если мы удалили последнюю запись на странице, переходим на предыдущую
    if (books.length === 1 && filters.page > 1) {
      filters.page--;
    }
    showMessage('Книга удалена', 'success');
    await loadBooks();
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

// Первичный запуск
loadBooks();