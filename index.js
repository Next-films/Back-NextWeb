const cors = require('cors');
const express = require('express');
const app = express();

// Разрешаем все запросы или только с конкретных доменов
const corsOptions = {
  origin: 'https://servernextfilms.hub-net.org',  // Разрешаем только этот домен
  methods: ['GET', 'POST', 'PUT', 'DELETE'],     // Разрешаем эти методы
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'], // Разрешаем эти заголовки
  credentials: true, // Разрешаем передачу cookies
};

// Использование CORS для всех маршрутов
app.use(cors(corsOptions));

// Добавим поддержку preflight-запросов для всех маршрутов
app.options('*', cors(corsOptions));  // Для всех маршрутов

// Маршруты
app.get('/api/films', (req, res) => {
  res.json({ message: 'Success', data: 'Your films data here' });
});

// Сервер
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on https://servernextfilms.hub-net.org:${PORT}`);
});