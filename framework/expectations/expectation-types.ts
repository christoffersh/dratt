import {
  arrayIncludesMatcher,
  ExpectationMatcher,
  typeMatcher,
} from "./expectation-matcher.ts";
import { JsonValueType } from "./mismatch.ts";

export type Expectation =
  | StatusEqualsExpectation
  | BodyEqualsExpectation
  | BodyIncludesExpectation;

// Status expectations

export class ExpectStatus {
  static toBe(status: number): StatusEqualsExpectation {
    return {
      type: "statusEquals",
      expectedStatus: status,
    };
  }
}

export interface StatusEqualsExpectation {
  type: "statusEquals";
  expectedStatus: number;
}

// Body expectations

export class ExpectBody {
  static toBe(body: any): BodyEqualsExpectation {
    return {
      type: "bodyEquals",
      expectedBody: body,
    };
  }

  static toInclude(body: any): BodyIncludesExpectation {
    return {
      type: "bodyIncludes",
      expectedBody: body,
    };
  }
}

export interface BodyEqualsExpectation {
  type: "bodyEquals";
  expectedBody: any;
}

export interface BodyIncludesExpectation {
  type: "bodyIncludes";
  expectedBody: any;
}

// Property expectations

export class ExpectProperty {
  static arrayIncludes(...items: any[]): ExpectationMatcher {
    return arrayIncludesMatcher(items);
  }

  static type(type: JsonValueType): ExpectationMatcher {
    return typeMatcher(type);
  }
}

// Expectation reports

export type ExpectationReport =
  | StatusEqualsExpectationReport
  | BodyEqualsExpectationReport
  | BodyIncludesExpectationReport;

type ExpectationReportTemplate<
  E extends Expectation,
  I,
  Extra = Record<string, unknown>,
> = {
  type: E["type"];
  expectation: Omit<E, "type">;
  expectationMet: boolean;
  context: I;
} & Extra;

export type StatusEqualsExpectationReport = ExpectationReportTemplate<
  StatusEqualsExpectation,
  { actualStatus: number }
>;

export type BodyEqualsExpectationReport = ExpectationReportTemplate<
  BodyEqualsExpectation,
  { body: any; mismatch: any }
>;

export type BodyIncludesExpectationReport = ExpectationReportTemplate<
  BodyIncludesExpectation,
  { body: any; mismatch: any }
>;
