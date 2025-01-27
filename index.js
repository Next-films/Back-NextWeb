const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const filmsRoutes = require("./routes/films");
const blockmainRoutes = require("./routes/blockmain");
const cartoonsRoutes = require("./routes/cartoons");
const serialsRoutes = require("./routes/serials");

const app = express();

// Настройка CORS для всех источников
app.use(cors());

// Парсинг JSON
app.use(bodyParser.json());

// Маршруты API
app.use("/api/films", filmsRoutes);
app.use("/api/cartoons", cartoonsRoutes);
app.use("/api/serials", serialsRoutes);
app.use("/api/blockmain", blockmainRoutes);

// Корневой маршрут
app.get("/", (req, res) => {
  res.send("Сервер работает! Используй /api/films, /api/cartoons, /api/serials или /api/blockmain для получения данных.");
});

// Порт, который будет использовать приложение
const PORT = process.env.PORT || 3000;

// Запуск сервера на указанном порту
app.listen(PORT, () => {
  console.log(`Сервер запущен на https://servernextfilms.hub-net.org:${PORT}`);
});