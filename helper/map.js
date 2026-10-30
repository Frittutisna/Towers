function generateRiver() {
    let riverSuccess    = false;
    let attempts        = 0;

    while (!riverSuccess && attempts < ATTEMPT_LIMIT) {
        attempts++;
        mapData.riverTiles.clear();
        let mainStartEdge = rng.nextInt(0, 1) === 0 ? 'top' : 'left';

        let startX = mainStartEdge === 'top' ? rng.nextInt(3, 16) : 0;
        let startY = mainStartEdge === 'top' ? 0 : rng.nextInt(3, 16); 
        let currX   = startX;
        let currY   = startY;

        let path        = [];
        let validMain   = true;

        while (!isEdgeTile(currX, currY) || path.length === 0) {
            if (isAdjacentToStartingTower(currX, currY)) {
                validMain = false;
                break;
            }

            mapData.riverTiles  .add    (`${currX},${currY}`);
            path                .push   ({x: currX, y: currY});

            let moves = [];

            if (mainStartEdge === 'top') {
                moves.push({x: currX, y: currY + 1});

                if (currX > 1)  moves.push({x: currX - 1, y: currY});
                if (currX < 18) moves.push({x: currX + 1, y: currY});
            } else {
                moves.push({x: currX + 1, y: currY});

                if (currY > 1)  moves.push({x: currX, y: currY - 1});
                if (currY < 18) moves.push({x: currX, y: currY + 1});
            }

            let nextStep = moves[rng.nextInt(0, moves.length - 1)];

            currX = nextStep.x;
            currY = nextStep.y;
        }

        if (!validMain || isAdjacentToStartingTower(currX, currY)) continue;

        mapData.riverTiles  .add    (`${currX},${currY}`);
        path                .push   ({x: currX, y: currY});

        if (path.length > 8) {
            let numBranches = rng.nextInt(2, Math.min(3, Math.floor(path.length / 4)));
            let usedIndices = new Set();

            for (let b = 0; b < numBranches; b++) {
                let branchIndex;
                let attemptsCount = 0;

                do {
                    branchIndex = rng.nextInt(3, path.length - 4);
                    attemptsCount++;
                } while (usedIndices.has(branchIndex) && attemptsCount < 20);

                if (usedIndices.has(branchIndex)) continue;
                usedIndices.add(branchIndex);

                let bCurr = {...path[branchIndex]};
                let bDir  = rng.next() < 0.5 ? -1 : 1;

                while (!isEdgeTile(bCurr.x, bCurr.y)) {
                    if (mainStartEdge === 'top')    bCurr.x += bDir;
                    else                            bCurr.y += bDir;

                    if (bCurr.x < 0 || bCurr.x >= 20 || bCurr.y < 0 || bCurr.y >= 20) break;

                    if (!isAdjacentToStartingTower(bCurr.x, bCurr.y))   mapData.riverTiles.add(`${bCurr.x},${bCurr.y}`);
                    else                                                break;
                }
            }
        }

        if (mapData.riverTiles.size >= 20) {
            processRivers();
            if (mapData.riverTiles.size >= 20) riverSuccess = true;
        }
    }
}

function processRivers() {
    let changed     = true;
    let attempts    = 0;

    while (changed && attempts < ATTEMPT_LIMIT) {
        attempts++;
        changed = false;

        let riverList = Array.from(mapData.riverTiles);
        let degreeMap = new Map();

        riverList.forEach(k => {
            let [x, y]  = k.split(',').map(Number);
            let deg     = 0;

            ORTHOGONAL_DIRS.forEach(([dx, dy]) => { if (mapData.riverTiles.has(`${x + dx},${y + dy}`)) deg++; });
            degreeMap.set(k, deg);
        });

        let deadEnds = riverList.filter(k => degreeMap.get(k) === 1 && !isEdgeTile(...k.split(',').map(Number)));
        if (deadEnds.length === 0) break;

        for (let de of deadEnds) {
            if (!mapData.riverTiles.has(de)) continue;

            let path    = [de];
            let curr    = de;
            let prev    = null;
            let length  = 0;

            while (true) {
                length++;

                let [cx, cy]    = curr.split(',').map(Number);
                let nexts       = [];

                ORTHOGONAL_DIRS.forEach(([dx, dy]) => {
                    let nk = `${cx+dx},${cy+dy}`;
                    if (mapData.riverTiles.has(nk) && nk !== prev) nexts.push(nk);
                });

                if (nexts.length === 1) {
                    prev = curr;
                    curr = nexts[0];

                    path.push(curr);
                    if (isEdgeTile(...curr.split(',').map(Number)) || degreeMap.get(curr) !== 2) break;
                } else break;
            }

            for (let i = 0; i < path.length - 1; i++) mapData.riverTiles.delete(path[i]);
            if (path.length === 1) mapData.riverTiles.delete(de);

            changed = true;
            break;
        }
    }
}

function getRiverRegions() {
    let visited = new Set();
    let regions = [];

    for (let x = 0; x < 20; x++) {
        for (let y = 0; y < 20; y++) {
            let key = `${x},${y}`;
            if (mapData.riverTiles.has(key) || visited.has(key)) continue;

            let region  = [];
            let queue   = [{x, y}];

            visited.add(key);

            while (queue.length > 0) {
                let curr = queue.shift();
                region.push(curr);

                ORTHOGONAL_DIRS.forEach(([dx, dy]) => {
                    let nx = curr.x + dx;
                    let ny = curr.y + dy;

                    if (nx >= 0 && nx < 20 && ny >= 0 && ny < 20) {
                        let nk = `${nx},${ny}`;

                        if (!mapData.riverTiles.has(nk) && !visited.has(nk)) {
                            visited .add    (nk);
                            queue   .push   ({x: nx, y: ny});
                        }
                    }
                });
            }

            regions.push(region);
        }
    }

    return regions;
}

function isAdjacentToRiver(x, y) {
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (mapData.riverTiles.has(`${x + dx},${y + dy}`)) return true;
    return false;
}

function generateMountain() {
    mapData.mountainTiles.clear();
    let regions = getRiverRegions();

    regions.forEach(region => {
        let candidates = region.filter(cell => {
            let key = `${cell.x},${cell.y}`;

            if (mapData.riverTiles.has(key))                                                return false;
            if (cell.x === mapData.startingTower.x && cell.y === mapData.startingTower.y)   return false;
            if (isAdjacentToStartingTower   (cell.x, cell.y))                               return false;
            if (isAdjacentToRiver           (cell.x, cell.y))                               return false;

            return true;
        });

        if (candidates.length === 0) return;

        let bestCluster = null;
        let bestSize    = 0;
        let maxAttempts = 50;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            let seedIdx         = rng.nextInt(0, candidates.length - 1);
            let seed            = candidates[seedIdx];
            let cluster         = [{x: seed.x, y: seed.y}];
            let clusterSet      = new Set([`${seed.x},${seed.y}`]);
            let candidateSet    = new Set(candidates.map(c => `${c.x},${c.y}`));

            candidateSet.delete(`${seed.x},${seed.y}`);

            let calcSize    = Math.floor(candidates.length * 0.5);
            let targetSize  = calcSize < 10 ? 0 : calcSize;

            if (targetSize === 0) return;

            while (cluster.length < targetSize) {
                let neighbors = [];

                cluster.forEach(t => {
                    ORTHOGONAL_DIRS.forEach(([dx, dy]) => {
                        let nx = t.x + dx;
                        let ny = t.y + dy;
                        let nk = `${nx},${ny}`;

                        if (candidateSet.has(nk) && !clusterSet.has(nk)) neighbors.push({x: nx, y: ny});
                    });
                });

                if (neighbors.length === 0) break;

                let nextCell    = neighbors[rng.nextInt(0, neighbors.length - 1)];
                let nk          = `${nextCell.x},${nextCell.y}`;

                cluster     .push   (nextCell);
                clusterSet  .add    (nk);
            }

            let hasStartingTower    = region.some(c => c.x === mapData.startingTower.x && c.y === mapData.startingTower.y);
            let blocksTower         = false;

            if (hasStartingTower) {
                cluster.forEach(t => mapData.mountainTiles.add(`${t.x},${t.y}`));

                let visited = new Set();
                let queue   = [{x: mapData.startingTower.x, y: mapData.startingTower.y}];

                visited.add(`${mapData.startingTower.x},${mapData.startingTower.y}`);

                while (queue.length > 0) {
                    let curr = queue.shift();

                    ORTHOGONAL_DIRS.forEach(([dx, dy]) => {
                        let nx = curr.x + dx;
                        let ny = curr.y + dy;
                        let nk = `${nx},${ny}`;

                        if (nx >= 0 && nx < 20 && ny >= 0 && ny < 20) {
                            if (!mapData.riverTiles.has(nk) && !mapData.mountainTiles.has(nk) && !visited.has(nk)) {
                                visited .add    (nk);
                                queue   .push   ({x: nx, y: ny});
                            }
                        }
                    });
                }

                let regionPassableCount = region.filter(c => !mapData.riverTiles.has(`${c.x},${c.y}`) && !mapData.mountainTiles.has(`${c.x},${c.y}`)).length;
                let reachableCount      = region.filter(c => visited.has(`${c.x},${c.y}`)).length;

                if (reachableCount < regionPassableCount) blocksTower = true;
                cluster.forEach(t => mapData.mountainTiles.delete(`${t.x},${t.y}`));
            }

            if (!blocksTower) {
                if (cluster.length > bestSize) {
                    bestSize    = cluster.length;
                    bestCluster = cluster;

                    if (bestSize >= targetSize) break;
                }
            }
        }

        if (bestCluster) bestCluster.forEach(t => mapData.mountainTiles.add(`${t.x},${t.y}`));
    });

    let visited     = new Set();
    let queue       = [{x: mapData.startingTower.x, y: mapData.startingTower.y}];
    let startKey    = `${mapData.startingTower.x},${mapData.startingTower.y}`;

    visited.add(startKey);

    while (queue.length > 0) {
        let curr = queue.shift();

        ORTHOGONAL_DIRS.forEach(([dx, dy]) => {
            let nx = curr.x + dx;
            let ny = curr.y + dy;

            if (nx >= 0 && nx < 20 && ny >= 0 && ny < 20) {
                let nk = `${nx},${ny}`;
                if (!mapData.mountainTiles.has(nk) && !visited.has(nk)) {
                    visited .add    (nk);
                    queue   .push   ({x: nx, y: ny});
                }
            }
        });
    }

    for (let x = 0; x < 20; x++) {
        for (let y = 0; y < 20; y++) {
            let key = `${x},${y}`;

            if (!mapData.mountainTiles.has(key) && !mapData.riverTiles.has(key)) {
                if (x === mapData.startingTower.x && y === mapData.startingTower.y) continue;
                if (!visited.has(key))                                              mapData.mountainTiles.add(key);
            }
        }
    }
}

function generateCapacity() {
    mapData.capacityTiles = [];
    mapData.capacityMap.clear();

    function isReachableFromStart(targetX, targetY) {
        let queue   = [{x: mapData.startingTower.x, y: mapData.startingTower.y}];
        let visited = new Set([`${mapData.startingTower.x},${mapData.startingTower.y}`]);

        while (queue.length > 0) {
            let curr = queue.shift();
            if (curr.x === targetX && curr.y === targetY) return true;

            for (let [dx, dy] of ORTHOGONAL_DIRS) {
                let nx = curr.x + dx;
                let ny = curr.y + dy;
                let nk = `${nx},${ny}`;

                if (nx >= 0 && nx < 20 && ny >= 0 && ny < 20) {
                    let isBlocked = mapData.mountainTiles.has(nk) || (mapData.capacityMap.has(nk) && (nx !== targetX || ny !== targetY));

                    if (!isBlocked && !visited.has(nk)) {
                        visited .add    (nk);
                        queue   .push   ({x: nx, y: ny});
                    }
                }
            }
        }

        return false;
    }

    function canPlaceCapacity(x, y) {
        if (!isReachableFromStart(x, y)) return false;

        let key = `${x},${y}`;
        mapData.capacityMap.set(key, 1);

        let allStillReachable = mapData.capacityTiles.every(ct => isReachableFromStart(ct.x, ct.y));
        mapData.capacityMap.delete(key);

        return allStillReachable;
    }

    let regions = getRiverRegions();

    let validRegions = regions.map(region => {
        return region.filter(cell => {
            let key = `${cell.x},${cell.y}`;

            if (mapData.riverTiles.has(key)         || mapData.mountainTiles.has(key))                      return false;
            if (cell.x === mapData.startingTower.x  && cell.y === mapData.startingTower.y)                  return false;
            if (isOctilinearlyAdjacent(cell.x, cell.y, mapData.startingTower.x, mapData.startingTower.y))   return false;

            let hasEmptyOrthogonal = ORTHOGONAL_DIRS.some(([dx, dy]) => {
                let nx = cell.x + dx;
                let ny = cell.y + dy;

                if (nx < 0 || nx >= 20 || ny < 0 || ny >= 20) return false;
                let nKey = `${nx},${ny}`;

                return !mapData.riverTiles.has(nKey) && !mapData.mountainTiles.has(nKey);
            });

            return hasEmptyOrthogonal;
        });
    }).filter(reg => reg.length > 0);

    let shuffledCapacities = [...CAPACITIES];

    for (let i = shuffledCapacities.length - 1; i > 0; i--) {
        let j = rng.nextInt(0, i);
        [shuffledCapacities[i], shuffledCapacities[j]] = [shuffledCapacities[j], shuffledCapacities[i]];
    }

    let capacityIndex = 0;

    validRegions.forEach(region => {
        if (capacityIndex >= shuffledCapacities.length) return;

        let placedInRegion  = false;
        let attempts        = 0;

        while (!placedInRegion && attempts < 200 && region.length > 0) {
            attempts++;

            let cellIndex   = rng.nextInt(0, region.length - 1);
            let cell        = region[cellIndex];
            let key         = `${cell.x},${cell.y}`;
            let tooClose    = mapData.capacityTiles.some(ct => isOctilinearlyAdjacent(ct.x, ct.y, cell.x, cell.y));

            if (tooClose || mapData.capacityMap.has(key) || !canPlaceCapacity(cell.x, cell.y)) {
                region.splice(cellIndex, 1);
                continue;
            }

            let capVal = shuffledCapacities[capacityIndex++];

            mapData.capacityTiles   .push   ({x: cell.x, y: cell.y, capacity: capVal, id: mapData.capacityTiles.length});
            mapData.capacityMap     .set    (key, capVal);

            placedInRegion = true;
        }
    });

    while (capacityIndex < shuffledCapacities.length) {
        let placed      = false;
        let attempts    = 0;

        while (!placed && attempts < ATTEMPT_LIMIT) {
            attempts++;

            let x = rng.nextInt(0, GRID_SIZE - 1);
            let y = rng.nextInt(0, GRID_SIZE - 1);

            let key = `${x},${y}`;

            if (mapData.riverTiles.has(key)     || mapData.mountainTiles.has(key))                  continue;
            if (x === mapData.startingTower.x   && y === mapData.startingTower.y)                   continue;
            if (isOctilinearlyAdjacent  (x, y, mapData.startingTower.x, mapData.startingTower.y))   continue;
            if (!canPlaceCapacity       (x, y))                                                     continue;
            if (mapData.capacityMap.has (key))                                                      continue;

            let tooClose = mapData.capacityTiles.some(ct => isOctilinearlyAdjacent(ct.x, ct.y, x, y));
            if (tooClose) continue;

            let hasEmptyOrthogonal = ORTHOGONAL_DIRS.some(([dx, dy]) => {
                let nx = x + dx;
                let ny = y + dy;

                if (nx < 0 || nx >= 20 || ny < 0 || ny >= 20) return false;
                let nKey = `${nx},${ny}`;

                return !mapData.riverTiles.has(nKey) && !mapData.mountainTiles.has(nKey);
            });

            if (hasEmptyOrthogonal) {
                let capVal = shuffledCapacities[capacityIndex++];

                mapData.capacityTiles.push({x, y, capacity: capVal, id: mapData.capacityTiles.length});
                mapData.capacityMap.set(key, capVal);

                placed = true;
            }
        }

        if (attempts >= ATTEMPT_LIMIT) break;
    }
}

function generateMap(seedStr) {
    actionHistory = [];

    currentSeed = seedStr.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (!currentSeed) currentSeed = DEFAULT_SEED;

    if (isFutureDateSeed(currentSeed)) {
        alert("Future date seeds are forbidden");
        currentSeed = getUTCYYMMDD();
    }

    document.getElementById('seedInput').value = currentSeed;
    rng = new RandomSeed(currentSeed);

    mapData     .riverTiles     .clear();
    mapData     .mountainTiles  .clear();
    mapData     .capacityMap    .clear();
    playerState .extraTowers    .clear();

    mapData     .capacityTiles  = [];
    playerState .cables         = [];

    const corners = [{x: 0, y: 0}, {x: 0, y: GRID_SIZE - 1}, {x: GRID_SIZE - 1, y: 0}, {x: GRID_SIZE - 1, y: GRID_SIZE - 1}];
    mapData.startingTower = corners[rng.nextInt(0, 3)];

    generateRiver       ();
    generateMountain    ();
    generateCapacity    ();

    resetTimer      ();
    render          ();
    updateMetrics   ();
}