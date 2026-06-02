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

3. Для OpenRouter + локальных embeddings заполните `.env`:

```env
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=openai/gpt-4o-mini
EMBEDDINGS_PROVIDER=local
LOCAL_EMBEDDING_MODEL=paraphrase-multilingual-MiniLM-L12-v2
CORS_ORIGINS=http://localhost:5173
```

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
- `python scripts/ingest_documents.py` пересоздает индекс для всех документов.
- `python scripts/update_index.py` индексирует новые и измененные документы без дублей.

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
- Для `ФРП` уровень и предмет применяются как точные ChromaDB-фильтры, потому что эти метаданные есть у ФРП.
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
2. В Render выберите `New` -> `Blueprint` и подключите репозиторий.
3. Render прочитает `render.yaml` и создаст сервис `regulatory-rag`.
4. В переменных окружения сервиса задайте секрет:

```env
OPENROUTER_API_KEY=sk-or-v1-...
```

5. Если Render выдаст другой URL сервиса, обновите:

```env
CORS_ORIGINS=https://your-service-name.onrender.com
```

6. Запустите deploy.

Первый deploy может быть долгим: `preDeployCommand` запускает `python scripts/update_index.py`, скачивает embedding-модель и строит ChromaDB индекс на persistent disk.

После deploy проверьте:

```text
https://your-service-name.onrender.com/health
https://your-service-name.onrender.com/stats
https://your-service-name.onrender.com
```

Если индексация не успеет завершиться на первом deploy, откройте Render Shell и вручную выполните:

```bash
python scripts/update_index.py
```
