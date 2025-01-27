const express = require("express");
const router = express.Router();
const fs = require("fs");

// Получение всех фильмов
router.get("/", (req, res) => {
  fs.readFile("./data/Serials.json", "utf-8", (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Ошибка при чтении данных" });
    }
    const serials = JSON.parse(data);
    res.json(serials);
  });
});

// Поиск фильма по ID
router.get("/:id", (req, res) => {
  const serId = req.params.id;
  fs.readFile("./data/Serials.json", "utf-8", (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Ошибка при чтении данных" });
    }
    const serials = JSON.parse(data);
    const ser = serials.find((f) => f.id === serId);
    if (!ser) {
      return res.status(404).json({ error: "Фильм не найден" });
    }
    res.json(ser);
  });
});

module.exports = router;