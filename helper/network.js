function getAllTowerList() {
    let towers = [{x: mapData.startingTower.x, y: mapData.startingTower.y}];

    playerState.extraTowers.forEach(k => {
        let [tx, ty] = k.split(',').map(Number);
        towers.push({x: tx, y: ty});
    });

    return towers;
}

function isTowerLocation(x, y) {
    if (x === mapData.startingTower.x && y === mapData.startingTower.y) return true;
    return playerState.extraTowers.has(`${x},${y}`);
}

function getActiveTowers() {
    let active      = new Set();
    let startKey    = `${mapData.startingTower.x},${mapData.startingTower.y}`;

    if (isTowerLocation(mapData.startingTower.x, mapData.startingTower.y)) active.add(startKey);

    let queue   = [{x: mapData.startingTower.x, y: mapData.startingTower.y}];
    let visited = new Set([startKey]);

    while (queue.length > 0) {
        let curr    = queue.shift();
        let currKey = `${curr.x},${curr.y}`;

        if (isTowerLocation(curr.x, curr.y)) active.add(currKey);

        playerState.cables.forEach(c => {
            if (c.type === 'towerCable') {
                let nextPos = null;

                if      (c.x1 === curr.x && c.y1 === curr.y) nextPos = {x: c.x2, y: c.y2};
                else if (c.x2 === curr.x && c.y2 === curr.y) nextPos = {x: c.x1, y: c.y1};

                if (nextPos) {
                    let nKey = `${nextPos.x},${nextPos.y}`;

                    if (!visited.has(nKey)) {
                        visited .add    (nKey);
                        queue   .push   (nextPos);
                    }
                }
            }
        });
    }

    return active;
}

function getNetworkReach(targetX, targetY, cableFilter) {
    let activeTowers    = getActiveTowers();
    let startKey        = `${targetX},${targetY}`;

    if (activeTowers.has(startKey)) return 0;

    let queue   = [{x: targetX, y: targetY, dist: 0}];
    let visited = new Set([startKey]);

    while (queue.length > 0) {
        let curr    = queue.shift();
        let currKey = `${curr.x},${curr.y}`;

        if (activeTowers.has(currKey))                                  return curr.dist;
        if (curr.dist >= CABLE_LIMIT)                                   continue;
        if (currKey !== startKey && mapData.capacityMap.has(currKey))   continue;

        playerState.cables.forEach(c => {if (cableFilter(c)) {
            let nextCell = null;

            if      (c.x1 === curr.x && c.y1 === curr.y) nextCell = {x: c.x2, y: c.y2};
            else if (c.x2 === curr.x && c.y2 === curr.y) nextCell = {x: c.x1, y: c.y1};

            if (nextCell) {
                let nKey = `${nextCell.x},${nextCell.y}`;

                if (!visited.has(nKey)) {
                    visited .add    (nKey);
                    queue   .push   ({x: nextCell.x, y: nextCell.y, dist: curr.dist + 1});
                }
            }
        }});
    }

    return Infinity;
}

function getCellNetworkReachToTower         (targetX, targetY) {return getNetworkReach(targetX, targetY, c => c.type !== 'towerCable')}
function getTowerCableReachToActiveTower    (targetX, targetY) {return getNetworkReach(targetX, targetY, c => c.type === 'towerCable')}

function computeNetworkFlow() {
    let activeTowers    = getActiveTowers();
    let capMap          = new Map();

    mapData.capacityTiles.forEach(t => capMap.set(`${t.x},${t.y}`, 0));
    if (activeTowers.size === 0 || mapData.capacityTiles.length === 0) return capMap;

    let adj = new Map();

    function addEdge(u, v, cap) {
        if (!adj.has(u)) adj.set(u, []);
        if (!adj.has(v)) adj.set(v, []);

        let uEdges = adj.get(u);
        let vEdges = adj.get(v);

        uEdges.push({to: v, cap: cap,   flow: 0, revIndex: vEdges.length});
        vEdges.push({to: u, cap: 0,     flow: 0, revIndex: uEdges.length - 1});
    }

    let sourceNode  = 'S';
    let sinkNode    = 'T';

    activeTowers.forEach(towerKey => {addEdge(sourceNode, towerKey, Infinity)});

    playerState.cables.forEach(c => {
        let r1 = activeTowers.has(`${c.x1},${c.y1}`) ? 0 : getCellNetworkReachToTower(c.x1, c.y1);
        let r2 = activeTowers.has(`${c.x2},${c.y2}`) ? 0 : getCellNetworkReachToTower(c.x2, c.y2);

        if (r1 <= CABLE_LIMIT || r2 <= CABLE_LIMIT || c.type === 'towerCable') {
            let cap = 1;

            if      (c.type === 'large')        cap = 2;
            else if (c.type === 'towerCable')   cap = Infinity;

            let u = `${c.x1},${c.y1}`;
            let v = `${c.x2},${c.y2}`;

            addEdge(u, v, cap);
            addEdge(v, u, cap);
        }
    });

    mapData.capacityTiles.forEach(capTile => {
        let key = `${capTile.x},${capTile.y}`;
        let reach = activeTowers.has(key) ? 0 : getCellNetworkReachToTower(capTile.x, capTile.y);

        if (reach <= CABLE_LIMIT) addEdge(key, sinkNode, capTile.capacity)
    });

    while (true) {
        let parent  = new Map();
        let queue   = [sourceNode];

        parent.set(sourceNode, {from: null, edgeIndex: null});
        let foundPath = false;

        while (queue.length > 0) {
            let u = queue.shift();

            if (u === sinkNode) {
                foundPath = true;
                break;
            }

            let edges = adj.get(u) || [];

            for (let i = 0; i < edges.length; i++) {
                let edge = edges[i];

                if (edge.cap - edge.flow > 0 && !parent.has(edge.to)) {
                    parent  .set    (edge.to, {from: u, edgeIndex: i});
                    queue   .push   (edge.to);
                }
            }
        }

        if (!foundPath) break;

        let pushFlow    = Infinity;
        let curr        = sinkNode;

        while (curr !== sourceNode) {
            let p       = parent.get(curr);
            let edges   = adj.get(p.from);
            let edge    = edges[p.edgeIndex];
            pushFlow    = Math.min(pushFlow, edge.cap - edge.flow);
            curr        = p.from;
        }

        curr = sinkNode;

        while (curr !== sourceNode) {
            let p       = parent.get(curr);
            let edges   = adj.get(p.from);
            let edge    = edges[p.edgeIndex];

            edge.flow += pushFlow;

            let revEdge = adj.get(edge.to)[edge.revIndex];
            revEdge.flow -= pushFlow;

            curr = p.from;
        }
    }

    mapData.capacityTiles.forEach(capTile => {
        let key         = `${capTile.x},${capTile.y}`;
        let edges       = adj.get(key) || [];
        let delivered   = 0;

        for (let edge of edges) if (edge.to === sinkNode) delivered += edge.flow;
        capMap.set(key, delivered);
    });

    return capMap;
}

function calculateDeliveredCapacity(targetTile) {
    let flowMap = computeNetworkFlow();
    return flowMap.get(`${targetTile.x},${targetTile.y}`) || 0;
}

function getTowerReachableTiles(startX, startY) {
    let reachable = new Set();
    if (mapData.mountainTiles.has(`${startX},${startY}`) || mapData.capacityMap.has(`${startX},${startY}`) || mapData.riverTiles.has(`${startX},${startY}`)) return reachable;

    let queue   = [{x: startX, y: startY, dist: 0}];
    let visited = new Set([`${startX},${startY}`]);

    while (queue.length > 0) {
        let curr    = queue.shift();
        let currKey = `${curr.x},${curr.y}`;

        reachable.add(currKey);
        if (curr.dist >= CABLE_LIMIT || mapData.capacityMap.has(currKey)) continue;

        for (let [dx, dy] of ORTHOGONAL_DIRS) {
            let nx = curr.x + dx;
            let ny = curr.y + dy;
            let nk = `${nx},${ny}`;

            if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
                let isBlocked = mapData.mountainTiles.has(nk);

                if (!isBlocked && !visited.has(nk)) {
                    visited .add    (nk);
                    queue   .push   ({x: nx, y: ny, dist: curr.dist + 1});
                }
            }
        }
    }

    return reachable;
}

function isValidTowerTile(x, y) {
    let key = `${x},${y}`;

    if (x === mapData.startingTower.x           && y === mapData.startingTower.y)                               return false;
    if (mapData     .riverTiles     .has(key)   || mapData.mountainTiles.has    (key))                          return false;
    if (mapData     .capacityMap    .has(key)   || mapData.capacityTiles.some   (t => t.x === x && t.y === y))  return false;
    if (playerState .extraTowers    .has(key))                                                                  return false;

    return true;
}