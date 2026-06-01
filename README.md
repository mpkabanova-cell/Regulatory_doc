# Regulatory RAG

Fullstack RAG-система для работы с нормативными документами образования РФ.

Система индексирует локальные документы из `documents/frp/` и `documents/norm_docs_pack/`, хранит чанки в ChromaDB, отвечает на вопросы только по найденным нормативным источникам и проверяет пользовательские PDF/DOCX на соответствие требованиям.

## Стек

- Frontend: React, Vite, TypeScript, Tailwind CSS.
- Backend: FastAPI.
- RAG: OpenRouter или OpenAI chat model + ChromaDB retrieval.
- Embeddings: локальная `paraphrase-multilingual-MiniLM-L12-v2` или OpenAI `text-embedding-3-small`.

## Быстрый старт

1. Создайте `.env` по примеру:

```bash
cp .env.example .env
```

2. Установите backend-зависимости:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

Для OpenRouter + локальных embeddings используйте `.env`:

```env
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=openai/gpt-4o-mini
EMBEDDINGS_PROVIDER=local
LOCAL_EMBEDDING_MODEL=paraphrase-multilingual-MiniLM-L12-v2
CORS_ORIGINS=http://localhost:5173
```

3. Постройте индекс:

```bash
python scripts/update_index.py
```

4. Запустите API:

```bash
uvicorn backend.app.main:app --reload
```

5. Запустите frontend:

```bash
cd frontend
npm install
npm run dev
```

## Скрипты документов

- `python scripts/parse_documents.py` извлекает текст и готовит `metadata/documents.jsonl` и `metadata/chunks.jsonl`.
- `python scripts/ingest_documents.py` пересоздает индекс для всех документов.
- `python scripts/update_index.py` индексирует новые и измененные документы без дублей.

## API

- `POST /chat` принимает `{ "message": "..." }` и возвращает ответ с источниками.
- `POST /upload` принимает PDF/DOCX пользователя.
- `POST /check` принимает `{ "upload_id": "...", "document_type": "План урока" }` и возвращает таблицу соответствия.

Если нормативного основания нет, backend возвращает:

```text
В загруженной нормативной базе не найдено нормативное основание для ответа.
```

## Деплой На Render Одним Web Service

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
