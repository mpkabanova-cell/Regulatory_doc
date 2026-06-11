# Интервью сквозь время — сценарии событийной разметки

Источник: `2026-05-26_событийная разметка и критерии -- Интервью сквозь время (5).md`

Счётчик Яндекс Метрики: `108472990`.

Все события сценария должны отправляться в два канала:

```ts
ym(108472990, "reachGoal", goalSlug, payload);
window.dataLayer.push({ event: goalSlug, ...payload });
```

Если в проекте используется custom event collector, событие дополнительно дублируется в `POST /api/events` с тем же `event_type`, что и `goalSlug`.

## Роли и смысл сценария

Сценарий состоит из двух связанных частей:

- Учитель копирует ссылку на интервью для ученика.
- Один или несколько учеников проходят интервью по этой ссылке и отправляют наблюдения.

Классическая воронка «один пользователь -> один финал» здесь не подходит, потому что одна учительская ссылка (`link_id`) может породить много ученических сессий (`visitor_id`).

```text
Учитель: itt_link_copied
  -> рассылка ссылки
  -> Ученики: itt_link_opened
  -> itt_brief_viewed
  -> itt_chat_started
  -> itt_message_sent
  -> itt_chat_completed
  -> itt_reflection_started
  -> itt_reflection_submitted
```

## Идентификаторы атрибуции

| Поле | Где хранится/передаётся | Роль | Назначение |
| :-- | :-- | :-- | :-- |
| `client_id` | URL `?client_id=` + события | учитель | Yandex Metrika ClientID учителя при копировании ссылки |
| `link_id` | URL `?link_id=` + события | ссылка | UUID v4 для связи рассылки учителя с действиями учеников |
| `visitor_id` | `sessionStorage` (`ez_itt_visitor_{link_id}`) + события | ученик | UUID сессии ученика для конкретной ссылки |
| `name` | URL `?name=` | учитель -> PDF | Имя для PDF, на сервер и в события не передаётся |

Формат учительской ссылки:

```text
/interview/{persona_id}?link_id={uuid}&client_id={ym_client_id}&name={имя}
```

`name` добавляется только при копировании ссылки с именем. В событиях допускается только флаг `with_name_hint: true`, без передачи самого имени.

## Общие правила payload

Для учительского события:

- `link_id` — UUID конкретного копирования.
- `client_id` — Yandex Metrika ClientID учителя.
- `persona_id` — персона интервью.
- `with_name` — была ли скопирована ссылка с именем.

Для ученических событий при наличии `link_id`:

- `link_id` — из query string.
- `teacher_client_id` — из query string `client_id`.
- `visitor_id` — создаётся при первом открытии ссылки и хранится в `sessionStorage`.
- `persona_id` — персона интервью.
- `with_name_hint` — опционально, если в URL есть `name`.

Для старых ссылок без `link_id` сценарий должен продолжать работать. В таком случае `link_id` может быть `null`, а `visitor_id` и `teacher_client_id` отсутствуют.

## Сценарии

### 1. Учитель копирует ссылку для ученика

Цель: зафиксировать факт создания учителем распространяемой ссылки.

Старт сценария учителя:

- учитель нажимает кнопку копирования ссылки;
- генерируется новый `link_id`;
- в ссылку добавляется `client_id` учителя;
- при необходимости добавляется `name`.

Событие:

| Событие | Goal slug | Payload |
| :-- | :-- | :-- |
| Скопирована ссылка для ученика | `itt_link_copied` | `link_id`, `client_id`, `persona_id`, `with_name` |

Пример:

```ts
ym(108472990, "reachGoal", "itt_link_copied", {
  itt_link_copied: {
    link_id: "...",
    client_id: "...",
    persona_id: "...",
    with_name: false,
  },
});

window.dataLayer.push({
  event: "itt_link_copied",
  link_id: "...",
  client_id: "...",
  persona_id: "...",
  with_name: false,
});
```

### 2. Ученик открывает ссылку

Цель: зафиксировать вход ученика в сценарий и связать его с учительской ссылкой.

Старт:

- ученик открывает `/interview/{persona_id}`;
- из URL читаются `link_id` и `client_id`;
- создаётся или переиспользуется `visitor_id` в `sessionStorage`.

Событие:

| Событие | Goal slug | Payload |
| :-- | :-- | :-- |
| Открыта ученическая ссылка | `itt_link_opened` | `link_id`, `visitor_id`, `teacher_client_id`, `persona_id`, `with_name_hint` |

### 3. Ученик просматривает бриф

Цель: отделить простое открытие ссылки от первого осмысленного просмотра задания.

Триггер:

- ученик увидел/открыл экран с брифом перед интервью.

Событие:

| Событие | Goal slug | Payload |
| :-- | :-- | :-- |
| Просмотрен бриф перед интервью | `itt_brief_viewed` | `link_id`, `visitor_id`, `teacher_client_id`, `persona_id` |

### 4. Ученик начинает интервью

Цель: зафиксировать старт выполнения сценария.

Триггер:

- ученик нажал кнопку начала интервью или перешёл к чату.

Событие:

| Событие | Goal slug | Payload |
| :-- | :-- | :-- |
| Начато интервью | `itt_chat_started` | `link_id`, `visitor_id`, `teacher_client_id`, `persona_id` |

### 5. Ученик отправляет сообщения в интервью

Цель: измерять глубину прохождения и отвал внутри диалога.

Триггер:

- каждое отправленное учеником сообщение.

Событие:

| Событие | Goal slug | Payload |
| :-- | :-- | :-- |
| Отправлено сообщение ученика | `itt_message_sent` | `link_id`, `visitor_id`, `teacher_client_id`, `persona_id`, `message_index`, `messages_remaining` |

Поля для анализа отвала:

- `message_index` — номер отправленного сообщения.
- `messages_remaining` — сколько сообщений осталось до лимита или ожидаемого конца.

### 6. Ученик завершает диалог

Цель: зафиксировать завершение чатовой части и переход к наблюдениям.

Триггер:

- ученик нажал кнопку перехода к наблюдениям после интервью.

Событие:

| Событие | Goal slug | Payload |
| :-- | :-- | :-- |
| Завершён диалог | `itt_chat_completed` | `link_id`, `visitor_id`, `teacher_client_id`, `persona_id` |

### 7. Ученик открывает форму наблюдений

Цель: зафиксировать старт финального этапа сценария.

Триггер:

- открыта форма наблюдений/рефлексии.

Событие:

| Событие | Goal slug | Payload |
| :-- | :-- | :-- |
| Открыта форма наблюдений | `itt_reflection_started` | `link_id`, `visitor_id`, `teacher_client_id`, `persona_id` |

### 8. Ученик отправляет наблюдения

Цель: зафиксировать успешное завершение ученического сценария.

Триггер:

- ученик отправил заполненную форму наблюдений.

Событие:

| Событие | Goal slug | Payload |
| :-- | :-- | :-- |
| Отправлены наблюдения | `itt_reflection_submitted` | `link_id`, `visitor_id`, `teacher_client_id`, `persona_id`, `reflection_length` |

`reflection_length` — длина отправленного текста наблюдений.

### 9. Ученик скачивает PDF

Цель: зафиксировать дополнительный сигнал вовлечённости.

Триггер:

- ученик скачал PDF по результатам сценария.

Событие:

| Событие | Goal slug | Payload |
| :-- | :-- | :-- |
| Скачан PDF | `itt_pdf_downloaded` | `link_id`, `visitor_id`, `teacher_client_id`, `persona_id` |

PDF не является обязательным критерием успеха, но полезен как дополнительный сигнал.

## Критерии воронки

| Уровень | Критерий | События |
| :-- | :-- | :-- |
| Инициация учителя | Учитель скопировал ссылку | `itt_link_copied` |
| Инициация ученика | Ученик открыл ссылку | `itt_link_opened` |
| Старт выполнения | Ученик начал интервью | `itt_chat_started` |
| Частичное прохождение | Ученик отправил хотя бы одно сообщение или завершил чат | `itt_message_sent`, `itt_chat_completed` |
| Полное прохождение ученика | Ученик отправил наблюдения | `itt_reflection_submitted` |
| Успех для учителя | Хотя бы один ученик отправил наблюдения по ссылке учителя | `itt_link_copied` + `itt_reflection_submitted` по одному `link_id` |
| Дополнительная вовлечённость | Ученик скачал PDF | `itt_pdf_downloaded` |

## Перевёрнутая воронка учителя

Успех учителя считается не по его собственному финальному действию, а по действиям учеников, пришедших по его ссылке.

Условие успеха:

- есть событие `itt_link_copied`;
- есть хотя бы одно событие `itt_reflection_submitted` с тем же `link_id`;
- `teacher_client_id` в ученическом событии соответствует `client_id` учителя.

Пример SQL для custom collector:

```sql
WITH copies AS (
  SELECT
    metadata->>'link_id' AS link_id,
    metadata->>'client_id' AS teacher_client_id,
    created_at
  FROM events
  WHERE event_type = 'itt_link_copied'
    AND metadata->>'link_id' IS NOT NULL
),
completions AS (
  SELECT DISTINCT
    metadata->>'link_id' AS link_id
  FROM events
  WHERE event_type = 'itt_reflection_submitted'
    AND metadata->>'link_id' IS NOT NULL
)
SELECT c.link_id, c.teacher_client_id, c.created_at
FROM copies c
INNER JOIN completions f ON f.link_id = c.link_id;
```

## Анализ отвала в диалоге

Отвал внутри интервью считается по событию `itt_message_sent`.

Основные разрезы:

- `link_id` — какая учительская ссылка дала сессию;
- `visitor_id` — конкретная ученическая сессия;
- `message_index` — на каком сообщении пользователь остановился;
- `messages_remaining` — сколько сообщений оставалось до конца сценария.

## События, не внедрённые в базовый сценарий

| Идея | Зачем | Комментарий |
| :-- | :-- | :-- |
| `itt_chat_abandoned` | Оценка отвала при уходе со страницы | Может быть шумным без порога, например после 2+ сообщений |
| Сегмент «учитель с активацией» | Считать учителей, у которых ученики завершили сценарий | Строится аналитически через `itt_link_copied` + `itt_reflection_submitted` |

## Итоговый список событий

- `itt_link_copied`
- `itt_link_opened`
- `itt_brief_viewed`
- `itt_chat_started`
- `itt_message_sent`
- `itt_chat_completed`
- `itt_reflection_started`
- `itt_reflection_submitted`
- `itt_pdf_downloaded`
