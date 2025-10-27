/**
 * @file server.ts
 *
 * 1. FILE PURPOSE
 * This file sets up and runs an Express.js REST API server. The server's
 * purpose is to expose the dependency analysis results via HTTP endpoints.
 * It manages the analysis lifecycle, including parsing, running both
 * heuristic and LLM analyses, and caching the results for performance.
 *
 * 2. VARIABLES / CONSTANTS
 * - FullAnalysisReport (Interface): A type definition for the combined
 *   report structure that the API will return.
 * - app (Constant): The main Express application instance.
 * - PORT (Constant): The port on which the server will listen (from
 *   environment variables or defaulting to 3000).
 * - cachedAnalysis (Variable): An in-memory cache holding the most recent
 *   `FullAnalysisReport` to avoid re-computation on every request.
 * - isAnalysisRunning (Variable): A boolean flag used as a mutex to
 *   prevent multiple concurrent analysis runs.
 *
 * 3. FUNCTIONALITIES
 * - getErrorMessage(error): A utility function to safely extract a
 *   string message from an unknown error type.
 * - runFullAnalysis(): The core asynchronous function that orchestrates
 *   the entire analysis pipeline (parse -> analyze -> cache).
 * - GET /api/analysis (Route): An endpoint that returns the cached analysis
 *   or triggers a new one if the cache is empty.
 * - POST /api/analysis/refresh (Route): An endpoint that forces a
 *   new analysis run, discarding the old cache.
 * - app.listen(): The command that starts the server and performs
 *   an initial analysis to populate the cache.
 */

import * as dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import { parseDependencies, DependencyMap } from './parser';
import {
  analyzeDependencies as analyzeWithLlm,
  AnalysisResult as LlmAnalysisResult,
} from '../analyzers/llmAnalyzer';
import {
  analyzeHeuristically,
  HeuristicAnalysisResult,
} from '../analyzers/heuristicAnalyzer';

/**
 * 1. FOR:
 * Safely extracting a readable string message from an error of an unknown type (e.g., Error, string, or other).
 *
 * 2. TAKES:
 * - error: The error object, typed as `unknown`.
 *
 * 3. DOES:
 * - Checks if the error is an instance of the `Error` class.
 * - If not, checks if it's a `string`.
 * - If neither, provides a generic default message.
 *
 * 4. RETURNS:
 * - A `string` containing the error message.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred.';
}

interface FullAnalysisReport {
  timestamp: string;
  llmAnalysis: LlmAnalysisResult;
  heuristicAnalysis: HeuristicAnalysisResult;
}

const app = express();
const PORT = process.env.PORT || 3000;

let cachedAnalysis: FullAnalysisReport | null = null;
let isAnalysisRunning = false;

/**
 * 1. FOR:
 * Running the complete analysis pipeline. This includes parsing all
 * source files, running the LLM analysis, and running the heuristic
 * analysis, then caching the combined result.
 *
 * 2. TAKES:
 * - (None)
 *
 * 3. DOES:
 * - 1. Checks `isAnalysisRunning` flag. If true, it waits for the current analysis to finish before resolving.
 * - 2. Sets `isAnalysisRunning` to `true` to block other calls.
 * - 3. Calls `parseDependencies()` to get the dependency graph.
 * - 4. Concurrently runs `analyzeWithLlm()` and `analyzeHeuristically()`.
 * - 5. Combines both results into a `FullAnalysisReport` object, adding a new timestamp.
 * - 6. Stores this report in the `cachedAnalysis` variable.
 * - 7. In a `finally` block, sets `isAnalysisRunning` back to `false`.
 *
 * 4. RETURNS:
 * - A `Promise<FullAnalysisReport>` containing the complete, combined report.
 */
async function runFullAnalysis(): Promise<FullAnalysisReport> {
  if (isAnalysisRunning) {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (!isAnalysisRunning && cachedAnalysis) {
          clearInterval(check);
          resolve(cachedAnalysis);
        }
      }, 100);
    });
  }

  isAnalysisRunning = true;
  console.log('API starting background analysis...');

  try {
    const dependencyMap: DependencyMap = await parseDependencies();

    if (dependencyMap.size === 0) {
      throw new Error('Parser found no files or dependencies.');
    }

    const [llmResult, heuristicResult] = await Promise.all([
      analyzeWithLlm(dependencyMap),
      analyzeHeuristically(dependencyMap),
    ]);

    if (!llmResult) {
      throw new Error('LLM analysis failed.');
    }

    const report: FullAnalysisReport = {
      timestamp: new Date().toISOString(),
      llmAnalysis: llmResult,
      heuristicAnalysis: heuristicResult,
    };

    cachedAnalysis = report;
    console.log('API analysis complete and cached.');
    return report;
  } catch (error) {
    console.error('API Analysis Error:', error);
    throw new Error(getErrorMessage(error));
  } finally {
    isAnalysisRunning = false;
  }
}

// ----------------------------------------------------
//                    API ROUTES
// ----------------------------------------------------

/**
 * 1. FOR:
 * Defining the main API endpoint (`GET /api/analysis`) to retrieve the dependency analysis report.
 *
 * 2. TAKES:
 * - `req`: The Express Request object.
 * - `res`: The Express Response object.
 *
 * 3. DOES:
 * - 1. Checks if `cachedAnalysis` has a value. If yes, returns it with a "success" status.
 * - 2. If no cache, checks `isAnalysisRunning`. If true, returns a "pending" status (503) asking the client to try again.
 * - 3. If no cache and not running, it triggers `runFullAnalysis()` on demand and returns the new report.
 *
 * 4. RETURNS:
 * - (void) - It sends a JSON response to the client.
 */
app.get('/api/analysis', (req: Request, res: Response) => {
  if (cachedAnalysis) {
    return res.json({
      status: 'success',
      data: cachedAnalysis,
    });
  }

  if (!isAnalysisRunning) {
    runFullAnalysis()
      .then((report) => res.json({
        status: 'success',
        data: report,
      }))
      .catch((error) => res.status(500).json({
        status: 'error',
        message: 'Analysis failed to run on demand.',
        error: error.message,
      }));
  } else {
    res.status(503).json({
      status: 'pending',
      message:
        'Analysis is currently running in the background. Please try again shortly.',
    });
  }
});

/**
 * 1. FOR:
 * Defining the refresh endpoint (`POST /api/analysis/refresh`) to force a new analysis run.
 *
 * 2. TAKES:
 * - `req`: The Express Request object.
 * - `res`: The Express Response object.
 *
 * 3. DOES:
 * - Immediately calls `runFullAnalysis()`, which will ignore any existing cache and generate a new report.
 * - Returns the newly generated report upon success.
 * - Returns a 500 error if the analysis fails.
 *
 * 4. RETURNS:
 * - (void) - It sends a JSON response to the client.
 */
app.post('/api/analysis/refresh', async (req: Request, res: Response) => {
  try {
    const newReport = await runFullAnalysis();
    res.json({
      status: 'success',
      message: 'Analysis successfully refreshed.',
      data: newReport,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to refresh analysis.',
      error: getErrorMessage(error),
    });
  }
});

// ----------------------------------------------------
//               SERVER INITIALIZATION
// ----------------------------------------------------

/**
 * 1. FOR:
 * Starting the Express server and performing an initial analysis.
 *
 * 2. TAKES:
 * - `PORT`: The port number to listen on.
 * - `callback`: An asynchronous function to execute once the server is successfully listening.
 *
 * 3. DOES:
 * - Binds the server to the specified `PORT`.
 * - Logs console messages indicating the server is running.
 * - Triggers an initial `runFullAnalysis()` in the background, so the cache is populated for the first API request.
 *
 * 4. RETURNS:
 * - (void) - It starts the node process.
 */
app.listen(PORT, async () => {
  console.log(`\n=================================================`);
  console.log(`Dependency Analyzer API running on port ${PORT}`);
  console.log(`Endpoint: http://localhost:${PORT}/api/analysis`);
  console.log(
    `Refresh Endpoint: http://localhost:${PORT}/api/analysis/refresh`
  );
  console.log(`=================================================\n`);

  await runFullAnalysis();
});
