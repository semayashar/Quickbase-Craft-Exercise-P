/**
 * @file parser.ts
 *
 * 1. FILE PURPOSE
 * This module is responsible for scanning the project's source code directory (`src/`)
 * to identify all relevant source files. It reads each file and parses its
 * content to find all local ES module import statements. From this, it
 * constructs and returns a complete dependency graph.
 *
 * 2. VARIABLES / CONSTANTS
 * - DependencyMap (Type): The primary data structure this parser builds.
 * It is a Map where the key is a file path (string) and the value is
 * an array of its imported file paths (string[]).
 * - importRegex (Constant): A regular expression pattern used to find
 * and extract relative import paths (e.g., './utils') from file content.
 *
 * 3. FUNCTIONALITIES
 * - parseDependencies(): The main asynchronous function exported by this
 * module. It orchestrates the file scanning, reading, and parsing
 * process to build the final dependency map.
 */

import * as fs from 'fs/promises'; 
import * as path from 'path'; 
import { glob } from 'glob'; 

export type DependencyMap = Map<string, string[]>;

const importRegex = /import(?:[\s\S]*?from\s*)?['"](\.\/.*?)['"]/g;

/**
 * 1. FOR:
 * To asynchronously scan the entire `src/` directory, parse all valid
 * source files, and build a complete map of their internal dependencies.
 *
 * 2. TAKES:
 * - (None)
 *
 * 3. DOES:
 * - 1. Initializes an empty `DependencyMap`.
 * - 2. Uses `glob` to find all `.ts`, `.tsx`, `.js`, and `.jsx` files,
 * while ignoring TypeScript declaration files (`.d.ts`).
 * - 3. Defines and filters out a list of `toolFiles` (the analyzer's
 * own source code) to prevent self-analysis.
 * - 4. Iterates over each remaining `analysisFile`.
 * - 5. For each file, it reads the content and uses `importRegex`
 * to find all relative import paths.
 * - 6. It resolves each import path into a normalized, project-relative
 * path, correctly handling cases where file extensions (like `.ts`)
 * are omitted in the import statement.
 * - 7. It stores the file's path and its array of resolved dependencies
 * in the `dependencyMap`.
 *
 * 4. RETURNS:
 * - A `Promise<DependencyMap>` that resolves to the fully constructed
 * dependency graph.
 */
export async function parseDependencies(): Promise<DependencyMap> {
  
  console.log('Starting dependency analysis...');

  const dependencyMap: DependencyMap = new Map();

  const files = await glob('src/**/*.{ts,tsx,js,jsx}', {
    ignore: ['src/**/*.d.ts'],
  });

  const toolFiles = [
    'src/index.ts',
    'src/core/parser.ts',
    'src/analyzers/llmAnalyzer.ts',
    'src/analyzers/heuristicAnalyzer.ts',
  ].map((f) => path.resolve(f)); 

  const analysisFiles = files
    .map((f) => path.resolve(f))
    .filter((f) => !toolFiles.includes(f));

  console.log(`Found ${analysisFiles.length} files to analyze...`);

  for (const file of analysisFiles) {
    const relativeFilePath = path.relative(process.cwd(), file);
    try {
      const content = await fs.readFile(file, 'utf-8');
      const dependencies: string[] = [];

      let match;

      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        const fileExtension = path.extname(importPath); 
        let dependencyName: string;

        if (fileExtension) {
          if (['.ts', '.tsx', '.js', '.jsx'].includes(fileExtension)) {
            dependencyName = path.normalize(
              path.join(path.dirname(relativeFilePath), importPath)
            );
          } else {
            continue;
          }
        } else {
          dependencyName = path.normalize(
            path.join(path.dirname(relativeFilePath), importPath + '.ts')
          );
        }

        dependencies.push(dependencyName);
      }

      dependencyMap.set(relativeFilePath.replace(/\\/g, '/'), dependencies);
    } catch (err) {
      console.error(`Could not read file ${relativeFilePath}: ${err}`);
    }
  }

  console.log('Dependency map created successfully.');
  return dependencyMap;
}
