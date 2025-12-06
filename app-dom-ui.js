// --- DOM references ---

// left side
const wordInput = document.getElementById("word-input");
const vectorInput = document.getElementById("vector-input");
const addWordBtn = document.getElementById("add-word-btn");
const clearAllBtn = document.getElementById("clear-all-btn");
const searchWordInput = document.getElementById("search-word-input");

const wordTableBody = document.getElementById("word-table-body");
const simHead = document.getElementById("sim-matrix-head");
const simBody = document.getElementById("sim-matrix-body");

const tokenTableBody = document.getElementById("token-table-body");

// right side – main program editor
const mainProgramInput = document.getElementById("main-program-input");
const expandMacrosBtn = document.getElementById("expand-macros-btn");
const compileBtn = document.getElementById("compile-btn");
const expandedOutput = document.getElementById("expanded-output");
const compiledOutput = document.getElementById("compiled-output");
const tokenCountLabel = document.getElementById("token-count");

// right side – macro editor
const macroNameInput = document.getElementById("macro-name-input");
const macroEditorInput = document.getElementById("macro-editor-input");
const saveMacroBtn = document.getElementById("save-macro-btn");
const clearMacrosBtn = document.getElementById("clear-macros-btn");
const macroList = document.getElementById("macro-list");
const noMacrosHint = document.getElementById("no-macros-hint");
const macroDetails = document.getElementById("macro-details");

const exportStateBtn = document.getElementById("export-state-btn");
const importStateBtn = document.getElementById("import-state-btn");
const importStateInput = document.getElementById("import-state-input");

// --- Export / Import of state (words + similarity + tokens + macros + program) ---

function loadMacroToEditor(name) {
  const body = state.macros[name];
  if (typeof body !== "string") return;
  macroNameInput.value = name;
  macroEditorInput.value = body;
}

function exportStateToFile() {
  const payload = {
    words: state.words,
    tokens: state.tokens,
    similarity: state.similarity,
    macros: state.macros,
    program: mainProgramInput.value
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  a.href = url;
  a.download = `word-embedding-state-${timestamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

function importStateFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);

      if (!data || typeof data !== "object") {
        throw new Error("Invalid JSON structure.");
      }
      if (!Array.isArray(data.words)) {
        throw new Error("Missing or invalid 'words' array.");
      }
      if (typeof data.tokens !== "object" || data.tokens === null) {
        throw new Error("Missing or invalid 'tokens' object.");
      }
      if (typeof data.similarity !== "object" || data.similarity === null) {
        throw new Error("Missing or invalid 'similarity' object.");
      }

      // Assign loaded state
      state.words = data.words;
      state.tokens = data.tokens;
      state.similarity = data.similarity;

      // macros are optional
      if (data.macros && typeof data.macros === "object") {
        state.macros = data.macros;
      } else {
        state.macros = {};
      }

      // restore main program if present
      if (typeof data.program === "string") {
        mainProgramInput.value = data.program;
      } else {
        mainProgramInput.value = "";
      }

      // Ensure all words have similarity rows/cols
      for (const w of state.words) {
        if (!state.similarity[w.id]) {
          state.similarity[w.id] = {};
        }
      }
      // Ensure symmetry + defaults
      for (const wi of state.words) {
        for (const wj of state.words) {
          if (state.similarity[wi.id][wj.id] == null) {
            state.similarity[wi.id][wj.id] = wi.id === wj.id ? 1 : 0;
          }
          if (!state.similarity[wj.id]) {
            state.similarity[wj.id] = {};
          }
          if (state.similarity[wj.id][wi.id] == null) {
            state.similarity[wj.id][wi.id] = state.similarity[wi.id][wj.id];
          }
        }
      }

      renderAll();
      updateTokenCount();
    } catch (err) {
      console.error(err);
      alert("Failed to import state: " + err.message);
    } finally {
      importStateInput.value = "";
    }
  };
  reader.readAsText(file);
}

// --- Helpers ---
function parseVector(str) {
  if (!str.trim()) return [];
  return str
    .split(",")
    .map((x) => x.trim())
    .filter((x) => x.length > 0)
    .map((x) => Number(x))
    .filter((x) => !Number.isNaN(x));
}

function safeText(str) {
  return String(str ?? "");
}

function getWordByName(name) {
  return state.words.find((w) => w.name === name) || null;
}

// shared filtered words based on search
function getFilteredWords() {
  const filter = searchWordInput.value.trim().toLowerCase();
  if (!filter) return state.words;
  return state.words.filter((w) => w.name.toLowerCase().includes(filter));
}

function findNearestMappedToken(wordName) {
  const w = getWordByName(wordName);
  if (!w) return null;

  const row = state.similarity[w.id];
  if (!row) return null;

  let bestName = null;
  let bestSim = -Infinity;

  for (const other of state.words) {
    const sim = row[other.id];
    if (sim == null) continue;

    const mapped = state.tokens[other.name];
    if (!mapped || mapped.trim() === "") continue;

    if (sim > bestSim) {
      bestSim = sim;
      bestName = other.name;
    }
  }

  if (bestName == null) return null;
  return state.tokens[bestName];
}

// Ensure similarity row/column for a new word ID
function ensureSimilarityForNewWord(newId, diagVal) {
  const words = state.words;

  if (!state.similarity[newId]) state.similarity[newId] = {};
  state.similarity[newId][newId] = diagVal;

  for (const w of words) {
    if (!state.similarity[w.id]) state.similarity[w.id] = {};
  }

  for (const w of words) {
    if (w.id === newId) continue;
    if (state.similarity[newId][w.id] === undefined) {
      state.similarity[newId][w.id] = 0;
    }
    if (state.similarity[w.id][newId] === undefined) {
      state.similarity[w.id][newId] = 0;
    }
  }
}

// --- Rendering: vocabulary table ---
function renderWordTable() {
  const filtered = getFilteredWords();
  wordTableBody.innerHTML = "";

  if (filtered.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 3;
    td.textContent = "No words yet. Add a word above.";
    td.style.color = "#6b7280";
    tr.appendChild(td);
    wordTableBody.appendChild(tr);
    return;
  }

  for (const w of filtered) {
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.textContent = w.name;

    const tdVec = document.createElement("td");
    tdVec.textContent = "[" + (w.vector || []).join(", ") + "]";

    const tdActions = document.createElement("td");
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.classList.add("danger");
    deleteBtn.style.fontSize = "11px";
    deleteBtn.addEventListener("click", () => {
      state.words = state.words.filter((x) => x.id !== w.id);
      delete state.tokens[w.name];
      delete state.similarity[w.id];
      for (const key in state.similarity) {
        if (Object.prototype.hasOwnProperty.call(state.similarity, key)) {
          delete state.similarity[key][w.id];
        }
      }
      renderAll();
    });

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.style.marginLeft = "4px";
    editBtn.style.fontSize = "11px";
    editBtn.addEventListener("click", () => {
      wordInput.value = w.name;
      vectorInput.value = (w.vector || []).join(", ");
    });

    tdActions.appendChild(deleteBtn);
    tdActions.appendChild(editBtn);

    tr.appendChild(tdName);
    tr.appendChild(tdVec);
    tr.appendChild(tdActions);
    wordTableBody.appendChild(tr);
  }
}

// --- Rendering: similarity matrix (filter rows only, show all columns) ---
function renderSimilarityMatrix() {
  const rowWords = getFilteredWords(); // filtered by search
  const colWords = state.words;        // ALL words → all columns

  simHead.innerHTML = "";
  simBody.innerHTML = "";

  if (rowWords.length === 0 || colWords.length === 0) return;

  // header row: all columns
  const headerRow = document.createElement("tr");
  const corner = document.createElement("th");
  corner.textContent = "";
  headerRow.appendChild(corner);
  for (const w of colWords) {
    const th = document.createElement("th");
    th.textContent = w.name;
    headerRow.appendChild(th);
  }
  simHead.appendChild(headerRow);

  // body rows: only filtered rows, but full set of columns
  for (const wi of rowWords) {
    const tr = document.createElement("tr");
    const rowHeader = document.createElement("td");
    rowHeader.textContent = wi.name;
    rowHeader.style.fontWeight = "600";
    tr.appendChild(rowHeader);

    for (const wj of colWords) {
      const td = document.createElement("td");
      const val =
        state.similarity[wi.id] && state.similarity[wi.id][wj.id] != null
          ? state.similarity[wi.id][wj.id]
          : 0;

      td.textContent = String(val);
      td.style.textAlign = "right";
      td.style.fontVariantNumeric = "tabular-nums";
      td.dataset.rowId = wi.id;
      td.dataset.colId = wj.id;
      td.contentEditable = "true";

      if (wi.id === wj.id) {
        td.style.color = "#22c55e";
      } else if (val > 0) {
        td.style.color = "#a3e635";
      } else if (val < 0) {
        td.style.color = "#f97316";
      } else {
        td.style.color = "#9ca3af";
      }

      tr.appendChild(td);
    }
    simBody.appendChild(tr);
  }
}

// Handle in-place editing of similarity cells
simBody.addEventListener(
  "blur",
  (e) => {
    const cell = e.target;
    if (!cell.dataset || !cell.dataset.rowId || !cell.dataset.colId) return;
    const rowId = cell.dataset.rowId;
    const colId = cell.dataset.colId;
    const raw = cell.textContent.trim();

    let newVal;
    if (raw === "") {
      newVal = 0;
    } else {
      const num = Number(raw);
      if (Number.isNaN(num)) {
        renderSimilarityMatrix();
        return;
      }
      newVal = num;
    }

    if (!state.similarity[rowId]) state.similarity[rowId] = {};
    if (!state.similarity[colId]) state.similarity[colId] = {};
    state.similarity[rowId][colId] = newVal;
    state.similarity[colId][rowId] = newVal; // symmetric
    renderSimilarityMatrix();
  },
  true
);

// --- Rendering: token table (filtered) ---
function renderTokenTable() {
  const words = getFilteredWords();
  tokenTableBody.innerHTML = "";

  if (words.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 2;
    td.textContent = "No words to map yet.";
    td.style.color = "#6b7280";
    tr.appendChild(td);
    tokenTableBody.appendChild(tr);
    return;
  }

  for (const w of words) {
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.textContent = w.name;

    const tdToken = document.createElement("td");
    const input = document.createElement("input");
    input.type = "text";
    input.className = "token-input";
    input.value = state.tokens[w.name] ?? "";
    input.placeholder = "// JS for '" + w.name + "'";
    input.addEventListener("input", () => {
      state.tokens[w.name] = input.value;
    });
    tdToken.appendChild(input);

    tr.appendChild(tdName);
    tr.appendChild(tdToken);
    tokenTableBody.appendChild(tr);
  }
}

// --- Macro rendering ---
function renderMacros() {
  macroList.innerHTML = "";
  macroDetails.innerHTML = "";

  const names = Object.keys(state.macros);

  if (names.length === 0) {
    noMacrosHint.style.display = "block";
    return;
  }
  noMacrosHint.style.display = "none";

  for (const name of names) {
    const macroBody = state.macros[name];
    const previewBody = String(macroBody ?? "")
      .replace(/\s+/g, " ")
      .trim();
    const shortPreview =
      previewBody.slice(0, 80) + (previewBody.length > 80 ? "…" : "");

    const row = document.createElement("div");
    row.className = "chip";

    const titleSpan = document.createElement("span");
    titleSpan.innerHTML =
      "<strong>" + safeText(name) + ":</strong> " + safeText(shortPreview);

    const insertBtn = document.createElement("button");
    insertBtn.textContent = "Insert name";
    insertBtn.style.marginLeft = "8px";
    insertBtn.style.fontSize = "11px";
    insertBtn.addEventListener("click", () => {
      const current = mainProgramInput.value;
      const sep = current.trim().length === 0 ? "" : "\n";
      mainProgramInput.value = current + sep + name;
      updateTokenCount();
    });

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.style.marginLeft = "4px";
    editBtn.style.fontSize = "11px";
    editBtn.addEventListener("click", () => {
      loadMacroToEditor(name);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "danger";
    deleteBtn.style.marginLeft = "4px";
    deleteBtn.style.fontSize = "11px";
    deleteBtn.addEventListener("click", () => {
      if (!confirm(`Delete macro "${name}"?`)) return;
      delete state.macros[name];
      if (macroNameInput.value === name) {
        macroNameInput.value = "";
        macroEditorInput.value = "";
      }
      renderMacros();
    });

    row.appendChild(titleSpan);
    row.appendChild(insertBtn);
    row.appendChild(editBtn);
    row.appendChild(deleteBtn);

    macroList.appendChild(row);
  }
}

// --- Word add / update handler ---
addWordBtn.addEventListener("click", () => {
  const name = wordInput.value.trim();
  if (!name) {
    alert("Word cannot be empty.");
    return;
  }

  const rawStr = vectorInput.value.trim();
  let diagVal = 1;
  let vec = [];

  if (rawStr !== "") {
    const num = Number(rawStr);
    if (Number.isNaN(num)) {
      alert("Diagonal similarity must be a valid number (e.g. 1, 0.5, -2).");
      return;
    }

    diagVal = num;
    vec = [num];
  }

  let existing = state.words.find((w) => w.name === name);
  if (existing) {
    existing.vector = vec;
    ensureSimilarityForNewWord(existing.id, diagVal);
  } else {
    const newId =
      "w_" + Date.now().toString(16) + "_" + Math.random().toString(16).slice(2);
    const newWord = { id: newId, name, vector: vec };
    state.words.push(newWord);
    ensureSimilarityForNewWord(newId, diagVal);
  }

  if (state.tokens[name] === undefined) {
    state.tokens[name] = "";
  }

  wordInput.value = "";
  vectorInput.value = "";
  renderAll();
});

clearAllBtn.addEventListener("click", () => {
  if (!confirm("Clear all words, similarity matrix and token mappings?")) return;
  state.words = [];
  state.tokens = {};
  state.similarity = {};
  state.macros = {};
  mainProgramInput.value = "";
  macroNameInput.value = "";
  macroEditorInput.value = "";
  renderAll();
});

// SEARCH: re-render everything so all views are filtered
searchWordInput.addEventListener("input", () => {
  renderAll();
});


