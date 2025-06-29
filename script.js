// --- Глобальное состояние сессии ---
let currentSession = {
    patientId: null,
    researcherId: null,
    startTime: null,
    protocol: null,
    visMode: null,
    measurements: {},
    finalDecision: null
};

// --- Функции управления UI и навигацией ---

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function setupChoiceButtons(groupId, callback) {
    const group = document.getElementById(groupId);
    group.addEventListener('click', (e) => {
        if (e.target.classList.contains('choice-button')) {
            group.querySelectorAll('.choice-button').forEach(btn => btn.classList.remove('selected'));
            e.target.classList.add('selected');
            // Передаем значение из data-атрибута в колбэк
            callback(e.target.dataset.value);
        }
    });
}

// --- ИСПРАВЛЕННАЯ ЛОГИКА СЕССИЙ ---

// Вызывается ТОЛЬКО при нажатии "Начать новое обследование"
function startNewSession() {
    // 1. Устанавливаем ID исследователя
    const researcherId = localStorage.getItem('researcherId') || `res-${crypto.randomUUID()}`;
    localStorage.setItem('researcherId', researcherId);
    
    // 2. Создаем НОВЫЙ ID пациента
    currentSession.researcherId = researcherId;
    currentSession.patientId = `pat-${crypto.randomUUID()}`;
    currentSession.startTime = new Date().toISOString();
    
    // 3. Сохраняем новую сессию в список активных
    let sessions = JSON.parse(localStorage.getItem('activeSessions')) || [];
    // Добавляем в начало списка для удобства
    sessions.unshift({ id: currentSession.patientId, time: currentSession.startTime });
    localStorage.setItem('activeSessions', JSON.stringify(sessions));

    // 4. Переходим к следующему экрану
    showScreen('protocol-screen');
}

// Вызывается ТОЛЬКО при клике на существующую сессию в списке
function continueSession(sessionId) {
    console.log(`Продолжение сессии для пациента: ${sessionId}`);
    
    // 1. Устанавливаем ID исследователя
    const researcherId = localStorage.getItem('researcherId');
    if (!researcherId) {
        // На случай, если localStorage был очищен, но сессии остались. Создаем новый ID.
        const newResearcherId = `res-${crypto.randomUUID()}`;
        localStorage.setItem('researcherId', newResearcherId);
        currentSession.researcherId = newResearcherId;
    } else {
        currentSession.researcherId = researcherId;
    }

    // 2. Устанавливаем СУЩЕСТВУЮЩИЙ ID пациента
    currentSession.patientId = sessionId;
    
    // 3. Сбрасываем предыдущие измерения для чистоты (в будущем здесь будет загрузка)
    currentSession.measurements = {};
    currentSession.finalDecision = null;

    // 4. Переходим к следующему экрану
    showScreen('protocol-screen');
}


function selectProtocol(protocolName) {
    currentSession.protocol = protocolName;
    setTimeout(() => {
        showScreen('vis-mode-screen');
    }, 300); 
}

function selectVisMode(mode) {
    currentSession.visMode = (mode === 'true');
    setTimeout(() => {
        applySessionSettings();
        showScreen('main-workspace');
    }, 300);
}

function applySessionSettings() {
    document.querySelectorAll('.module').forEach(module => {
        const protocols = module.dataset.protocol.split(',');
        module.classList.toggle('hidden', !protocols.includes(currentSession.protocol));
    });

    document.querySelectorAll('.visualization-element').forEach(el => {
        el.classList.toggle('hidden', !currentSession.visMode);
    });

    generateProtocolMenu();
    
    const protocolText = {
        'basic': 'Базовый',
        'advanced': 'Продвинутый',
        'expert': 'Экспертный'
    };
    document.getElementById('session-info').innerText = `Сессия: ${currentSession.patientId.substring(4, 10)} | Протокол: ${protocolText[currentSession.protocol]}`;
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
    setupSidebarScroll(); 
}

// --- Функции-калькуляторы (без изменений) ---

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
    const responsive = variability > cutoff;
    
    interpretationBox.className = 'interpretation-box';
    interpretationBox.innerText = responsive ? `> ${cutoff}%. Вероятен ответ на инфузию.` : `≤ ${cutoff}%. Ответ на инфузию маловероятен.`;
    interpretationBox.classList.add(responsive ? 'responsive' : 'non-responsive');
    
    saveMeasurement('ijv', { hmax, hmin, tech, variability, responsive });
}


function calculateCCA_Vpk() {
    const vmax = document.getElementById('vmax').value;
    const vmin = document.getElementById('vmin').value;
    const tech = document.getElementById('vpk-tech').value;
    const resultText = document.getElementById('vpk-result-text');
    const interpretationBox = document.getElementById('vpk-interpretation');

    if (!vmax || !vmin || !tech) {
         resultText.innerText = 'Заполните все поля.'; return;
    }

    const variability = ((parseFloat(vmax) - parseFloat(vmin)) / ((parseFloat(vmax) + parseFloat(vmin)) / 2)) * 100;
    resultText.innerText = `Вариабельность Vpk: ${variability.toFixed(1)}%`;
    
    const cutoff = 12;
    const responsive = variability > cutoff;

    interpretationBox.className = 'interpretation-box';
    interpretationBox.innerText = responsive ? `> ${cutoff}%. Вероятен ответ на инфузию.` : `≤ ${cutoff}%. Ответ на инфузию маловероятен.`;
    interpretationBox.classList.add(responsive ? 'responsive' : 'non-responsive');

    saveMeasurement('cca_vpk', { vmax, vmin, tech, variability, responsive });
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
    const responsive = ftc < cutoff;

    interpretationBox.className = 'interpretation-box';
    interpretationBox.innerText = responsive ? `< ${cutoff} мс. Вероятен ответ на инфузию.` : `≥ ${cutoff} мс. Ответ на инфузию маловероятен.`;
    interpretationBox.classList.add(responsive ? 'responsive' : 'non-responsive');

    saveMeasurement('cca_ftc', { flowTime, heartRate, age, tech, ftc, responsive });
}

// --- Итоговые функции и сбор данных (без изменений) ---

function generateFinalReport() {
    let responsiveCount = 0;
    let nonResponsiveCount = 0;
    let techIssues = false;

    for (const key in currentSession.measurements) {
        const measurement = currentSession.measurements[key];
        if (measurement.tech === 'да') techIssues = true;
        if (measurement.responsive === true) responsiveCount++;
        else if (measurement.responsive === false) nonResponsiveCount++;
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
        reportText = 'Данные противоречивы. Требуется дополнительная оценка или использование других методов.';
        finalBox.classList.add('neutral');
    }

    if (techIssues) {
        reportText += ' ВНИМАНИЕ: при проведении измерений были зафиксированы технические сложности, что может влиять на достоверность заключения.';
        if(!finalBox.classList.contains('responsive')) { // Не делаем красным, если и так responsive
             finalBox.classList.add('non-responsive');
        }
    }
    
    finalBox.innerText = reportText;
    document.getElementById('final-result-section').classList.remove('hidden');
}

function finishSession(){
    const decision = document.getElementById('clinical-decision').value;
    if(!decision){
        alert('Пожалуйста, выберите ваше клиническое действие.');
        return;
    }
    currentSession.finalDecision = decision;
    sendDataToGoogleSheet({
        type: 'final_report',
        ...currentSession
    });
    alert('Сессия завершена. Данные сохранены (выведены в консоль). Перезагрузка...');
    window.location.reload();
}

function saveMeasurement(type, data) {
    currentSession.measurements[type] = data;
    sendDataToGoogleSheet({
        type: `measurement_${type}`,
        timestamp: new Date().toISOString(),
        sessionId: currentSession.patientId,
        researcherId: currentSession.researcherId,
        data: data
    });
}

function sendDataToGoogleSheet(data) {
    console.log("--- ДАННЫЕ ДЛЯ ОТПРАВКИ ---");
    console.log(JSON.stringify(data, null, 2));
}

// --- Инициализация при загрузке страницы ---

function setupSidebarScroll() {
    const sidebarLinks = document.querySelectorAll('.sidebar a');
    const modules = document.querySelectorAll('.module:not(.hidden)');

    sidebarLinks.forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({ behavior: 'smooth' });
        });
    });

    if(modules.length === 0) return;

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

document.addEventListener('DOMContentLoaded', () => {
    setupChoiceButtons('protocol-choice', selectProtocol);
    setupChoiceButtons('vis-mode-choice', selectVisMode);

    const sessions = JSON.parse(localStorage.getItem('activeSessions')) || [];
    const container = document.getElementById('active-sessions-container');
    const list = document.getElementById('active-sessions-list');
    
    if (sessions.length > 0) {
        sessions.forEach(s => {
            const li = document.createElement('li');
            li.textContent = `Пациент ${s.id.substring(4, 10)} (начато: ${new Date(s.time).toLocaleString()})`;
            li.onclick = () => continueSession(s.id);
            list.appendChild(li);
        });
        container.classList.remove('hidden');
    } else {
       container.classList.add('hidden');
    }

    showScreen('start-screen');
});
