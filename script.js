/* ========================
   LEVEL DATA
======================== */

const puzzles = [
  {
    theme: "Level 1: Test",
    grid: [
      ["K","A","T","Z","E","N"],
      ["W","I","N","D","I","G"],
      ["S","C","H","A","U","M"],
      ["P","F","E","R","D","E"],
      ["V","A","M","P","I","R"],
      ["F","I","S","C","H","E"],
      ["B","O","N","B","O","N"],
      ["L","U","S","T","I","G"]
    ],
    words: ["KATZEN","WINDIG","SCHAUM","PFERDE","VAMPIR","FISCHE","BONBON"],
    spangram: "LUSTIG"
  },

  {
    theme: "Level 2: Liegt in der Familie",
    grid: [
      ["A","E","T","S","S","G"],
      ["M","R","A","V","O","R"],
      ["O","N","D","T","S","R"],
      ["R","A","O","H","C","E"],
      ["U","W","S","N","H","T"],
      ["R","U","T","E","S","A"],
      ["E","M","T","C","W","F"],
      ["V","R","E","S","H","T"]
    ],
    words: ["MUTTER","SCHWESTER","SOHN","UROMA","GROSSVATER"],
    spangram: "VERWANDTSCHAFT"
  },

{
    theme: "Level 3: Eine runde Sache",
    grid: [
      ["G","L","O","D","N","M","L","E"],
      ["U","B","D","N","U","O","U","M"],
      ["S","E","T","S","M","E","N","R"],
      ["E","N","R","U","F","N","O","S"],
      ["G","U","S","S","B","A","R","B"],
      ["E","L","K","L","L","E","E","S"],
    ],
    words: ["GLOBUS","ERBSE","MURMEL","KUGEL","FUSSBALL"],
    spangram: "SONNEMONDUNDSTERNE"
  }  
];

/* ========================
   STATE
======================== */

let currentLevel = 0;
let puzzle = puzzles[currentLevel];

let isSelecting = false;
let selectedCells = [];
let currentWord = "";
let foundWords = [];
let completedLevels = JSON.parse(localStorage.getItem("completedLevels") || "[]");
let hintIndex = 0;

/* ========================
   DOM
======================== */

const gridEl = document.getElementById("grid");
const svgEl = document.getElementById("lines");
const themeEl = document.getElementById("theme");
const hintBtn = document.getElementById("hintBtn");
const levelCompleteEl = document.getElementById("levelComplete");
const nextLevelBtn = document.getElementById("nextLevelBtn");
const openLevelsBtn = document.getElementById("openLevels");
const closeLevelsBtn = document.getElementById("closeLevels");
const levelScreen = document.getElementById("levelScreen");
const levelGrid = document.getElementById("levelGrid");

/* ========================
   INIT
======================== */

function updateProgress() {
  const total = puzzle.words.length + 1; // +1 für Spangram
  const current = foundWords.length;

  document.getElementById("progress").textContent =
    `${current} von ${total} Wörtern gefunden`;
}

function init() {
  themeEl.textContent = puzzle.theme;

  hintBtn.addEventListener("pointerdown", giveHint);
  nextLevelBtn.addEventListener("pointerdown", nextLevel);

  renderGrid();
  updateProgress();
}

init();

/* ========================
   GRID
======================== */

function renderGrid() {
  gridEl.innerHTML = "";

  gridEl.style.gridTemplateColumns =
    `repeat(${puzzle.grid[0].length}, 60px)`;

  puzzle.grid.forEach((row, y) => {
    row.forEach((letter, x) => {
      const cell = document.createElement("div");

      cell.className = "cell";
      cell.textContent = letter;
      cell.dataset.x = x;
      cell.dataset.y = y;

      gridEl.appendChild(cell);
    });
  });
}

/* ========================
   INPUT HANDLING (MOUSE + TOUCH)
======================== */

document.addEventListener("mousedown", startSelection);
document.addEventListener("mouseover", moveSelection);
document.addEventListener("mouseup", endSelection);

document.addEventListener("touchstart", handleTouchStart, { passive: false });
document.addEventListener("touchmove", handleTouchMove, { passive: false });
document.addEventListener("touchend", endSelection);

function startSelection(e) {
  if (!e.target.classList.contains("cell")) return;

  isSelecting = true;
  clearSelection();
  selectCell(e.target);
}

function moveSelection(e) {
  if (!isSelecting || !e.target.classList.contains("cell")) return;
  selectCell(e.target);
}

/* TOUCH */

function handleTouchStart(e) {
  const touch = e.touches[0];
  const el = document.elementFromPoint(touch.clientX, touch.clientY);

  if (el && el.classList.contains("cell")) {
    e.preventDefault(); // nur beim Start auf Grid
    startSelection({ target: el });
  }
}

function handleTouchMove(e) {
  const touch = e.touches[0];
  const el = document.elementFromPoint(touch.clientX, touch.clientY);

  // 👉 nur wenn wir wirklich im Spiel sind
  if (isSelecting && el && el.classList.contains("cell")) {
    e.preventDefault(); // nur dann blockieren!

    selectCell(el);
  }
}

function endSelection() {
  if (!isSelecting) return;

  isSelecting = false;
  finishSelection();
}

openLevelsBtn.addEventListener("pointerdown", () => {
  renderLevelGrid();
  levelScreen.classList.remove("hidden");
});

closeLevelsBtn.addEventListener("pointerdown", () => {
  levelScreen.classList.add("hidden");
});

/* ========================
   SELECTION LOGIC
======================== */

function selectCell(cell) {
  const index = selectedCells.indexOf(cell);
  if (index !== -1) {
    // alles nach diesem Punkt entfernen
    selectedCells.slice(index + 1).forEach(c => c.classList.remove("active"));

    selectedCells = selectedCells.slice(0, index + 1);
    currentWord = selectedCells.map(c => c.textContent).join("");

    drawLine(selectedCells);
    return;
  }

  cell.classList.remove("hint");
  if (selectedCells.includes(cell)) return;

  if (selectedCells.length > 0) {
    const last = selectedCells[selectedCells.length - 1];
    if (!isAdjacent(last, cell)) return;
  }

  selectedCells.push(cell);
  currentWord += cell.textContent;

  cell.classList.add("active");
  drawLine(selectedCells);
}

function clearSelection() {
  selectedCells.forEach(c => c.classList.remove("active"));
  selectedCells = [];
  currentWord = "";

  removeActiveLine();
}

const spangramBanner = document.getElementById("spangramBanner");

function showSpangramBanner() {
  spangramBanner.classList.add("show");

  setTimeout(() => {
    spangramBanner.classList.remove("show");
  }, 1000);
}

function finishSelection() {
  const word = currentWord;
  const reversed = [...word].reverse().join("");

  const allWords = [...puzzle.words, puzzle.spangram];

  let found = null;

  for (let w of allWords) {
    if (w === word || w === reversed) {
      found = w;
      break;
    }
  }

  if (found && !foundWords.includes(found)) {
    const isSpangram = found === puzzle.spangram;
    if (isSpangram) {
  showSpangramBanner();
}

    markWord(selectedCells, isSpangram);
    drawPermanentLine(selectedCells, isSpangram);
    foundWords.push(found);
    hintIndex = 0;
    updateProgress();
  } else {
    clearSelection();
  }

  removeActiveLine();
  checkLevelComplete();
}

/* ========================
   GAME LOGIC
======================== */

function isAdjacent(c1, c2) {
  const dx = Math.abs(c1.dataset.x - c2.dataset.x);
  const dy = Math.abs(c1.dataset.y - c2.dataset.y);
  return dx <= 1 && dy <= 1;
}

function markWord(cells, isSpangram) {
  cells.forEach(c => {
    c.classList.remove("active");
    c.classList.add(isSpangram ? "spangram" : "found");
  });
}

function checkLevelComplete() {
  const total = puzzle.words.length + 1;

  if (!completedLevels.includes(currentLevel)) {
  completedLevels.push(currentLevel);
  localStorage.setItem("completedLevels", JSON.stringify(completedLevels));
  }

  if (foundWords.length === total) {
    levelCompleteEl.style.display = "block";
  }
}

/* ========================
   LEVEL
======================== */

function nextLevel() {
  currentLevel++;
  hintIndex = 0;

  if (currentLevel >= puzzles.length) {
    alert("Alle Level geschafft!");
    return;
  }

  puzzle = puzzles[currentLevel];

  foundWords = [];
  selectedCells = [];
  currentWord = "";

  svgEl.innerHTML = "";

  levelCompleteEl.style.display = "none";

  themeEl.textContent = puzzle.theme;
  renderGrid();
  updateProgress();
}

/* ========================
   SVG LINES
======================== */

function getCellCenter(cell) {
  const rect = cell.getBoundingClientRect();
  const parent = gridEl.getBoundingClientRect();

  return {
    x: rect.left - parent.left + rect.width / 2,
    y: rect.top - parent.top + rect.height / 2
  };
}

function removeActiveLine() {
  const existing = document.getElementById("active-line");
  if (existing) existing.remove();
}

function drawLine(cells) {
  removeActiveLine();

  if (cells.length < 2) return;

  let path = "";

  cells.forEach((cell, i) => {
    const { x, y } = getCellCenter(cell);
    path += (i === 0 ? "M" : "L") + x + "," + y + " ";
  });

  const line = document.createElementNS("http://www.w3.org/2000/svg", "path");

  line.setAttribute("id", "active-line");
  line.setAttribute("d", path);
  line.setAttribute("stroke", "orange");
  line.setAttribute("stroke-width", "8");
  line.setAttribute("fill", "none");
  line.setAttribute("stroke-linecap", "round");

  svgEl.appendChild(line);
}

function drawPermanentLine(cells, isSpangram) {
  if (cells.length < 2) return;

  let path = "";

  cells.forEach((cell, i) => {
    const { x, y } = getCellCenter(cell);
    path += (i === 0 ? "M" : "L") + x + "," + y + " ";
  });

  const line = document.createElementNS("http://www.w3.org/2000/svg", "path");

  line.setAttribute("d", path);
  line.setAttribute("stroke", isSpangram ? "gold" : "#4caf50");
  line.setAttribute("stroke-width", "8");
  line.setAttribute("fill", "none");
  line.setAttribute("stroke-linecap", "round");

  svgEl.appendChild(line);
}

/* ========================
   HINT
======================== */

function getRemainingWordsSorted() {
  const normalWords = puzzle.words
    .filter(w => !foundWords.includes(w))
    .sort((a, b) => a.length - b.length);

  const spangram = !foundWords.includes(puzzle.spangram)
    ? [puzzle.spangram]
    : [];

  return [...normalWords, ...spangram];
}

function giveHint() {
  const remaining = getRemainingWordsSorted();
  if (!remaining.length) return;

  // 🔥 wichtig: nicht über Länge hinausgehen
  if (hintIndex >= remaining.length) {
    hintIndex = remaining.length - 1;
  }

  const word = remaining[hintIndex];

  hintIndex++; // nächster Hint = nächstes Wort

  const path = findWord(word);
  highlightHint(path);
}

function findWord(word) {
  const rows = puzzle.grid.length;
  const cols = puzzle.grid[0].length;

  function dfs(x, y, index, path, visited) {
    if (index === word.length) return path;

    const key = x + "," + y;

    if (
      x < 0 || y < 0 || x >= cols || y >= rows ||
      visited.has(key) ||
      puzzle.grid[y][x] !== word[index]
    ) return null;

    visited.add(key);
    path.push([x, y]);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const res = dfs(x + dx, y + dy, index + 1, path, visited);
        if (res) return res;
      }
    }

    visited.delete(key);
    path.pop();
    return null;
  }

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const res = dfs(x, y, 0, [], new Set());
      if (res) return res;
    }
  }

  return [];
}

function highlightHint(path) {
  path.forEach(([x, y]) => {
    const cell = document.querySelector(`[data-x='${x}'][data-y='${y}']`);
    if (cell) cell.classList.add("hint");
  });

  setTimeout(() => {
    document.querySelectorAll(".hint")
      .forEach(c => c.classList.remove("hint"));
  }, 5000);
}

function renderLevelGrid() {
  levelGrid.innerHTML = "";

  puzzles.forEach((_, index) => {
    const square = document.createElement("div");

    square.className = "levelSquare";
    square.textContent = index + 1;

    if (completedLevels.includes(index)) {
      square.classList.add("completed");
    }

    if (index === currentLevel) {
      square.classList.add("current");
    }

    square.addEventListener("pointerdown", () => {
      loadLevel(index);
      levelScreen.classList.add("hidden");
    });

    levelGrid.appendChild(square);
  });
}

function loadLevel(index) {
  currentLevel = index;
  puzzle = puzzles[currentLevel];

  foundWords = [];
  selectedCells = [];
  currentWord = "";

  svgEl.innerHTML = "";

  levelCompleteEl.style.display = "none";

  themeEl.textContent = puzzle.theme;

  renderGrid();
  updateProgress();
}