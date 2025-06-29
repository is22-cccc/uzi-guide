// --- Глобальное состояние ---
let currentSession = {
    patientId: null,
    researcherId: null,
    startTime: null,
    protocol: null,
    visMode: null,
    measurements: {},
    finalDecision: null
};

// --- Функции управления UI ---

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function startNewSession() {
    // Генерация ID
    const researcherId = localStorage.getItem('researcherId') || `res-${crypto.randomUUID()}`;
    localStorage.setItem('researcherId', researcherId);
    
    currentSession.researcherId = researcherId;
    currentSession.patientId = `pat-${crypto.randomUUID()}`;
    currentSession.startTime = new Date().toISOString();
    
    // Сохранение сессии
    let sessions = JSON.parse(localStorage.getItem('activeSessions')) || [];
    sessions.push({id: currentSession.patientId, time: currentSession.startTime});
    localStorage.setItem('activeSessions', JSON.stringify(sessions));

    showScreen('protocol-screen');
}

function continueSession(sessionId) {
    // В будущем здесь будет логика загрузки сохраненных данных сессии
    alert(`Продолжение сессии ${sessionId} в разработке.`);
    // Для демонстрации начинаем новую сессию, но с id старой
    const researcherId = localStorage.getItem('researcherId');
    currentSession.researcherId = researcherId;
    currentSession.patientId = sessionId;
    showScreen('protocol-screen');
}

function selectProtocol(protocolName) {
    currentSession.protocol = protocolName;
    document.querySelectorAll('.module').forEach(module => {
        const protocols = module.dataset.protocol.split(',');
        if (protocols.includes(protocolName)) {
            module.classList.remove('hidden');
        } else {
            module.classList.add('hidden');
        }
    });
    generateProtocolMenu();
    showScreen('vis-mode-screen');
}

function selectVisMode(mode) {
    currentSession.visMode = mode;
    document.querySelectorAll('.visualization-element').forEach(el => {
        if (mode) {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });
    document.getElementById('session-info').innerText = `Сессия: ${currentSession.patientId.substring(4, 10)} | Протокол: ${currentSession.protocol}`;
    showScreen('main-workspace');
}

function generateProtocolMenu() {
    const menu = document.getElementById('protocol-menu');
    menu.innerHTML = '';
    document.querySelectorAll('.module:not(.hidden)').forEach(module => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${module.id}`;
        a.textContent = module.querySelector('h2').textContent;
        li.appendChild(a);
        menu.appendChild(li);
    });
    setupSidebar(); // Перенастраиваем сайдбар
}


// --- Функции-калькуляторы ---

function calculateIJV() {
    const hmax = document.getElementById('hmax').value;
    const hmin = document.getElementById('hmin').value;
    const tech = document.getElementById('ijv-tech').value;
    const resultText = document.getElementById('ijv-result-text');
    const interpretationBox = document.getElementById('ijv-interpretation');

    if (!hmax || !hmin || !tech) {
        resultText.innerText = 'Заполните все поля.'; return;
    }
    
    const variability = ((parseFloat(hmax) - parseFloat(hmin)) / ((parseFloat(hmax) + parseFloat(hmin)) / 2)) * 100;
    resultText.innerText = `Вариабельность ВЯВ: ${variability.toFixed(1)}%`;
    
    const cutoff = 18;
    let responsive = variability > cutoff;
    interpretationBox.className = 'interpretation-box';
    if(tech === 'да') {
        interpretationBox.innerText = `[Тех. сложности] Результат может быть неточным.`;
        interpretationBox.classList.add('neutral');
        responsive = 'uncertain';
    } else {
        interpretationBox.innerText = responsive ? `> ${cutoff}%. Вероятен ответ на инфузию.` : `≤ ${cutoff}%. Ответ на инфузию маловероятен.`;
        interpretationBox.classList.add(responsive ? 'responsive' : 'non-responsive');
    }

    saveMeasurement('ijv', { hmax, hmin, tech, variability, responsive });
}

function calculateCCA_Vpk() {
    // Аналогичная логика, как в calculateIJV
    const vmax = document.getElementById('vmax').value;
    const vmin = document.getElementById('vmin').value;
    const tech = document.getElementById('vpk-tech').value;
    //...
    saveMeasurement('cca_vpk', { vmax, vmin, tech, /* ... */ });
}

function calculateCCA_FTc() {
    const flowTime = document.getElementById('flowTime').value;
    const heartRate = document.getElementById('heartRate').value;
    const age = document.getElementById('cca-age').value;
    const tech = document.getElementById('ftc-tech').value;
    const resultText = document.getElementById('ftc-result-text');
    const interpretationBox = document.getElementById('ftc-interpretation');

    if (!flowTime || !heartRate || !age || !tech) {
        resultText.innerText = 'Заполните все поля.'; return;
    }
    
    const ftc = parseFloat(flowTime) + 1.29 * (parseFloat(heartRate) - 60);
    resultText.innerText = `FTc: ${ftc.toFixed(0)} мс`;

    const cutoff = age === '<65' ? 325 : 340;
    let responsive = ftc < cutoff;
    interpretationBox.className = 'interpretation-box';

    if(tech === 'да'){
        interpretationBox.innerText = `[Тех. сложности] Результат может быть неточным.`;
        interpretationBox.classList.add('neutral');
        responsive = 'uncertain';
    } else {
        interpretationBox.innerText = responsive ? `< ${cutoff} мс. Вероятен ответ на инфузию.` : `≥ ${cutoff} мс. Ответ на инфузию маловероятен.`;
        interpretationBox.classList.add(responsive ? 'responsive' : 'non-responsive');
    }

    saveMeasurement('cca_ftc', { flowTime, heartRate, age, tech, ftc, responsive });
}

// --- Итоговые функции и сбор данных ---

function generateFinalReport() {
    let responsiveCount = 0;
    let nonResponsiveCount = 0;
    let uncertainCount = 0;

    for (const key in currentSession.measurements) {
        const measurement = currentSession.measurements[key];
        if (measurement.responsive === true) responsiveCount++;
        else if (measurement.responsive === false) nonResponsiveCount++;
        else if (measurement.responsive === 'uncertain') uncertainCount++;
    }

    const finalBox = document.getElementById('final-interpretation');
    finalBox.className = 'interpretation-box';
    if(uncertainCount > 0){
         finalBox.innerText = `Заключение затруднено из-за технических сложностей при измерениях.`;
         finalBox.classList.add('neutral');
    } else if (responsiveCount > nonResponsiveCount) {
        finalBox.innerText = `Совокупность данных указывает на вероятный положительный ответ на инфузионную терапию.`;
        finalBox.classList.add('responsive');
    } else if (nonResponsiveCount > responsiveCount) {
        finalBox.innerText = `Совокупность данных указывает на низкую вероятность ответа на инфузионную терапию.`;
        finalBox.classList.add('non-responsive');
    } else {
        finalBox.innerText = `Данные противоречивы. Требуется дополнительная оценка или использование других методов.`;
        finalBox.classList.add('neutral');
    }
    document.getElementById('final-result-section').classList.remove('hidden');
}

function finishSession(){
    const decision = document.getElementById('clinical-decision').value;
    if(!decision){
        alert('Пожалуйста, выберите ваше клиническое действие.');
        return;
    }
    currentSession.finalDecision = decision;
    sendDataToGoogleSheet(currentSession);
    alert('Сессия завершена. Данные сохранены (выведены в консоль). Перезагрузка...');
    window.location.reload();
}

function saveMeasurement(type, data) {
    currentSession.measurements[type] = data;
    sendDataToGoogleSheet({
        type: 'measurement',
        ...currentSession
    });
}

function sendDataToGoogleSheet(data) {
    // --- ЗАГЛУШКА ДЛЯ ОТПРАВКИ ДАННЫХ ---
    console.log("--- ДАННЫЕ ДЛЯ ОТПРАВКИ В GOOGLE ---");
    console.log(JSON.stringify(data, null, 2));
    // В будущем здесь будет fetch-запрос на серверный обработчик
}


// --- Инициализация при загрузке страницы ---

function setupSidebar() {
    // Эта функция должна быть перенастроена, так как меню теперь динамическое
    const sidebarLinks = document.querySelectorAll('.sidebar a');
    sidebarLinks.forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({ behavior: 'smooth' });
        });
    });
    // Логика подсветки активного пункта останется такой же, но ее нужно вызывать после генерации меню
}

document.addEventListener('DOMContentLoaded', () => {
    // Загрузка активных сессий
    const sessions = JSON.parse(localStorage.getItem('activeSessions')) || [];
    const list = document.getElementById('active-sessions-list');
    if(sessions.length > 0){
        sessions.forEach(s => {
            const li = document.createElement('li');
            li.textContent = `Пациент ${s.id.substring(4,10)} (начато: ${new Date(s.time).toLocaleString()})`;
            li.onclick = () => continueSession(s.id);
            list.appendChild(li);
        });
    } else {
       document.getElementById('active-sessions-container').classList.add('hidden');
    }

    showScreen('start-screen');
});
