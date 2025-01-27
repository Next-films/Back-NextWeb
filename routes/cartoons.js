const express = require("express");
const router = express.Router();
const fs = require("fs");

// Получение всех фильмов
router.get("/", (req, res) => {
  fs.readFile("./data/Cartoons.json", "utf-8", (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Ошибка при чтении данных" });
    }
    const films = JSON.parse(data);
    res.json(films);
  });
});

// Поиск фильма по ID
router.get("/:id", (req, res) => {
  const filmId = req.params.id;
  fs.readFile("./data/Cartoons.json", "utf-8", (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Ошибка при чтении данных" });
    }
    const films = JSON.parse(data);
    const film = films.find((f) => f.id === filmId);
    if (!film) {
      return res.status(404).json({ error: "Фильм не найден" });
    }
    res.json(film);
  });
});

module.exports = router;