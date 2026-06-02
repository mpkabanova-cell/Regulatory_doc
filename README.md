# Regulatory RAG

Fullstack-система для работы с нормативными документами образования РФ.

Проект индексирует локальную нормативную базу из `documents/frp/` и `documents/norm_docs_pack/`, хранит фрагменты в ChromaDB, ведет диалог как методист и возвращает точные ссылки на источники, когда в базе есть подходящие материалы. Также система проверяет пользовательские PDF/DOCX на соответствие найденным требованиям.

## Возможности

- Чат по нормативной базе с цитатами, страницами и источниками.
- Диалоговый режим: короткие продолжения вроде `уточнила`, `ищи везде`, `в ФРП` не ищутся как отдельные запросы, а связываются с предыдущим содержательным вопросом.
- Методический режим: если найденные материалы подходят частично, ассистент сначала дает резюме ближайших источников и не пишет ложное `точной ссылки нет`.
- Фильтры по типу документа, уровню образования и предмету.
- Автоопределение предмета и ступени из вопроса, например `информатика` и `8 класс`.
- Приоритет источников по предмету: вопрос про информатику поднимает `ФРП Информатика` выше близких, но нерелевантных предметов.
- Полный список предметов ФРП по ступеням `НОО`, `ООО`, `СОО`.
- Проверка загруженных документов: КТП, рабочая программа, план урока, методическая разработка.
- VPS-деплой по IP: nginx отдает frontend и проксирует API на FastAPI через `/api`.

## Стек

- Frontend: React, Vite, TypeScript, Tailwind CSS 3, `react-markdown`.
- Backend: FastAPI.
- RAG: OpenRouter или OpenAI chat model + ChromaDB retrieval.
- Embeddings: локальная `paraphrase-multilingual-MiniLM-L12-v2` или OpenAI `text-embedding-3-small`.
- Deploy: Docker Compose + nginx + FastAPI на VPS.

## Быстрый старт

1. Создайте `.env` по примеру:

```bash
cp .env.example .env
```

2. Установите backend-зависимости:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

Если нужен локальный embedding-поиск через `sentence-transformers`, установите расширенный набор:

```bash
pip install -r backend/requirements-local.txt
```

3. Для OpenRouter + легкого поиска заполните `.env`:

```env
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=openai/gpt-4o-mini
EMBEDDINGS_PROVIDER=keyword
LOCAL_EMBEDDING_MODEL=paraphrase-multilingual-MiniLM-L12-v2
CORS_ORIGINS=*
```

Для VPS по IP используйте `EMBEDDINGS_PROVIDER=keyword`: этот режим не загружает локальную embedding-модель и экономит память. Для локальной машины или мощного VPS можно включить `EMBEDDINGS_PROVIDER=local`, если установлен `backend/requirements-local.txt`.

4. Постройте или обновите индекс:

```bash
python scripts/update_index.py
```

5. Запустите API:

```bash
uvicorn backend.app.main:app --reload
```

6. Запустите frontend:

```bash
cd frontend
npm install
npm run dev
```

Локально приложение будет доступно через Vite. Frontend обращается к API через относительный путь `/api`, а Vite proxy перенаправляет эти запросы на `http://localhost:8000`.

## Скрипты документов

- `python scripts/parse_documents.py` извлекает текст и готовит `metadata/documents.jsonl` и `metadata/chunks.jsonl`.
- `python scripts/ingest_documents.py` пересоздает ChromaDB-индекс для всех документов.
- `python scripts/update_index.py` индексирует новые и измененные документы без дублей.
- При `EMBEDDINGS_PROVIDER=keyword` ChromaDB не используется: поиск идет по подготовленному `metadata/chunks.jsonl`.

## Поведение чата

`POST /chat` работает не как простой поиск каждой фразы, а как диалоговый методический ассистент с доступом к базе.

Запрос может включать:

```json
{
  "message": "Какие результаты по информатике в 8 классе?",
  "document_type": "frp",
  "level": "ooo",
  "subject": "Информатика",
  "history": [
    { "role": "user", "content": "Что проверить в плане урока?" },
    { "role": "assistant", "content": "Уточните предмет и уровень." }
  ]
}
```

Особенности:

- `document_type`: `frp`, `fgos`, `sanpin`, `profstandart` или пусто для поиска по всей базе.
- `level`: `noo`, `ooo`, `soo`.
- `subject`: русское название предмета, например `Информатика`.
- Если выбран `Все документы`, поиск идет по всей базе; уровень и предмет используются как контекст для ответа.
- Для `ФРП` уровень и предмет применяются как точные фильтры по метаданным, потому что эти данные есть у ФРП.
- Если пользователь пишет продолжение диалога, backend берет предыдущий содержательный вопрос как retrieval-запрос.
- Источники ранжируются с учетом совпадения предмета и ступени.
- Цитаты нормализуются так, чтобы не начинаться с середины слова или середины пункта.

## API

В production frontend вызывает API через относительный префикс `/api`:

- `GET /api/health` возвращает состояние сервера.
- `GET /api/stats` возвращает количество документов по типам.
- `POST /api/chat` принимает сообщение, фильтры и историю диалога; возвращает ответ и источники.
- `POST /api/upload` принимает PDF/DOCX пользователя.
- `POST /api/check` принимает `{ "upload_id": "...", "document_type": "План урока" }` и возвращает таблицу соответствия.

Внутри backend FastAPI сохраняет маршруты без префикса (`/health`, `/stats`, `/chat`, `/upload`, `/check`), а nginx снимает `/api` при проксировании.

## Проверки

Backend tests:

```bash
.venv/bin/python -m pytest
```

Frontend build:

```bash
npm --prefix frontend run build
```

## Деплой на VPS по IP

Проект запускается на VPS без домена: пользователь открывает `http://<SERVER_IP>`, nginx отдает React frontend и проксирует `/api/*` во внутренний FastAPI-сервис.

1. Установите Docker и Docker Compose plugin на VPS.
2. Склонируйте репозиторий на сервер.
3. Создайте `.env`:

```bash
cp .env.example .env
```

4. В `.env` задайте ключ OpenRouter:

```env
OPENROUTER_API_KEY=sk-or-v1-...
```

Для деплоя по IP можно оставить:

```env
EMBEDDINGS_PROVIDER=keyword
CORS_ORIGINS=*
```

5. Запустите сборку и сервисы:

```bash
docker compose up -d --build
```

Backend запускается на `0.0.0.0:8000` внутри Docker-сети. Наружу открыт только nginx на порту `80`.

После запуска проверьте:

```text
http://<SERVER_IP>/
http://<SERVER_IP>/api/health
http://<SERVER_IP>/api/stats
```

Если меняете документы, пересоберите контейнеры:

```bash
docker compose up -d --build
```
