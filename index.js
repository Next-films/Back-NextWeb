const cors = require('cors');
const express = require('express');
const app = express();

// Разрешаем запросы только с конкретного домена
const corsOptions = {
  origin: 'https://servernextfilms.hub-net.org', // Ваш фронтенд домен
  methods: ['GET'], // Разрешаем только GET-запросы
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Применяем CORS
app.use(cors(corsOptions));

// Ваши маршруты
app.get('/api/films', (req, res) => {
  res.json({ message: 'Success', data: 'Your films data here' });
});

// Сервер
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on https://servernextfilms.hub-net.org:${PORT}`);
});