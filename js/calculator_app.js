// ФАЙЛ: /js/calculator_app.js
// Этот файл отвечает за работу приложения: сессии, сохранение, UI.

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

function findPatientSession() {
    const patientId = document.getElementById('patient-id-input').value.trim();
    if (!patientId) {
        alert('Пожалуйста, введите ID пациента.');
        return;
    }
    const patientData = localStorage.getItem(`data_${patientId}`);
    if (!patientData || JSON.parse(patientData).length === 0) {
        alert(`Данные для пациента с ID "${patientId}" не найдены.`);
        return;
    }
    console.log(`Найдены данные для пациента ${patientId}. Загрузка сессии...`);
    currentSession.isContinuation = true;
    currentSession.patientId = patientId;
    currentSession.researcherId = localStorage.getItem('researcherId');
    currentSession.measurements = {};
    currentSession.finalDecision = null;
    showScreen('protocol-screen');
}

function selectProtocol(protocolName) {
    currentSession.protocol = protocolName;
    currentSession.visMode = false;
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
        if(document.getElementById('prev-hmax')) document.getElementById('prev-hmax').textContent = `(пред. ${lastMeasurements['ВЯВ'].hmax})`;
        if(document.getElementById('prev-hmin')) document.getElementById('prev-hmin').textContent = `(пред. ${lastMeasurements['ВЯВ'].hmin})`;
    }
    if (lastMeasurements['Vpk_ОСА']) {
        if(document.getElementById('prev-vmax')) document.getElementById('prev-vmax').textContent = `(пред. ${lastMeasurements['Vpk_ОСА'].vmax})`;
        if(document.getElementById('prev-vmin')) document.getElementById('prev-vmin').textContent = `(пред. ${lastMeasurements['Vpk_ОСА'].vmin})`;
    }
    if (lastMeasurements['FTc_ОСА']) {
        if(document.getElementById('prev-flowTime')) document.getElementById('prev-flowTime').textContent = `(пред. ${lastMeasurements['FTc_ОСА'].flowTime})`;
        if(document.getElementById('prev-heartRate')) document.getElementById('prev-heartRate').textContent = `(пред. ${lastMeasurements['FTc_ОСА'].heartRate})`;
    }
    if (lastMeasurements['Vpk_Плечевая']) {
        if(document.getElementById('prev-brachial-vmax')) document.getElementById('prev-brachial-vmax').textContent = `(пред. ${lastMeasurements['Vpk_Плечевая'].vmax})`;
        if(document.getElementById('prev-brachial-vmin')) document.getElementById('prev-brachial-vmin').textContent = `(пред. ${lastMeasurements['Vpk_Плечевая'].vmin})`;
    }
    if (lastMeasurements['НПВ_субкостально']) {
        if(document.getElementById('prev-ivc-sub-dmax')) document.getElementById('prev-ivc-sub-dmax').textContent = `(пред. ${lastMeasurements['НПВ_субкостально'].dmax})`;
        if(document.getElementById('prev-ivc-sub-dmin')) document.getElementById('prev-ivc-sub-dmin').textContent = `(пред. ${lastMeasurements['НПВ_субкостально'].dmin})`;
    }
    if (lastMeasurements['НПВ_транспеченочно']) {
        if(document.getElementById('prev-ivc-trans-dmax')) document.getElementById('prev-ivc-trans-dmax').textContent = `(пред. ${lastMeasurements['НПВ_транспеченочно'].dmax})`;
        if(document.getElementById('prev-ivc-trans-dmin')) document.getElementById('prev-ivc-trans-dmin').textContent = `(пред. ${lastMeasurements['НПВ_транспеченочно'].dmin})`;
    }
    if (lastMeasurements['VTI_ЛА_PLR']) {
        if(document.getElementById('prev-pa-vti-before')) document.getElementById('prev-pa-vti-before').textContent = `(пред. ${lastMeasurements['VTI_ЛА_PLR'].vtiBefore})`;
        if(document.getElementById('prev-pa-vti-after')) document.getElementById('prev-pa-vti-after').textContent = `(пред. ${lastMeasurements['VTI_ЛА_PLR'].vtiAfter})`;
    }
    if (lastMeasurements['ВПВ_TEE']) {
        if(document.getElementById('prev-svc-dmax')) document.getElementById('prev-svc-dmax').textContent = `(пред. ${lastMeasurements['ВПВ_TEE'].dmax})`;
        if(document.getElementById('prev-svc-dmin')) document.getElementById('prev-svc-dmin').textContent = `(пред. ${lastMeasurements['ВПВ_TEE'].dmin})`;
    }
    if (lastMeasurements['VTI_Аорта_PLR']) {
        if(document.getElementById('prev-aorta-vti-before')) document.getElementById('prev-aorta-vti-before').textContent = `(пред. ${lastMeasurements['VTI_Аорта_PLR'].vtiBefore})`;
        if(document.getElementById('prev-aorta-vti-after')) document.getElementById('prev-aorta-vti-after').textContent = `(пред. ${lastMeasurements['VTI_Аорта_PLR'].vtiAfter})`;
    }
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
        age: data.age || 'N/A',
        ventilation: data.ventilation || 'N/A'
    };
    let allPatientData = JSON.parse(localStorage.getItem(`data_${currentSession.patientId}`)) || [];
    allPatientData.push({
        dataType: 'measurement',
        measurement: measurementName, 
        data: data
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
    const protocolButtons = document.querySelectorAll('#protocol-choice .choice-button');
    protocolButtons.forEach(button => {
        button.addEventListener('click', () => {
            protocolButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            selectProtocol(button.dataset.value);
        });
    });
    
    let sessions = JSON.parse(localStorage.getItem('activeSessions')) || [];
    const oneDayAgo = new Date().getTime() - (24 * 60 * 60 * 1000);
    sessions = sessions.filter(s => new Date(s.time).getTime() > oneDayAgo);
    localStorage.setItem('activeSessions', JSON.stringify(sessions));
    
    const container = document.getElementById('active-sessions-container');
    const list = document.getElementById('active-sessions-list');
    
    if (sessions.length > 0) {
        container.style.display = 'block';
        list.innerHTML = '';
        sessions.forEach(s => {
            const li = document.createElement('li');
            li.textContent = `Пациент ${s.id.substring(4,10)} (начато: ${new Date(s.time).toLocaleString()})`;
            li.onclick = () => continueSession(s.id);
            list.appendChild(li);
        });
    } else {
       container.style.display = 'none';
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
