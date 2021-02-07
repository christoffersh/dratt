import { Expectation } from "./expect.ts";
import { HttpRequest } from "./http-request.ts";
import { LogLevel } from "./logger.ts";
import { TestStepReport } from "./report.ts";

export interface TestSuiteDefinition {
  name: string;
  tests: TestDefinition[];
  variables: VariableStore;
  ignoreFailedTests?: boolean;
}

export interface TestDefinition {
  name: string;
  description?: string;
  dataSeeders?: DataSeeder[];
  continueAfterFailedSteps?: boolean;
  steps: TestStepDefinition[];
}

export type TestFlow =
  | { action: "continue"; result: TestStepReport }
  | { action: "exit"; result: TestStepReport };

export interface TestStepDefinition {
  description: string;
  request: HttpRequest;
  expectations: Expectation[];
  afterStep?: AfterStepHandler;
}

export type AfterStepHandler = (
  setVariable: (name: string, value: string | number) => void,
  response: HttpResponse,
) => void;

export interface DataSeeder {
  name: string;
  setup: TestStepDefinition[];
  teardown: TestStepDefinition[];
}

export type VariableStore = Record<string, string | number>;

export interface Variables {
  suite: VariableStore;
  test: VariableStore;
}

export function combineVariables(variables: Variables): VariableStore {
  // Test variables can overwrite suite variables
  return { ...variables.suite, ...variables.test };
}

export interface TestRunnerSettings {
  logLevel: LogLevel;
}

// Response

export interface HttpResponse {
  url: string;
  status: number;
  statusText: string;
  body?: any;
}

// Utils

export type ExhaustiveMap<T extends string, U> = {
  [K in T]: U;
};

export function exhaustiveMap<T extends string, U extends unknown>(
  map: ExhaustiveMap<T, U>,
): ExhaustiveMap<T, U> {
  return map;
}
