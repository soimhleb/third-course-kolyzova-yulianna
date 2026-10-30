const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware для чтения JSON из тела запроса (нужно для POST)
app.use(express.json());

// Часть 2. Данные (массив из 6 объектов)
const books = [
  { id: 1, title: '1984', author: 'George Orwell', year: 1949, available: true },
  { id: 2, title: 'Brave New World', author: 'Aldous Huxley', year: 1932, available: false },
  { id: 3, title: 'We', author: 'Yevgeny Zamyatin', year: 1920, available: true },
  { id: 4, title: 'Fahrenheit 451', author: 'Ray Bradbury', year: 1953, available: false },
  { id: 5, title: 'The Hobbit', author: 'J.R.R. Tolkien', year: 1937, available: true },
  { id: 6, title: 'The Lord of the Rings', author: 'J.R.R. Tolkien', year: 1954, available: true }
];

// Часть 3 и 5. Получение коллекции + Query параметры
app.get('/api/books', (req, res) => {
  let result = books;

  // Фильтр по автору (query: ?author=Tolkien)
  if (req.query.author) {
    result = result.filter(b => b.author.toLowerCase().includes(req.query.author.toLowerCase()));
  }

  // Фильтр по доступности (query: ?available=true)
  if (req.query.available) {
    const expected = req.query.available === 'true';
    result = result.filter(b => b.available === expected);
  }

  res.json(result);
});

// Часть 4. Получение одного объекта по ID
app.get('/api/books/:id', (req, res) => {
  const id = Number(req.params.id);
  const book = books.find(b => b.id === id);

  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  res.json(book);
});

// Часть 6. Создание (POST)
app.post('/api/books', (req, res) => {
  const title = String(req.body.title ?? '').trim();
  const author = String(req.body.author ?? '').trim();

  // Валидация: обязательные поля
  if (!title || !author) {
    return res.status(400).json({ error: 'title and author are required' });
  }

  const newBook = {
    id: Date.now(), // Генерируем уникальный ID
    title: title,
    author: author,
    year: req.body.year || null,
    available: req.body.available ?? true
  };

  books.push(newBook);
  res.status(201).json(newBook); // 201 Created
});

// Часть 7. Служебный маршрут
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Books API',
    version: 1,
    items: books.length // Количество вычисляется динамически
  });
});

// Часть 8. Обработка неизвестного маршрута (404)
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});