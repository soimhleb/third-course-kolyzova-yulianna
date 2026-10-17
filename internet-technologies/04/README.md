# Занятие 4. HTTP-методы, REST и CRUD

## 1. Как запустить проект?
Открыть страницу по адресу GitHub Pages. Для работы запросов используется
CORS-прокси `cors-anywhere.herokuapp.com` — перед первым запуском нужно
активировать его на странице `https://cors-anywhere.herokuapp.com/corsdemo`.

## 2. Какой API используется?
`https://jsonplaceholder.typicode.com/posts` — учебный сервис
JSONPlaceholder. Возвращает правдоподобные ответы, но реально не сохраняет
изменения.

## 3. Какие HTTP-методы реализованы?
- `GET /posts?_limit=10` — загрузка списка;
- `POST /posts` — создание (JSON в теле, Content-Type: application/json);
- `PATCH /posts/:id` — частичное изменение;
- `DELETE /posts/:id` — удаление.

## 4. Как устроено состояние приложения?
```js
{
  posts: [],
  isLoading: false,
  isSaving: false,
  error: null,
  editingId: null,
  filter: ''
}
```

## 5. Как обрабатываются ошибки?
Все операции обёрнуты в `try/catch/finally`. При ошибке сети или при
`response.ok === false` в `state.error` пишется сообщение, в `finally`
снимается флаг `isSaving` и вызывается `render()`.

## 6. Что происходит после успешного POST, PATCH и DELETE?
- `POST` — ответ сервера добавляется в начало `state.posts`. Форма очищается.
<img width="686" height="122" alt="изображение" src="https://github.com/user-attachments/assets/aec99d67-c712-423a-ba6b-a522f8882102" />
<img width="425" height="148" alt="изображение" src="https://github.com/user-attachments/assets/5354e855-ac08-415e-b1fb-05a10a3c273a" />
<img width="485" height="136" alt="изображение" src="https://github.com/user-attachments/assets/eac1250e-6d35-4bf8-8040-97d1192aedaa" />

- `PATCH` — объект в `state.posts` заменяется на новый `{ ...old, ...updated }`.
<img width="724" height="121" alt="изображение" src="https://github.com/user-attachments/assets/af7f446b-ecb6-4471-b369-12fedf3982d1" />
<img width="421" height="136" alt="изображение" src="https://github.com/user-attachments/assets/55245f4a-b2be-45b3-84e8-4b559bc42e40" />
<img width="426" height="123" alt="изображение" src="https://github.com/user-attachments/assets/6a77ea5c-a3af-45ad-90b3-10781bbc7ff3" />

- `DELETE` — `state.posts` фильтруется: остаются все, кроме удаляемого `id`.
<img width="714" height="119" alt="изображение" src="https://github.com/user-attachments/assets/22a04497-6628-4dad-9c65-f43e7f76e07d" />
<img width="364" height="63" alt="изображение" src="https://github.com/user-attachments/assets/49254063-da6f-40ce-a9d5-7568779259df" />

## 7. Почему изменения исчезают после полной перезагрузки страницы?
JSONPlaceholder — учебный API. `POST/PATCH/DELETE` принимаются и
возвращают корректные ответы, но не изменяют базу на сервере. Поэтому
после перезагрузки `GET /posts` снова возвращает исходные 100 постов,
а созданные/изменённые/удалённые записи исчезают. Все изменения хранятся только в `state` внутри страницы.
