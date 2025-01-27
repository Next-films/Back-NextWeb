const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();

// Настройка CORS для разрешения только с указанных источников
const allowedOrigins = [
  'http://localhost:3000',  // Локальный источник для разработки
  'https://servernextfilms.hub-net.org'  // Домен вашего продакшн-сервера
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);  // Разрешаем запросы с указанных доменов
    } else {
      callback(new Error('Not allowed by CORS'));  // Запрещаем запросы с других источников
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Requested-With', 'Authorization'],
}));

// Разрешаем обработку JSON данных
app.use(bodyParser.json());

// Пример маршрутов (замени на свои реальные маршруты)
const filmsRoutes = require("./routes/films");  // Убедись, что маршруты существуют
const cartoonsRoutes = require("./routes/cartoons");
const serialsRoutes = require("./routes/serials");

// Подключение маршрутов
app.use("/api/films", filmsRoutes);
app.use("/api/cartoons", cartoonsRoutes);
app.use("/api/serials", serialsRoutes);

// Корневой маршрут (для проверки работы сервера)
app.get("/", (req, res) => {
  res.send("Сервер работает! Используй /api/films, /api/cartoons или /api/serials для получения данных.");
});

// Обработка ошибок для маршрутов, которые не найдены
app.use((req, res) => {
  res.status(404).json({ message: "Ресурс не найден" });
});

// Порт для запуска сервера (3000 по умолчанию)
const PORT = process.env.PORT || 3000;

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});