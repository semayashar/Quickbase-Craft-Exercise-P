/**
 * @file llmAnalyzer.ts
 *
 * 1. FILE PURPOSE
 * This file is responsible for connecting to the Google Gemini Generative AI
 * service. It sends the project's dependency graph to the AI model and
 * requests an intelligent, semantic analysis.
 *
 * 2. VARIABLES / CONSTANTS
 * - AnalysisResult (Interface): Defines the structured JSON format that
 * we expect the LLM to return.
 * - generationConfig (Object): Configuration for the Gemini model to control
 * its creativity (temperature) and ensure it returns JSON.
 * - safetySettings (Array): Configuration to disable content safety filters,
 * as code analysis is a safe context.
 * - systemPrompt (String): The detailed instructions that tell the LLM
 * how to act (as an architect) and what to analyze.
 *
 * 3. FUNCTIONALITIES
 * - analyzeDependencies(dependencyMap): The main public function. It formats
 * the dependency data, sends it to the Gemini API, and parses the
 * resulting JSON analysis.
 */

import {
  GoogleGenerativeAI,
  GenerationConfig,
  SafetySetting,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';
import { DependencyMap } from '../core/parser'; 

export interface AnalysisResult {
  circularDependencies: {
    path: string[];
    reason: string;
  }[];
  tightlyCoupledModules: {
    module: string;
    importedBy: string[];
    recommendation: string;
  }[];
  refactoringRecommendations: string[];
}

/**
 * 1. FOR:
 * Analyzes a given dependency map using the Google Gemini LLM to identify
 * circular dependencies, hubs, and refactoring opportunities.
 *
 * 2. TAKES:
 * - dependencyMap: A Map<string, string[]> representing the project's
 * dependency graph.
 *
 * 3. DOES:
 * - 1. Loads the `GEMINI_API_KEY` from environment variables.
 * - 2. Initializes the `GoogleGenerativeAI` client and selects a model.
 * - 3. Defines model configurations (e.g., `generationConfig`, `safetySettings`).
 * - 4. Converts the `dependencyMap` (a Map) into a JSON string that the
 * model can understand.
 * - 5. Defines a `systemPrompt` instructing the LLM on its role and task.
 * - 6. Starts a chat session and sends the prompt and dependency JSON.
 * - 7. Receives the text response and performs robust JSON parsing,
 * handling potential markdown wrappers (```json) or extra text.
 * - 8. Handles errors, including API failures or response blocking.
 *
 * 4. RETURNS:
 * - A Promise that resolves to a structured `AnalysisResult` object if
 * successful, or `null` if an error occurs.
 */
export async function analyzeDependencies( dependencyMap: DependencyMap): Promise<AnalysisResult | null> {

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
    console.error(
      'GEMINI_API_KEY is not found. Please create a .env file and add it.'
    );
    return null;
  }

  console.log('Gemini API key found. Initializing client...');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-preview-09-2025',
  });

  const generationConfig: GenerationConfig = {
    temperature: 0.2,
    topK: 1,
    topP: 1,
    maxOutputTokens: 8192,
    responseMimeType: 'application/json', 
  };

  const safetySettings: SafetySetting[] = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
  ];

  const dependencyObject: { [key: string]: string[] } = {}; 
    dependencyMap.forEach((value, key) => {
    dependencyObject[key] = value;
  });
  
  const dependencyJson = JSON.stringify(dependencyObject, null, 2);

  const systemPrompt = `You are a senior software architect reviewing a TypeScript project's dependency graph.
The user will provide a JSON object where each key is a file and its value is an array of the local files it imports.

Your task is to analyze this graph and provide a structured JSON response with three properties:
1.  "circularDependencies": An array of objects. Each object should have:
    * "path": an array of strings showing the circular path (e.g., ["fileA.ts", "fileB.ts", "fileA.ts"]).
    * "reason": a brief explanation of the cycle.
    If none, return an empty array [].
2.  "tightlyCoupledModules": An array of objects. Identify modules that are "hubs" (imported by many other modules). Each object should have:
    * "module": the name of the module.
    * "importedBy": an array of files that import it.
    * "recommendation": a brief suggestion (e.g., "Consider splitting this module").
    If none, return an empty array [].
3.  "refactoringRecommendations": A general array of strings with 1-3 high-level recommendations for improving the project's dependency structure.

Analyze the following dependency graph:
`;

  console.log('Sending dependency graph to LLM for analysis...');

  let responseText = '';
  try {
    const chat = model.startChat({
      generationConfig,
      safetySettings,
      history: [{ role: 'user', parts: [{ text: systemPrompt }] }],
    });

    const result = await chat.sendMessage(dependencyJson);
    const response = result.response;

    if (response.promptFeedback?.blockReason) {
      console.error(
        `LLM response was blocked. Reason: ${response.promptFeedback.blockReason}`
      );
      return null;
    }

    if (response.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
      console.warn(
        `LLM response may have been truncated (MAX_TOKENS reached).`
      );
    }

    responseText = response.text();

    const jsonMatch = responseText.match(/```json([\s\S]*)```/);
    if (jsonMatch && jsonMatch[1]) {
      responseText = jsonMatch[1];
    }

    const objectMatch = responseText.match(/\{[\s\S]*\}/);
    if (objectMatch && objectMatch[0]) {
      responseText = objectMatch[0];
    }

    return JSON.parse(responseText) as AnalysisResult;
  } catch (err) {
    console.error('Error analyzing dependencies with LLM:', err);
    console.error('--- LLM Response Text (on failure) ---');
    console.error(responseText);
    console.error('--------------------------------------');

    return null;
  }
}
