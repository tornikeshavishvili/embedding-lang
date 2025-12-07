// --- Simple helpers for identifiers and number literals ---
function isIdentifier(token) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(token);
}

function isNumberLiteral(token) {
  return /^[0-9]+(\.[0-9]+)?$/.test(token);
}

// --- State ---
// words: { id, name, vector }
// tokens: mapping wordName -> JS token
// macros: macroName -> programText
// similarity: wordId -> { otherWordId: number }
const state = {
  words: [],
  tokens: {},
  macros: {},
  similarity: {}
};

// --- Initial vocabulary: basic pseudo-words ---
const baseWords = [
  { id: "w_define",   name: "define",   vector: [] },
  { id: "w_number",   name: "number",   vector: [] },
  { id: "w_text",     name: "text",     vector: [] },
  { id: "w_list",     name: "list",     vector: [] },

  { id: "w_if",       name: "if",       vector: [] },
  { id: "w_else",     name: "else",     vector: [] },
  { id: "w_repeat",   name: "repeat",   vector: [] },
  { id: "w_times",    name: "times",    vector: [] },

  // extra words for the loop example
  { id: "w_end",        name: "end",        vector: [] },
  { id: "w_forLoop",    name: "forLoop",    vector: [] },
  { id: "w_blockClose", name: "blockClose", vector: [] },

  { id: "w_function", name: "function", vector: [] },
  { id: "w_call",     name: "call",     vector: [] },
  { id: "w_return",   name: "return",   vector: [] },

  { id: "w_set",      name: "set",      vector: [] },
  { id: "w_to",       name: "to",       vector: [] },

  { id: "w_add",      name: "add",      vector: [] },
  { id: "w_sub",      name: "subtract", vector: [] },

  { id: "w_print",    name: "print",    vector: [] },
  { id: "w_log",      name: "log",      vector: [] },

  { id: "w_constkw",  name: "const",    vector: [] },
  { id: "w_letkw",    name: "let",      vector: [] },
  { id: "w_varkw",    name: "var",      vector: [] },

  { id: "w_for",      name: "for",      vector: [] },
  { id: "w_while",    name: "while",    vector: [] },
  { id: "w_do",       name: "do",       vector: [] },
  { id: "w_switch",   name: "switch",   vector: [] },
  { id: "w_case",     name: "case",     vector: [] },
  { id: "w_break",    name: "break",    vector: [] },
  { id: "w_continue", name: "continue", vector: [] },
  { id: "w_try",      name: "try",      vector: [] },
  { id: "w_catch",    name: "catch",    vector: [] },
  { id: "w_finally",  name: "finally",  vector: [] },
  { id: "w_throw",    name: "throw",    vector: [] },

  { id: "w_class",    name: "class",    vector: [] },
  { id: "w_new",      name: "new",      vector: [] },
  { id: "w_this",     name: "this",     vector: [] },
  { id: "w_async",    name: "async",    vector: [] },
  { id: "w_await",    name: "await",    vector: [] }
];

// JS token words: actual symbols and operators
const jsTokenWords = [
  { id: "w_lparen",  name: "(",   vector: [] },
  { id: "w_rparen",  name: ")",   vector: [] },
  { id: "w_lbrace",  name: "{",   vector: [] },
  { id: "w_rbrace",  name: "}",   vector: [] },
  { id: "w_lbrack",  name: "[",   vector: [] },
  { id: "w_rbrack",  name: "]",   vector: [] },
  { id: "w_semicol", name: ";",   vector: [] },
  { id: "w_comma",   name: ",",   vector: [] },
  { id: "w_dot",     name: ".",   vector: [] },

  { id: "w_plus",    name: "+",   vector: [] },
  { id: "w_minus",   name: "-",   vector: [] },
  { id: "w_star",    name: "*",   vector: [] },
  { id: "w_slash",   name: "/",   vector: [] },
  { id: "w_mod",     name: "%",   vector: [] },

  { id: "w_assign",  name: "=",   vector: [] },
  { id: "w_eq",      name: "==",  vector: [] },
  { id: "w_seq",     name: "===", vector: [] },
  { id: "w_neq",     name: "!=",  vector: [] },
  { id: "w_sneq",    name: "!==", vector: [] },
  { id: "w_lt",      name: "<",   vector: [] },
  { id: "w_gt",      name: ">",   vector: [] },
  { id: "w_le",      name: "<=",  vector: [] },
  { id: "w_ge",      name: ">=",  vector: [] },

  { id: "w_and",     name: "&&",  vector: [] },
  { id: "w_or",      name: "||",  vector: [] },
  { id: "w_not",     name: "!",   vector: [] },
  { id: "w_arrow",   name: "=>",  vector: [] }
];

// Predefined mapping: wordName -> JS token/expression
const predefinedTokens = {
  // high-level pseudo-words
  define:   "const",
  number:   "",
  text:     "",
  list:     "[]",

  if:       "if",
  else:     "else",
  repeat:   "// repeat",
  times:    "// times",

  function: "function",
  call:     "",
  return:   "return",

  set:      "=",
  to:       "",

  add:      "+",
  subtract: "-",

  print:    "console.log",
  log:      "console.log",

  const:    "const",
  let:      "let",
  var:      "var",

  for:      "for",
  while:    "while",
  do:       "do",
  switch:   "switch",
  case:     "case",
  break:    "break",
  continue: "continue",
  try:      "try",
  catch:    "catch",
  finally:  "finally",
  throw:    "throw",

  class:    "class",
  new:      "new",
  this:     "this",
  async:    "async",
  await:    "await",

  // punctuation + operators: mapped to themselves
  "(":   "(",
  ")":   ")",
  "{":   "{",
  "}":   "}",
  "[":   "[",
  "]":   "]",
  ";":   ";",
  ",":   ",",
  ".":   ".",

  "+":   "+",
  "-":   "-",
  "*":   "*",
  "/":   "/",
  "%":   "%",

  "=":   "=",
  "==":  "==",
  "===": "===",
  "!=":  "!=",
  "!==": "!==",
  "<":   "<",
  ">":   ">",
  "<=":  "<=",
  ">=":  ">=",

  "&&":  "&&",
  "||":  "||",
  "!":   "!",
  "=>":  "=>"
};

// --- Initialize state with base words + JS token words ---
state.words = [...baseWords, ...jsTokenWords];
state.tokens = { ...predefinedTokens };
state.macros = {};
state.similarity = {};

// --- Similarity matrix initialization ---
function initSimilarityMatrix() {
  const words = state.words;
  for (let i = 0; i < words.length; i++) {
    const wi = words[i];
    if (!state.similarity[wi.id]) state.similarity[wi.id] = {};
    for (let j = 0; j < words.length; j++) {
      const wj = words[j];
      if (!state.similarity[wj.id]) state.similarity[wj.id] = {};
      state.similarity[wi.id][wj.id] = wi.id === wj.id ? 1 : 0;
    }
  }
}
initSimilarityMatrix();

// --- Helpers to look up words and ids ---
function findWordByName(name) {
  return state.words.find((w) => w.name === name) || null;
}

function getWordIdByName(name) {
  const w = findWordByName(name);
  return w ? w.id : null;
}

// --- Similarity-aware token lookup ---
function findNearestMappedToken(wordName) {
  const sourceId = getWordIdByName(wordName);
  if (!sourceId) return null;

  const simRow = state.similarity[sourceId];
  if (!simRow) return null;

  let bestName = null;
  let bestScore = -Infinity;

  for (const other of state.words) {
    const otherId = other.id;
    const otherName = other.name;

    if (!Object.prototype.hasOwnProperty.call(state.tokens, otherName)) continue;

    const score = simRow[otherId];
    if (typeof score !== "number") continue;

    if (score > bestScore) {
      bestScore = score;
      bestName = otherName;
    }
  }

  if (!bestName) return null;
  return state.tokens[bestName] || "";
}

// --- Custom token mappings for the repeat / end loop example ---

// basic variable / assignment / output
state.tokens["define"] = "let ";          // "define counter number" -> "let counter "
state.tokens["number"] = "";              // ignore "number"
state.tokens["set"]    = "";              // "set counter to 0" -> "counter = 0"
state.tokens["to"]     = "=";
state.tokens["print"]  = "console.log";

// loop helpers: we split header across repeat + number + times
state.tokens["forLoop"]    = "for (let i = 0; i < ";
state.tokens["blockClose"] = "}";

// IMPORTANT: "repeat", "times", "end"
// - "repeat" is resolved via similarity to "forLoop" (prefix)
// - "times" closes header and opens block: ") {"
// - "end" is resolved via similarity to "blockClose"
state.tokens["repeat"] = "";       // resolved via similarity to "forLoop"
state.tokens["times"]  = ") {";    // closes `for (let i = 0; i < 5` → `for (let i = 0; i < 5) {`
state.tokens["end"]    = "";       // resolved via similarity to "blockClose"

// --- Custom similarity for the example ---

const sim = state.similarity;

function setSim(idA, idB, value) {
  sim[idA][idB] = value;
  sim[idB][idA] = value;
}

const ID_REPEAT     = "w_repeat";
const ID_FORLOOP    = "w_forLoop";
const ID_END        = "w_end";
const ID_BLOCKCLOSE = "w_blockClose";

setSim(ID_REPEAT, ID_FORLOOP, 0.95);   // repeat ~ forLoop
setSim(ID_END,    ID_BLOCKCLOSE, 0.96); // end ~ blockClose
setSim(ID_REPEAT, ID_END, 0.1);        // weak relation (optional)
