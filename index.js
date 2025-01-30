// Загружаем переменные окружения из .env.production
require('dotenv').config({ path: '.env.production' });

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Инициализация приложения
const app = express();

// Логирование для диагностики
console.log('Запуск сервера...');
console.log('Настройки CORS:');
console.log('CORS_ORIGIN:', process.env.CORS_ORIGIN);
console.log('CORS_METHODS:', process.env.CORS_METHODS);
console.log('CORS_HEADERS:', process.env.CORS_HEADERS);

// Разделим разрешённые источники для CORS
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',');

// Настройка CORS

const corsOptions = {
	origin: 'https://next-films.ru', // Разрешить только этот домен
	methods: ['GET', 'POST', 'PUT', 'DELETE'], // Указать разрешённые методы
	allowedHeaders: ['Content-Type', 'Authorization'], // Указать разрешённые заголовки
};
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// Middleware для обработки JSON
app.use(bodyParser.json());

// Логирование входящих запросов
app.use((req, res, next) => {
	console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
	next();
});

// Обработка предварительных запросов OPTIONS
app.options('*', (req, res) => {
	const origin = req.headers.origin || '';
	console.log('Обработка OPTIONS для:', origin);
	// res.header('Access-Control-Allow-Origin', origin);
	// res.header('Access-Control-Allow-Methods', process.env.CORS_METHODS);
	// res.header('Access-Control-Allow-Headers', process.env.CORS_HEADERS);
	res.sendStatus(204); // No Content
});

// Маршруты
const filmsRoutes = require('./routes/films');
const cartoonsRoutes = require('./routes/cartoons');
const serialsRoutes = require('./routes/serials');

// Подключение маршрутов
app.use('/api/films', filmsRoutes);
app.use('/api/cartoons', cartoonsRoutes);
app.use('/api/serials', serialsRoutes);

// Корневой маршрут
app.get('/', (req, res) => {
	res.send(
		'Сервер работает! Используй /api/films, /api/cartoons, /api/serials для получения данных.'
	);
});

// Обработка ошибок 404
app.use((req, res) => {
	res.status(404).json({ message: 'Ресурс не найден' });
});

// Обработка ошибок сервера
app.use((err, req, res, next) => {
	console.error(`[${new Date().toISOString()}] Ошибка: ${err.message}`);
	if (err.message === 'Not allowed by CORS') {
		return res.status(403).json({ message: err.message });
	}
	res.status(500).json({ message: 'Ошибка сервера' });
});

// Порт сервера
const PORT = process.env.PORT || 3032;

// Запуск сервера
app.listen(PORT, () => {
	console.log(
		`[${new Date().toISOString()}] Сервер запущен на http://localhost:${PORT}`
	);
});
