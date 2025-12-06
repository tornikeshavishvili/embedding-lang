# Word-Embedding Programming Workbench

Interactive browser playground for experimenting with a **word-based programming language**:

1. You define words and a similarity matrix.
2. You map words to JavaScript tokens/expressions.
3. You write programs and macros using those words.
4. The tool expands macros and compiles the text into JavaScript.

Everything runs entirely in the browser (no backend).

---

## Features

### 1. Vocabulary & Similarity Matrix

Left panel lets you build the “language”:

- Add/update words with a **diagonal similarity value** (just a number for now).  
- See all words in a table and edit or delete them.  
- Edit the **similarity matrix** directly: each cell is a similarity score between two words. The matrix is kept symmetric and defaults to `1` on the diagonal and `0` elsewhere.  
- Filter the vocabulary and the matrix via the “Search words” box.

These similarities are later used to choose which mapped JS token is “closest” to a word when compiling.

### 2. Token Mapping (Words → JavaScript)

Still in the left panel:

- A “Token mapping” table shows each word with a text field where you can enter the **JS token or expression** to use when compiling.  
- Some mappings are predefined (e.g. `define → const`, `print → console.log`, `list → []`, punctuation and operators map to themselves).:contentReference[oaicite:3]{index=3}  

When compiling:

1. The system first looks for a mapped token using the **similarity matrix** (`findNearestMappedToken`).  
2. If nothing is found, it falls back to a direct mapping using the word’s own mapping.  
3. If still nothing, identifiers and number literals are passed through unchanged; other tokens are preserved as-is.  

### 3. Program Editor & Macros

Right panel:

- Main program textarea with a live **token counter**.  
- “Expand macros”:
  - Replaces macro names in the program with their macro bodies.
  - Preserves whitespace and punctuation so formatting stays readable.  
- “Compile to JavaScript”:
  - First expands macros.
  - Then runs the similarity-aware compiler to produce JS code.  
  - Shows both the expanded program and the compiled JS in read-only boxes.  

#### Macro System

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
- Import logic validates structure and repairs missing similarity entries to keep the matrix well-formed.:contentReference[oaicite:12]{index=12}  

---

## Project Structure

```text
.
├── index.html        # App layout and DOM structure
├── styles.css        # Dark theme UI styling
├── app-core.js       # Core language state & helpers (words, similarity, tokens)
├── app-dom-ui.js     # DOM bindings, rendering of tables, macro list, export/import
├── app-program.js    # Macro expansion + similarity-aware compiler
├── app.js            # (Monolithic variant / older combined version)
├── package.json      # NPM metadata (currently only peggy dependency)
└── package-lock.json
