import { ExpectationReport } from "./expect.ts";
import { HttpRequest } from "./http-request.ts";
import { TestStepDefinition } from "./models.ts";

export interface TestStepReport {
  testStep: TestStepDefinition;
  request: HttpRequest;
  testStepSuccessful: boolean;
  expectationReports: ExpectationReport[];
}
