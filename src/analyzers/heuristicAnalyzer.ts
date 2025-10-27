/**
 * @file heuristicAnalyzer.ts
 *
 * 1. FILE PURPOSE
 *  This file provides functions to perform a heuristic (code-based) analysis
 * on a project's dependency graph. Its main purpose is to detect structural
 * problems like circular dependencies and "hub" modules.
 *
 * 2. VARIABLES / CONSTANTS
 * - HeuristicAnalysisResult (Interface): Defines the shape of the report this analyzer produces.
 * - HUB_THRESHOLD (Constant): A configuration value that defines the minimum number
 *   of incoming imports for a module to be considered a "tightly coupled" hub.
 *
 * 3. FUNCTIONALITIES
 * - analyzeHeuristically(dependencyMap): The main public function that runs all
 *   heuristic checks and returns a combined report.
 * - findCircularDependencies(dependencyMap): A private function that uses a
 *   Depth-First Search (DFS) algorithm to find all cyclical import paths.
 * - findTightlyCoupledModules(dependencyMap, threshold): A private function that
 *   counts incoming imports for all modules to identify hubs.
 */

import { DependencyMap } from '../core/parser';

export interface HeuristicAnalysisResult {
  circularDependencies: {
    path: string[];
  }[];
  tightlyCoupledModules: {
    module: string;
    importedBy: string[];
  }[];
}

const HUB_THRESHOLD = 3;

/**
 * 1. FOR:
 * Serves as the main entry point for the heuristic analysis.
 * It orchestrates the execution of different analysis steps.
 *
 * 2. TAKES:
 * - dependencyMap: The dependency graph (Map<string, string[]>) where
 * each module maps to its direct dependencies.
 *
 * 3. DOES:
 * - Logs the start of the analysis.
 * - Calls `findCircularDependencies` to detect cycles.
 * - Calls `findTightlyCoupledModules` to identify hubs based on the HUB_THRESHOLD.
 * - Logs the completion of the analysis.
 *
 * 4. RETURNS:
 * - HeuristicAnalysisResult: An object containing the structured results
 * from both analysis steps.
 */
export function analyzeHeuristically(dependencyMap: DependencyMap): HeuristicAnalysisResult {

  console.log('Running heuristic analysis...');
  const circularDependencies = findCircularDependencies(dependencyMap);
  const tightlyCoupledModules = findTightlyCoupledModules(dependencyMap, HUB_THRESHOLD);

  console.log('Heuristic analysis complete.');
  return { circularDependencies, tightlyCoupledModules};
}

/**
 * 1. FOR:
 * Detects circular dependencies in the dependency graph.
 *
 * 2. TAKES:
 * - dependencyMap: The dependency graph (Map<string, string[]>) to analyze.
 *
 * 3. DOES:
 * - Uses a Depth-First Search (DFS) algorithm.
 * - It maintains two sets: `visited` (for all nodes) and `recursionStack`
 * (for nodes in the current path).
 * - It defines a recursive helper function `detectCycle` to perform the traversal.
 * - If it encounters a node that is already in the `recursionStack`,
 * it identifies this as a cycle and records the path.
 *
 * 4. RETURNS:
 * - An array of objects. Each object contains a `path` (string array)
 * that describes one detected circular dependency.
 */
function findCircularDependencies(dependencyMap: DependencyMap): {path: string[];}[] {

  const cycles: { path: string[] }[] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const allNodes = new Set<string>(dependencyMap.keys());

  dependencyMap.forEach((deps) => deps.forEach((dep) => allNodes.add(dep)));

  /**
   * 1. FOR:
   * A recursive helper function to perform the DFS traversal for cycle detection.
   *
   * 2. TAKES:
   * - node: The string name of the current module being explored.
   * - path: An array of strings representing the current import path being followed.
   *
   * 3. DOES:
   * - Marks the current node as visited and adds it to the recursion stack and path.
   * - Iterates through all dependencies of the current node.
   * - If a dependency is already in the `recursionStack`, a cycle is found,
   * and its path is constructed and stored in the `cycles` array.
   * - If a dependency has not been visited, it calls itself recursively.
   * - After exploring all dependencies, it "backtracks" by removing the node
   * from the path and recursion stack.
   *
   * 4. RETURNS:
   * - void (it modifies the `cycles` array directly via closure).
   */
  function detectCycle(node: string, path: string[]) {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const dependencies = dependencyMap.get(node) || [];

    for (const dependency of dependencies) {
      if (recursionStack.has(dependency)) {
        const cyclePath = [...path.slice(path.indexOf(dependency)), dependency];
        cycles.push({ path: cyclePath });
        continue;
      }

      if (!visited.has(dependency)) {
        detectCycle(dependency, path);
      }
    }

    path.pop();
    recursionStack.delete(node);
  }

  for (const node of allNodes) {
    if (!visited.has(node)) {
      detectCycle(node, []);
    }
  }

  return cycles;
}

/**
 * 1. FOR:
 * Identifies tightly coupled modules ("hubs") by counting their
 * total number of incoming imports.
 *
 * 2. TAKES:
 * - dependencyMap: The dependency graph (Map<string, string[]>).
 * - threshold: The minimum number of importers for a module to
 * be considered a hub.
 *
 * 3. DOES:
 * - 1. Builds a reverse mapping (`incomingMap`) by iterating the
 * `dependencyMap`. This new map stores: moduleName -> [importer1, importer2].
 * - 2. Filters the `incomingMap` to find all modules where the
 * number of importers is greater than or equal to the `threshold`.
 * - 3. Sorts the final list of hubs in descending order (most imported first).
 *
 * 4. RETURNS:
 * - A list of objects, where each object contains the `module` name
 * and an array `importedBy` listing the files that import it.
 */
function findTightlyCoupledModules( dependencyMap: DependencyMap, threshold: number): { module: string; importedBy: string[] }[] {
  
  const incomingMap = new Map<string, string[]>();

  for (const [importer, dependencies] of dependencyMap.entries()) {
    for (const importedModule of dependencies) {
      const importers = incomingMap.get(importedModule) || [];
      importers.push(importer);
      incomingMap.set(importedModule, importers);
    }
  }

  const hubs: { module: string; importedBy: string[] }[] = [];
  for (const [module, importedBy] of incomingMap.entries()) {
    if (importedBy.length >= threshold) {
      hubs.push({ module, importedBy });
    }
  }

  return hubs.sort((a, b) => b.importedBy.length - a.importedBy.length);
}
