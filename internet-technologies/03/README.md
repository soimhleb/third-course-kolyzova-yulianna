# Занятие 3. HTTP, Fetch API и работа с JSON

1. **Какой endpoint используется?**
   `https://jsonplaceholder.typicode.com/users` - учебный API JSONPlaceholder.
   Запрос идёт через CORS-прокси `https://cors-anywhere.herokuapp.com/`,
   потому что GitHub Pages блокирует прямые запросы к сторонним API
   политикой CORS. Итоговый адрес:
   `https://cors-anywhere.herokuapp.com/https://jsonplaceholder.typicode.com/users`

2. **Какой HTTP-метод отправляется?**
   `GET` - данные только читаются.

3. **Где в программе хранится состояние?**
   В объекте `state`:
   ```js
   {
     users: [],
     isLoading: false,
     error: null,
     filter: ''
   }

4. **Какие состояния интерфейса предусмотрены?**
- данные ещё не загружены (пустой state.users);
- загрузка (state.isLoading === true);
- успешный ответ (массив заполнен, ошибки нет);
- ошибка (state.error не null).

5. **Как обрабатывается ошибка?**
В loadUsers() запрос обёрнут в try/catch/finally.
Если fetch падает или response.ok возвращает false - бросается
исключение, оно ловится в catch, и в state.error пишется понятное
сообщение. Блок finally снимает флаг isLoading и вызывает render(),
поэтому интерфейс не зависает на «Загрузка…».

6. **Какие поля участвуют в фильтрации?**
name, username, email. Фильтр регистронезависимый -
обе стороны приводятся к нижнему регистру через .toLowerCase().
Исходный массив state.users не изменяется: Array.prototype.filter
возвращает новый массив.

7. **Что вы увидели в Network при успешном запросе и при ошибке?**
При успешном: GET к jsonplaceholder.typicode.com/users (через прокси),
Status Code 200 OK, в Response - JSON-массив из 10 пользователей
с полями id, name, username, email, address, company.
При неправильном endpoint (для проверки временно менялся адрес):
Status Code 404 Not Found, в Response - HTML-страница ошибки, а не JSON.
