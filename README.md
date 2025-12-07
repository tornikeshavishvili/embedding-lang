# Word-Embedding Programming Workbench

Interactive browser playground for experimenting with a **word-based, similarity-aware programming language**.

At a high level:

1. You define words and a similarity matrix.
2. You map words to JavaScript tokens/expressions.
3. You write programs and macros using those words.
4. The tool expands macros and compiles the text into JavaScript.
5. You can **toggle** whether the similarity matrix is used during compilation to see how much it helps.

Everything runs entirely in the browser (no backend).

---

## Why this is innovative

This workbench is not “just another DSL editor”. It experiments with three ideas at once:

1. **Similarity-driven compilation**

   - Each word lives in a similarity space.
   - When compiling, the system can choose a mapped JS token not only from the word itself, but also from the **nearest mapped neighbour** in the similarity matrix.
   - This lets you explore how fuzzy / semantic relationships between words can influence code generation.

2. **Two compilation modes for A/B comparison**

   - A small inline toggle in the program panel controls whether compilation uses the similarity matrix or not.
   - With the toggle ON → the compiler is **similarity-first**, then falls back to direct mappings.
   - With the toggle OFF → the compiler ignores similarity completely and behaves as a pure token-mapping DSL.
   - This makes it easy to demonstrate, measure, and explain the effect of similarity on generated code length and structure.

3. **Macro system over a word-language**

   - Macros are defined in the same word-based language you are experimenting with.
   - Macro expansion preserves whitespace and punctuation, so expanded programs stay human-readable.
   - Because macros plus similarity mappings are both present, you can design very high-level “story-like” constructs, then see how they collapse into JavaScript.

Together, these pieces let you present the project as:

> “A research playground for **semantic, similarity-aware code generation** from word-based languages, with a live A/B switch between fuzzy and exact compilation.”

---

## Features

### 1. Vocabulary & Similarity Matrix

The left panel lets you build the “language”:

- Add/update words with a **diagonal similarity value** (just a number for now).  
- See all words in a table and edit or delete them.  
- Edit the **similarity matrix** directly: each cell is a similarity score between two words. The matrix is kept symmetric and defaults to `1` on the diagonal and `0` elsewhere.  
- Filter the vocabulary and the matrix via the “Search words” box.

These similarities are later used to choose which mapped JS token is “closest” to a word when compiling.

### 2. Token Mapping (Words → JavaScript)

Still in the left panel:

- A “Token mapping” table shows each word with a text field where you can enter the **JS token or expression** to use when compiling.  
- Some mappings are predefined (e.g. `define → const`, `print → console.log`, `list → []`, punctuation and operators map to themselves).

When compiling:

1. The system first looks for a mapped token using the **similarity matrix** (`findNearestMappedToken`).  
2. If nothing is found, it falls back to a direct mapping using the word’s own mapping.  
3. If still nothing, identifiers and number literals are passed through unchanged; other tokens are preserved as-is.  

### 3. Program Editor & Macros

The right panel contains the **program editor** and the **macro editor**.

Program editor:

- Main program textarea with a live **token counter**.
- Compact toolbar with:
  - “Expand macros”  
  - “Compile to JavaScript”  
  - A **“Use similarity matrix”** checkbox to enable/disable similarity-aware compilation.
- When you click “Compile to JavaScript”:
  - The tool first expands macros (whitespace-preserving).
  - Then it chooses either:
    - `compileProgram` (similarity-first) if the toggle is ON, or  
    - `compileProgramDirect` (direct mapping only) if the toggle is OFF.
  - The expanded program and the compiled JS are shown in read-only boxes.
  - A compiled-token counter shows how many JS tokens your program collapsed into.

Macro system:

- Define a macro by giving it a **name** and a **macro body** (a small program snippet).  
- Save/update macros, list them as “chips,” and:
  - Insert the macro name into the main program,
  - Edit,
  - Delete.  
- Macro expansion is recursive but guards against infinite recursion by tracking visited macro names.  

### 4. State Export / Import

- Export the full editor state as JSON:
  - `words`, `tokens`, `similarity`, `macros`, and the current `program`.  
- Import a previously saved JSON file to restore everything.  
- Import logic validates structure and repairs missing similarity entries to keep the matrix well-formed.

---

## Example: positioning language as “semantic pseudocode”

For example, you might define mappings like:

- `define → const`
- `set → =`
- `print → console.log`
- `repeat`, `times` mapped to small JS fragments or comments.

Then write a program:

```text
define counter number
set counter to 0

repeat 5 times
  print counter
  set counter to counter + 1
end
```

With the similarity matrix tuned appropriately, you can:

- Map `repeat` close to `for`, `loop`, or `while`.
- Map `end` close to `}`.
- See how the **same program** compiles differently when similarity is ON vs OFF:
  - With similarity OFF, you get something closer to a literal DSL expansion.
  - With similarity ON, the system may choose “nearby” mapped tokens you did not explicitly assign to these words.

This is a good story for talks, demos, and research writeups.

---

## Project Structure

```text
.
├── index.html        # App layout and DOM structure
├── styles.css        # Dark theme UI styling
├── app-core.js       # Core language state & helpers (words, similarity, tokens)
├── app-dom-ui.js     # DOM bindings, rendering of tables, macro list, export/import
├── app-program.js    # Macro expansion + similarity-aware and direct-only compilers 
```

You only need a static file server (or your browser’s “Open file…” menu) to run it.

---

## How to run

1. Open `index.html` in a modern browser (Chrome, Edge, Firefox).  
2. Start adding words and mappings on the left.  
3. Write a program and macros on the right.  
4. Toggle **“Use similarity matrix”** on/off and recompile to see how the semantics change.

This makes the project a compact, self-contained lab for experimenting with **word embeddings, similarity matrices, and macro-driven compilation**.
---

## Example: similarity matrix tuning for `repeat ... times`

To make the pseudocode

```text
define counter number
set counter to 0

repeat 5 times
  print counter
  set counter to counter + 1
end
```

compile into a normal JavaScript `for` loop when **"Use similarity matrix"** is enabled, you can tune the token mappings and similarity matrix as follows.

### Token mappings

Assume you have these words in the vocabulary:

`define, number, set, to, print, repeat, times, end, forLoop, blockClose`

Configure their JavaScript mappings:

```js
// basic variable / assignment / output
tokens["define"] = "let ";          // "define counter number" -> "let counter "
tokens["number"] = "";              // ignore "number"
tokens["set"]    = "";              // "set counter to 0" -> "counter = 0"
tokens["to"]     = "=";
tokens["print"]  = "console.log";

// loop helpers (the "true" implementation)
tokens["forLoop"]     = "for (let i = 0; i < ";
tokens["blockClose"]  = "}";

// optional: ignore these words directly; they will resolve via similarity
tokens["repeat"] = "";   // resolved via similarity to "forLoop"
tokens["times"]  = "";   // decorative
tokens["end"]    = "";   // resolved via similarity to "blockClose"]
```

### Similarity matrix

Now configure the similarity matrix so that `repeat` is close to `forLoop` and `end` is close to `blockClose`:

```js
// diagonals
similarity["repeat"]["repeat"]          = 1.0;
similarity["forLoop"]["forLoop"]        = 1.0;
similarity["end"]["end"]                = 1.0;
similarity["blockClose"]["blockClose"]  = 1.0;

// cross-terms for loop opening
similarity["repeat"]["forLoop"]         = 0.95;
similarity["forLoop"]["repeat"]         = 0.95;

// cross-terms for loop closing
similarity["end"]["blockClose"]         = 0.96;
similarity["blockClose"]["end"]         = 0.96;

// everything else can stay at or near zero
similarity["repeat"]["end"]             = 0.1;
similarity["end"]["repeat"]             = 0.1;
```

With this tuning, when the compiler encounters:

- `repeat` it uses `findNearestMappedToken("repeat")`, which selects `forLoop`.
- `end` it uses `findNearestMappedToken("end")`, which selects `blockClose`.

So the program compiles approximately to:

```js
let counter
counter = 0

for (let i = 0; i < 5) {
  console.log(counter)
  counter = counter + 1
}
```

This example demonstrates how **semantic similarity** can redirect high-level, natural-language words to the low-level constructs that actually implement the loop.

