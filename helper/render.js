function gridToCanvas(x, y, sz = cellSize, pad = padding, canvasHeight = canvas.height) {return {cx: pad + x * sz + sz / 2, cy: canvasHeight - pad - y * sz - sz / 2}}

function canvasToGrid(cx, cy) {
    const rect = canvas.getBoundingClientRect();

    const scaleX    = canvas.width      / rect.width;
    const scaleY    = canvas.height     / rect.height;
    const canvasX   = (cx - rect.left)  * scaleX;
    const canvasY   = (cy - rect.top)   * scaleY;

    let gx = Math.floor((canvasX        - padding)              / cellSize);
    let gy = Math.floor((canvas.height  - padding - canvasY)    / cellSize);

    if (gx >= 0 && gx < 20 && gy >= 0 && gy < 20) return {x: gx, y: gy};
    return null;
}

function drawRoundedTile(ctx, rx, ry, size, hasTop, hasBottom, hasLeft, hasRight, fillStyle, strokeStyle, gridX, gridY) {
    ctx.fillStyle = fillStyle;
    ctx.beginPath();

    let r = Math.max(0, size * 0.5);

    let isAtLeftEdge   = (gridX === 0);
    let isAtRightEdge  = (gridX === GRID_SIZE - 1);
    let isAtBottomEdge = (gridY === 0);
    let isAtTopEdge    = (gridY === GRID_SIZE - 1);

    let tlOuter = !hasTop       && !hasLeft     && !isAtTopEdge     && !isAtLeftEdge;
    let trOuter = !hasTop       && !hasRight    && !isAtTopEdge     && !isAtRightEdge;
    let brOuter = !hasBottom    && !hasRight    && !isAtBottomEdge  && !isAtRightEdge;
    let blOuter = !hasBottom    && !hasLeft     && !isAtBottomEdge  && !isAtLeftEdge;

    let x = rx;
    let y = ry;

    if (tlOuter)    ctx.moveTo(x + r, y);
    else            ctx.moveTo(x, y);

    if (trOuter) {
            ctx.lineTo  (x + size - r, y);
            ctx.arcTo   (x + size, y, x + size, y + r, r);
    } else  ctx.lineTo  (x + size, y);

    if (brOuter) {
            ctx.lineTo  (x + size, y + size - r);
            ctx.arcTo   (x + size, y + size, x + size - r, y + size, r);
    } else  ctx.lineTo  (x + size, y + size);

    if (blOuter) {
            ctx.lineTo  (x + r, y + size);
            ctx.arcTo   (x, y + size, x, y + size - r, r);
    } else  ctx.lineTo  (x, y + size);

    if (tlOuter) {
            ctx.lineTo  (x, y + r);
            ctx.arcTo   (x, y, x + r, y, r);
    } else  ctx.lineTo  (x, y);

    ctx.closePath   ();
    ctx.fill        ();

    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth   = 1;

    ctx.stroke();
}

function drawEmptyTileCorners(ctx, rx, ry, size, x, y, isDark) {
    let r = size * 0.5;

    let strokeStyle     = isDark ? '#646464' : '#c8c8c8';
    let terrainTypes    = [{set: mapData.mountainTiles, fillStyle: isDark ? '#96fa96' : '#329632'}, {set: mapData.riverTiles, fillStyle: isDark ? '#9696fa' : '#323296'}];

    terrainTypes.forEach(({set, fillStyle}) => {
        if (set.has(`${x},${y + 1}`) && set.has(`${x - 1},${y}`) && set.has(`${x - 1},${y+1}`)) {
            ctx.fillStyle = fillStyle;

            ctx.beginPath   ();
            ctx.moveTo      (rx, ry);
            ctx.lineTo      (rx + r, ry);
            ctx.arc         (rx + r, ry + r, r, 1.5 * Math.PI, Math.PI, true);
            ctx.closePath   ();
            ctx.fill        ();

            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth   = 1;

            ctx.beginPath   ();
            ctx.arc         (rx + r, ry + r, r, 1.5 * Math.PI, Math.PI, true);
            ctx.stroke      ();
        }

        if (set.has(`${x},${y + 1}`) && set.has(`${x + 1},${y}`) && set.has(`${x + 1},${y + 1}`)) {
            ctx.fillStyle = fillStyle;

            ctx.beginPath   ();
            ctx.moveTo      (rx + size, ry);
            ctx.lineTo      (rx + size - r, ry);
            ctx.arc         (rx + size - r, ry + r, r, 1.5 * Math.PI, 0, false);
            ctx.closePath   ();
            ctx.fill        ();

            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth   = 1;

            ctx.beginPath   ();
            ctx.arc         (rx + size - r, ry + r, r, 1.5 * Math.PI, 0, false);
            ctx.stroke      ();
        }

        if (set.has(`${x},${y - 1}`) && set.has(`${x - 1},${y}`) && set.has(`${x - 1},${y - 1}`)) {
            ctx.fillStyle = fillStyle;

            ctx.beginPath   ();
            ctx.moveTo      (rx, ry + size);
            ctx.lineTo      (rx + r, ry + size);
            ctx.arc         (rx + r, ry + size - r, r, 0.5 * Math.PI, Math.PI, false);
            ctx.closePath   ();
            ctx.fill        ();

            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth   = 1;

            ctx.beginPath   ();
            ctx.arc         (rx + r, ry + size - r, r, 0.5 * Math.PI, Math.PI, false);
            ctx.stroke      ();
        }

        if (set.has(`${x},${y - 1}`) && set.has(`${x + 1},${y}`) && set.has(`${x + 1},${y - 1}`)) {
            ctx.fillStyle = fillStyle;

            ctx.beginPath   ();
            ctx.moveTo      (rx + size, ry + size);
            ctx.lineTo      (rx + size - r, ry + size);
            ctx.arc         (rx + size - r, ry + size - r, r, 0.5 * Math.PI, 0, true);
            ctx.closePath   ();
            ctx.fill        ();

            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth   = 1;

            ctx.beginPath   ();
            ctx.arc         (rx + size - r, ry + size - r, r, 0.5 * Math.PI, 0, true);
            ctx.stroke      ();
        }
    });
}

function renderBoardCore(ctx, tCellSize, pad, canvasHeight, isDark, options = {}) {
    ctx.fillStyle = isDark ? '#000000' : '#ffffff';
    ctx.fillRect(0, 0, ctx.canvas.width, canvasHeight);

    if (options.previewSet) {options.previewSet.forEach(key => {
        let [x, y] = key.split(',').map(Number);

        let rx =                pad + x         * tCellSize;
        let ry = canvasHeight - pad - (y + 1)   * tCellSize;

        ctx.fillStyle = isDark ? 'rgba(250, 150, 150, 0.5)' : 'rgba(250, 50, 50, 0.25)';
        ctx.fillRect(rx, ry, tCellSize, tCellSize);
    })}

    for (let x = 0; x < 20; x++) {
        for (let y = 0; y < 20; y++) {
            let rx  =                   pad + x         * tCellSize;
            let ry  = canvasHeight -    pad - (y + 1)   * tCellSize;

            let key = `${x},${y}`;

            let isRiver     = mapData.riverTiles    .has(key);
            let isMountain  = mapData.mountainTiles .has(key);

            if (isRiver || isMountain) {
                let set = isRiver ? mapData.riverTiles : mapData.mountainTiles;

                let hasTop      = set.has(`${x},${y + 1}`);
                let hasBottom   = set.has(`${x},${y - 1}`);
                let hasLeft     = set.has(`${x - 1},${y}`);
                let hasRight    = set.has(`${x + 1},${y}`);

                let fillStyle   = isRiver   ? (isDark ? '#9696fa' : '#323296') : (isDark ? '#96fa96' : '#329632');
                let strokeStyle = isDark    ? '#646464' : '#c8c8c8';

                drawRoundedTile(ctx, rx, ry, tCellSize, hasTop, hasBottom, hasLeft, hasRight, fillStyle, strokeStyle, x, y);
            } else {
                if (!options.previewSet || !options.previewSet.has(key)) {
                    ctx.fillStyle = isDark ? '#000000' : '#ffffff';
                    ctx.fillRect(rx, ry, tCellSize, tCellSize);
                }

                ctx.strokeStyle = isDark ? '#646464' : '#c8c8c8';
                ctx.lineWidth   = 1;

                ctx.strokeRect          (rx, ry, tCellSize, tCellSize);
                drawEmptyTileCorners    (ctx, rx, ry, tCellSize, x, y, isDark);
            }
        }
    }

    let edgeMap = {};

    playerState.cables.forEach(c => {
        let edgeKey = c.x1 < c.x2 || (c.x1 === c.x2 && c.y1 < c.y2) ? `${c.x1},${c.y1}-${c.x2},${c.y2}` : `${c.x2},${c.y2}-${c.x1},${c.y1}`;
        if (!edgeMap[edgeKey]) edgeMap[edgeKey] = [];
        edgeMap[edgeKey].push(c);
    });

    let cableSpacing    = options.cableSpacing  || 4;
    let smallWidth      = options.smallWidth    || 2;
    let largeWidth      = options.largeWidth    || 4;

    Object.values(edgeMap).forEach(group => {
        let count = group.length;

        group.forEach((cable, index) => {
            let p1 = gridToCanvas(cable.x1, cable.y1, tCellSize, pad, canvasHeight);
            let p2 = gridToCanvas(cable.x2, cable.y2, tCellSize, pad, canvasHeight);

            let isHorizontal    = (cable.y1 === cable.y2);
            let totalOffset     = (index - (count - 1) / 2) * cableSpacing;

            let offsetX = isHorizontal ? 0 : totalOffset;
            let offsetY = isHorizontal ? totalOffset : 0; 

            ctx.beginPath   ();
            ctx.moveTo      (p1.cx + offsetX, p1.cy + offsetY);
            ctx.lineTo      (p2.cx + offsetX, p2.cy + offsetY);

            if (cable.type === 'small') {
                ctx.strokeStyle = isDark ? '#ffffff' : '#000000';
                ctx.lineWidth   = smallWidth;

                ctx.setLineDash([smallWidth * 2, smallWidth * 2]);
            } else if (cable.type === 'large') {
                ctx.strokeStyle = isDark ? '#ffffff' : '#000000';
                ctx.lineWidth   = largeWidth;

                ctx.setLineDash([]);
            } else if (cable.type === 'towerCable') {
                ctx.strokeStyle = isDark ? '#fa9696' : '#fa3232';
                ctx.lineWidth   = largeWidth;

                ctx.setLineDash([]);
            }

            ctx.lineJoin    = 'round';
            ctx.lineCap     = 'round';

            ctx.stroke      ();
            ctx.setLineDash ([]);
        });
    });

    let stPos       = gridToCanvas(mapData.startingTower.x, mapData.startingTower.y, tCellSize, pad, canvasHeight);
    ctx.fillStyle   = isDark ? '#fa9696' : '#fa3232';

    ctx.beginPath   ();
    ctx.arc         (stPos.cx, stPos.cy, tCellSize * 0.38, 0, Math.PI * 2);
    ctx.fill        ();

    playerState.extraTowers.forEach(key => {
        let [tx, ty]    = key.split(',').map(Number);
        let pos         = gridToCanvas(tx, ty, tCellSize, pad, canvasHeight);

        ctx.beginPath   ();
        ctx.arc         (pos.cx, pos.cy, tCellSize * 0.35, 0, Math.PI * 2);

        ctx.strokeStyle = isDark ? '#fa9696' : '#fa3232';
        ctx.lineWidth   = options.extraTowerLineWidth || 5;

        ctx.stroke();
    });

    let flowMap = computeNetworkFlow();

    mapData.capacityTiles.forEach(cap => {
        let pos         = gridToCanvas(cap.x, cap.y, tCellSize, pad, canvasHeight);
        let delivered   = flowMap.get(`${cap.x},${cap.y}`) || 0;

        let borderColor;

        if      (delivered >= cap.capacity) borderColor = isDark ? '#96fa96' : '#329632';
        else if (delivered > 0)             borderColor = isDark ? '#fafa96' : '#fa9632';
        else                                borderColor = isDark ? '#fa9696' : '#fa3232';

        ctx.fillStyle = isDark ? '#000000' : '#ffffff';

        ctx.beginPath   ();
        ctx.arc         (pos.cx, pos.cy, tCellSize * 0.3, 0, Math.PI * 2);
        ctx.fill        ();

        if (options.strokeCapacity !== false) {
            ctx.strokeStyle = borderColor;
            ctx.lineWidth   = options.capacityLineWidth || 3;

            ctx.stroke();
        }

        ctx.fillStyle       = borderColor;
        ctx.font            = options.capacityFont || 'bold 12px system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
        ctx.textAlign       = 'center';
        ctx.textBaseline    = 'middle';

        ctx.fillText(String(cap.capacity), pos.cx, pos.cy);
    });

    if (options.activeTool === 'tower' && options.hoverCell && isValidTowerTile(options.hoverCell.x, options.hoverCell.y)) {
        let hPos = gridToCanvas(options.hoverCell.x, options.hoverCell.y, tCellSize, pad, canvasHeight);

        ctx.beginPath   ();
        ctx.arc         (hPos.cx, hPos.cy, tCellSize * 0.35, 0, Math.PI * 2);

        ctx.strokeStyle = isDark ? 'rgba(250, 150, 150, 0.5)' : 'rgba(250, 50, 50, 0.5)';
        ctx.lineWidth   = 4;

        ctx.stroke();
    }

    if (options.isDragging && options.dragStartCell && options.hoverCell && options.activeTool !== 'eraser' && options.activeTool !== 'tower') {
        let p1 = gridToCanvas(options.dragStartCell .x, options.dragStartCell   .y, tCellSize, pad, canvasHeight);
        let p2 = gridToCanvas(options.hoverCell     .x, options.hoverCell       .y, tCellSize, pad, canvasHeight);

        ctx.beginPath   ();
        ctx.moveTo      (p1.cx, p1.cy);
        ctx.lineTo      (p2.cx, p2.cy);

        ctx.strokeStyle = options.activeTool === 'towerCable' ? (isDark ? '#fa9696' : '#fa3232') : '#3232fa';
        ctx.lineWidth   = 3;

        ctx.setLineDash ([5, 5]);
        ctx.stroke      ();
        ctx.setLineDash ([]);
    }
}

function render() {
    const isDark    = document.documentElement.classList.contains('dark');
    let previewSet  = new Set();

    if (activeTool === 'tower' && currentHoverCell && isValidTowerTile(currentHoverCell.x, currentHoverCell.y)) {
        let reachable = getTowerReachableTiles(currentHoverCell.x, currentHoverCell.y);

        reachable.forEach(key => {
            previewSet.add(key);
            let [x, y] = key.split(',').map(Number);

            ORTHOGONAL_DIRS.forEach(([dx, dy]) => {
                let nk = `${x + dx},${y + dy}`;
                if (mapData.mountainTiles.has(nk)) previewSet.add(nk);
            });
        });
    }

    renderBoardCore(ctx, cellSize, padding, canvas.height, isDark, {
        previewSet,
        hoverCell       : currentHoverCell,
        isDragging,
        dragStartCell,
        activeTool,
        cableSpacing    : 4,
        smallWidth      : 2,
        largeWidth      : 4,
        strokeCapacity  : canvas.width >= 500
    });
}

function resizeCanvas() {
    const container = canvas.parentElement;
    if (!container) return;

    let availableWidth  = container.clientWidth - 24;
    let size            = Math.max(0, Math.min(availableWidth, 640));

    canvas.width    = size;
    canvas.height   = size;

    cellSize = Math.max(0, (size - padding * 2) / GRID_SIZE);
    render();
}

function populateHTMLGridLabels() {
    const topDiv    = document.getElementById('topLabels');
    const bottomDiv = document.getElementById('bottomLabels');
    const leftDiv   = document.getElementById('leftLabels');
    const rightDiv  = document.getElementById('rightLabels');

    if (topDiv && !topDiv.hasChildNodes()) {
        COLUMNS.forEach(col => {
            topDiv      .appendChild(createLabelSpan(col));
            bottomDiv   .appendChild(createLabelSpan(col));
        });

        for (let i = 1; i <= 20; i++) {
            leftDiv     .appendChild(createLabelSpan(GRID_SIZE + 1 - i));
            rightDiv    .appendChild(createLabelSpan(GRID_SIZE + 1 - i));
        }
    }
}

function createLabelSpan(text) {
    const span = document.createElement('span');

    span.innerText          = text;
    span.style.flex         = "1";
    span.style.textAlign    = "center";

    return span;
}

function drawBoardToCanvas(targetCanvas) {
    targetCanvas.width  = 1100;
    targetCanvas.height = 1100;

    const tCtx          = targetCanvas.getContext('2d');
    const isDark        = document.documentElement.classList.contains('dark');
    const pad           = 50;
    const availableSize = targetCanvas.width - (pad * 2);
    const tCellSize     = Math.max(0, availableSize / GRID_SIZE);

    renderBoardCore(tCtx, tCellSize, pad, targetCanvas.height, isDark, {
        cableSpacing        : 5,
        smallWidth          : 3,
        largeWidth          : 6,
        extraTowerLineWidth : 6,
        capacityLineWidth   : 4,
        capacityFont        : 'bold 18px sans-serif'}
    )
}

function drawMagnifiedView(mCtx, cx, cy) {
    const isDark = document.documentElement.classList.contains('dark');
    mCtx.save();

    let zoomScale   = 2.5;
    let p           = gridToCanvas(cx, cy, cellSize, padding, canvas.height);

    mCtx.translate  (64 - p.cx * zoomScale, 64 - p.cy * zoomScale);
    mCtx.scale      (zoomScale, zoomScale);

    renderBoardCore(mCtx, cellSize, padding, canvas.height, isDark, {
        cableSpacing    : 4,
        smallWidth      : 2,
        largeWidth      : 4,
        strokeCapacity  : canvas.width >= 500
    });

    mCtx.restore();
}