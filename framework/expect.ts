import {
  arrayIncludesMatcher,
  ExpectationMatcher,
  typeMatcher,
} from "./expectation-matcher.ts";
import { JsonValueType } from "./mismatch.ts";

export type ResponseExpectation =
  | StatusEqualsExpectation
  | BodyEqualsExpectation
  | BodyIncludesExpectation;

// Status expectations

export interface StatusEqualsExpectation {
  expectation: "statusEquals";
  status: number;
}

export class ExpectStatus {
  static toBe(status: number): StatusEqualsExpectation {
    return {
      expectation: "statusEquals",
      status,
    };
  }
}

// Body expectations

export interface BodyEqualsExpectation {
  expectation: "bodyEquals";
  body: any;
}

export interface BodyIncludesExpectation {
  expectation: "bodyIncludes";
  body: any;
}

export class ExpectBody {
  static toBe(body: any): BodyEqualsExpectation {
    return {
      expectation: "bodyEquals",
      body,
    };
  }

  static toInclude(body: any): BodyIncludesExpectation {
    return {
      expectation: "bodyIncludes",
      body,
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
