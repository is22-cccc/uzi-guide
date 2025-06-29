function goToStep(stepNumber) {
    // Сначала скрыть все шаги
    document.querySelectorAll('.step').forEach(step => {
        step.style.display = 'none';
    });
    
    // Показать нужный шаг
    const activeStep = document.getElementById('step' + stepNumber);
    if (activeStep) {
        activeStep.style.display = 'block';
    }
}

function calculateIJV() {
    // Получаем значения из полей ввода
    const hmax = parseFloat(document.getElementById('hmax').value);
    const hmin = parseFloat(document.getElementById('hmin').value);

    // Элементы для вывода результата и интерпретации
    const resultText = document.getElementById('result-text');
    const interpretationBox = document.getElementById('interpretation');

    // Проверка, что введены оба числа
    if (isNaN(hmax) || isNaN(hmin)) {
        resultText.innerText = 'Ошибка: введите оба значения диаметра.';
        interpretationBox.innerHTML = '';
        interpretationBox.className = 'interpretation-box'; // Сброс стилей
        return;
    }

    // Проверка корректности данных
    if (hmax <= 0 || hmin < 0 || hmin > hmax) {
        resultText.innerText = 'Ошибка: данные некорректны (Hmax должен быть > Hmin, и оба > 0).';
        interpretationBox.innerHTML = '';
        interpretationBox.className = 'interpretation-box';
        return;
    }

    // Расчет по формуле: (Hmax - Hmin) / ((Hmax + Hmin) / 2)
    // Эта формула — индекс вариабельности, а не коллабирования. Используем ее, как в источнике.
    const variability = ((hmax - hmin) / ((hmax + hmin) / 2)) * 100;
    
    // Вывод результата
    resultText.innerText = `Вариабельность размера ВЯВ: ${variability.toFixed(1)}%`;

    // Интерпретация результата
    const cutoff = 18; [cite_start]// Оптимальная точка отсечения – 18% [cite: 26]
    if (variability > cutoff) {
        interpretationBox.innerText = `Результат > ${cutoff}%. [cite_start]Пациент с высокой вероятностью ответит на введение жидкости. [cite: 26]`;
        interpretationBox.className = 'interpretation-box responsive'; // Применяем зеленый стиль
    } else {
        interpretationBox.innerText = `Результат ≤ ${cutoff}%. Ответ на инфузию маловероятен. Рассмотрите другие причины гипотензии.`;
        interpretationBox.className = 'interpretation-box non-responsive'; // Применяем оранжевый стиль
    }
}

// По умолчанию при загрузке страницы показываем первый шаг
document.addEventListener('DOMContentLoaded', () => {
    goToStep(1);
});
