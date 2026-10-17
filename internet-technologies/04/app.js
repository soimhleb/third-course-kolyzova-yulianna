let nextLocalId = 101;

const PROXY = 'https://cors-anywhere.herokuapp.com/';
const API_URL = PROXY + 'https://jsonplaceholder.typicode.com/posts';

// Состояние
const state = {
  posts: [],
  isLoading: false,
  isSaving: false,
  error: null,
  editingId: null,
  filter: ''
};

// Ссылки на DOM
const loadBtn      = document.querySelector('#loadBtn');
const filterInput  = document.querySelector('#filterInput');
const postForm     = document.querySelector('#postForm');
const titleInput   = document.querySelector('#titleInput');
const bodyInput    = document.querySelector('#bodyInput');
const saveBtn      = document.querySelector('#saveBtn');
const cancelBtn    = document.querySelector('#cancelBtn');
const formTitle    = document.querySelector('#formTitle');
const statusEl     = document.querySelector('#status');
const postsEl      = document.querySelector('#posts');

// GET
async function loadPosts() {
  state.isLoading = true;
  state.error = null;
  render();

  try {
    const response = await fetch(`${API_URL}?_limit=10`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.posts = await response.json();
  } catch (e) {
    state.error = 'Не удалось загрузить публикации.';
    console.error(e);
  } finally {
    state.isLoading = false;
    render();
  }
}

// POST
async function createPost(data) {
  state.isSaving = true;
  state.error = null;
  render();

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const created = await response.json();

    // JSONPlaceholder всегда возвращает id: 101 — перезаписываем,
    // чтобы каждая локальная запись имела уникальный id
    created.id = nextLocalId++;
    
    // Добавляем в начало списка (свежее — сверху)
    state.posts.unshift(created);
    resetForm();
  } catch (e) {
    state.error = 'Не удалось создать публикацию.';
    console.error(e);
  } finally {
    state.isSaving = false;
    render();
  }
}

// PATCH
async function updatePost(id, data) {
  state.isSaving = true;
  state.error = null;
  render();

  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const updated = await response.json();

    // Обновляем запись в массиве по id
    state.posts = state.posts.map(p =>
      p.id === id ? { ...p, ...updated } : p
    );
    resetForm();
  } catch (e) {
    state.error = 'Не удалось сохранить изменения.';
    console.error(e);
  } finally {
    state.isSaving = false;
    render();
  }
}

// DELETE
async function deletePost(id) {
  state.isSaving = true;
  state.error = null;
  render();

  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    // Убираем из массива по id
    state.posts = state.posts.filter(p => p.id !== id);
  } catch (e) {
    state.error = 'Не удалось удалить публикацию.';
    console.error(e);
  } finally {
    state.isSaving = false;
    render();
  }
}

// Возвращает приложение в режим создания новой записи
function resetForm() {
  titleInput.value = '';
  bodyInput.value = '';
  state.editingId = null;
  formTitle.textContent = 'Новая публикация';
  saveBtn.textContent = 'Сохранить';
}

function getFilteredPosts(posts, filter) {
  if (!filter) return posts;
  const q = filter.toLowerCase();
  return posts.filter(p =>
    p.title.toLowerCase().includes(q) ||
    p.body.toLowerCase().includes(q)
  );
}

// Одна карточка
function renderPostCard(post) {
  const card = document.createElement('article');
  card.className = 'post-card';

  const id = document.createElement('span');
  id.className = 'id-badge';
  id.textContent = `#${post.id}`;
  card.append(id);

  const h3 = document.createElement('h3');
  h3.textContent = post.title;
  card.append(h3);

  const p = document.createElement('p');
  p.textContent = post.body;
  card.append(p);

  const actions = document.createElement('div');
  actions.className = 'actions';

  const editBtn = document.createElement('button');
  editBtn.textContent = 'Редактировать';
  editBtn.addEventListener('click', () => startEditing(post.id));
  actions.append(editBtn);

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Удалить';
  deleteBtn.addEventListener('click', () => deletePost(post.id));
  actions.append(deleteBtn);

  card.append(actions);
  return card;
}

// Список
function renderPosts(posts) {
  postsEl.innerHTML = '';
  for (const post of posts) {
    postsEl.append(renderPostCard(post));
  }
}

function render() {
  // Статус
  statusEl.className = '';
  if (state.isLoading) {
    statusEl.textContent = 'Загрузка…';
    statusEl.className = 'loading';
  } else if (state.isSaving) {
    statusEl.textContent = 'Сохранение…';
    statusEl.className = 'saving';
  } else if (state.error) {
    statusEl.textContent = state.error;
    statusEl.className = 'error';
  } else if (state.posts.length === 0) {
    statusEl.textContent = 'Нажмите «Загрузить», чтобы получить публикации.';
  } else {
    statusEl.textContent = '';
  }

  // Блокируем кнопку сохранения, пока идёт операция
  saveBtn.disabled = state.isSaving;

  // Список
  const filtered = getFilteredPosts(state.posts, state.filter);
  renderPosts(filtered);
}

// Загрузить
loadBtn.addEventListener('click', loadPosts);

// Отправка
postForm.addEventListener('submit', (e) => {
  e.preventDefault();

  if (state.isSaving) return;

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  if (!title || !body) {
    state.error = 'Заполните заголовок и текст.';
    render();
    return;
  }

  const data = { title, body, userId: 1 };

  if (state.editingId === null) {
    createPost(data);
  } else {
    updatePost(state.editingId, data);
  }
});

// Отмена
cancelBtn.addEventListener('click', () => {
  resetForm();
  state.error = null;
  render();
});

// Поле поиска
filterInput.addEventListener('input', (e) => {
  state.filter = e.target.value;
  render();
});

// Редактировать
function startEditing(id) {
  const post = state.posts.find(p => p.id === id);
  if (!post) return;

  titleInput.value = post.title;
  bodyInput.value = post.body;
  state.editingId = id;
  formTitle.textContent = `Редактирование #${id}`;
  saveBtn.textContent = 'Сохранить изменения';
  render();
}

// Первичная загрузка
loadPosts();
