const Database = require('better-sqlite3');
const db = new Database('data.db');

// Очищаем таблицу перед заполнением
db.prepare('DELETE FROM books').run();

const insert = db.prepare('INSERT INTO books (title, author, available) VALUES (?, ?, ?)');
const authors = ['Tolkien', 'Orwell', 'Herbert', 'Rowling', 'Martin', 'King'];

for (let i = 1; i <= 25; i++) {
  const author = authors[i % authors.length];
  const title = `Книга ${i} автора ${author}`;
  const available = i % 2 === 0 ? 1 : 0;
  insert.run(title, author, available);
}
console.log('База заполнена 25 записями');