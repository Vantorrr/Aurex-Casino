# 🚀 Railway Deployment Guide

## Автоматический деплой всех сервисов

### Метод 1: Railway Template (РЕКОМЕНДУЕТСЯ)

Это автоматически создаст 3 сервиса: PostgreSQL, Backend, Frontend

1. **Перейди на**: https://railway.app/new/template

2. **Нажми "Deploy from GitHub repo"**

3. **Выбери репозиторий**: `Vantorrr/Aurex-Casino`

4. **Railway автоматически создаст:**
   - ✅ PostgreSQL Database
   - ✅ Backend Service (порт 6000)
   - ✅ Frontend Service (порт 3000)
   - ✅ Все переменные окружения

5. **Подожди 5-10 минут** пока все деплоится

6. **Готово!** Открывай Frontend URL

---

### Метод 2: Ручная настройка (если Template не работает)

#### Шаг 1: Создай новый проект
1. Railway Dashboard → **New Project**
2. Назови проект: `AUREX Casino`

#### Шаг 2: Добавь PostgreSQL
1. В проекте → **New** → **Database** → **Add PostgreSQL**
2. Подожди пока запустится
3. Открой database → **Variables** → скопируй `DATABASE_URL`

#### Шаг 3: Добавь Backend
1. **New** → **GitHub Repo** → выбери `Vantorrr/Aurex-Casino`
2. В настройках сервиса:
   - **Root Directory**: `/backend`
   - **Custom Start Command**: `npm run setup && npm start`
3. Добавь Variables:
   ```
   NODE_ENV=production
   PORT=6000
   DATABASE_URL=<вставь-из-postgres>
   JWT_SECRET=<сгенерируй-случайную-строку-32-символа>
   FRONTEND_URL=https://your-frontend.railway.app
   ```
4. **Deploy**

#### Шаг 4: Добавь Frontend  
1. **New** → **GitHub Repo** → выбери `Vantorrr/Aurex-Casino`
2. В настройках сервиса:
   - **Root Directory**: `/frontend`
   - **Custom Start Command**: `npm start`
3. Добавь Variables:
   ```
   NEXT_PUBLIC_API_URL=<твой-backend-url>
   NEXT_PUBLIC_SITE_URL=<твой-frontend-url>
   ```
4. **Deploy**

#### Шаг 5: Обновить CORS
1. Вернись в Backend service
2. Обнови `FRONTEND_URL` на реальный URL фронтенда
3. Нажми **Redeploy**

---

## ✅ Проверка после деплоя

1. **Backend Health Check**:
   ```
   https://your-backend.railway.app/health
   ```
   Должен вернуть: `{ "status": "OK", "timestamp": "..." }`

2. **Frontend**:
   ```
   https://your-frontend.railway.app
   ```
   Должна открыться главная страница

3. **Admin Login**:
   - Открой фронтенд
   - Логин: `admin`
   - Пароль: `admin123`
   - Должен быть VIP Emperor с балансом 100,000₽

---

## 🔧 Environment Variables

### Backend
```bash
# Обязательные
NODE_ENV=production
PORT=6000
DATABASE_URL=<postgresql://...>
JWT_SECRET=<random-32-chars>
FRONTEND_URL=<https://your-frontend.railway.app>

# Опциональные
B2B_API_KEY=<your-gaming-provider-key>
B2B_API_URL=<https://api.provider.com>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<email>
SMTP_PASS=<password>
```

### Frontend
```bash
# Обязательные
NEXT_PUBLIC_API_URL=<https://your-backend.railway.app>
NEXT_PUBLIC_SITE_URL=<https://your-frontend.railway.app>

# Опциональные
NEXT_PUBLIC_GA_ID=<google-analytics>
NEXT_PUBLIC_YANDEX_METRIKA_ID=<yandex-metrika>
```

---

## 🎯 Структура проекта на Railway

```
AUREX Casino (Project)
├── postgres (Database)
│   └── DATABASE_URL автоматически
├── backend (Service)
│   ├── Root: /backend
│   ├── Port: 6000
│   └── Health: /health
└── frontend (Service)
    ├── Root: /frontend
    ├── Port: 3000
    └── Auto SSL
```

---

## 🔍 Troubleshooting

### Backend не запускается
1. Проверь `DATABASE_URL` - должен начинаться с `postgresql://`
2. Проверь логи: Railway → backend service → **Deployments** → View Logs
3. Убедись что миграции прошли: ищи в логах `✅ Migrations completed`

### Frontend не подключается к Backend
1. Проверь `NEXT_PUBLIC_API_URL` - должен быть HTTPS URL бэкенда
2. Проверь CORS: в backend logs должен быть `FRONTEND_URL` с правильным доменом
3. Открой Network tab в браузере и смотри ошибки

### База данных пустая
1. Перезапусти backend - это запустит seed скрипт заново
2. Или зайди в postgres и запусти вручную:
   ```bash
   railway run npm run seed
   ```

### CORS ошибки
Backend переменная `FRONTEND_URL` должна точно совпадать с URL фронтенда (включая https://)

---

## 🔄 Обновление проекта

После git push изменений:

1. Railway автоматически деплоит изменения
2. Или вручную: Service → **Deployments** → **Redeploy**

---

## 💰 Pricing

Railway Free Tier:
- $5 в месяц бесплатно
- Хватит на тестирование
- Для продакшена - $5-20/месяц

PostgreSQL:
- Включена в Free Tier
- 500MB достаточно для старта

---

## 📞 Support

Проблемы с деплоем?
1. Проверь Railway Status: https://railway.app/status
2. Railway Discord: https://discord.gg/railway
3. Логи на Railway показывают 90% проблем

---

**Готово! Казино запущено! 🎰👑**
