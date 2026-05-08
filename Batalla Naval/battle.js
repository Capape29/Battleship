const board = document.querySelector("#board");
const boardAttack = document.querySelector("#boardAttack");
const attackCard = document.querySelector("#attackCard");
const playerCard = document.querySelector(".board-card--player");
const enemyCard = document.querySelector("#attackCard");
const menuScreen = document.querySelector("#menuScreen");
const gameScreen = document.querySelector("#gameScreen");
const modeSelectionPanel = document.querySelector("#modeSelectionPanel");
const menuDetailsPanel = document.querySelector("#menuDetailsPanel");
const settingsPanel = document.querySelector("#settingsPanel");
const shipsContainer = document.querySelector("#ships");
const orientationControls = document.querySelector("#orientationControls");
const difficultyGroup = document.querySelector("#difficultyGroup");
const setupPanel = document.querySelector("#setupPanel");
const powerPanel = document.querySelector("#powerPanel");
const powerButtons = Array.from(document.querySelectorAll("[data-power]"));
const gameModeLabel = document.querySelector("#gameModeLabel");
const turnLabel = document.querySelector("#turnLabel");
const statusText = document.querySelector("#statusText");
const playerBoardLabel = document.querySelector("#playerBoardLabel");
const opponentBoardLabel = document.querySelector("#opponentBoardLabel");
const setupFleetStatus = document.querySelector("#setupFleetStatus");
const menuStartButton = document.querySelector("#menuStartButton");
const setupActionButton = document.querySelector("#setupActionButton");
const closeSettingsButton = document.querySelector("#closeSettingsButton");
const sidenavSettingsButton = document.querySelector("#sidenavSettingsButton");
const backToModeButton = document.querySelector("#backToModeButton");
const backToMenuButton = document.querySelector("#backToMenuButton");
const modeButtons = Array.from(document.querySelectorAll("[data-mode]"));
const variantButtons = Array.from(document.querySelectorAll("[data-variant]"));
const difficultyButtons = Array.from(document.querySelectorAll("[data-difficulty]"));
const orientationButtons = Array.from(document.querySelectorAll("[data-orientation]"));

const BOARD_SIZE = 10;
const SHIP_NAMES = ["Portaviones", "Acorazado", "Submarino", "Destructor"];
const SHIP_SIZES = [5, 4, 3, 2];
const SHIP_COUNTS = [1, 1, 1, 2];

const state = {
    mode: "bot",
    modeSelected: false,
    variant: "classic",
    difficulty: "normal",
    phase: "menu",
    players: [],
    setupPlayerIndex: 0,
    battlePlayerIndex: 0,
    selectedShipIndex: 0,
    selectedOrientation: "horizontal",
    lastShot: null,
    selectedPower: "single",
    processingShot: false
};

const TOTAL_SHIP_CELLS = SHIP_SIZES.reduce((total, size, index) => total + size * SHIP_COUNTS[index], 0);
const TOTAL_SHIP_PLACEMENTS = SHIP_COUNTS.reduce((total, count) => total + count, 0);

function createEmptyBoard() {
    return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(""));
}

function createPlayer(name, isBot = false) {
    return {
        name,
        isBot,
        board: createEmptyBoard(),
        placementCounts: SHIP_COUNTS.slice(),
        remainingCells: SHIP_SIZES.reduce((total, size, index) => total + size * SHIP_COUNTS[index], 0),
        botMemory: {
            targets: [],
            lastHit: null,
            direction: null,
        },
        powerCharges: {
            adjacent: 2,
            line: 1,
        },
    };
}

function currentSetupPlayer() {
    return state.players[state.setupPlayerIndex];
}

function currentBattlePlayer() {
    return state.players[state.battlePlayerIndex];
}

function opponentPlayer() {
    return state.players[state.battlePlayerIndex === 0 ? 1 : 0];
}

function getModeLabel() {
    return state.mode === "bot" ? "Vs la máquina" : "Multijugador local";
}

function getVariantLabel() {
    return state.variant === "powered" ? "Potenciado" : "Clásico";
}

function getDifficultyLabel() {
    return state.difficulty === "easy" ? "Fácil" : state.difficulty === "hard" ? "Difícil" : "Normal";
}

function getPlacedShipCount(player) {
    return TOTAL_SHIP_PLACEMENTS - player.placementCounts.reduce((total, count) => total + count, 0);
}

function getFleetIntegrityPercent(player) {
    return Math.max(0, Math.round((player.remainingCells / TOTAL_SHIP_CELLS) * 100));
}

function formatCoordinates(row, col) {
    return `${String.fromCharCode(65 + col)}${row + 1}`;
}

function renderDeploymentStatus(player) {
    const placedShips = getPlacedShipCount(player);
    const deploymentValue = `${placedShips}/${TOTAL_SHIP_PLACEMENTS}`;

    if (setupFleetStatus) {
        setupFleetStatus.textContent = deploymentValue;
    }
}

function updateMenuSelection() {
    modeButtons.forEach((button) => {
        button.classList.toggle("active", button.dataset.mode === state.mode);
    });
    difficultyButtons.forEach((button) => {
        button.classList.toggle("active", button.dataset.difficulty === state.difficulty);
    });

    if (modeSelectionPanel) {
        modeSelectionPanel.classList.toggle("hidden", state.modeSelected);
    }

    if (menuDetailsPanel) {
        menuDetailsPanel.classList.toggle("hidden", state.mode !== "bot" || !state.modeSelected);
    }

    if (difficultyGroup) {
        difficultyGroup.classList.toggle("hidden", state.mode !== "bot");
    }
}

function setScreen(screen) {
    state.phase = screen === "menu" ? "menu" : state.phase;
    menuScreen.classList.toggle("hidden", screen !== "menu");
    gameScreen.classList.toggle("hidden", screen !== "game");
    settingsPanel.classList.add("hidden");
}

function showSettings() {
    settingsPanel.classList.remove("hidden");
}

function hideSettings() {
    settingsPanel.classList.add("hidden");
}

function setMode(mode) {
    state.mode = mode;
    state.modeSelected = true;
    if (mode !== "bot") {
        state.variant = "classic";
    }
    updateMenuSelection();
    if (mode === "multiplayer") {
        startNewGame();
    }
}

function setVariant(variant) {
    state.variant = variant;
    updateMenuSelection();
}

function setDifficulty(difficulty) {
    state.difficulty = difficulty;
    updateMenuSelection();
}

function setOrientation(orientation) {
    state.selectedOrientation = orientation;
    orientationButtons.forEach((button) => {
        button.classList.toggle("active", button.dataset.orientation === orientation);
    });
}

function renderBoard(container, matrix, options = {}) {
    const { revealShips = true, onCellClick = null } = options;

    container.innerHTML = "";

    for (let row = 0; row < BOARD_SIZE; row += 1) {
        const rowElement = document.createElement("div");
        rowElement.className = "myRow";

        for (let col = 0; col < BOARD_SIZE; col += 1) {
            const cell = document.createElement("div");
            cell.className = "grid";
            cell.dataset.row = String(row);
            cell.dataset.col = String(col);

            const value = matrix[row][col];
            if (value === "ship" && revealShips) {
                cell.classList.add("selected");
            }
            if (value === "hit") {
                cell.classList.add("hit");
            }
            if (value === "miss") {
                cell.classList.add("miss");
            }

            if (onCellClick && value !== "hit" && value !== "miss") {
                cell.addEventListener("click", onCellClick);
            }

            rowElement.appendChild(cell);
        }

        container.appendChild(rowElement);
    }
}

function getNextAvailableShipIndex(player) {
    return player.placementCounts.findIndex((count) => count > 0);
}

function canPlaceShip(matrix, row, col, size, orientation) {
    if (orientation === "horizontal") {
        if (col + size > BOARD_SIZE) {
            return false;
        }

        for (let offset = 0; offset < size; offset += 1) {
            if (matrix[row][col + offset] === "ship") {
                return false;
            }
        }

        return true;
    }

    if (row + size > BOARD_SIZE) {
        return false;
    }

    for (let offset = 0; offset < size; offset += 1) {
        if (matrix[row + offset][col] === "ship") {
            return false;
        }
    }

    return true;
}

function placeShipOnBoard(matrix, row, col, size, orientation) {
    if (orientation === "horizontal") {
        for (let offset = 0; offset < size; offset += 1) {
            matrix[row][col + offset] = "ship";
        }
        return;
    }

    for (let offset = 0; offset < size; offset += 1) {
        matrix[row + offset][col] = "ship";
    }
}

function allShipsPlaced(player) {
    return player.placementCounts.every((count) => count === 0);
}

function renderShipSelector() {
    const player = currentSetupPlayer();
    const selectedIndex = player.placementCounts[state.selectedShipIndex] > 0 ? state.selectedShipIndex : getNextAvailableShipIndex(player);

    if (selectedIndex !== -1) {
        state.selectedShipIndex = selectedIndex;
    }

    shipsContainer.innerHTML = "";

    SHIP_NAMES.forEach((name, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "ship-option";
        button.classList.toggle("active", index === state.selectedShipIndex);
        button.disabled = player.placementCounts[index] === 0;
        button.innerHTML = `
            <span>${name}</span>
            <small>Tamaño: ${SHIP_SIZES[index]}</small>
            <strong>${player.placementCounts[index]}</strong>
        `;

        button.addEventListener("click", () => {
            if (player.placementCounts[index] === 0) {
                return;
            }
            state.selectedShipIndex = index;
            renderSetupPhase();
        });

        shipsContainer.appendChild(button);
    });

    orientationButtons.forEach((button) => {
        button.classList.toggle("active", button.dataset.orientation === state.selectedOrientation);
    });
}

function renderSetupPhase() {
    const player = currentSetupPlayer();
    const ready = allShipsPlaced(player);

    gameScreen.classList.add("game-screen--setup");
    gameScreen.classList.remove("game-screen--battle");
    attackCard.classList.add("hidden");
    setupPanel.classList.remove("hidden");

    // clear any target highlights when in setup
    if (playerCard) playerCard.classList.remove("board-card--target");
    if (enemyCard) enemyCard.classList.remove("board-card--target");

    gameModeLabel.textContent = `${getModeLabel()} · ${getVariantLabel()}${state.mode === "bot" ? ` · ${getDifficultyLabel()}` : ""}`;
    turnLabel.textContent = "FLEET DEPLOYMENT";
    // make sure the textual turn label is visible during setup
    if (turnLabel) turnLabel.style.display = "";
    statusText.textContent = state.mode === "bot" ? "Click the grid to place the selected ship." : `Turno de ${player.name}: coloca tus naves.`;
    playerBoardLabel.textContent = player.name;
    opponentBoardLabel.textContent = state.mode === "bot" ? "Tablero del bot" : state.setupPlayerIndex === 0 ? "Tablero del jugador 2" : "Tablero del jugador 1";
    renderDeploymentStatus(player);

    renderBoard(board, player.board, {
        revealShips: true,
        onCellClick: handleSetupCellClick,
    });

    boardAttack.innerHTML = "";
    renderShipSelector();

    setupActionButton.disabled = !ready;
    if (state.mode === "bot") {
        setupActionButton.textContent = ready ? "CONFIRM DEPLOYMENT" : "PLACE ALL SHIPS";
    } else if (state.setupPlayerIndex === 0) {
        setupActionButton.textContent = ready ? "CONFIRM PLAYER 1" : "PLACE ALL SHIPS";
    } else {
        setupActionButton.textContent = ready ? "BEGIN BATTLE" : "PLACE ALL SHIPS";
    }
}

function handleSetupCellClick(event) {
    const row = Number(event.currentTarget.dataset.row);
    const col = Number(event.currentTarget.dataset.col);
    const player = currentSetupPlayer();
    const shipIndex = state.selectedShipIndex;

    if (player.placementCounts[shipIndex] === 0) {
        alert("Selecciona un barco disponible");
        return;
    }

    const size = SHIP_SIZES[shipIndex];
    if (!canPlaceShip(player.board, row, col, size, state.selectedOrientation)) {
        alert("Selecciona una posición válida");
        return;
    }

    placeShipOnBoard(player.board, row, col, size, state.selectedOrientation);
    player.placementCounts[shipIndex] -= 1;

    renderSetupPhase();
}

function placeShipRandomly(player, shipIndex) {
    const size = SHIP_SIZES[shipIndex];

    for (let attempt = 0; attempt < 250; attempt += 1) {
        const orientation = Math.random() < 0.5 ? "horizontal" : "vertical";
        const rowLimit = orientation === "vertical" ? BOARD_SIZE - size + 1 : BOARD_SIZE;
        const colLimit = orientation === "horizontal" ? BOARD_SIZE - size + 1 : BOARD_SIZE;
        const row = Math.floor(Math.random() * rowLimit);
        const col = Math.floor(Math.random() * colLimit);

        if (canPlaceShip(player.board, row, col, size, orientation)) {
            placeShipOnBoard(player.board, row, col, size, orientation);
            return true;
        }
    }

    return false;
}

function autoPlaceBotShips() {
    const bot = state.players[1];

    SHIP_COUNTS.forEach((count, shipIndex) => {
        let placed = 0;

        while (placed < count) {
            if (placeShipRandomly(bot, shipIndex)) {
                placed += 1;
                bot.placementCounts[shipIndex] -= 1;
            }
        }
    });
}

function setPower(power) {
    const player = currentBattlePlayer();
    if (!player || !player.powerCharges || (player.powerCharges[power] ?? 0) <= 0) {
        state.selectedPower = "single";
    } else {
        state.selectedPower = power;
    }

    powerButtons.forEach((button) => {
        const powerType = button.dataset.power;
        const remaining = player?.powerCharges?.[powerType] ?? 0;
        button.classList.toggle("active", state.selectedPower === powerType);
        button.disabled = remaining <= 0;
        button.title = `Usos restantes: ${remaining}`;
    });
}

function getShotPattern(power, row, col) {
    if (power === "adjacent") {
        return [
            { row, col },
            { row: row - 1, col },
            { row: row + 1, col },
            { row, col: col - 1 },
            { row, col: col + 1 },
        ];
    }

    if (power === "line") {
        const fullRow = Array.from({ length: BOARD_SIZE }, (_, index) => ({ row, col: index }));
        return fullRow;
    }

    return [{ row, col }];
}

function getAvailableCells(cells, defender) {
    return cells.filter(({ row, col }) => row >= 0 && col >= 0 && row < BOARD_SIZE && col < BOARD_SIZE && isShotAvailable(defender.board, row, col));
}

function chooseBotPower(attacker) {
    if (state.variant !== "powered") return "single";

    const available = [];
    if (attacker.powerCharges.line > 0) available.push("line");
    if (attacker.powerCharges.adjacent > 0) available.push("adjacent");
    if (available.length === 0) return "single";

    const rand = Math.random();
    if (state.difficulty === "hard") {
        if (rand < 0.3 && available.includes("line")) return "line";
        if (rand < 0.75 && available.includes("adjacent")) return "adjacent";
        return "single";
    }

    if (rand < 0.2 && available.includes("line")) return "line";
    if (rand < 0.5 && available.includes("adjacent")) return "adjacent";
    return "single";
}

function chooseCheckerboardShot(matrix) {
    const parityShots = [];
    const fallback = [];

    for (let row = 0; row < BOARD_SIZE; row += 1) {
        for (let col = 0; col < BOARD_SIZE; col += 1) {
            if (!isShotAvailable(matrix, row, col)) continue;
            fallback.push({ row, col });
            if ((row + col) % 2 === 0) parityShots.push({ row, col });
        }
    }

    const pool = parityShots.length > 0 ? parityShots : fallback;
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
}

function renderBattlePhase() {
    const attacker = currentBattlePlayer();
    const defender = opponentPlayer();
    const player = state.players[0];
    const opponent = state.players[1];

    gameScreen.classList.add("game-screen--battle");
    gameScreen.classList.remove("game-screen--setup");
    attackCard.classList.remove("hidden");
    setupPanel.classList.add("hidden");
    if (powerPanel) powerPanel.classList.toggle("hidden", state.variant !== "powered" || attacker.isBot);
    if (!attacker.isBot && state.variant === "powered") {
        setPower(state.selectedPower);
    }

    gameModeLabel.textContent = `${getModeLabel()} · ${getVariantLabel()}${state.mode === "bot" ? ` · ${getDifficultyLabel()}` : ""}`;
    // hide the per-turn textual indicator in battle; we will highlight the target board instead
    if (turnLabel) turnLabel.style.display = "none";
    statusText.textContent = state.mode === "bot"
        ? attacker.isBot
            ? "Enemy systems are active."
            : "Target the enemy grid and engage."
        : `${attacker.name}, dispara al tablero del rival.`;

    playerBoardLabel.textContent = player.name;
    opponentBoardLabel.textContent = opponent.name;

    renderBoard(board, player.board, {
        revealShips: state.mode === "bot",
    });

    renderBoard(boardAttack, opponent.board, {
        revealShips: false,
        onCellClick: attacker.isBot ? null : handleAttackCellClick,
    });

    // highlight which board will be attacked next
    if (playerCard) playerCard.classList.remove("board-card--target");
    if (enemyCard) enemyCard.classList.remove("board-card--target");
    if (attacker.isBot) {
        if (playerCard) playerCard.classList.add("board-card--target");
    } else {
        if (enemyCard) enemyCard.classList.add("board-card--target");
    }
}

function startBattle() {
    state.phase = "battle";
    state.battlePlayerIndex = 0;
    state.lastShot = null;
    state.selectedPower = "single";

    // ensure processing flag cleared at start
    state.processingShot = false;
    renderBattlePhase();

    if (currentBattlePlayer().isBot) {
        // lock input while bot 'thinks'
        state.processingShot = true;
        window.setTimeout(executeBotTurn, 350);
    }
}

function handlePrimaryAction() {
    const player = currentSetupPlayer();

    if (!allShipsPlaced(player)) {
        alert("Debes colocar todos los barcos antes de continuar.");
        return;
    }

    if (state.mode === "bot") {
        autoPlaceBotShips();
        startBattle();
        return;
    }

    if (state.setupPlayerIndex === 0) {
        state.setupPlayerIndex = 1;
        state.selectedShipIndex = 0;
        state.selectedOrientation = "horizontal";
        renderSetupPhase();
        return;
    }

    startBattle();
}

function isShotAvailable(matrix, row, col) {
    const value = matrix[row][col];
    return value !== "hit" && value !== "miss";
}

function chooseRandomShot(matrix) {
    const availableShots = [];

    for (let row = 0; row < BOARD_SIZE; row += 1) {
        for (let col = 0; col < BOARD_SIZE; col += 1) {
            if (isShotAvailable(matrix, row, col)) {
                availableShots.push({ row, col });
            }
        }
    }

    if (availableShots.length === 0) {
        return null;
    }

    return availableShots[Math.floor(Math.random() * availableShots.length)];
}

function targetExists(queue, row, col) {
    return queue.some((item) => item.row === row && item.col === col);
}

function addBotTarget(attacker, row, col, prioritize = false) {
    if (row < 0 || col < 0 || row >= BOARD_SIZE || col >= BOARD_SIZE) {
        return;
    }

    if (!isShotAvailable(opponentPlayer().board, row, col)) {
        return;
    }

    if (targetExists(attacker.botMemory.targets, row, col)) {
        return;
    }

    const target = { row, col };
    if (prioritize) {
        attacker.botMemory.targets.unshift(target);
        return;
    }

    attacker.botMemory.targets.push(target);
}

function registerBotHit(attacker, row, col) {
    const memory = attacker.botMemory;
    const previousHit = memory.lastHit;

    if (previousHit && (previousHit.row === row || previousHit.col === col)) {
        memory.direction = {
            rowStep: Math.sign(row - previousHit.row),
            colStep: Math.sign(col - previousHit.col),
        };
    }

    memory.lastHit = { row, col };

    const neighbors = [
        { row: row - 1, col },
        { row: row + 1, col },
        { row, col: col - 1 },
        { row, col: col + 1 },
    ];

    neighbors.forEach((candidate) => {
        addBotTarget(attacker, candidate.row, candidate.col, state.difficulty === "hard");
    });

    if (state.difficulty === "hard" && memory.direction) {
        addBotTarget(attacker, row + memory.direction.rowStep, col + memory.direction.colStep, true);
        addBotTarget(attacker, row - memory.direction.rowStep, col - memory.direction.colStep, true);
    }
}

function chooseBotShot(defenderBoard, attacker) {
    if (state.difficulty === "hard" && attacker.botMemory.direction && attacker.botMemory.lastHit) {
        const nextRow = attacker.botMemory.lastHit.row + attacker.botMemory.direction.rowStep;
        const nextCol = attacker.botMemory.lastHit.col + attacker.botMemory.direction.colStep;

        if (nextRow >= 0 && nextCol >= 0 && nextRow < BOARD_SIZE && nextCol < BOARD_SIZE && isShotAvailable(defenderBoard, nextRow, nextCol)) {
            return { row: nextRow, col: nextCol };
        }

        const previousRow = attacker.botMemory.lastHit.row - attacker.botMemory.direction.rowStep;
        const previousCol = attacker.botMemory.lastHit.col - attacker.botMemory.direction.colStep;

        if (previousRow >= 0 && previousCol >= 0 && previousRow < BOARD_SIZE && previousCol < BOARD_SIZE && isShotAvailable(defenderBoard, previousRow, previousCol)) {
            return { row: previousRow, col: previousCol };
        }
    }

    while (attacker.botMemory.targets.length > 0) {
        const target = attacker.botMemory.targets.shift();
        if (isShotAvailable(defenderBoard, target.row, target.col)) {
            return target;
        }
    }

    return state.difficulty === "easy" ? chooseRandomShot(defenderBoard) : chooseCheckerboardShot(defenderBoard);
}

function finishGame(winner) {
    state.phase = "finished";
    // show textual winner message when the match finishes
    if (turnLabel) turnLabel.style.display = "";
    turnLabel.textContent = `${winner.name} gana`;
    statusText.textContent = "Vuelve al menú para iniciar una nueva partida.";
    setupActionButton.disabled = true;
    // ensure processing flag is cleared so UI is responsive
    state.processingShot = false;
}

function processShot(attacker, defender, row, col, power = "single") {
    // prevent re-entrant shots (e.g., double-click before turn switches)
    if (state.processingShot) return;
    state.processingShot = true;

    const shotPower = power !== "single" && (attacker.powerCharges[power] ?? 0) > 0 ? power : "single";
    const targets = getAvailableCells(getShotPattern(shotPower, row, col), defender);
    if (targets.length === 0) {
        state.processingShot = false;
        return;
    }

    let hitRegistered = false;

    if (shotPower !== "single") {
        attacker.powerCharges[shotPower] -= 1;
    }

    targets.forEach(({ row: targetRow, col: targetCol }) => {
        const currentValue = defender.board[targetRow][targetCol];
        if (currentValue === "ship") {
            defender.board[targetRow][targetCol] = "hit";
            defender.remainingCells -= 1;
            hitRegistered = true;

            if (attacker.isBot) {
                registerBotHit(attacker, targetRow, targetCol);
            }
        } else if (currentValue !== "hit" && currentValue !== "miss") {
            defender.board[targetRow][targetCol] = "miss";
        }
    });

    state.lastShot = { row, col, result: hitRegistered ? "hit" : "miss" };
    state.selectedPower = "single";

    renderBattlePhase();

    if (defender.remainingCells === 0) {
        finishGame(attacker);
        return;
    }

    // Powered variant: attacker gets extra turn on hit
    if (state.variant === "powered" && hitRegistered) {
        // allow next shot by same attacker — clear processing flag so UI can accept it
        state.processingShot = false;
        if (attacker.isBot) {
            window.setTimeout(executeBotTurn, 350);
        }
        return;
    }

    // Classic: switch turns regardless of hit/miss
    state.battlePlayerIndex = state.battlePlayerIndex === 0 ? 1 : 0;
    renderBattlePhase();

    // allow interactions for next player
    state.processingShot = false;

    if (state.phase === "battle" && currentBattlePlayer().isBot) {
        state.processingShot = true; // keep locked while bot 'thinks'
        window.setTimeout(executeBotTurn, 350);
    }
}

function handleAttackCellClick(event) {
    if (state.phase !== "battle") {
        return;
    }

    const attacker = currentBattlePlayer();
    if (attacker.isBot) {
        return;
    }

    const row = Number(event.currentTarget.dataset.row);
    const col = Number(event.currentTarget.dataset.col);
    const defender = opponentPlayer();

    processShot(attacker, defender, row, col, state.selectedPower);
}

function executeBotTurn() {
    if (state.phase !== "battle" || !currentBattlePlayer().isBot) {
        return;
    }

    // allow the bot to take over processing (clear the UI lock so processShot can run)
    state.processingShot = false;

    const attacker = currentBattlePlayer();
    const defender = opponentPlayer();
    const shot = chooseBotShot(defender.board, attacker);

    if (!shot) {
        return;
    }

    processShot(attacker, defender, shot.row, shot.col, chooseBotPower(attacker));
}

function startNewGame() {
    state.players = state.mode === "bot"
        ? [createPlayer("Jugador"), createPlayer("Máquina", true)]
        : [createPlayer("Jugador 1"), createPlayer("Jugador 2")];
    state.setupPlayerIndex = 0;
    state.battlePlayerIndex = 0;
    state.selectedShipIndex = 0;
    state.selectedOrientation = "horizontal";
    state.phase = "setup";
    state.lastShot = null;
    state.selectedPower = "single";
    state.processingShot = false;

    setScreen("game");
    renderSetupPhase();
}

function returnToMenu() {
    hideSettings();
    state.phase = "menu";
    state.modeSelected = false;
    state.players = [];
    state.setupPlayerIndex = 0;
    state.battlePlayerIndex = 0;
    state.selectedShipIndex = 0;
    state.selectedOrientation = "horizontal";
    state.lastShot = null;
    state.selectedPower = "single";
    state.processingShot = false;

    gameScreen.classList.remove("game-screen--setup", "game-screen--battle");
    setScreen("menu");
    updateMenuSelection();
    // clear any target highlights when leaving to menu
    if (playerCard) playerCard.classList.remove("board-card--target");
    if (enemyCard) enemyCard.classList.remove("board-card--target");
}

function bindEvents() {
    modeButtons.forEach((button) => {
        button.addEventListener("click", () => {
            setMode(button.dataset.mode);
        });
    });

    // variant buttons removed from UI; no binding required

    difficultyButtons.forEach((button) => {
        button.addEventListener("click", () => {
            setDifficulty(button.dataset.difficulty);
        });
    });

    orientationButtons.forEach((button) => {
        button.addEventListener("click", () => {
            setOrientation(button.dataset.orientation);
        });
    });

    powerButtons.forEach((button) => {
        button.addEventListener("click", () => setPower(button.dataset.power));
    });

    closeSettingsButton.addEventListener("click", hideSettings);
    if (sidenavSettingsButton) {
        sidenavSettingsButton.addEventListener("click", showSettings);
    }
    if (backToModeButton) {
        backToModeButton.addEventListener("click", () => {
            state.modeSelected = false;
            updateMenuSelection();
        });
    }
    if (menuStartButton) {
        menuStartButton.addEventListener("click", startNewGame);
    }
    backToMenuButton.addEventListener("click", returnToMenu);
    setupActionButton.addEventListener("click", handlePrimaryAction);
}

function resetMenuState() {
    state.modeSelected = false;
    updateMenuSelection();
    setOrientation("horizontal");
    state.selectedPower = "single";
    gameScreen.classList.remove("game-screen--setup", "game-screen--battle");
    setScreen("menu");
}

bindEvents();
resetMenuState();
