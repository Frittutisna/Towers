class RandomSeed {
    constructor(seedStr = DEFAULT_SEED) {
        let h = 2166136261;
        for (let i = 0; i < seedStr.length; i++) h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
        this.seed = (h >>> 0) % 2147483647;
        if (this.seed <= 0) this.seed += 2147483646;
    }

    next() {
        this.seed = (this.seed * 16807) % 2147483646;
        return (this.seed - 1) / 2147483646;
    }

    nextInt(min, max) {return Math.floor(this.next() * (max - min + 1)) + min}
}

function generateRandom6CharSeed() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let res     = '';

    do {
        res = '';
        for (let i = 0; i < 6; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
    } while (isFutureDateSeed(res));

    return res;
}

function getUTCYYMMDD() {
    const now = new Date();

    const yy = String(now.getUTCFullYear()).slice(-2);
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');

    return yy + mm + dd;
}

function isFutureDateSeed(str) {
    if (!/^\d{6}$/.test(str)) return false;

    const yy = parseInt(str.slice(0, 2), 10);
    const mm = parseInt(str.slice(2, 4), 10);
    const dd = parseInt(str.slice(4, 6), 10);

    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return false;

    const year      = 2000 + yy;
    const dateObj   = new Date(Date.UTC(year, mm - 1, dd));

    if (dateObj.getUTCFullYear() !== year || dateObj.getUTCMonth() !== mm - 1 || dateObj.getUTCDate() !== dd) return false;
    return str > getUTCYYMMDD();
}

function formatTimeDisplay(sec) {
    if (sec < 60) return sec.toFixed(3);

    let mins    = Math.floor(sec / 60);
    let remSec  = (sec % 60);
    let secStr  = remSec < 10 ? '0' + remSec.toFixed(3) : remSec.toFixed(3);

    return `${mins}:${secStr}`;
}

function formatNumber(num) {
    if (typeof num !== 'number') return num;
    let locale = 'en-US';

    if (currentLang === 'ID') locale = 'id-ID';
    if (currentLang === 'JP') locale = 'ja-JP';

    return num.toLocaleString(locale);
}

const isOctilinearlyAdjacent    = (x1, y1, x2, y2)  => Math.abs(x1 - x2) <= 1 && Math.abs(y1 - y2) <= 1;
const isAdjacentToStartingTower = (x, y)            => isOctilinearlyAdjacent(x, y, mapData.startingTower.x, mapData.startingTower.y);
const isEdgeTile                = (x, y)            => x === 0 || x === GRID_SIZE - 1 || y === 0 || y === GRID_SIZE - 1;