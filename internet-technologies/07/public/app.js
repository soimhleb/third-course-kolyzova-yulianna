// 1. Состояние
let books = [];
let messageEl = document.querySelector('#message');
let listEl = document.querySelector('#book-list');

// 2. Вспомогательная функция для запросов (обработка ошибок и 204)
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

// 3. Загрузка данных (GET)
async function loadBooks() {
  showMessage('Загрузка...', '');
  try {
    books = await request('/api/books');
    render();
    showMessage('', '');
  } catch (error) {
    showMessage('Не удалось загрузить данные: ' + error.message, 'error');
  }
}

// 4. Отрисовка интерфейса (Безопасная!)
function render() {
  listEl.replaceChildren(); // Очищаем список

  if (books.length === 0) {
    showMessage('Список пуст', '');
    return;
  }

  for (const book of books) {
    const li = document.createElement('li');
    
    // Безопасный вывод текста (защита от XSS)
    const info = document.createElement('span');
    info.textContent = `${book.title} — ${book.author} (${book.available ? 'В наличии' : 'Нет в наличии'})`;
    
    const actions = document.createElement('div');
    actions.className = 'actions';

    // Кнопка изменения статуса (PATCH)
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = 'Изменить статус';
    toggleBtn.onclick = () => updateBookStatus(book.id, !book.available);
    
    // Кнопка удаления (DELETE)
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Удалить';
    deleteBtn.onclick = () => deleteBook(book.id);

    actions.append(toggleBtn, deleteBtn);
    li.append(info, actions);
    listEl.append(li);
  }
}

// 5. Создание (POST)
document.querySelector('#book-form').addEventListener('submit', async (e) => {
  e.preventDefault(); // Отменяем перезагрузку страницы
  
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
    await loadBooks(); // Обновляем список
  } catch (error) {
    showMessage(error.message, 'error');
  }
});

// 6. Изменение (PATCH)
async function updateBookStatus(id, newStatus) {
  try {
    await request(`/api/books/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available: newStatus })
    });
    showMessage('Статус обновлён', 'success');
    await loadBooks();
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

// 7. Удаление (DELETE)
async function deleteBook(id) {
  if (!confirm('Вы уверены, что хотите удалить книгу?')) return;
  
  try {
    await request(`/api/books/${id}`, { method: 'DELETE' });
    showMessage('Книга удалена', 'success');
    await loadBooks();
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

// 8. Вспомогательная функция сообщений
function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = type;
}

// 9. Кнопка "Обновить"
document.querySelector('#refresh-btn').addEventListener('click', loadBooks);

// 10. Первичная загрузка при открытии страницы
loadBooks();