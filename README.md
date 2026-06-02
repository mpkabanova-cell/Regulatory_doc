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
- Единый web service для Render: FastAPI отдает и API, и собранный React frontend.

## Стек

- Frontend: React, Vite, TypeScript, Tailwind CSS 3, `react-markdown`.
- Backend: FastAPI.
- RAG: OpenRouter или OpenAI chat model + ChromaDB retrieval.
- Embeddings: локальная `paraphrase-multilingual-MiniLM-L12-v2` или OpenAI `text-embedding-3-small`.
- Deploy: Docker + Render Web Service + persistent disk.

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
CORS_ORIGINS=http://localhost:5173
```

Для Render/free используйте `EMBEDDINGS_PROVIDER=keyword`: этот режим не загружает локальную embedding-модель и укладывается в 512 MB RAM. Для локальной машины или VPS можно оставить `EMBEDDINGS_PROVIDER=local`, если хватает памяти.

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

Локально приложение будет доступно через Vite, а API по умолчанию ожидается на `http://localhost:8000`.

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

- `GET /health` возвращает состояние сервера.
- `GET /stats` возвращает количество документов по типам.
- `POST /chat` принимает сообщение, фильтры и историю диалога; возвращает ответ и источники.
- `POST /upload` принимает PDF/DOCX пользователя.
- `POST /check` принимает `{ "upload_id": "...", "document_type": "План урока" }` и возвращает таблицу соответствия.

## Проверки

Backend tests:

```bash
.venv/bin/python -m pytest
```

Frontend build:

```bash
npm --prefix frontend run build
```

## Деплой на Render одним Web Service

Проект деплоится как один Render Web Service. FastAPI отдает API и собранный React frontend из `frontend/dist`.

1. Запушьте проект в GitHub.
2. В Render выберите `New` -> `Blueprint` и подключите репозиторий или создайте `Web Service` из Dockerfile вручную.
3. Render прочитает `render.yaml` и создаст бесплатный сервис `regulatory-rag`.
4. В переменных окружения сервиса задайте секрет:

```env
OPENROUTER_API_KEY=sk-or-v1-...
```

5. Если Render выдаст другой URL сервиса, обновите:

```env
CORS_ORIGINS=https://your-service-name.onrender.com
```

6. Запустите deploy.

В Docker build автоматически запускается `python scripts/parse_documents.py`, поэтому `metadata/chunks.jsonl` попадает в image. На Render включен `EMBEDDINGS_PROVIDER=keyword`, чтобы сервис не загружал `sentence-transformers` и не падал с `Ran out of memory (used over 512MB)`.

Если сервис уже был создан раньше, проверьте переменные окружения в Render Dashboard: `EMBEDDINGS_PROVIDER` должен быть `keyword`. Старое значение `local` заставит backend пытаться загрузить `sentence-transformers`.

После deploy проверьте:

```text
https://your-service-name.onrender.com/health
https://your-service-name.onrender.com/stats
https://your-service-name.onrender.com
```

Если меняете документы, просто сделайте новый deploy: чанки будут пересобраны на этапе Docker build.
