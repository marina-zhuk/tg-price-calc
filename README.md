# tg-price-calc — Telegram Mini App «Калькулятор стоимости клининга + заявка»

Демо-кейс для портфолио. Клиент задаёт параметры уборки → видит вилку цены вживую →
оставляет заявку → владельцу приходит уведомление в Telegram с готовым расчётом.

Архитектура не привязана к нише: смена ниши = правка `src/config/pricing.config.ts`
и текстов. Код калькулятора и отправки заявки не меняется.

## Стек
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Zod — валидация заявки на бэке
- Telegram WebApp SDK (тема, MainButton, initData)
- Telegram Bot API — уведомление владельцу
- Хостинг: Vercel (страница + serverless API route)
- БЕЗ базы данных, оплаты и авторизации

## Локальный запуск
```bash
npm install
npm run dev      # http://localhost:3000
```
Windows PowerShell: если `npm.ps1` блокируется политикой — используйте `npm.cmd run dev`.

Демо работает **в обычном браузере** (обычная кнопка отправки) и **внутри Telegram**
(нижняя MainButton). Без токенов всё считает и «отправляет» заявку в mock-режиме.

## Как это считает
`total = ставка[тип] × площадь × коэф_срочности + сумма доп-опций`, затем применяется
минимальный заказ (если `total < minOrder` → `minOrder`). Вилка цены:
`min = round(total)`, `max = round(total × 1.2)`.

Прайс целиком лежит в `src/config/pricing.config.ts`:
| Параметр | Значение |
|---|---|
| Поддерживающая | 60 ₽/м² |
| Генеральная | 120 ₽/м² |
| После ремонта | 180 ₽/м² |
| Минимальный заказ | 2500 ₽ |
| Срочность | обычная ×1.0 · 24 ч ×1.2 |
| Доп-опции | окна 1500 · диван 2000 · ковёр 1500 · духовка 800 · холодильник 600 · глажка 700 |

Чистая функция расчёта — `src/lib/pricing.ts: calculatePrice(config, input)`.

## API: `POST /api/lead`
Тело (JSON):
```json
{
  "name": "Иван",
  "phone": "+7 900 000-00-00",
  "comment": "необязательно",
  "calc": { "type": "general", "area": 50, "urgency": "normal", "options": ["windows"], "min": 6000, "max": 7200 }
}
```
- Валидация через Zod. Невалидные данные → `400` с ошибками.
- Если заданы `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` → реальная отправка владельцу.
- Если нет → mock: payload в консоль сервера, ответ `{ ok: true, mock: true }`.
- При валидном вводе в демо роут никогда не падает.

## Подключение бота (реальные уведомления)
1. Создайте бота у [@BotFather](https://t.me/BotFather) → получите **token**.
2. Узнайте свой **chat_id** (напишите боту, затем [@getmyid_bot](https://t.me/getmyid_bot) или [@userinfobot](https://t.me/userinfobot)).
3. Скопируйте `.env.example` → `.env.local` и заполните:
   ```
   TELEGRAM_BOT_TOKEN=123456:ABC...
   TELEGRAM_CHAT_ID=782598557
   ```
4. Перезапустите `npm run dev`. Теперь заявки приходят в Telegram.

### Привязать Mini App к боту
1. У @BotFather: `/newapp` (или Bot Settings → Menu Button / Web App) → укажите URL
   задеплоенного приложения (см. ниже).
2. Откройте бота → кнопка меню/`web_app` запустит Mini App внутри Telegram.

## Деплой на Vercel
1. Залейте репозиторий на GitHub.
2. На [vercel.com](https://vercel.com) → **New Project** → импортируйте репозиторий.
3. Framework определится как Next.js автоматически. **Environment Variables**:
   добавьте `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` (если нужны реальные уведомления).
4. **Deploy**. Получите прод-URL — его и указывайте в @BotFather как Web App URL.

## Структура
```
src/
  app/
    layout.tsx            # подключение telegram-web-app.js, мета
    page.tsx              # экран: калькулятор + форма заявки
    globals.css
    api/lead/route.ts     # POST /api/lead: Zod + отправка/мок
  components/
    Calculator.tsx        # UI калькулятора, живой расчёт
    LeadForm.tsx          # форма заявки + интеграция MainButton
  lib/
    pricing.ts            # чистая функция расчёта
    schema.ts             # Zod-схема заявки
    telegram.ts           # сборка сообщения + sendMessage / mock
    useTelegram.ts        # хук инициализации WebApp + тема
    telegram-webapp.d.ts  # типы SDK
  config/
    pricing.config.ts     # ПРАЙС НИШИ (точка смены ниши)
public/
  screenshots/            # скриншоты для портфолио
```

## Допущения (демо)
- Без токенов приложение работает в **mock-режиме** — это штатное поведение демо.
- `initData` Telegram передаётся на бэк, но **не проверяется** (для демо подпись не валидируется).
- Нет БД: заявки не хранятся, только отправляются/логируются.
- Телефон валидируется мягко (длина + допустимые символы), без проверки формата по стране.
- Вилка цены (`×1.2`) — демонстрационная «вверх», точную смету подтверждает менеджер.

## TODO после goal
- Проверка подписи `initData` (HMAC по токену бота) на бэке.
- Запись заявок в Google Sheets через `GOOGLE_APPS_SCRIPT_WEBHOOK_URL` (опциональный апсейл).
- Антиспам/rate-limit на `/api/lead`.
- Реальные скриншоты в `public/screenshots/` + демо-ссылка в шапке README.
- Тесты на `calculatePrice` (граничные случаи: минимальный заказ, срочность, опции).
