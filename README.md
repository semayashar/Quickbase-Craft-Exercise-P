# TypeScript Dependency Analysis Program

A **TypeScript-based dependency analysis tool** that inspects relationships between local modules.
It combines **heuristic (programmatic)** and **LLM-driven (Gemini API)** insights to evaluate module coupling, circular dependencies, and architectural complexity — providing actionable refactoring recommendations.

---

## Overview

This tool helps developers:

* Detect **circular dependencies**
* Identify **tightly coupled modules**
* Assess **architectural complexity**
* Get **AI-powered refactoring suggestions**

---

## Core Features

### 1. Dependency Parsing

* Scans `.ts`, `.tsx`, `.js`, and `.jsx` files within the `src` directory
* Extracts **relative import statements** to build a **dependency graph**

### 2. LLM Integration (Gemini API)

* Sends only **structured dependency maps** (`Map<string, string[]>`) — **never raw source code**
* LLM provides:

  * Hidden circular dependency detection
  * Coupling & cohesion insights
  * Architectural refactoring recommendations

### 3. Heuristic Analysis

* Uses **Depth-First Search (DFS)** to find cycles & score coupling
* Implemented in `heuristicAnalyzer.ts`

### 4. Structured Output

* Combines both analyses into a unified **JSON report**
* Designed for **CI/CD** integration or visualization dashboards

### 5. REST API Server

* Lightweight **Express server** exposing results via HTTP
* Enables automation and visualization tools

---

## Project Structure

```bash
├── .env                        # Environment configuration (API key, port)
├── .gitignore                  
├── package.json                # Project metadata & dependencies
├── README.md                   # Documentation
├── READMEORIGINAL.md           # Original spec document
├── src
│   ├── analyzers
│   │   ├── heuristicAnalyzer.ts    # Programmatic analysis
│   │   └── llmAnalyzer.ts          # Gemini API integration
│   │
│   ├── core
│   │   ├── parser.ts              # Builds dependency map
│   │   └── server.ts              # Express server
│   │
│   ├── utils
│   │   ├── arrayUtils.ts
│   │   ├── mathUtils.ts
│   │   ├── statsUtils.ts
│   │   ├── stringUtils.ts
│   │   └── templateUtils.ts
│   │
│   └── index.ts                   # Entry point
│
└── tsconfig.json                 # TypeScript configuration
```

---

## Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

> Requires **Node.js v18+**.
> You can run scripts directly using `ts-node`.

### 2. Configure Environment

Create a `.env` file in the project root:

```bash
GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"
PORT=3000
```

---

## Running the Program

### Mode 1 — Command Line (CLI)

Run a one-time analysis and print results to the console:

```bash
npx ts-node src/index.ts
```

Outputs both **heuristic** and **LLM** analyses as structured JSON.

### Mode 2 — REST API Server

Start the server to access reports via HTTP:

```bash
npx ts-node src/core/server.ts
```

Default server port: **3000** (configurable via `.env`)

---

## Testing the API

### 1. Get Cached Analysis Report

```bash
curl http://localhost:3000/api/analysis | json_pp
```

### 2. Refresh Analysis Report

```bash
curl -X POST http://localhost:3000/api/analysis/refresh | json_pp
```

---

## Security

**No source code** is ever sent to the LLM.
Only the **dependency structure** (file paths + imports) is transmitted.
This ensures **safety for private and proprietary repositories.**

---

## Stretch Goals Implemented

* Heuristic (programmatic) dependency detection
* LLM integration using the **Gemini API**
* RESTful API for automation and visualization
* Multi-filetype support (`.ts`, `.tsx`, `.js`, `.jsx`)

---

## Purpose

1. **Identify Structural Weaknesses**
   Detect circular dependencies and tightly coupled modules that make code fragile.

2. **Provide Intelligent Insights**
   Use Gemini’s semantic reasoning to suggest refactoring and decoupling strategies.

3. **Improve Code Health**
   Serve as an **early warning system** in CI/CD pipelines to maintain modular, scalable architecture.

---

## Tech Stack

| Component       | Technology               |
| --------------- | ------------------------ |
| Language        | TypeScript               |
| Runtime         | Node.js (v18+)           |
| Web Framework   | Express.js               |
| LLM Integration | Google Gemini API        |
| Analysis        | DFS + Custom Graph Logic |
