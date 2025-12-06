// --- Program utilities ---
// Shared splitter: whitespace OR single-char punctuation OR everything else
function splitWithWhitespaceAndPunct(text) {
  // note: * and / are escaped as \* and \/
  return text.split(/(\s+|[(){}\[\];,.:+\-*\/%!<>=&|])/);
}

// Use this for token counting (non-whitespace, non-empty pieces)
function tokenizeProgram(text) {
  const parts = splitWithWhitespaceAndPunct(text);
  return parts.filter((t) => t && !/^\s+$/.test(t));
}

// --- Whitespace-preserving macro expansion ---

function expandTokenPreserve(token, visited) {
  if (!visited) visited = new Set();
  if (visited.has(token)) {
    // prevent infinite recursion
    return token;
  }

  const body = state.macros[token];
  if (typeof body !== "string") {
    // not a macro name
    return token;
  }

  visited.add(token);
  // Expand the macro body itself, preserving its own formatting
  return expandProgram(body, new Set(visited));
}

function expandProgram(text, visited) {
  if (!visited) visited = new Set();

  const parts = splitWithWhitespaceAndPunct(text);
  const result = [];

  for (const part of parts) {
    if (part === "") continue;

    // Whitespace: keep as is
    if (/^\s+$/.test(part)) {
      result.push(part);
      continue;
    }

    // Single-char punctuation tokens: keep as is, do NOT treat as macro names
    if (/^[(){}\[\];,.:+\-*\/%!<>=&|]$/.test(part)) {
      result.push(part);
      continue;
    }

    // Otherwise this is a word-like token → possible macro name
    const token = part;
    const expanded = expandTokenPreserve(token, visited);
    result.push(expanded);
  }

  return result.join("");
}

// Compile: similarity-first, then direct mapping, then identifier/number/as-is,
// preserving all whitespace
function compileProgram(text) {
  const parts = splitWithWhitespaceAndPunct(text);
  const compiledParts = [];

  for (const part of parts) {
    if (part === "") continue;

    // Preserve whitespace exactly (spaces, tabs, newlines)
    if (/^\s+$/.test(part)) {
      compiledParts.push(part);
      continue;
    }

    // Preserve punctuation as is
    if (/^[(){}\[\];,.:+\-*\/%!<>=&|]$/.test(part)) {
      compiledParts.push(part);
      continue;
    }

    // Word-like token
    const token = part;

    // 1) similarity-based mapping
    let mapped = findNearestMappedToken(token);

    // 2) fallback to direct mapping
    if (!mapped || mapped.trim() === "") {
      mapped = state.tokens[token] ?? null;
    }

    // 3) decide what to emit
    if (mapped && mapped.trim().length > 0) {
      compiledParts.push(mapped);
    } else if (isIdentifier(token) || isNumberLiteral(token)) {
      compiledParts.push(token);
    } else {
      // unknown stuff – pass through
      compiledParts.push(token);
    }
  }

  // join with "" because whitespace and punctuation segments are included
  return compiledParts.join("");
}



function updateTokenCount() {
  const tokens = tokenizeProgram(mainProgramInput.value);
  tokenCountLabel.textContent = String(tokens.length);
}

exportStateBtn.addEventListener("click", () => {
  exportStateToFile();
});

importStateBtn.addEventListener("click", () => {
  importStateInput.click();
});

importStateInput.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  importStateFromFile(file);
});

mainProgramInput.addEventListener("input", updateTokenCount);

expandMacrosBtn.addEventListener("click", () => {
  const expanded = expandProgram(mainProgramInput.value);
  expandedOutput.textContent = expanded || "(empty)";
});

compileBtn.addEventListener("click", () => {
  const expanded = expandProgram(mainProgramInput.value);
  expandedOutput.textContent = expanded || "(empty)";
  const jsCode = compileProgram(expanded);
  compiledOutput.textContent = jsCode || "// nothing compiled";
});

// --- Macro handlers ---
saveMacroBtn.addEventListener("click", () => {
  const name = macroNameInput.value.trim();
  if (!name) {
    alert("Macro name cannot be empty.");
    return;
  }
  const body = macroEditorInput.value.trim();
  if (!body) {
    alert("Macro program is empty.");
    return;
  }
  state.macros[name] = body;
  renderMacros();
});

clearMacrosBtn.addEventListener("click", () => {
  if (!confirm("Delete all macros?")) return;
  state.macros = {};
  macroNameInput.value = "";
  macroEditorInput.value = "";
  renderMacros();
});

// --- Main render ---
function renderAll() {
  renderWordTable();
  renderSimilarityMatrix();
  renderTokenTable();
  renderMacros();
  updateTokenCount();
}

// initial render
renderAll();
