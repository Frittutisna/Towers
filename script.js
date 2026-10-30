const canvas        = document.getElementById('gameCanvas');
const ctx           = canvas.getContext('2d');
const initialSeed   = getUTCYYMMDD();
const langToggle    = document.getElementById('langToggle');
const themeIcon     = document.getElementById('themeIcon');
const themeToggle   = document.getElementById('themeToggle');

let actionHistory       = [];
let activeTool          = 'large';
let cellSize            = 30;
let currentHoverCell    = null;
let currentLang         = localStorage.getItem('lang') || 'EN';
let currentSeed         = initialSeed;
let dragStartCell       = null;
let isDragging          = false;
let nextCableId         = 1;
let padding             = 0;
let rng                 = new RandomSeed(initialSeed);
let timerFrozen         = false;
let timerInterval       = null;
let timerRunning        = false;
let timerSeconds        = 0;

let mapData = {
    startingTower   : {x: 0, y: 0},
    riverTiles      : new Set(),
    mountainTiles   : new Set(),
    capacityTiles   : [], 
    capacityMap     : new Map() 
};

let playerState = {
    extraTowers : new Set(), 
    cables      : [], 
};

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    if (langToggle) langToggle.innerText = lang;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (TRANSLATIONS[currentLang][key]) el.innerHTML = TRANSLATIONS[currentLang][key];
    });

    updateMetrics();
}

if (langToggle) langToggle.addEventListener('click', () => {
    if      (currentLang === 'EN')  setLanguage('JP');
    else if (currentLang === 'JP')  setLanguage('ID');
    else                            setLanguage('EN');
});

function saveState() {
    actionHistory.push({
        extraTowers : new Set(playerState.extraTowers),
        cables      : playerState.cables.map(c => ({...c})),
        nextCableId : nextCableId
    });

    if (actionHistory.length > 50) actionHistory.shift();
}

function undo() {
    if (actionHistory.length === 0) return;
    let prevState = actionHistory.pop();

    playerState.extraTowers = prevState.extraTowers;
    playerState.cables      = prevState.cables;
    nextCableId             = prevState.nextCableId;

    startTimer      ();
    render          ();
    updateMetrics   ();
}

function updateThemeIcon() {
    if (document.documentElement.classList.contains('dark'))    themeIcon.className = 'fa-solid fa-moon text-sm text-white';
    else                                                        themeIcon.className = 'fa-solid fa-sun text-sm text-slate-900';
}

themeToggle.addEventListener('click', () => {
    if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList  .remove     ('dark');
        localStorage                        .setItem    ('theme', 'light');
    } else {
        document.documentElement.classList  .add        ('dark');
        localStorage                        .setItem    ('theme', 'dark');
    }

    updateThemeIcon ();
    render          ();
});

if (localStorage.getItem('theme') === 'light')  document.documentElement.classList.remove   ('dark');
else                                            document.documentElement.classList.add      ('dark');

updateThemeIcon();

function startTimer() {
    if (timerFrozen) return;

    if (!timerRunning) {
        timerRunning    = true;
        let startTime   = Date.now() - (timerSeconds * 1000);

        timerInterval = setInterval(() => {
            timerSeconds = (Date.now() - startTime) / 1000;
            updateTimerUI();
        }, 33);
    }
}

function resetTimer() {
    clearInterval(timerInterval);

    timerRunning = false;
    timerSeconds = 0;
    timerFrozen  = false;

    updateTimerUI();
}

function updateTimerUI() {document.getElementById('timerDisplay').innerText = formatTimeDisplay(timerSeconds)}

function addTower(x, y) {
    let key = `${x},${y}`;

    if (x === mapData.startingTower.x   && y === mapData.startingTower.y)   return;
    if (mapData.riverTiles  .has(key)   || mapData.mountainTiles.has(key))  return;
    if (mapData.capacityMap .has(key))                                      return;

    saveState();
    playerState.extraTowers.add(key);

    startTimer      ();
    render          ();
    updateMetrics   ();
}

function eraseAt(x, y) {
    let key = `${x},${y}`;

    playerState.extraTowers.delete(key);
    playerState.cables = playerState.cables.filter(c => !(c.x1 === x && c.y1 === y) && !(c.x2 === x && c.y2 === y));

    render          ();
    updateMetrics   ();
}

function tryAddCable(x1, y1, x2, y2, type) {
    let getLineCells = (xStart, yStart, xEnd, yEnd) => {
        let cells = [];

        let dx = Math.abs(xEnd - xStart);
        let dy = Math.abs(yEnd - yStart);

        let sx = (xStart < xEnd) ? 1 : -1;
        let sy = (yStart < yEnd) ? 1 : -1;

        let err = dx - dy;
        let x   = xStart, y = yStart;

        while (true) {
            cells.push({x, y});

            if (x === xEnd && y === yEnd) break;
            let e2 = 2 * err;

            if (e2 > -dy)   {err -= dy; x += sx}
            if (e2 < dx)    {err += dx; y += sy}
        }

        return cells;
    };

    let pathCells = getLineCells(x1, y1, x2, y2);
    for (let cell of pathCells) if (mapData.mountainTiles.has(`${cell.x},${cell.y}`)) return false;

    if (type === 'towerCable') {
        let dist = Math.abs(x1 - x2) + Math.abs(y1 - y2);
        if (dist !== 1) return false;

        let activeTowers = getActiveTowers();

        let r1 = activeTowers.has(`${x1},${y1}`) ? 0 : getTowerCableReachToActiveTower(x1, y1);
        let r2 = activeTowers.has(`${x2},${y2}`) ? 0 : getTowerCableReachToActiveTower(x2, y2);

        let minReach = Math.min(r1, r2);
        if (minReach >= CABLE_LIMIT) return false;
    } else {
        let dist = Math.abs(x1 - x2) + Math.abs(y1 - y2);

        if (dist !== 1)                                         return false;
        if (isTowerLocation(x1, y1) && isTowerLocation(x2, y2)) return false;

        let k1 = `${x1},${y1}`;

        if (mapData.capacityMap.has(k1) && !isTowerLocation(x1, y1)) {
            let reach1 = getCellNetworkReachToTower(x1, y1);
            if (reach1 !== Infinity) return false;
        }

        let activeTowers = getActiveTowers();

        let r1 = isTowerLocation(x1, y1) ? (activeTowers.has(`${x1},${y1}`) ? 0 : Infinity) : getCellNetworkReachToTower(x1, y1);
        let r2 = isTowerLocation(x2, y2) ? (activeTowers.has(`${x2},${y2}`) ? 0 : Infinity) : getCellNetworkReachToTower(x2, y2);

        let minReach = Math.min(r1, r2);
        if (minReach >= CABLE_LIMIT) return false;
    }

    playerState.cables.push({id: nextCableId++, x1, y1, x2, y2, type});

    startTimer      ();
    render          ();
    updateMetrics   ();

    return true;
}

function updateMetrics() {
    let totalCost = 0;
    let totalDays = 0;

    totalCost += playerState.extraTowers.size * 1000;
    totalDays += playerState.extraTowers.size * 60;

    playerState.cables.forEach(c => {
        if      (c.type === 'small')        {totalCost += 2;    totalDays += 1}
        else if (c.type === 'large')        {totalCost += 3;    totalDays += 2}
        else if (c.type === 'towerCable')   {totalCost += 40;   totalDays += 30}
    });

    let riverCrossings = 0;

    playerState.cables.forEach(c => {
        let dx = Math.abs(c.x2 - c.x1);
        let dy = Math.abs(c.y2 - c.y1);

        let sx = (c.x1 < c.x2) ? 1 : -1;
        let sy = (c.y1 < c.y2) ? 1 : -1;

        let err = dx - dy;
        let x   = c.x1, y = c.y1;

        while (true) {
            let e2 = 2 * err;

            if (e2 > -dy)   {err -= dy; x += sx}
            if (e2 < dx)    {err += dx; y += sy}

            let k = `${x},${y}`;

            if (mapData.riverTiles.has(k))  riverCrossings++;
            if (x === c.x2 && y === c.y2)   break;
        }
    });

    totalCost += riverCrossings * 40;
    totalDays += riverCrossings * 30;

    let servedCapacity  = 0;
    let totalCapacity   = mapData.capacityTiles.reduce((sum, tile) => sum + tile.capacity, 0);

    mapData.capacityTiles.forEach(capTile => {
        let delivered = calculateDeliveredCapacity(capTile);

        if      (delivered >= capTile.capacity) servedCapacity += capTile.capacity;
        else if (delivered > 0)                 servedCapacity += delivered;
    });

    let remainingCapacity   = Math.max(0, totalCapacity - servedCapacity);
    let finalScore          = remainingCapacity > 0 ? "N/A" : ((totalCost * totalDays) + Math.floor(timerSeconds));

    if (servedCapacity === totalCapacity && timerRunning && !timerFrozen) {
        timerFrozen = true;
        clearInterval(timerInterval);
        timerRunning = false;
    } else if (servedCapacity < totalCapacity && timerFrozen) {
        timerFrozen = false;
        startTimer();
    }

    document.getElementById('statCapacity')         .innerText = `${servedCapacity}/${totalCapacity}`;
    document.getElementById('statRiverCrossings')   .innerText = riverCrossings;
    document.getElementById('statCost')             .innerText = formatNumber(totalCost);
    document.getElementById('statTime')             .innerText = formatNumber(totalDays);
    document.getElementById('statScore')            .innerText = typeof finalScore === 'number' ? formatNumber(finalScore) : finalScore;

    const capacityCard = document.getElementById('statCapacityCard');

    if (servedCapacity === totalCapacity) {
        capacityCard.className = "p-3 rounded-xl border shadow-sm dark:shadow-none transition-colors duration-200 bg-[#329632] border-[#329632] text-white";
        capacityCard.querySelectorAll('div').forEach(el => el.classList.replace('text-slate-900', 'text-white'));
    } else {
        capacityCard.className = "p-3 rounded-xl border shadow-sm dark:shadow-none transition-colors duration-200 bg-[#fa3232] border-[#fa3232] text-white";
        capacityCard.querySelectorAll('div').forEach(el => el.classList.replace('text-slate-900', 'text-white'));
    }

    return {drawTime: timerSeconds, cost: totalCost, buildTime: totalDays, servedCapacity, remainingCapacity, score: finalScore};
}

let isTouchDevice = false;

window.addEventListener('touchstart', function onFirstTouch() {
    isTouchDevice = true;
    window.removeEventListener('touchstart', onFirstTouch, false);
}, {once: true});

function updateMagnifier(clientX, clientY) {
    const magnifier = document.getElementById('magnifier');
    const wrapper   = document.getElementById('boardWrapper');

    if (!isTouchDevice || !isDragging || activeTool === 'eraser' || activeTool === 'tower') {
        magnifier.classList.add('hidden');
        return;
    }

    const rect = wrapper.getBoundingClientRect();

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    magnifier.style.left = `${x}px`;
    magnifier.style.top  = `${y}px`;

    magnifier.classList.remove('hidden');

    const mCanvas = document.getElementById('magnifierCanvas');

    if (mCanvas && currentHoverCell) {
        const mCtx = mCanvas.getContext('2d');

        mCtx.clearRect      (0, 0, mCanvas.width, mCanvas.height);
        drawMagnifiedView   (mCtx, currentHoverCell.x, currentHoverCell.y);
    }
}

canvas.addEventListener('mousedown', (e) => {
    const gridPos = canvasToGrid(e.clientX, e.clientY);
    if (!gridPos) return;

    if      (activeTool === 'tower')    addTower(gridPos.x, gridPos.y);
    else if (activeTool === 'eraser')   {
        isDragging          = true;
        dragStartCell       = gridPos;
        currentHoverCell    = gridPos;

        eraseAt(gridPos.x, gridPos.y);
    } else {
        saveState();

        isDragging          = true;
        dragStartCell       = gridPos;
        currentHoverCell    = gridPos;
    }
});

canvas.addEventListener('mousemove', (e) => {
    const gridPos       = canvasToGrid(e.clientX, e.clientY);
    currentHoverCell    = gridPos;

    if (isDragging && gridPos) {
        if      (activeTool === 'eraser')   eraseAt(gridPos.x, gridPos.y);
        else if (activeTool === 'tower')    {}
        else if (dragStartCell)             {
            let dx = Math.abs(gridPos.x - dragStartCell.x);
            let dy = Math.abs(gridPos.y - dragStartCell.y);

            if (dx + dy === 1) {
                tryAddCable(dragStartCell.x, dragStartCell.y, gridPos.x, gridPos.y, activeTool);
                dragStartCell = gridPos;
            }
        }
    }

    render();
});

canvas.addEventListener('mouseleave', () => {
    isDragging          = false;
    dragStartCell       = null;
    currentHoverCell    = null;

    document.getElementById('magnifier').classList.add('hidden');
    render();
});

window.addEventListener('mouseup', () => {
    isDragging      = false;
    dragStartCell   = null;

    document.getElementById('magnifier').classList.add('hidden');
    render();
});

canvas.addEventListener('touchstart', (e) => {
    let touch = e.touches[0];

    let gridPos = canvasToGrid(touch.clientX, touch.clientY);
    if (!gridPos) return;

    if      (activeTool === 'tower')    addTower(gridPos.x, gridPos.y);
    else if (activeTool === 'eraser')   {
        isDragging          = true;
        dragStartCell       = gridPos;
        currentHoverCell    = gridPos;

        eraseAt(gridPos.x, gridPos.y);
    } else {
        saveState();

        isDragging          = true;
        dragStartCell       = gridPos;
        currentHoverCell    = gridPos;

        updateMagnifier(touch.clientX, touch.clientY);
    }

    render();
});

canvas.addEventListener('touchmove', (e) => {
    let touch   = e.touches[0];
    let gridPos = canvasToGrid(touch.clientX, touch.clientY);

    currentHoverCell = gridPos;

    if (isDragging && gridPos) {
        updateMagnifier(touch.clientX, touch.clientY);

        if      (activeTool === 'eraser')   eraseAt(gridPos.x, gridPos.y);
        else if (dragStartCell)             {
            let dx = Math.abs(gridPos.x - dragStartCell.x);
            let dy = Math.abs(gridPos.y - dragStartCell.y);

            if (dx + dy === 1) {
                tryAddCable(dragStartCell.x, dragStartCell.y, gridPos.x, gridPos.y, activeTool);
                dragStartCell = gridPos;
            }
        }
    }

    render();
});

canvas.addEventListener('touchend', () => {
    isDragging      = false;
    dragStartCell   = null;

    document.getElementById('magnifier').classList.add('hidden');
    render();
});

document.querySelectorAll('.tool-btn').forEach(btn => {btn.addEventListener('click', () => {
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('tool-btn-active'));
    btn.classList.add('tool-btn-active');
    activeTool = btn.dataset.tool;
})});

document.getElementById('btnLoadSeed').addEventListener('click', () => {
    let val = document.getElementById('seedInput').value || "051002";
    generateMap(val);
});

document.getElementById('btnRandomSeed').addEventListener('click', () => {
    let val = generateRandom6CharSeed();
    generateMap(val);
});

document.getElementById('seedInput').addEventListener('input', (e) => {e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')});

document.getElementById('btnReset').addEventListener('click', () => {
    actionHistory = [];

    playerState.extraTowers.clear();
    playerState.cables = [];

    resetTimer      ();
    render          ();
    updateMetrics   ();
});

document.getElementById('btnFinish').addEventListener('click', () => {
    let res = updateMetrics();

    clearInterval(timerInterval);
    timerRunning = false;

    document.getElementById('modalStatScore')           .innerText = typeof res.score === 'number' ? formatNumber(res.score) : res.score;
    document.getElementById('modalStatCost')            .innerText = formatNumber(res.cost);
    document.getElementById('modalStatTime')            .innerText = formatNumber(res.buildTime);
    document.getElementById('modalTimerDisplay')        .innerText = formatTimeDisplay(res.drawTime);
    document.getElementById('modalStatCapacity')        .innerText = `${res.servedCapacity}/35`;
    document.getElementById('modalStatRiverCrossings')  .innerText = document.getElementById('statRiverCrossings').innerText;

    const modalCanvas = document.getElementById('modalCanvas');
    drawBoardToCanvas(modalCanvas);

    const t         = TRANSLATIONS[currentLang];
    const shareText = `🗼 ${t.gameTitle}
${t.shareSeed}: ${currentSeed}
${t.shareScore}: ${document     .getElementById('modalStatScore')       .innerText}
${t.shareBuildCost}: ${document .getElementById('modalStatCost')        .innerText}
${t.shareBuildTime}: ${document .getElementById('modalStatTime')        .innerText}
${t.shareDrawTime}: ${document  .getElementById('modalTimerDisplay')    .innerText}
https://frittutisna.github.io/Towers/`;

    document.getElementById('shareResultText').value = shareText;
    document.getElementById('resultModal').classList.remove('hidden');
});

document.getElementById('btnDownloadMap').addEventListener('click', () => {
    const modalCanvas   = document.getElementById('modalCanvas');
    const link          = document.createElement('a');

    link.download   = `Towers-${currentSeed}.png`;
    link.href       = modalCanvas.toDataURL('image/png');

    link.click();
});

document.getElementById('btnCloseModal').addEventListener('click', () => {document.getElementById('resultModal').classList.add('hidden')});

document.getElementById('btnCopyShare').addEventListener('click', () => {
    const textarea = document.getElementById('shareResultText');
    textarea.select();

    navigator.clipboard.writeText(textarea.value).then(() => {
        const btn       = document.getElementById('btnCopyShare');
        const isDark    = document.documentElement.classList.contains('dark');
        const color     = isDark ? 'text-white' : 'text-slate-700';

        btn.innerHTML = `<i class="fa-solid fa-check text-sm ${color}"></i>`;
        setTimeout(() => {btn.innerHTML = '<i class="fa-regular fa-copy text-sm"></i>'}, 2000);
    });
});

document.getElementById('btnNewSeedModal').addEventListener('click', () => {
    document.getElementById('resultModal').classList.add('hidden');
    let val = generateRandom6CharSeed();
    generateMap(val);
});

document.getElementById('btnUndo').addEventListener('click', undo);

function initGame() {
    setLanguage             (currentLang);
    populateHTMLGridLabels  ();
    resizeCanvas            ();
    generateMap             (initialSeed);
}

window.addEventListener('resize', resizeCanvas);

if (document.readyState === 'loading') {
    document    .addEventListener('DOMContentLoaded',   initGame);
    window      .addEventListener('load',               resizeCanvas);
} else initGame();