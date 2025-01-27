const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();

// Настройка CORS - разрешаем все источники
app.use(cors({
  origin: '*',  // Разрешаем все источники
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Разрешаем методы
  allowedHeaders: ['Content-Type', 'X-Requested-With', 'Authorization'], // Разрешаем заголовки
}));

// Разрешаем обработку JSON данных
app.use(bodyParser.json());

// Обработка предварительных запросов OPTIONS
app.options('*', cors());  // Разрешаем предварительные запросы для всех маршрутов

// Пример маршрутов
const filmsRoutes = require("./routes/films");  // Убедись, что файлы маршрутов существуют
const cartoonsRoutes = require("./routes/cartoons");
const serialsRoutes = require("./routes/serials");

// Добавляем маршруты
app.use("/api/films", filmsRoutes);
app.use("/api/cartoons", cartoonsRoutes);
app.use("/api/serials", serialsRoutes);

// Корневой маршрут
app.get("/", (req, res) => {
  res.send("Сервер работает! Используй /api/films, /api/cartoons, /api/serials для получения данных.");
});

// Обработка ошибок (например, если маршрут не найден)
app.use((req, res) => {
  res.status(404).json({ message: "Ресурс не найден" });
});

// Порт, на котором будет работать сервер
const PORT = process.env.PORT || 3000;

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});