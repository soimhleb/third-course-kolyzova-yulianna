const path = require('node:path');

const express = require('express');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
// Раздаем статические файлы из папки public
app.use(express.static(path.join(__dirname, 'public')));

// Подключение к БД и создание таблицы
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

// Вспомогательная функция для проверки чисел
function parsePositiveInt(val, def, max) {
  if (val === undefined) return def;
  if (typeof val !== 'string' || !/^[1-9]\d*$/.test(val)) return null;
  const num = Number(val);
  if (!Number.isSafeInteger(num) || num > max) return null;
  return num;
}

// ОБНОВЛЕННЫЙ GET /api/books
app.get('/api/books', (req, res) => {
  // 1. Читаем параметры
  const page = parsePositiveInt(req.query.page, 1, 10000);
  const limit = parsePositiveInt(req.query.limit, 5, 50);
  const available = req.query.available; // будет строкой 'true' или 'false'
  const search = req.query.search ?? '';
  const sort = req.query.sort ?? 'id';
  const order = req.query.order ?? 'asc';

  // 2. Валидация (Белый список сортировки)
  const sortColumns = { id: 'id', title: 'title', author: 'author', available: 'available' };
  
  if (page === null || limit === null || 
      (available !== undefined && !['true', 'false'].includes(available)) ||
      !Object.hasOwn(sortColumns, sort) || !['asc', 'desc'].includes(order)) {
    return res.status(400).json({ error: 'Некорректные параметры запроса' });
  }

  // 3. Собираем WHERE
  const where = [];
  const params = [];

  if (search.trim()) {
    where.push('title LIKE ?');
    params.push(`%${search.trim()}%`);
  }
  if (available !== undefined) {
    where.push('available = ?');
    params.push(available === 'true' ? 1 : 0);
  }

  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

  // 4. Считаем общее количество (COUNT)
  const total = db.prepare(`SELECT COUNT(*) AS total FROM books ${whereSql}`).get(...params).total;

  // 5. Считаем LIMIT и OFFSET
  const offset = (page - 1) * limit;
  const sortSql = sortColumns[sort];
  const orderSql = order.toUpperCase();

  // 6. Получаем данные
  const sql = `SELECT * FROM books ${whereSql} ORDER BY ${sortSql} ${orderSql}, id ASC LIMIT ? OFFSET ?`;
  const rows = db.prepare(sql).all(...params, limit, offset);

  // 7. Отправляем ответ в новом формате
  res.json({
    items: rows.map(r => ({ ...r, available: Boolean(r.available) })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 0 // если total=0, то pages=0
    }
  });
});

// GET: Одна книга по ID
app.get('/api/books/:id', (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  
  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }
  
  res.json({ ...book, available: Boolean(book.available) });
});

// POST: Создание
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

// PATCH: Обновление
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

// DELETE: Удаление
app.delete('/api/books/:id', (req, res) => {
  const result = db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Book not found' });
  }
  
  res.status(204).end(); // 204 = Успешно, но без тела ответа
});

// Неизвестный маршрут
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Запуск
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});