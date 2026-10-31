const express = require('express');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// --- Часть 1. Подключение к БД и создание таблицы ---
// Файл data.db создастся автоматически в папке 06
const db = new Database('data.db');

// Создаем таблицу
db.prepare(`
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    available INTEGER NOT NULL DEFAULT 1
  )
`).run();

// Функция для добавления тестовых данных при первом запуске
const count = db.prepare('SELECT COUNT(*) as count FROM books').get();
if (count.count === 0) {
  const insert = db.prepare('INSERT INTO books (title, author, available) VALUES (?, ?, ?)');
  insert.run('1984', 'George Orwell', 1);
  insert.run('The Hobbit', 'J.R.R. Tolkien', 0);
  insert.run('Dune', 'Frank Herbert', 1);
}

// --- Часть 2 и 4. GET: Получение списка с фильтрацией ---
app.get('/api/books', (req, res) => {
  let sql = 'SELECT * FROM books';
  const params = [];
  const conditions = [];

  // Фильтр по автору
  if (req.query.author) {
    conditions.push('author LIKE ?');
    params.push(`%${req.query.author}%`);
  }

  // Фильтр по доступности (available=true/false)
  if (req.query.available !== undefined) {
    conditions.push('available = ?');
    params.push(req.query.available === 'true' ? 1 : 0);
  }

  // Если есть условия, добавляем WHERE
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  const rows = db.prepare(sql).all(params);
  
  // Преобразуем 0/1 из SQLite в true/false для клиента
  const books = rows.map(b => ({ ...b, available: Boolean(b.available) }));
  res.json(books);
});

// --- GET: Одна книга по ID ---
app.get('/api/books/:id', (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  
  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }
  
  res.json({ ...book, available: Boolean(book.available) });
});

// --- Часть 3. POST: Создание ---
app.post('/api/books', (req, res) => {
  const title = String(req.body.title ?? '').trim();
  const author = String(req.body.author ?? '').trim();

  // Валидация
  if (!title || !author) {
    return res.status(400).json({ error: 'title and author are required' });
  }

  const available = req.body.available ? 1 : 0;

  const result = db.prepare(
    'INSERT INTO books (title, author, available) VALUES (?, ?, ?)'
  ).run(title, author, available);

  const newBook = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...newBook, available: Boolean(newBook.available) });
});

// --- Часть 2. PATCH: Обновление ---
app.patch('/api/books/:id', (req, res) => {
  const id = req.params.id;
  
  // Ищем текущую запись
  const current = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
  if (!current) {
    return res.status(404).json({ error: 'Book not found' });
  }

  // Берем новые значения, если они переданы, иначе оставляем старые
  const title = req.body.title !== undefined ? String(req.body.title).trim() : current.title;
  const author = req.body.author !== undefined ? String(req.body.author).trim() : current.author;
  const available = req.body.available !== undefined ? (req.body.available ? 1 : 0) : current.available;

  if (!title || !author) {
    return res.status(400).json({ error: 'title and author cannot be empty' });
  }

  db.prepare(
    'UPDATE books SET title = ?, author = ?, available = ? WHERE id = ?'
  ).run(title, author, available, id);

  const updated = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
  res.json({ ...updated, available: Boolean(updated.available) });
});

// --- Часть 2. DELETE: Удаление ---
app.delete('/api/books/:id', (req, res) => {
  const result = db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Book not found' });
  }
  
  res.status(204).end(); // 204 = Успешно, но без тела ответа
});

// --- Часть 7. Неизвестный маршрут ---
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Запуск
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});