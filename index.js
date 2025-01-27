const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const filmsRoutes = require("./routes/films");
const blockmainRoutes = require("./routes/blockmain");
const cartoonsRoutes = require("./routes/cartoons");
const serialsRoutes = require("./routes/serials");

const app = express();
const PORT = 5100;

app.use(cors());
app.use(bodyParser.json());

// Маршруты API
app.use("/api/films", filmsRoutes);
app.use("/api/cartoons", cartoonsRoutes);
app.use("/api/serials", serialsRoutes);
app.use("/api/blockmain", blockmainRoutes);

// Корневой маршрут
app.get("/", (req, res) => {
  res.send("Сервер работает! Используй /api/films, /api/cartoons, /api/serials, или /api/blockmain для получения данных.");
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});