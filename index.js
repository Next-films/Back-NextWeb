const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();

// Указываем URL источников, которые могут обращаться к серверу
// Для локальной разработки можно поставить '*' (разрешает все), на сервере лучше указать конкретный домен
const allowedOrigins = ['http://localhost:3000', 'https://servernextfilms.hub-net.org']; // Укажите домен сервера

// Настройка CORS - разрешаем доступ только с указанных источников
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Requested-With', 'Authorization'],
}));

// Разрешаем обработку JSON данных
app.use(bodyParser.json());

// Пример маршрутов
const filmsRoutes = require("./routes/films");
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

// Порт, который будет использовать приложение
const PORT = process.env.PORT || 3000;

// Запуск сервера на указанном порту
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});