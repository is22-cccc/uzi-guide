// --- Глобальное состояние сессии ---
let currentSession = {
    patientId: null,
    researcherId: null,
    startTime: null,
    protocol: null,
    visMode: null,
    isContinuation: false, // Новый флаг для отслеживания продолжения сессии
    measurements: {},
    tacticEvaluation: null,
    finalDecision: null
};

// --- Функции для генерации ID ---
function generateUUID() {
    if (crypto && crypto.randomUUID) {
        return crypto.randomUUID();
    }
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

function setupChoiceButtons(groupId, callback) {
    const group = document.getElementById(groupId);
    group.addEventListener('click', e => {
        if (e.target.classList.contains('choice-button')) {
            group.querySelectorAll('.choice-button').forEach(btn => btn.classList.remove('selected'));
            e.target.classList.add('selected');
            callback(e.target.dataset.value);
        }
    });
}

// --- Новая логика сессий ---

function startNewSession() {
    currentSession.isContinuation = false;
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
    currentSession.isContinuation = true; // Устанавливаем флаг
    const researcherId = localStorage.getItem('researcherId');
    currentSession.researcherId = researcherId;
    currentSession.patientId = sessionId;
    currentSession.measurements = {};
    currentSession.finalDecision = null;
    
    showScreen('protocol-screen');
}

function selectProtocol(protocolName) {
    currentSession.protocol = protocolName;
    setTimeout(() => showScreen('vis-mode-screen'), 300);
}

function selectVisMode(mode) {
    currentSession.visMode = (mode === 'true');
    setTimeout(() => {
        applySessionSettings();
        showScreen('main-workspace');
    }, 300);
}

function applySessionSettings() {
    // Показываем/скрываем модули
    document.querySelectorAll('.module').forEach(module => {
        const protocols = module.dataset.protocol.split(',');
        module.classList.toggle('hidden', !protocols.includes(currentSession.protocol));
    });

    // Показываем/скрываем элементы визуализации
    document.querySelectorAll('.visualization-element').forEach(el => {
        el.classList.toggle('hidden', !currentSession.visMode);
    });

    // Показываем/скрываем блок оценки тактики
    const followUpBlock = document.getElementById('follow-up-evaluation');
    followUpBlock.classList.toggle('hidden', !currentSession.isContinuation);
    
    // Загружаем предыдущие данные, если это продолжение сессии
    if (currentSession.isContinuation) {
        loadPreviousMeasurements(currentSession.patientId);
    }

    generateProtocolMenu();
    
    const protocolText = { 'basic': 'Базовый', 'advanced': 'Продвинутый', 'expert': 'Экспертный' };
    document.getElementById('session-info').innerText = `Сессия: ${currentSession.patientId.substring(4, 10)} | Протокол: ${protocolText[currentSession.protocol]}`;
}

// --- НОВАЯ ФУНКЦИЯ: Загрузка предыдущих измерений ---
function loadPreviousMeasurements(patientId) {
    const allPatientData = JSON.parse(localStorage.getItem(`data_${patientId}`)) || [];
    if (allPatientData.length === 0) return;

    // Находим последнее измерение каждого типа
    const lastMeasurements = {};
    allPatientData.filter(d => d.dataType === 'measurement').forEach(m => {
        lastMeasurements[m.measurement] = m; // Перезаписываем, в итоге останется последнее
    });
    
    // Отображаем предыдущие значения
    if (lastMeasurements['ВЯВ']) {
        document.getElementById('prev-hmax').textContent = `(пред. ${lastMeasurements['ВЯВ'].hmax})`;
        document.getElementById('prev-hmin').textContent = `(пред. ${lastMeasurements['ВЯВ'].hmin})`;
    }
    if (lastMeasurements['Vpk_ОСА']) {
        document.getElementById('prev-vmax').textContent = `(пред. ${lastMeasurements['Vpk_ОСА'].vmax})`;
        document.getElementById('prev-vmin').textContent = `(пред. ${lastMeasurements['Vpk_ОСА'].vmin})`;
    }
    // и так далее для других модулей
}


// --- Функции-калькуляторы (без изменений) ---
// ... calculateIJV, calculateCCA_Vpk, calculateCCA_FTc ...
function calculateIJV(){/*...код без изменений...*/
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
function calculateCCA_Vpk(){/*...код без изменений...*/
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
function calculateCCA_FTc(){/*...код без изменений...*/
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


// --- Итоговые функции и сбор данных (обновлены) ---

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
        reportText += ' ВНИМАНИЕ: зафиксированы технические сложности, что может влиять на достоверность.';
        finalBox.classList.add('non-responsive');
    }
    finalBox.innerText = reportText;
    document.getElementById('final-result-section').classList.remove('hidden');
}

async function finishSession() {
    const decision = document.getElementById('clinical-decision').value;
    if (!decision) { alert('Пожалуйста, выберите ваше клиническое действие.'); return; }
    currentSession.finalDecision = decision;
    
    // Сохраняем оценку тактики, если она была
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
        tacticEvaluation: currentSession.tacticEvaluation // Отправляем новое поле
    });

    alert('Сессия завершена. Данные отправлены.');
    window.location.reload();
}

// НОВАЯ ЛОГИКА СОХРАНЕНИЯ ДАННЫХ
function saveMeasurement(measurementName, data) {
    currentSession.measurements[measurementName] = data;

    const dataToSend = {
        dataType: 'measurement',
        timestamp: new Date().toISOString(),
        researcherId: currentSession.researcherId,
        patientId: currentSession.patientId,
        protocol: currentSession.protocol,
        measurement: measurementName,
        isResponsive: data.isResponsive,
        techIssue: data.tech,
        //... добавляем все сырые данные
        ...data 
    };
    
    // Сохраняем в localStorage для динамического наблюдения
    let allPatientData = JSON.parse(localStorage.getItem(`data_${currentSession.patientId}`)) || [];
    allPatientData.push(dataToSend);
    localStorage.setItem(`data_${currentSession.patientId}`, JSON.stringify(allPatientData));
    
    sendDataToGoogleSheet(dataToSend);
}

async function sendDataToGoogleSheet(data) {
    // Эта функция остается без изменений
    console.log("Отправка данных:", data);
    try {
        const response = await fetch('/.netlify/functions/save-data', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            console.error('Ошибка при отправке данных на сервер');
        }
    } catch (error) {
        console.error('Сетевая ошибка:', error);
    }
}


// --- Инициализация при загрузке страницы (обновлена) ---
document.addEventListener('DOMContentLoaded', () => {
    // ... (код инициализации без изменений) ...
    setupChoiceButtons('protocol-choice', selectProtocol);
    setupChoiceButtons('vis-mode-choice', selectVisMode);
    let sessions = JSON.parse(localStorage.getItem('activeSessions')) || [];
    const oneDayAgo = new Date().getTime() - (24 * 60 * 60 * 1000);
    sessions = sessions.filter(s => new Date(s.time).getTime() > oneDayAgo);
    localStorage.setItem('activeSessions', JSON.stringify(sessions));
    const container = document.getElementById('active-sessions-container');
    const list = document.getElementById('active-sessions-list');
    if (sessions.length > 0) {
        sessions.forEach(s => {
            const li = document.createElement('li');
            li.textContent = `Пациент ${s.id.substring(4,10)} (начато: ${new Date(s.time).toLocaleString()})`;
            li.onclick = () => continueSession(s.id);
            list.appendChild(li);
        });
        container.classList.remove('hidden');
    } else {
       container.classList.add('hidden');
    }
    showScreen('start-screen');
});

function setupSidebarScroll() {
    // ... (код скролла без изменений) ...
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

