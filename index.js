// Загружаем переменные окружения из .env.production
require('dotenv').config({ path: '.env.production' });

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

// Инициализация приложения
const app = express();

// Настройка CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*', // Разрешаем все источники по умолчанию
  methods: process.env.CORS_METHODS ? process.env.CORS_METHODS.split(',') : ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Разрешаем методы
  allowedHeaders: process.env.CORS_HEADERS ? process.env.CORS_HEADERS.split(',') : ['Content-Type', 'X-Requested-With', 'Authorization'], // Разрешаем заголовки
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
  res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.header('Access-Control-Allow-Methods', process.env.CORS_METHODS || 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', process.env.CORS_HEADERS || 'Content-Type, X-Requested-With, Authorization');
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

// Обработка ошибок 500
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Ошибка: ${err.message}`);
  res.status(500).json({ message: "Ошибка сервера" });
});

// Порт сервера
const PORT = process.env.PORT || 3000;

// Запуск сервера
app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Сервер запущен на http://localhost:${PORT}`);
});