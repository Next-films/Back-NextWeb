# 🎬 Backend - Next films

Это серверное приложение разработано с использованием фреймворка [NestJS](https://nestjs.com/).
Используется пакетный менеджер `yarn`.

---

## 🚀 Быстрый старт

1. Установите зависимости.

2. Укажите необходимые **env** в файл **.env.dev**. 

_Смотреть пример актульаной версии env в .env.example_
3. Запустите приложение в режиме разработки:
```bash
yarn start:dev
```

---

## ⚙️ Работа с ENV

При добавлении новых переменных окружения:

- Обязательно добавляйте их в `.env.example`
- Если переменная нужна при тестировании — дублируйте её в `.env.test`
- Используйте разные `.env` файлы для разных окружений
- Для запуска всех тестов используйте:
```bash
yarn test
```
⚠️ Желательно использовать **локальную БД** при тестах, чтобы избежать случайного удаления данных на удалённой базе.

**Важно:**  
Используйте конфигурационный модуль NestJS (`@nestjs/config`) вместо прямого обращения к `process.env`.

✅ Используйте:
```ts
class ExampleClas {
    private readonly admin_salt_round: number;
    private readonly apiSettings: ApiSettingsType;
    constructor(private readonly configService: ConfigService<ConfigurationType, true>) {
        const businessRules = this.configService.get('businessRulesSettings', { infer: true });
        this.apiSettings = this.configService.get('apiSettings', { infer: true });
        this.admin_salt_round = businessRules.ADMIN_HASH_SALT_ROUND;
    }
}
```

❌ Не используйте:
```ts
class ExampleClas {
    private readonly admin_salt_round: process.env.ADMIN_HASH_SALT_ROUND;
    constructor() {}
}
```

Также не забывайте обновлять конфигурационные файлы при добавлении новых ENV.

---

## 📥 Обработка данных и ошибок

При добавлении:

- input моделей
- строковых параметров
- новых ошибок

обязательно добавляйте соответствующие ключи в `exception-keys.enum.ts`. Это позволяет фронтенду ориентироваться на ключи, а не на строки, и делает API стабильным при изменениях текста ошибок.

---

## 📦 Работа с модулями и провайдерами

**Важно:**  
При использовании провайдера из одного модуля в другом:

✅ Правильно:
- Экспортировать провайдер в `ModuleA`
- Импортировать `ModuleA` в `ModuleB`

❌ Неправильно:
- Импортировать класс провайдера напрямую — это приведёт к созданию нового экземпляра, что нежелательно.

---

## 🎲 Генерация тестовых данных

Для генерации тестовых данных (фильмы, сериалы, мультфильмы):

```bash
yarn migrate-movies
```
---

# 📬 Работа между сервисами — используем appNotification, а не throw
В проекте принят единый подход обработки ошибок и результатов с помощью класса ApplicationNotification.
Это улучшает читаемость, контроль бизнес-логики и предсказуемость ответа API.

❌ Не делаем так:
```ts
    if (!user) {
        throw new Error('User not found'); // ❌ — бросает сырую ошибку
    }
```

✅ Правильный подход:
1. Вся бизнес-логика обрабатывается в команде (CommandHandler)

2. Вместо throw возвращается структурированный результат через appNotification

3. Контроллер получает единый формат результата и сам решает, как его обработать

🔧 Пример:
```ts
class Auth {
    @Post('/login')
    async login(@Body() input: LoginInputModel): Promise<LoginOutputModel | void> {
        const result = await this.commandBus.execute(new LoginCommand(input));

        if (result.appResult === AppNotificationResultEnum.Success) {
            return result.data;
        }

        this.appNotification.handleHttpResult(result); // Возвращает корректный HTTP-ответ с ошибкой
    } 
}
```

Обработчик команды
```ts
@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand, AppNotificationResult<void>> {
    constructor(
        private readonly appNotification: ApplicationNotification,
        //...
    ) {}

    async execute(command: LoginCommand): Promise<AppNotificationResult<void>> {
        try {
            const user = await this.userRepo.findByEmail(command.email);

            if (!user) {
                return this.appNotification.notFound({
                    field: 'email',
                    message: 'User not found',
                    errorKey: EXCEPTION_KEYS_ENUM.USER_NOT_FOUND,
                });
            }
            return this.appNotification.success();
        } catch (e) {
            this.logger.error(e, this.execute.name); // Логируем ошибку
            return this.appNotification.internalServerError()
        }
    }
}
```

💡 Зачем это нужно:
🔄 Единый способ возврата ошибок и успешных данных

🧪 Удобство в тестировании и мокинге

🚦 Гибкость в контроллерах — мы не "вылетаем" из метода

🔐 Больше контроля и читаемости бизнес-логики


---

## 🪵 Логгирование: обязательная часть новой функциональности
Для удобства отладки и аудита выполнения кода обязательно добавляйте логгирование при создании новых контроллеров, обработчиков команд, сервисов и других элементов бизнес-логики.

### 📌 Общие рекомендации:

Используйте **LoggerService** и задавайте контекст через **setContext(...)**

Логируйте ключевые действия: **вход в метод, вызов команды, результат выполнения, ошибки**

Для ошибок используйте **logger.error(...)** с передачей ошибки и названия метода

**_Не логируйте чувствительные данные (например, пароли)_**

✅ auth.controller.ts:
```ts
import { LoggerService } from '@/common/utils/logger/logger.service';

@Controller(ADMIN_AUTH_ROUTES.MAIN)
export class AdminAuthController {
    constructor(
        private readonly logger: LoggerService,
    ) {
        this.logger.setContext(AdminAuthController.name); // Устанавливаем контекст
    }

    @Post(ADMIN_AUTH_ROUTES.LOGIN)
    async login(@Body() body: AdminLoginInputModel): Promise<void> {
        this.logger.log('Execute: login', this.login.name); // Логируем вызов метода
            //...
        this.logger.log(result.appResult, this.login.name); // Логируем результат
    }
}
```

✅ login.handler.ts:
```ts
import { LoggerService } from '@/common/utils/logger/logger.service';

@CommandHandler(AdminLoginCommand)
export class AdminLoginHandler implements ICommandHandler<void> {
    constructor(
        private readonly logger: LoggerService,
        //...
    ) {
        this.logger.setContext(AdminLoginCommand.name); // Контекст команды
    }

    async execute(command: AdminLoginCommand): Promise<void> {
        this.logger.log('Login admin command', this.execute.name); // Логируем старт
        try {
            //...
        } catch (e) {
            this.logger.error(e, this.execute.name); // Логируем ошибку
        }
    }
}
```

---

## 🧭 Добавление новых модулей: не забывай про алиасы
При добавлении новых модулей бизнес-логики обязательно прописывайте алиасы путей для корректной работы импорта в проекте, тестах и IDE.

Это позволяет:

🔍 Упростить чтение кода и импорты (@/films/film.service вместо ../../../../modules/cinema/film/film.service)

✅ Избежать проблем в тестах (jest использует moduleNameMapper)

⚙️ Где нужно настраивать алиасы?

**1. tsconfig.json**

```json
{
       "compilerOptions": {
       ...
       "paths": {
           "@/common/*": ["common/*"],
           "@/settings/*": ["settings/*"],
           "@/films/*": ["modules/cinema/film/*"],
           "@/cartoons/*": ["modules/cinema/cartoon/*"],
           "@/serials/*": ["modules/cinema/serial/*"],
           "@/movies/*": ["modules/cinema/movies/*"]
       }
    }
}
```
**2. package.json (раздел jest > moduleNameMapper)**
```json
   "jest": {
        ...
       "moduleNameMapper": {
           "@/common/(.*)$": "<rootDir>/common/$1",
           "@/settings/(.*)$": "<rootDir>/settings/$1",
           "@/films/(.*)$": "<rootDir>/modules/cinema/film/$1",
           "@/cartoons/(.*)$": "<rootDir>/modules/cinema/cartoon/$1",
           "@/serials/(.*)$": "<rootDir>/modules/cinema/serial/$1",
           "@/movies/(.*)$": "<rootDir>/modules/cinema/movies/$1"
       }
   }
```
**3. jest-e2e.json**
```json
   {
        ...
       "moduleNameMapper": {
           "@/common/(.*)$": "<rootDir>/common/$1",
           "@/settings/(.*)$": "<rootDir>/settings/$1",
           "@/films/(.*)$": "<rootDir>/modules/cinema/film/$1",
           "@/cartoons/(.*)$": "<rootDir>/modules/cinema/cartoon/$1",
           "@/serials/(.*)$": "<rootDir>/modules/cinema/serial/$1",
           "@/movies/(.*)$": "<rootDir>/modules/cinema/movies/$1"
       }
   }
```
_**При добавлении нового модуля: сразу заводите алиас.**_

_Следите, чтобы все три файла были синхронизированы (tsconfig.json, package.json, jest-e2e.json)_

_Проверяйте сборку и запуск тестов после изменений_

📌 **Важно: несоблюдение этих правил может привести к сбоям при запуске Jest, ESLint и даже самой сборки проекта.**

---

## 📦 Добавление новых пакетов в проект
При установке новых зависимостей необходимо зафиксировать точную версию пакета, чтобы избежать неожиданных обновлений в будущем.

🔧 Что нужно сделать:
Удалите символ **^** перед версией добавленного пакета в package.json.
Это гарантирует, что проект всегда использует строго указанную версию.

Удалите файл **yarn.lock** — это позволяет пересобрать lock-файл на основе актуального package.json.

Выполните команду: **yarn install**
Это создаст свежий yarn.lock с корректно зафиксированными версиями.

**⚠️ Важно:**
_Если не выполнить эти шаги, при создании pull request в GitHub могут не пройти тесты из-за несовпадения версий зависимостей._

---

## 💡 Рекомендации

- Соблюдайте единый стиль написания кода
- Используйте типизацию и DTO для всех входящих данных
- Покрывайте функциональность тестами, особенно при работе с критичными модулями
- Не забывайте про читаемость: пишем код для людей, а не только для компилятора 😊

---


















