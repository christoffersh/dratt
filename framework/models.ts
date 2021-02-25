import { Expectation } from "./expectations/expectation-types.ts";
import { HttpRequest, HttpResponse } from "./http.ts";
import { LogLevel } from "./logger.ts";
import { TestStepReport } from "./report.ts";
import { VariableStore } from "./variables.ts";

export interface TestSuiteDefinition {
  name: string;
  tests: TestDefinition[];
  variables: VariableStore;
  exitOnTestFail?: boolean;
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

export interface TestRunnerSettings {
  logLevel: LogLevel;
}
