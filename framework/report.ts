import { Expectation } from "./expect.ts";
import { HttpRequest } from "./http-request.ts";

export interface TestStepReport {
  description: string;
  request: HttpRequest;
  expectations: Expectation[];
}
