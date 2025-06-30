// --- Глобальное состояние сессии ---
let currentSession = {
    patientId: null,
    researcherId: null,
    startTime: null,
    protocol: null,
    visMode: null,
    isContinuation: false, 
    measurements: {},
    tacticEvaluation: null,
    finalDecision: null
};

// --- Функции для генерации ID ---
function generateUUID() {
    if (crypto && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // "Подстраховочный" метод для старых браузеров
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// --- Управление UI ---
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// --- Логика сессий ---
function startNewSession() {
    currentSession.isContinuation = false;
    document.querySelectorAll('.previous-value').forEach(span => span.textContent = '');
    const researcherId = localStorage.getItem('researcherId') || `res-${generateUUID()}`;
    localStorage.setItem('researcherId', researcherId);
    currentSession.researcherId = researcherId;
    currentSession.patientId = `pat-${generateUUID()}`;
    currentSession.startTime = new Date().toISOString();
    let sessions = JSON.parse(localStorage.getItem('activeSessions')) || [];
    sessions.unshift({ id: currentSession.patientId, time: currentSession.startTime });
    sessions = sessions.slice(0, 5);
    localStorage.setItem('activeSessions', JSON.stringify(sessions));
    showScreen('protocol-screen');
}

function continueSession(sessionId) {
    currentSession.isContinuation = true;
    const researcherId = localStorage.getItem('researcherId');
    currentSession.researcherId = researcherId;
    currentSession.patientId = sessionId;
    currentSession.measurements = {};
    currentSession.finalDecision = null;
    showScreen('protocol-screen');
}

function selectProtocol(protocolName) {
    currentSession.protocol = protocolName;
    // Сразу устанавливаем режим визуализации.
    // Установите `true`, если хотите всегда показывать картинки-инструкции,
    // или `false`, если хотите их скрыть по умолчанию.
    currentSession.visMode = false; 
    
    // Сразу применяем настройки и переходим к работе
    applySessionSettings();
    showScreen('main-workspace');
}

function selectVisMode(mode) {
    currentSession.visMode = (mode === 'true');
    applySessionSettings();
    showScreen('main-workspace');
}

function applySessionSettings() {
    document.querySelectorAll('.module').forEach(module => {
        if (module.id === 'follow-up-evaluation') return;
        const protocols = module.dataset.protocol.split(',');
        module.classList.toggle('hidden', !protocols.includes(currentSession.protocol));
    });

    document.querySelectorAll('.module').forEach(module => {
        module.classList.toggle('no-vis', !currentSession.visMode);
    });

    const followUpBlock = document.getElementById('follow-up-evaluation');
    followUpBlock.classList.toggle('hidden', !currentSession.isContinuation);
    
    if (currentSession.isContinuation) {
        loadPreviousMeasurements(currentSession.patientId);
    }

    generateProtocolMenu();
    
    const protocolText = { 'basic': 'Базовый', 'advanced': 'Продвинутый', 'expert': 'Экспертный' };
    document.getElementById('session-info').innerText = `Сессия: ${currentSession.patientId.substring(4, 10)} | Протокол: ${protocolText[currentSession.protocol]}`;
}

// --- Загрузка предыдущих измерений ---
function loadPreviousMeasurements(patientId) {
    const allPatientData = JSON.parse(localStorage.getItem(`data_${patientId}`)) || [];
    if (allPatientData.length === 0) return;
    const lastMeasurements = {};
    allPatientData.filter(d => d.dataType === 'measurement').forEach(m => {
        lastMeasurements[m.measurement] = m.data; 
    });
    if (lastMeasurements['ВЯВ']) {
        document.getElementById('prev-hmax').textContent = `(пред. ${lastMeasurements['ВЯВ'].hmax})`;
        document.getElementById('prev-hmin').textContent = `(пред. ${lastMeasurements['ВЯВ'].hmin})`;
    }
    if (lastMeasurements['Vpk_ОСА']) {
        document.getElementById('prev-vmax').textContent = `(пред. ${lastMeasurements['Vpk_ОСА'].vmax})`;
        document.getElementById('prev-vmin').textContent = `(пред. ${lastMeasurements['Vpk_ОСА'].vmin})`;
    }
    if (lastMeasurements['FTc_ОСА']) {
        document.getElementById('prev-flowTime').textContent = `(пред. ${lastMeasurements['FTc_ОСА'].flowTime})`;
        document.getElementById('prev-heartRate').textContent = `(пред. ${lastMeasurements['FTc_ОСА'].heartRate})`;
    }
}

// --- Функции-калькуляторы ---
function calculateIJV(){
    const hmax = document.getElementById('hmax').value;
    const hmin = document.getElementById('hmin').value;
    const tech = document.getElementById('ijv-tech').value;
    if (!hmax || !hmin || !tech) { alert('Заполните все поля для ВЯВ.'); return; }
    const variability = ((parseFloat(hmax) - parseFloat(hmin)) / ((parseFloat(hmax) + parseFloat(hmin)) / 2)) * 100;
    document.getElementById('ijv-result-text').innerText = `Вариабельность ВЯВ: ${variability.toFixed(1)}%`;
    const cutoff = 18;
    const responsive = variability > cutoff;
    const interpretationBox = document.getElementById('ijv-interpretation');
    interpretationBox.className = 'interpretation-box';
    interpretationBox.innerText = responsive ? `> ${cutoff}%. Вероятен ответ на инфузию.` : `≤ ${cutoff}%. Ответ на инфузию маловероятен.`;
    interpretationBox.classList.add(responsive ? 'responsive' : 'non-responsive');
    saveMeasurement('ВЯВ', { hmax, hmin, tech, value: variability.toFixed(1), isResponsive: responsive });
}
function calculateCCA_Vpk(){
    const vmax = document.getElementById('vmax').value;
    const vmin = document.getElementById('vmin').value;
    const tech = document.getElementById('vpk-tech').value;
    if (!vmax || !vmin || !tech) { alert('Заполните все поля для Vpk.'); return; }
    const variability = ((parseFloat(vmax) - parseFloat(vmin)) / ((parseFloat(vmax) + parseFloat(vmin)) / 2)) * 100;
    document.getElementById('vpk-result-text').innerText = `Вариабельность Vpk: ${variability.toFixed(1)}%`;
    const cutoff = 12;
    const responsive = variability > cutoff;
    const interpretationBox = document.getElementById('vpk-interpretation');
    interpretationBox.className = 'interpretation-box';
    interpretationBox.innerText = responsive ? `> ${cutoff}%. Вероятен ответ на инфузию.` : `≤ ${cutoff}%. Ответ на инфузию маловероятен.`;
    interpretationBox.classList.add(responsive ? 'responsive' : 'non-responsive');
    saveMeasurement('Vpk_ОСА', { vmax, vmin, tech, value: variability.toFixed(1), isResponsive: responsive });
}
function calculateCCA_FTc(){
    const flowTime = document.getElementById('flowTime').value;
    const heartRate = document.getElementById('heartRate').value;
    const age = document.getElementById('cca-age').value;
    const tech = document.getElementById('ftc-tech').value;
    if (!flowTime || !heartRate || !age || !tech) { alert('Заполните все поля для FTc.'); return; }
    const ftc = parseFloat(flowTime) + 1.29 * (parseFloat(heartRate) - 60);
    document.getElementById('ftc-result-text').innerText = `FTc: ${ftc.toFixed(0)} мс`;
    const cutoff = age === '<65' ? 325 : 340;
    const responsive = ftc < cutoff;
    const interpretationBox = document.getElementById('ftc-interpretation');
    interpretationBox.className = 'interpretation-box';
    interpretationBox.innerText = responsive ? `< ${cutoff} мс. Вероятен ответ на инфузию.` : `≥ ${cutoff} мс. Ответ на инфузию маловероятен.`;
    interpretationBox.classList.add(responsive ? 'responsive' : 'non-responsive');
    saveMeasurement('FTc_ОСА', { flowTime, heartRate, age, tech, value: ftc.toFixed(0), isResponsive: responsive });
}

// --- Итоговые функции и сбор данных ---
function generateFinalReport() {
    let responsiveCount = 0;
    let nonResponsiveCount = 0;
    let techIssues = false;
    for (const key in currentSession.measurements) {
        if (currentSession.measurements[key].tech === 'да') techIssues = true;
        if (currentSession.measurements[key].isResponsive === true) responsiveCount++;
        else if (currentSession.measurements[key].isResponsive === false) nonResponsiveCount++;
    }
    const finalBox = document.getElementById('final-interpretation');
    finalBox.className = 'interpretation-box';
    let reportText = '';
    if (responsiveCount === 0 && nonResponsiveCount === 0) {
        reportText = 'Недостаточно данных для формирования заключения.';
        finalBox.classList.add('neutral');
    } else if (responsiveCount > nonResponsiveCount) {
        reportText = 'Совокупность данных указывает на ВЕРОЯТНЫЙ положительный ответ на инфузионную терапию.';
        finalBox.classList.add('responsive');
    } else if (nonResponsiveCount > responsiveCount) {
        reportText = 'Совокупность данных указывает на НИЗКУЮ вероятность ответа на инфузионную терапию.';
        finalBox.classList.add('non-responsive');
    } else {
        reportText = 'Данные противоречивы. Требуется дополнительная оценка.';
        finalBox.classList.add('neutral');
    }
    if (techIssues) {
        reportText += ' ВНИМАНИЕ: зафиксированы технические сложности, что может влиять на достоверность заключения.';
        if(!finalBox.classList.contains('responsive')) {
             finalBox.classList.add('non-responsive');
        }
    }
    finalBox.innerText = reportText;
    const finalSection = document.getElementById('final-result-section');
    finalSection.classList.remove('hidden');
    finalSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
async function finishSession() {
    const decision = document.getElementById('clinical-decision').value;
    if (!decision) { alert('Пожалуйста, выберите ваше клиническое действие.'); return; }
    currentSession.finalDecision = decision;
    if (currentSession.isContinuation) {
        currentSession.tacticEvaluation = document.getElementById('tactic-evaluation').value;
    }
    const button = document.getElementById('finish-button');
    button.innerText = 'Сохранение...';
    button.disabled = true;
    await sendDataToGoogleSheet({
        dataType: 'final_report',
        timestamp: new Date().toISOString(),
        researcherId: currentSession.researcherId,
        patientId: currentSession.patientId,
        protocol: currentSession.protocol,
        visMode: currentSession.visMode,
        finalDecision: currentSession.finalDecision,
        tacticEvaluation: currentSession.tacticEvaluation,
        // Собираем все измерения в один объект для итогового отчета
        allMeasurements: currentSession.measurements 
    });
    alert('Сессия завершена. Данные отправлены.');
    window.location.reload();
}
function saveMeasurement(measurementName, data) {
    currentSession.measurements[measurementName] = data;
    const dataToSend = {
        dataType: 'measurement',
        timestamp: new Date().toISOString(),
        researcherId: currentSession.researcherId,
        patientId: currentSession.patientId,
        measurement: measurementName,
        value: data.value,
        isResponsive: data.isResponsive,
        techIssue: data.tech,
        age: data.age || 'N/A' // Добавляем возраст, если он есть
    };
    
    // Локальное сохранение для подтягивания "предыдущих" значений
    let allPatientData = JSON.parse(localStorage.getItem(`data_${currentSession.patientId}`)) || [];
    allPatientData.push({
        dataType: 'measurement',
        measurement: measurementName, 
        data: data // Сохраняем все сырые данные
    });
    localStorage.setItem(`data_${currentSession.patientId}`, JSON.stringify(allPatientData));
    
    sendDataToGoogleSheet(dataToSend);
}
async function sendDataToGoogleSheet(data) {
    console.log("Отправка данных:", data);
    try {
        const response = await fetch('/.netlify/functions/save-data', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            console.error('Ошибка при отправке данных на сервер. Статус:', response.status);
        }
    } catch (error) {
        console.error('Сетевая ошибка:', error);
    }
}


// --- Инициализация при загрузке страницы ---
document.addEventListener('DOMContentLoaded', () => {
    // Настройка кнопок выбора
    const protocolButtons = document.querySelectorAll('#protocol-choice .choice-button');
    protocolButtons.forEach(button => {
        button.addEventListener('click', () => {
            protocolButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            selectProtocol(button.dataset.value);
        });
    });
    
    // Загрузка активных сессий
    let sessions = JSON.parse(localStorage.getItem('activeSessions')) || [];
    const oneDayAgo = new Date().getTime() - (24 * 60 * 60 * 1000);
    sessions = sessions.filter(s => new Date(s.time).getTime() > oneDayAgo);
    localStorage.setItem('activeSessions', JSON.stringify(sessions));
    
    const container = document.getElementById('active-sessions-container');
    const list = document.getElementById('active-sessions-list');
    
    if (sessions.length > 0) {
        container.classList.remove('hidden');
        list.innerHTML = '';
        sessions.forEach(s => {
            const li = document.createElement('li');
            li.textContent = `Пациент ${s.id.substring(4,10)} (начато: ${new Date(s.time).toLocaleString()})`;
            li.onclick = () => continueSession(s.id);
            list.appendChild(li);
        });
    } else {
       container.classList.add('hidden');
    }
    showScreen('start-screen');
});

// Функции навигации 
function setupSidebarScroll() {
    const sidebarLinks = document.querySelectorAll('.sidebar a');
    const modules = document.querySelectorAll('.module:not(.hidden)');
    if(modules.length === 0) return;
    sidebarLinks.forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({ behavior: 'smooth' });
        });
    });
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
    }, { rootMargin: '-40% 0px -60% 0px' });
    modules.forEach(module => observer.observe(module));
}

function generateProtocolMenu() {
    const menu = document.getElementById('protocol-menu');
    menu.innerHTML = '';
    document.querySelectorAll('.module:not(.hidden)').forEach(module => {
        if (module.id === 'follow-up-evaluation') return;
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${module.id}`;
        a.textContent = module.querySelector('h2').textContent;
        li.appendChild(a);
        menu.appendChild(li);
    });
    setupSidebarScroll();
}
// --- Функции-калькуляторы для новых модулей ---

// МОДУЛЬ 3: ПЛЕЧЕВАЯ АРТЕРИЯ (Brachial Artery Vpk)
function calculateBrachialVpk() {
    const vmax = document.getElementById('brachial-vmax').value;
    const vmin = document.getElementById('brachial-vmin').value;
    const tech = document.getElementById('brachial-tech').value;

    if (!vmax || !vmin || !tech) {
        alert('Заполните все поля для плечевой артерии.');
        return;
    }

    const variability = ((parseFloat(vmax) - parseFloat(vmin)) / ((parseFloat(vmax) + parseFloat(vmin)) / 2)) * 100;
    document.getElementById('brachial-vpk-result-text').innerText = `Вариабельность Vpk: ${variability.toFixed(1)}%`;

    const cutoff = 10; // Пороговое значение для Vpk плечевой артерии
    const responsive = variability > cutoff;
    const interpretationBox = document.getElementById('brachial-vpk-interpretation');
    interpretationBox.className = 'interpretation-box';
    interpretationBox.innerText = responsive ? `> ${cutoff}%. Вероятен ответ на инфузию.` : `≤ ${cutoff}%. Ответ на инфузию маловероятен.`;
    interpretationBox.classList.add(responsive ? 'responsive' : 'non-responsive');

    saveMeasurement('Vpk_Плечевая', { vmax, vmin, tech, value: variability.toFixed(1), isResponsive: responsive });
}

// МОДУЛЬ 4: НИЖНЯЯ ПОЛАЯ ВЕНА (СУБКОСТАЛЬНО)
function calculateIVCSubcostal() {
    const dmax = document.getElementById('ivc-sub-dmax').value;
    const dmin = document.getElementById('ivc-sub-dmin').value;
    const ventilation = document.getElementById('ivc-sub-ventilation').value;
    const tech = document.getElementById('ivc-sub-tech').value;

    if (!dmax || !dmin || !ventilation || !tech) {
        alert('Заполните все поля для НПВ (субкостально).');
        return;
    }

    let index, cutoff, responsive, resultText, interpretationText;

    if (ventilation === 'spontaneous') {
        // Для спонтанного дыхания считаем Индекс Коллабирования (CI)
        index = ((parseFloat(dmax) - parseFloat(dmin)) / parseFloat(dmax)) * 100;
        cutoff = 40; // Примерный порог для индекса коллабирования
        responsive = index > cutoff;
        resultText = `Индекс коллабирования (CI): ${index.toFixed(1)}%`;
        interpretationText = responsive ? `> ${cutoff}%. Вероятен ответ на инфузию.` : `≤ ${cutoff}%. Ответ на инфузию маловероятен.`;
    } else { // 'mechanical'
        // Для ИВЛ считаем Индекс Растяжимости (DI)
        index = ((parseFloat(dmax) - parseFloat(dmin)) / parseFloat(dmin)) * 100;
        cutoff = 18; // Примерный порог для индекса растяжимости
        responsive = index > cutoff;
        resultText = `Индекс растяжимости (DI): ${index.toFixed(1)}%`;
        interpretationText = responsive ? `> ${cutoff}%. Вероятен ответ на инфузию.` : `≤ ${cutoff}%. Ответ на инфузию маловероятен.`;
    }
    
    document.getElementById('ivc-sub-result-text').innerText = resultText;
    const interpretationBox = document.getElementById('ivc-sub-interpretation');
    interpretationBox.className = 'interpretation-box';
    interpretationBox.innerText = interpretationText;
    interpretationBox.classList.add(responsive ? 'responsive' : 'non-responsive');

    saveMeasurement('НПВ_субкостально', { dmax, dmin, ventilation, tech, value: index.toFixed(1), isResponsive: responsive });
}

// МОДУЛЬ 5: НИЖНЯЯ ПОЛАЯ ВЕНА (ТРАНСПЕЧЕНОЧНО)
function calculateIVCTranshepatic() {
    const dmax = document.getElementById('ivc-trans-dmax').value;
    const dmin = document.getElementById('ivc-trans-dmin').value;
    const ventilation = document.getElementById('ivc-trans-ventilation').value;
    const tech = document.getElementById('ivc-trans-tech').value;
    
    if (!dmax || !dmin || !ventilation || !tech) {
        alert('Заполните все поля для НПВ (транспеченочно).');
        return;
    }

    let index, cutoff, responsive, resultText, interpretationText;

    if (ventilation === 'spontaneous') {
        index = ((parseFloat(dmax) - parseFloat(dmin)) / parseFloat(dmax)) * 100;
        cutoff = 40;
        responsive = index > cutoff;
        resultText = `Индекс коллабирования (CI): ${index.toFixed(1)}%`;
        interpretationText = responsive ? `> ${cutoff}%. Вероятен ответ на инфузию.` : `≤ ${cutoff}%. Ответ на инфузию маловероятен.`;
    } else { // 'mechanical'
        index = ((parseFloat(dmax) - parseFloat(dmin)) / parseFloat(dmin)) * 100;
        cutoff = 18;
        responsive = index > cutoff;
        resultText = `Индекс растяжимости (DI): ${index.toFixed(1)}%`;
        interpretationText = responsive ? `> ${cutoff}%. Вероятен ответ на инфузию.` : `≤ ${cutoff}%. Ответ на инфузию маловероятен.`;
    }

    document.getElementById('ivc-trans-result-text').innerText = resultText;
    const interpretationBox = document.getElementById('ivc-trans-interpretation');
    interpretationBox.className = 'interpretation-box';
    interpretationBox.innerText = interpretationText;
    interpretationBox.classList.add(responsive ? 'responsive' : 'non-responsive');

    saveMeasurement('НПВ_транспеченочно', { dmax, dmin, ventilation, tech, value: index.toFixed(1), isResponsive: responsive });
}

// МОДУЛЬ 6: VTI НА ЛЕГОЧНОЙ АРТЕРИИ (с пробой PLR)
function calculatePAVTI() {
    const vtiBefore = document.getElementById('pa-vti-before').value;
    const vtiAfter = document.getElementById('pa-vti-after').value;
    const tech = document.getElementById('pa-vti-tech').value;

    if (!vtiBefore || !vtiAfter || !tech) {
        alert('Заполните все поля для VTI на легочной артерии.');
        return;
    }

    const variability = ((parseFloat(vtiAfter) - parseFloat(vtiBefore)) / parseFloat(vtiBefore)) * 100;
    document.getElementById('pa-vti-result-text').innerText = `Изменение VTI после PLR: ${variability.toFixed(1)}%`;

    const cutoff = 12; // Порог для изменения VTI на ЛА после PLR
    const responsive = variability > cutoff;
    const interpretationBox = document.getElementById('pa-vti-interpretation');
    interpretationBox.className = 'interpretation-box';
    interpretationBox.innerText = responsive ? `> ${cutoff}%. Вероятен ответ на инфузию.` : `≤ ${cutoff}%. Ответ на инфузию маловероятен.`;
    interpretationBox.classList.add(responsive ? 'responsive' : 'non-responsive');
    
    saveMeasurement('VTI_ЛА_PLR', { vtiBefore, vtiAfter, tech, value: variability.toFixed(1), isResponsive: responsive });
}

// МОДУЛЬ 7: ВЕРХНЯЯ ПОЛАЯ ВЕНА (TEE)
function calculateSVC() {
    const dmax = document.getElementById('svc-dmax').value;
    const dmin = document.getElementById('svc-dmin').value;
    const tech = document.getElementById('svc-tech').value;

    if (!dmax || !dmin || !tech) {
        alert('Заполните все поля для верхней полой вены.');
        return;
    }

    // Для ВПВ (TEE) на ИВЛ используется индекс коллабирования
    const variability = ((parseFloat(dmax) - parseFloat(dmin)) / parseFloat(dmax)) * 100;
    document.getElementById('svc-result-text').innerText = `Индекс коллабирования ВПВ: ${variability.toFixed(1)}%`;

    const cutoff = 36; // Порог для SVC collapsibility index
    const responsive = variability > cutoff;
    const interpretationBox = document.getElementById('svc-interpretation');
    interpretationBox.className = 'interpretation-box';
    interpretationBox.innerText = responsive ? `> ${cutoff}%. Вероятен ответ на инфузию.` : `≤ ${cutoff}%. Ответ на инфузию маловероятен.`;
    interpretationBox.classList.add(responsive ? 'responsive' : 'non-responsive');

    saveMeasurement('ВПВ_TEE', { dmax, dmin, tech, value: variability.toFixed(1), isResponsive: responsive });
}

// МОДУЛЬ 8: VTI НА АОРТЕ (с пробой PLR)
function calculateAortaVTI() {
    const vtiBefore = document.getElementById('aorta-vti-before').value;
    const vtiAfter = document.getElementById('aorta-vti-after').value;
    const tech = document.getElementById('aorta-vti-tech').value;

    if (!vtiBefore || !vtiAfter || !tech) {
        alert('Заполните все поля для VTI на аорте.');
        return;
    }

    const variability = ((parseFloat(vtiAfter) - parseFloat(vtiBefore)) / parseFloat(vtiBefore)) * 100;
    document.getElementById('aorta-vti-result-text').innerText = `Изменение VTI после PLR: ${variability.toFixed(1)}%`;

    const cutoff = 12; // Порог для изменения VTI в ВТЛЖ после PLR
    const responsive = variability > cutoff;
    const interpretationBox = document.getElementById('aorta-vti-interpretation');
    interpretationBox.className = 'interpretation-box';
    interpretationBox.innerText = responsive ? `> ${cutoff}%. Вероятен ответ на инфузию.` : `≤ ${cutoff}%. Ответ на инфузию маловероятен.`;
    interpretationBox.classList.add(responsive ? 'responsive' : 'non-responsive');

    saveMeasurement('VTI_Аорта_PLR', { vtiBefore, vtiAfter, tech, value: variability.toFixed(1), isResponsive: responsive });
}
