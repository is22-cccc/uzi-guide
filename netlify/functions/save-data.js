// Этот код должен находиться в файле: /netlify/functions/save-data.js

// Импортируем необходимые библиотеки
const { GoogleSpreadsheet } = require('google-spreadsheet');

exports.handler = async (event, context) => {
  try {
    // 1. Проверяем, что запрос содержит данные
    if (!event.body) {
      return { statusCode: 400, body: 'Missing request body' };
    }
    const data = JSON.parse(event.body);

    // 2. Инициализируем документ Google Таблиц
    // Переменные окружения должны быть установлены в настройках сайта на Netlify
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);

    // 3. Авторизуемся с помощью сервисного аккаунта
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      // ВАЖНО: Netlify неправильно обрабатывает переносы строк в private_key,
      // поэтому мы заменяем их на реальные переносы строк
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });

    // 4. Загружаем информацию о документе и выбираем первый лист
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];

    // 5. Добавляем новую строку с данными
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
    });

    // 6. Отправляем успешный ответ
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Data saved successfully" }),
    };

  } catch (error) {
    // В случае ошибки, логируем ее и отправляем ответ с ошибкой
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to save data' }),
    };
  }
};
