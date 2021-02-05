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

type EReport<E extends Expectation, I, Extra = {}> = {
  type: Expectation["type"];
  expectation: Omit<E, "type">;
  wasValid: boolean;
  invalidating?: I;
} & Extra;

export type ExpectationReport =
  | EReport<StatusEqualsExpectation, { status: number }>
  | EReport<BodyEqualsExpectation, { body: any; mismatch: any }>
  | EReport<BodyIncludesExpectation, { body: any; mismatch: any }>;

function report<E extends Expectation, R extends ExpectationReport>() {
}

// Status expectations

export interface StatusEqualsExpectation {
  type: "statusEquals";
  expectedStatus: number;
}

export class ExpectStatus {
  static toBe(status: number): StatusEqualsExpectation {
    return {
      type: "statusEquals",
      expectedStatus: status,
    };
  }
}

// Body expectations

export interface BodyEqualsExpectation {
  type: "bodyEquals";
  expectedBody: any;
}

export interface BodyIncludesExpectation {
  type: "bodyIncludes";
  expectedBody: any;
}

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

// Property expectations

export class ExpectProperty {
  static arrayIncludes(...items: any[]): ExpectationMatcher {
    return arrayIncludesMatcher(items);
  }

  static type(type: JsonValueType): ExpectationMatcher {
    return typeMatcher(type);
  }
}
