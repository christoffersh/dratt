import { ExpectationReport } from "./expect.ts";
import { HttpRequest } from "./http-request.ts";
import {
  TestDefinition,
  TestStepDefinition,
  TestSuiteDefinition,
} from "./models.ts";

export interface TestSuiteReport {
  testSuite: TestSuiteDefinition;
  testSuiteSuccessful: boolean;
  testReports: TestReport[];
}

export interface TestReport {
  test: TestDefinition;
  testSuccessful: boolean;
  septupStepReports: TestStepReport[];
  testStepReports: TestStepReport[];
  teardownStepReports: TestStepReport[];
}

export interface TestStepReport {
  testStep: TestStepDefinition;
  request: HttpRequest;
  testStepSuccessful: boolean;
  expectationReports: ExpectationReport[];
}
