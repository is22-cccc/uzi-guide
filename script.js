// Функция для расчета вариабельности ВЯВ
function calculateIJV() {
    const hmax = parseFloat(document.getElementById('hmax').value);
    const hmin = parseFloat(document.getElementById('hmin').value);
    const resultText = document.getElementById('ijv-result-text');
    const interpretationBox = document.getElementById('ijv-interpretation');

    if (isNaN(hmax) || isNaN(hmin) || hmin > hmax || hmax <= 0) {
        resultText.innerText = 'Ошибка: введите корректные значения Hmax и Hmin.';
        interpretationBox.innerHTML = '';
        interpretationBox.className = 'interpretation-box';
        return;
    }

    // Расчет по формуле: (Hmax - Hmin) / ((Hmax + Hmin) / 2)
    const variability = ((hmax - hmin) / ((hmax + hmin) / 2)) * 100;
    resultText.innerText = `Вариабельность размера ВЯВ: ${variability.toFixed(1)}%`;

    const cutoff = 18; [cite_start]// Оптимальная точка отсечения – 18% [cite: 26]
    if (variability > cutoff) {
        interpretationBox.innerText = `Результат > ${cutoff}%. Вероятен ответ на введение жидкости.`;
        interpretationBox.className = 'interpretation-box responsive';
    } else {
        interpretationBox.innerText = `Результат ≤ ${cutoff}%. Ответ на инфузию маловероятен.`;
        interpretationBox.className = 'interpretation-box non-responsive';
    }
}

// Функция для расчета вариабельности Vpk на сонной артерии
function calculateCCA_Vpk() {
    const vmax = parseFloat(document.getElementById('vmax').value);
    const vmin = parseFloat(document.getElementById('vmin').value);
    const resultText = document.getElementById('vpk-result-text');
    const interpretationBox = document.getElementById('vpk-interpretation');

    if (isNaN(vmax) || isNaN(vmin) || vmin > vmax || vmin <= 0) {
        resultText.innerText = 'Ошибка: введите корректные значения Vmax и Vmin.';
        interpretationBox.innerHTML = '';
        interpretationBox.className = 'interpretation-box';
        return;
    }

    // Вычисление по формуле: (Vmax - Vmin) / ((Vmax + Vmin) / 2)
    const variability = ((vmax - vmin) / ((vmax + vmin) / 2)) * 100;
    resultText.innerText = `Вариабельность пиковой скорости (Vpk): ${variability.toFixed(1)}%`;

    const cutoff = 12; [cite_start]// Оптимальная точка отсечения – 12% [cite: 42]
    if (variability > cutoff) {
        interpretationBox.innerText = `Результат > ${cutoff}%. Вероятен ответ на введение жидкости.`;
        interpretationBox.className = 'interpretation-box responsive';
    } else {
        interpretationBox.innerText = `Результат ≤ ${cutoff}%. Ответ на инфузию маловероятен.`;
        interpretationBox.className = 'interpretation-box non-responsive';
    }
}

// Функция для расчета корректированного времени потока (FTc)
function calculateCCA_FTc() {
    const flowTime = parseFloat(document.getElementById('flowTime').value);
    const heartRate = parseFloat(document.getElementById('heartRate').value);
    const resultText = document.getElementById('ftc-result-text');
    const interpretationBox = document.getElementById('ftc-interpretation');

    if (isNaN(flowTime) || isNaN(heartRate) || flowTime <= 0 || heartRate <= 0) {
        resultText.innerText = 'Ошибка: введите корректные значения времени потока и ЧСС.';
        interpretationBox.innerHTML = '';
        interpretationBox.className = 'interpretation-box';
        return;
    }

    [cite_start]// Расчет по формуле Wodey: FTc = Время потока (мс) + 1,29 * (ЧСС - 60) [cite: 51]
    const ftc = flowTime + 1.29 * (heartRate - 60);
    resultText.innerText = `Корректированное время потока (FTc): ${ftc.toFixed(0)} мс`;
    
    // Используем базовую точку отсечения 325 мс, так как возраст неизвестен
    const cutoff = 325; [cite_start]// Оптимальная точка отсечения, менее которой пациент вероятно ответит на введение жидкости [cite: 51]
    if (ftc < cutoff) {
        interpretationBox.innerText = `Результат < ${cutoff} мс. Вероятен ответ на введение жидкости.`;
        interpretationBox.className = 'interpretation-box responsive';
    } else {
        interpretationBox.innerText = `Результат ≥ ${cutoff} мс. Ответ на инфузию маловероятен.`;
        interpretationBox.className = 'interpretation-box non-responsive';
    }
}


// Эта часть кода отвечает за плавную прокрутку и подсветку активного пункта в меню
document.addEventListener('DOMContentLoaded', () => {
    const sidebarLinks = document.querySelectorAll('.sidebar a');
    const modules = document.querySelectorAll('.module');

    // Функция для плавной прокрутки
    sidebarLinks.forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            document.querySelector(targetId).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Функция для подсветки активного пункта меню при прокрутке
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                sidebarLinks.forEach(link => {
                    link.parentElement.classList.remove('active');
                    if (link.getAttribute('href') === '#' + entry.target.id) {
                        link.parentElement.classList.add('active');
                    }
                });
            }
        });
    }, { rootMargin: '-30% 0px -70% 0px' }); // Активируется, когда модуль находится в средней трети экрана

    modules.forEach(module => {
        observer.observe(module);
    });
});
