/**
 * @file index.ts
 * 
 * * 1. FILE PURPOSE
 * This script serves as the **main executable program** that coordinates 
 * the dependency analysis of a TypeScript/JavaScript project. It orchestrates 
 * the entire workflow from loading configuration to generating the final report.
 * 
 * * 2. VARIABLES / CONSTANTS
 * - HUB_THRESHOLD (Constant): Defines the minimum number of incoming imports 
 *   required for a module to be flagged as a "hub" (tightly coupled).
 * - dependencyMap: A graph representing all file dependencies 
 *   (Map<string, string[]>) built by the parser.
 * - heuristicResult: The structured object containing findings from the 
 *   **code-based structural analysis** (e.g., circular dependencies).
 * - llmResult: The structured object containing findings from the 
 *   **AI semantic analysis** (Large Language Model-based reasoning).
 * 
 * * 3. FUNCTIONALITIES
 * - main(): The asynchronous function that controls the entire application flow: 
 *   parsing, analysis, and report generation.
 *   This file is executed directly via Node.js: `node dist/index.js`
 */

import * as dotenv from 'dotenv';
dotenv.config(); 

import { parseDependencies } from './core/parser';
import { analyzeDependencies as analyzeWithLlm } from './analyzers/llmAnalyzer';
import { analyzeHeuristically } from './analyzers/heuristicAnalyzer';

const HUB_THRESHOLD = 3;

/**
 * 1. FOR:
 * Orchestrates the entire dependency analysis workflow, serving as the application's main entry point after configuration loading.
 * 
 * * 2. TAKES:
 * - None (It reads configuration and project files directly).
 * 
 * * 3. DOES:
 * - Prints a welcome message and initial separator.
 * - **Step 1:** Calls `parseDependencies()` to build the dependency graph.
 * - **Step 2:** Executes the `analyzeHeuristically()` and `analyzeWithLlm()` analyses in sequence.
 * - **Step 3:** Prints a detailed comparative report, showing results side-by-side and including LLM-based refactoring recommendations.
 * 
 * * 4. RETURNS:
 * - void (The function prints the final report to the console).
 */
async function main() {
  console.log('=======================================');
  console.log(' TypeScript Dependency Analyzer');
  console.log('=======================================');

  const dependencyMap = await parseDependencies();

  if (dependencyMap.size === 0) {
    console.log('No dependencies found or files could not be read.');
    return;
  }

  console.log('\nDiscovered Dependency Map:');
  console.log(Object.fromEntries(dependencyMap));
  console.log('---------------------------------------\n');

  const heuristicResult = analyzeHeuristically(dependencyMap);

  const llmResult = await analyzeWithLlm(dependencyMap);

  if (!llmResult) {
    console.log('Failed to get analysis from LLM.');
    return;
  }

  console.log('=================================');
  console.log('  Comparative Analysis Report  ');
  console.log('=================================');

  console.log('\n--- Circular Dependencies ---');

  console.log('\n[ Heuristic Analysis ]');
  if (heuristicResult.circularDependencies.length === 0) {
    console.log('No circular dependencies found.');
  } 
  else {
    console.log(JSON.stringify(heuristicResult.circularDependencies, null, 2));
  }

  console.log('\n[ LLM Analysis ]');
  if (llmResult.circularDependencies.length === 0) {
    console.log('No circular dependencies found.');
  } 
  else {
    console.log(JSON.stringify(llmResult.circularDependencies, null, 2));
  }

  console.log('\n\n--- Tightly Coupled Modules ---');

  console.log('\n[ Heuristic Analysis ]');
  if (heuristicResult.tightlyCoupledModules.length === 0) {
    console.log(`No modules found imported by ${HUB_THRESHOLD} or more files.`);
  } 
  else {
    console.log(JSON.stringify(heuristicResult.tightlyCoupledModules, null, 2));
  }

  console.log('\n[ LLM Analysis ]');
  if (llmResult.tightlyCoupledModules.length === 0) {
    console.log('No tightly coupled modules identified.');
  } 
  else {
    console.log(JSON.stringify(llmResult.tightlyCoupledModules, null, 2));
  }

  console.log('\n\n--- Refactoring Recommendations (LLM Only) ---');
  if (llmResult.refactoringRecommendations.length === 0) {
    console.log('No specific recommendations given.');
  } 
  else {
    llmResult.refactoringRecommendations.forEach((rec) => {
      console.log(`- ${rec}`);
    });
  }

  console.log('\n=======================================');
  console.log('           Analysis Complete');
  console.log('=========================================');
}

/**
 * 1. FOR:
 * The primary execution block to start the application.
 * 
 * * 2. TAKES:
 * - None.
 * 
 * * 3. DOES:
 * - Calls the asynchronous `main()` function.
 * - Uses `.catch()` to handle any unhandled exceptions that occur during the execution of `main()`, logging the error and exiting with a failure code (1).
 * 
 * * 4. RETURNS:
 * - void (It initiates the main application flow).
 */
main().catch((err) => {
  console.error('A fatal error occurred:', err);
  process.exit(1);
});