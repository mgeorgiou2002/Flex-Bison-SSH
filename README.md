# Flex/Bison VS Code Extension

A Visual Studio Code extension that provides development support for
Flex and Bison files (.l and .y).

The extension adds syntax highlighting, linting, code navigation,
autocomplete, and visualization tools to help users develop lexers
and parsers more efficiently.

## Features

- Syntax highlighting for Flex (.l) and Bison (.y)
- Autocomplete for directives, tokens and grammar rules
- Hover documentation for common Flex/Bison functions and directives
- Go to Definition for tokens and grammar rules
- Find References across Flex and Bison files
- Document outline for grammar sections and rules
- Real-time linting with compiler diagnostics
- Semantic analysis (undefined symbols, duplicate declarations, unused tokens)
- Quick fixes for common issues
- Flex/Bison build command
- Regex tester for Flex regular expressions
- Grammar graph visualization for Bison grammars

- ## Screenshots

### Syntax Highlighting

![Syntax-Highlight](images/syntaxhighlighting.png)

### Hover Window

![Hover-Window](images/hover.gif)

### Autocomplete

![Autocomplete](images/autocomplete.gif)

### Linting and Quick Fix

![Lint](images/lint.gif)

### Grammar Graph

![Graph](images/grammargraph.png)

### Regex Tester

![Regex](images/regextester.png)

### Bison Auto-build

![Bison-auto](images/bisongif.gif)

### Flex Auto-build

![Flex-auto](images/flexgif.gif)

## Installation

1. Install Visual Studio Code
2. Install Flex and Bison on your system
3. Clone this repository
4. Run:

npm install

npm run compile

5. Press F5 in VS Code to launch the extension

Or

 VS Code Marketplace

This extension is available on the Visual Studio Code Marketplace.
## Usage

### Build Flex/Bison

Click the **Build Flex/Bison** button in the toolbar 

---

### Regex Tester

Open the Regex Tester from the command palette:

Flex: Regex Tester

Insert a regular expression and test input to see if it is accepted.

---

### Grammar Graph

Open a Bison (.y) file and run:

Flex: Show Grammar Graph

to visualize grammar rule dependencies.

## Example

Example Bison rule:

expr:
    expr '+' expr
  | NUMBER
  ;

  ## Requirements

- Flex
- Bison
- GCC
- Visual Studio Code

## Quick-Guide

After installing the extension, open a workspace containing Flex (`.l`) and/or Bison (`.y`) files.

### Build Flex/Bison

Use the **Build Flex/Bison** button in the toolbar or run the following command from the Command Palette:

Flex: Run Flex/Bison

The extension will automatically:

- Detect `.l` and `.y` files in the current folder
- Run **Flex**, **Bison**, and **GCC**
- Display compilation output in the **Flex/Bison Output** panel
- Show compiler errors and warnings directly inside the editor

---

### Linting and Diagnostics

The extension performs **real-time linting** while editing Flex and Bison files.

It detects:

- Undefined symbols
- Duplicate token declarations
- Duplicate grammar rules
- Unused tokens
- Unused grammar rules

Compiler diagnostics from Flex/Bison/GCC are also displayed directly in the editor.

Quick fixes are provided for common issues, such as automatically creating missing `%token` declarations.

---

### Autocomplete

The extension provides **IntelliSense suggestions** for:

- Flex directives (`%option`, `%x`, `%s`)
- Bison directives (`%token`, `%type`, `%left`, `%right`)
- Common Flex/Bison variables and functions
- Tokens and grammar rules declared inside the current file

---

### Go to Definition and Find References

Navigation features are available for grammar development:

- **Go to Definition**: Jump to token or rule declarations.
- **Find References**: Locate all usages of a token or rule across Flex and Bison files.

---

### Grammar Graph

The extension can visualize grammar rule dependencies.

This opens an interactive graph showing relationships between grammar rules and tokens. Nodes are clickable and allow quick navigation to the corresponding definition in the source file.

---

### Regex Tester

The extension includes a **Flex Regex Tester** tool.

You can enter a regular expression and test input to check whether the input is **accepted or rejected**, helping you debug Flex patterns.


## Author

Marios Georgiou  
Student ID: ics22140  

Department of Applied Informatics  
University of Macedonia, Thessaloniki, Greece  
