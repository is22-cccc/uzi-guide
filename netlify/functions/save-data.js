// Этот код должен находиться в файле: /netlify/functions/save-data.js
// ФИНАЛЬНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ

const { GoogleSpreadsheet } = require('google-spreadsheet');

exports.handler = async (event, context) => {
  // Логируем самое начало работы
  console.log("--- Функция 'save-data' запущена ---");

  try {
    // 1. Получаем и парсим данные
    if (!event.body) {
      console.error("ОШИБКА: Тело запроса отсутствует.");
      return { statusCode: 400, body: 'Missing request body' };
    }
    const data = JSON.parse(event.body);
    console.log("Шаг 1: Данные получены и распарсены успешно.");
    console.log("Полученный объект data:", data); // Дополнительный лог для отладки

    // 2. Инициализируем Google Таблицу
    console.log("Шаг 2: Инициализация объекта GoogleSpreadsheet...");
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
    console.log("Шаг 2a: Объект инициализирован.");

    // 3. Авторизуемся
    console.log("Шаг 3: Попытка аутентификации с помощью сервисного аккаунта...");
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
    console.log("Шаг 3a: Аутентификация пройдена успешно.");

    // 4. Загружаем информацию о документе
    console.log("Шаг 4: Загрузка информации о документе (loadInfo)...");
    await doc.loadInfo();
    console.log("Шаг 4a: Информация о документе загружена. Название таблицы:", doc.title);
    
    // Используем первый лист по индексу. Убедитесь, что это правильный лист.
    const sheet = doc.sheetsByIndex[0];
    console.log("Шаг 5: Лист для записи найден:", sheet.title);

    // 5. Добавляем строку
    console.log("Шаг 6: Попытка добавить новую строку...");
    await sheet.addRow({
      timestamp: data.timestamp || new Date().toISOString(),
      dataType: data.dataType || 'N/A',
      researcherId: data.researcherId || 'N/A',
      patientId: data.patientId || 'N/A',
      protocol: data.protocol || 'N/A',
      visMode: data.visMode !== undefined ? data.visMode.toString() : 'N/A',
      measurement: data.measurement || 'N/A',
      value: data.value !== undefined ? data.value.toString() : 'N/A',
      isResponsive: data.isResponsive !== undefined ? data.isResponsive.toString() : 'N/A',
      techIssue: data.techIssue || 'N/A',
      finalDecision: data.finalDecision || 'N/A',
      age: data.age || 'N/A',
      tacticEvaluation: data.tacticEvaluation || 'N/A',
      ventilation: data.ventilation || 'N/A' // <--- ВОТ ИСПРАВЛЕНИЕ!
    });
    console.log("Шаг 6a: Строка успешно добавлена в таблицу!");

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Data saved successfully" }),
    };

  } catch (error) {
    // Если на любом из шагов произойдет ошибка, мы увидим ее здесь
    console.error("---!!! КРИТИЧЕСКАЯ ОШИБКА !!!---");
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to save data. Check function logs on Netlify for details.' }),
    };
  }
};
