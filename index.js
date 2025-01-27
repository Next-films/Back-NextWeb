const https = require("https");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

// Импорты маршрутов
const filmsRoutes = require("./routes/films");
const blockmainRoutes = require("./routes/blockmain");
const cartoonsRoutes = require("./routes/cartoons");
const serialsRoutes = require("./routes/serials");

const app = express();

// Настройка middlewares
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

// Настройка SSL-сертификатов
const sslOptions = {
  key: fs.readFileSync("/etc/ssl/privkey.pem"),  // Путь к вашему приватному ключу
  cert: fs.readFileSync("/etc/ssl/cert.pem"),   // Путь к вашему SSL-сертификату
  ca: fs.readFileSync("/etc/ssl/chain.pem")     // Путь к цепочке сертификатов
};

// Запуск HTTPS-сервера
https.createServer(sslOptions, app).listen(443, () => {
  console.log(`Сервер запущен на https://servernextfilms.hub-net.org`);
});