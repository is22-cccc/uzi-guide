// ФАЙЛ: /js/calculator_logic.js
// Этот файл содержит ТОЛЬКО логику расчетов для всех калькуляторов.

function calculateIJV(isTrainingMode = false) {
    const hmax = document.getElementById('hmax').value;
    const hmin = document.getElementById('hmin').value;
    const tech = document.getElementById('ijv-tech').value;
    const ventilation = document.getElementById('ijv-ventilation').value;
    if (!hmax || !hmin || !tech || !ventilation) {
        alert('Пожалуйста, заполните все поля, включая режим дыхания.');
        return;
    }
    const variability = ((parseFloat(hmax) - parseFloat(hmin)) / ((parseFloat(hmax) + parseFloat(hmin)) / 2)) * 100;
    document.getElementById('ijv-result-text').innerText = `Вариабельность ВЯВ: ${variability.toFixed(1)}%`;
    let cutoff, responsive;
    if (ventilation === 'spontaneous') {
        cutoff = 18;
        responsive = variability > cutoff;
    } else {
        cutoff = 18;
        responsive = variability > cutoff;
    }
    const interpretationBox = document.getElementById('ijv-interpretation');
    interpretationBox.className = 'interpretation-box';
    interpretationBox.innerText = responsive ? `> ${cutoff}%. Вероятен ответ на инфузию.` : `≤ ${cutoff}%. Ответ на инфузию маловероятен.`;
    interpretationBox.classList.add(responsive ? 'responsive' : 'non-responsive');
    
    // Сохраняем, только если это не режим обучения
    if (!isTrainingMode) {
        saveMeasurement('ВЯВ', { hmax, hmin, tech, ventilation, value: variability.toFixed(1), isResponsive: responsive });
    }
}

function calculateCCA_Vpk(isTrainingMode = false) {
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
    
    if (!isTrainingMode) {
        saveMeasurement('Vpk_ОСА', { vmax, vmin, tech, value: variability.toFixed(1), isResponsive: responsive });
    }
}

function calculateCCA_FTc(isTrainingMode = false) {
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
    
    if (!isTrainingMode) {
        saveMeasurement('FTc_ОСА', { flowTime, heartRate, age, tech, value: ftc.toFixed(0), isResponsive: responsive });
    }
}

function calculateBrachialVpk(isTrainingMode = false) {
    const vmax = document.getElementById('brachial-vmax').value;
    const vmin = document.getElementById('brachial-vmin').value;
    const tech = document.getElementById('brachial-tech').value;
    if (!vmax || !vmin || !tech) { alert('Заполните все поля для плечевой артерии.'); return; }
    const variability = ((parseFloat(vmax) - parseFloat(vmin)) / ((parseFloat(vmax) + parseFloat(vmin)) / 2)) * 100;
    document.getElementById('brachial-vpk-result-text').innerText = `Вариабельность Vpk: ${variability.toFixed(1)}%`;
    const cutoff = 12;
    const responsive = variability > cutoff;
    const interpretationBox = document.getElementById('brachial-vpk-interpretation');
    interpretationBox.className = 'interpretation-box';
    interpretationBox.innerText = responsive ? `> ${cutoff}%. Вероятен ответ на инфузию.` : `≤ ${cutoff}%. Ответ на инфузию маловероятен.`;
    interpretationBox.classList.add(responsive ? 'responsive' : 'non-responsive');
    
    if (!isTrainingMode) {
        saveMeasurement('Vpk_Плечевая', { vmax, vmin, tech, value: variability.toFixed(1), isResponsive: responsive });
    }
}

function calculateIVCSubcostal(isTrainingMode = false) {
    const dmax = document.getElementById('ivc-sub-dmax').value;
    const dmin = document.getElementById('ivc-sub-dmin').value;
    const ventilation = document.getElementById('ivc-sub-ventilation').value;
    const tech = document.getElementById('ivc-sub-tech').value;
    if (!dmax || !dmin || !ventilation || !tech) { alert('Пожалуйста, заполните все поля для НПВ (субкостально), включая режим дыхания.'); return; }
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
    document.getElementById('ivc-sub-result-text').innerText = resultText;
    const interpretationBox = document.getElementById('ivc-sub-interpretation');
    interpretationBox.className = 'interpretation-box';
    interpretationBox.innerText = interpretationText;
    interpretationBox.classList.add(responsive ? 'responsive' : 'non-responsive');
    
    if (!isTrainingMode) {
        saveMeasurement('НПВ_субкостально', { dmax, dmin, ventilation, tech, value: index.toFixed(1), isResponsive: responsive });
    }
}

function calculateIVCTranshepatic(isTrainingMode = false) {
    const dmax = document.getElementById('ivc-trans-dmax').value;
    const dmin = document.getElementById('ivc-trans-dmin').value;
    const ventilation = document.getElementById('ivc-trans-ventilation').value;
    const tech = document.getElementById('ivc-trans-tech').value;
    if (!dmax || !dmin || !ventilation || !tech) { alert('Пожалуйста, заполните все поля для НПВ (транспеченочно), включая режим дыхания.'); return; }
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

    if (!isTrainingMode) {
        saveMeasurement('НПВ_транспеченочно', { dmax, dmin, ventilation, tech, value: index.toFixed(1), isResponsive: responsive });
    }
}

function calculatePAVTI(isTrainingMode = false) {
    const vtiBefore = document.getElementById('pa-vti-before').value;
    const vtiAfter = document.getElementById('pa-vti-after').value;
    const tech = document.getElementById('pa-vti-tech').value;
    if (!vtiBefore || !vtiAfter || !tech) { alert('Заполните все поля для VTI на легочной артерии.'); return; }
    const variability = ((parseFloat(vtiAfter) - parseFloat(vtiBefore)) / parseFloat(vtiBefore)) * 100;
    document.getElementById('pa-vti-result-text').innerText = `Изменение VTI после PLR: ${variability.toFixed(1)}%`;
    const cutoff = 14;
    const responsive = variability > cutoff;
    const interpretationBox = document.getElementById('pa-vti-interpretation');
    interpretationBox.className = 'interpretation-box';
    interpretationBox.innerText = responsive ? `> ${cutoff}%. Вероятен ответ на инфузию.` : `≤ ${cutoff}%. Ответ на инфузию маловероятен.`;
    interpretationBox.classList.add(responsive ? 'responsive' : 'non-responsive');

    if (!isTrainingMode) {
        saveMeasurement('VTI_ЛА_PLR', { vtiBefore, vtiAfter, tech, value: variability.toFixed(1), isResponsive: responsive });
    }
}

function calculateSVC(isTrainingMode = false) {
    const dmax = document.getElementById('svc-dmax').value;
    const dmin = document.getElementById('svc-dmin').value;
    const tech = document.getElementById('svc-tech').value;
    if (!dmax || !dmin || !tech) { alert('Заполните все поля для верхней полой вены.'); return; }
    const variability = ((parseFloat(dmax) - parseFloat(dmin)) / parseFloat(dmax)) * 100;
    document.getElementById('svc-result-text').innerText = `Индекс коллабирования ВПВ: ${variability.toFixed(1)}%`;
    const cutoff = 21;
    const responsive = variability > cutoff;
    const interpretationBox = document.getElementById('svc-interpretation');
    interpretationBox.className = 'interpretation-box';
    interpretationBox.innerText = responsive ? `> ${cutoff}%. Вероятен ответ на инфузию.` : `≤ ${cutoff}%. Ответ на инфузию маловероятен.`;
    interpretationBox.classList.add(responsive ? 'responsive' : 'non-responsive');
    
    if (!isTrainingMode) {
        saveMeasurement('ВПВ_TEE', { dmax, dmin, tech, value: variability.toFixed(1), isResponsive: responsive });
    }
}

function calculateAortaVTI(isTrainingMode = false) {
    const vtiBefore = document.getElementById('aorta-vti-before').value;
    const vtiAfter = document.getElementById('aorta-vti-after').value;
    const tech = document.getElementById('aorta-vti-tech').value;
    if (!vtiBefore || !vtiAfter || !tech) { alert('Заполните все поля для VTI на аорте.'); return; }
    const variability = ((parseFloat(vtiAfter) - parseFloat(vtiBefore)) / parseFloat(vtiBefore)) * 100;
    document.getElementById('aorta-vti-result-text').innerText = `Изменение VTI после PLR: ${variability.toFixed(1)}%`;
    const cutoff = 15;
    const responsive = variability > cutoff;
    const interpretationBox = document.getElementById('aorta-vti-interpretation');
    interpretationBox.className = 'interpretation-box';
    interpretationBox.innerText = responsive ? `> ${cutoff}%. Вероятен ответ на инфузию.` : `≤ ${cutoff}%. Ответ на инфузию маловероятен.`;
    interpretationBox.classList.add(responsive ? 'responsive' : 'non-responsive');

    if (!isTrainingMode) {
        saveMeasurement('VTI_Аорта_PLR', { vtiBefore, vtiAfter, tech, value: variability.toFixed(1), isResponsive: responsive });
    }
}
