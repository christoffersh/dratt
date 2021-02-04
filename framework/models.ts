import { ResponseExpectation } from "./expect.ts";
import { HttpRequest } from "./http-request.ts";
import { LogLevel } from "./logger.ts";

export interface TestSuite {
  name: string;
  tests: Test[];
  variables: VariableStore;
  continueAfterFailedTests?: boolean;
}

export interface Test {
  name: string;
  description: string;
  dataSeeders?: DataSeeder[];
  continueAfterFailedSteps?: boolean;
  steps: TestStep[];
}

export type TestResult = "testSuccess" | "testFailed" | "error";
export type TestFlow =
  | { action: "continue"; result: "testFailed" }
  | { action: "continue"; result: "testSuccess" }
  | { action: "exit"; result: "testFailed" }
  | { action: "exit"; result: "error" };

export interface TestStep {
  description: string;
  request: HttpRequest;
  expectations: ResponseExpectation[];
  afterStep?: (
    setVariable: (name: string, value: string | number) => void,
    response: HttpResponse,
  ) => void;
}

export type TestStepResult = "stepSuccess" | "stepFailed" | "error";

export interface DataSeeder {
  name: string;
  setup: TestStep[];
  teardown: TestStep[];
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
