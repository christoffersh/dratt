import { ResponseExpectation } from "./expect.ts";
import { HttpRequest } from "./http-request.ts";
import { LogLevel } from "./logger.ts";

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

export type TestResult = "testSuccess" | "testFailed" | "error";
export type TestFlow =
  | { action: "continue"; result: "testFailed" }
  | { action: "continue"; result: "testSuccess" }
  | { action: "exit"; result: "testFailed" }
  | { action: "exit"; result: "error" };

export interface TestStepDefinition {
  description: string;
  request: HttpRequest;
  expectations: ResponseExpectation[];
  afterStep?: AfterStepHandler;
}

export type AfterStepHandler = (
  setVariable: (name: string, value: string | number) => void,
  response: HttpResponse,
) => void;

export type TestStepResult = "stepSuccess" | "stepFailed" | "error";

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
