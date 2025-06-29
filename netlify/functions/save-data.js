// Этот код должен находиться в файле: /netlify/functions/save-data.js
// ВЕРСИЯ ДЛЯ ДИАГНОСТИКИ

exports.handler = async (event, context) => {
  // 1. Сразу же логируем, что функция была вызвана.
  // Это первое, что мы должны увидеть в логах на Netlify.
  console.log("Function 'save-data' was invoked.");

  // 2. Проверяем, что в запросе есть тело.
  if (!event.body) {
    console.log("Request body is missing.");
    return { statusCode: 400, body: 'Missing request body' };
  }
  
  // 3. Логируем полученные данные.
  try {
    const data = JSON.parse(event.body);
    console.log("Received data:", data);
  } catch (error) {
    console.error("Error parsing request body:", error);
    return { statusCode: 400, body: 'Error parsing JSON' };
  }

  // 4. Немедленно отправляем успешный ответ, НЕ ПЫТАЯСЬ подключиться к Google.
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Data received by diagnostic function successfully!" }),
  };
};
