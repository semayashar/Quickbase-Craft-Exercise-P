───────────────────────────────────────────────

# **TypeScript Dependency Analysis Program**

───────────────────────────────────────────────

## **Overview**

This project is a TypeScript-based dependency analysis tool that inspects relationships between local modules within a codebase.
It combines heuristic (programmatic) analysis and Large Language Model (LLM)-driven insights to evaluate module coupling, circular dependencies, and architectural complexity.

The tool’s main purpose is to identify structural issues and provide actionable refactoring recommendations.

───────────────────────────────────────────────

## **Core Features**

───────────────────────────────────────────────

### **1. Dependency Parsing**

* Scans `.ts`, `.tsx`, `.js`, and `.jsx` files within the `src` directory
* Extracts relative import statements to construct a dependency graph

### **2. LLM Integration (Gemini API)**

* Sends **only** the structured dependency map (`Map<string, string[]>`) to the LLM — **never raw source code**
* Provides:

  * Detection of hidden circular dependencies
  * Identification of tightly coupled modules
  * Refactoring suggestions

### **3. Heuristic Analysis**

* Uses a Depth-First Search (DFS) algorithm to detect cycles and score coupling
* Implemented in `heuristicAnalyzer.ts`

### **4. Structured Output**

* Combines heuristic and LLM analyses into a unified JSON result
* Easy to read and integrate with CI/CD or reporting tools

### **5. REST API Server**

* Lightweight Express server to expose results via HTTP endpoints
* Enables automation and visualization

───────────────────────────────────────────────

## **Project Structure**

───────────────────────────────────────────────

├── .env                        # Environment configuration (API key, port)
├── .gitignore                  # Git ignore rules
├── node_modules                # Installed dependencies
├── package-lock.json            
├── package.json                # Project metadata & dependencies
├── README.md                   # Documentation
├── READMEORIGINAL.md           # Original requirements file
├── src
│   ├── analyzers
│   │   ├── heuristicAnalyzer.ts    # Programmatic analysis logic
│   │   └── llmAnalyzer.ts          # Gemini API integration
│   │
│   ├── core
│   │   ├── parser.ts              # Builds dependency map
│   │   └── server.ts              # Express server setup
│   │
│   ├── utils
│   │   ├── arrayUtils.ts
│   │   ├── mathUtils.ts
│   │   ├── statsUtils.ts
│   │   ├── stringUtils.ts
│   │   └── templateUtils.ts
│   │
│   └── index.ts                   # Main entry point
│
└── tsconfig.json                 # TypeScript configuration

───────────────────────────────────────────────

## **Setup & Installation**

───────────────────────────────────────────────

### **1. Install Dependencies**

Ensure Node.js (v18+) and npm are installed, then run:

npm install

If using `ts-node`, you can execute scripts without manual compilation.


### **2. Configure Environment**

Create a `.env` file in the project root:

GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"
PORT=3000

───────────────────────────────────────────────

## **Running the Program**

───────────────────────────────────────────────

### **Mode 1 — Command Line (CLI)**

Run the full analysis once and print results to the console:

npx ts-node src/index.ts

Outputs both heuristic and LLM analysis results as structured JSON.

### **Mode 2 — REST API Server**

Start the Express server and access results via HTTP:

npx ts-node src/core/server.ts

Default server port: `3000` (configurable via `.env`).

───────────────────────────────────────────────

## **Testing the API**

───────────────────────────────────────────────

**1. Get Cached Analysis Report**

curl http://localhost:3000/api/analysis | json_pp

**2. Refresh Analysis Report**

curl -X POST http://localhost:3000/api/analysis/refresh | json_pp

───────────────────────────────────────────────

## **Security Constraint**

───────────────────────────────────────────────

* Source code content is **never** sent to the LLM.
* Only the dependency structure (file paths + imports) is transmitted.
* The program is safe for private or proprietary repositories.

───────────────────────────────────────────────

## **Stretch Goals Implemented**

───────────────────────────────────────────────

* Heuristic (programmatic) dependency detection
* LLM integration using the Gemini API
* RESTful API server for visualization & automation
* Support for `.ts`, `.tsx`, `.js`, and `.jsx` files

───────────────────────────────────────────────

## **Purpose**

───────────────────────────────────────────────

1.  **Identify Structural Weaknesses:** 
    Automatically find hidden issues like **circular dependencies** and **tightly coupled modules** that lead to brittle, hard-to-maintain code.
2.  **Provide Intelligent Insights:** 
    Use the **Gemini LLM** to provide high-level, semantic reasoning and **actionable refactoring recommendations** that go beyond simple programmatic checks.
3.  **Improve Code Health:** 
    Serve as an early warning system in CI/CD pipelines to ensure the codebase remains modular, flexible, and scalable.

───────────────────────────────────────────────
