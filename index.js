// Загружаем переменные окружения из .env.production
require('dotenv').config({ path: '.env.production' });

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

// Инициализация приложения
const app = express();

// Логирование для диагностики
console.log("Запуск сервера...");
console.log("Настройки CORS:");
console.log("CORS_ORIGIN:", process.env.CORS_ORIGIN);
console.log("CORS_METHODS:", process.env.CORS_METHODS);
console.log("CORS_HEADERS:", process.env.CORS_HEADERS);

// Настройка CORS
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',');
app.use(cors({
  origin: (origin, callback) => {
    console.log("Проверка origin:", origin);
    if (!origin || allowedOrigins.includes(origin)) {
      console.log("CORS разрешён для origin:", origin);
      callback(null, true);
    } else {
      console.error("CORS отклонён для origin:", origin);
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  methods: process.env.CORS_METHODS.split(','), // Разрешённые HTTP-методы
  allowedHeaders: process.env.CORS_HEADERS.split(','), // Разрешённые заголовки
}));

// Middleware для обработки JSON
app.use(bodyParser.json());

// Логирование входящих запросов
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Обработка предварительных запросов OPTIONS
app.options('*', (req, res) => {
  console.log("Обработка OPTIONS для:", req.headers.origin);
  res.header('Access-Control-Allow-Origin', req.headers.origin || '');
  res.header('Access-Control-Allow-Methods', process.env.CORS_METHODS);
  res.header('Access-Control-Allow-Headers', process.env.CORS_HEADERS);
  res.sendStatus(204); // No Content
});

// Маршруты
const filmsRoutes = require("./routes/films");
const cartoonsRoutes = require("./routes/cartoons");
const serialsRoutes = require("./routes/serials");

// Подключение маршрутов
app.use("/api/films", filmsRoutes);
app.use("/api/cartoons", cartoonsRoutes);
app.use("/api/serials", serialsRoutes);

// Корневой маршрут
app.get("/", (req, res) => {
  res.send("Сервер работает! Используй /api/films, /api/cartoons, /api/serials для получения данных.");
});

// Обработка ошибок 404
app.use((req, res) => {
  res.status(404).json({ message: "Ресурс не найден" });
});

// Обработка ошибок сервера
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Ошибка: ${err.message}`);
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: err.message });
  }
  res.status(500).json({ message: "Ошибка сервера" });
});

// Порт сервера
const PORT = process.env.PORT || 3000;

// Запуск сервера
app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Сервер запущен на http://localhost:${PORT}`);
});