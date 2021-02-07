import {
  BodyEqualsExpectation,
  BodyEqualsExpectationReport,
  BodyIncludesExpectation,
  BodyIncludesExpectationReport,
  Expectation,
  ExpectationReport,
  StatusEqualsExpectation,
  StatusEqualsExpectationReport,
} from "./expect.ts";
import { HttpRequest } from "./http-request.ts";
import {
  evaluateMismatch,
  filterMismatches,
  removeMismatchSymbols,
} from "./mismatch.ts";
import { HttpResponse, VariableStore } from "./models.ts";

export function checkExpectations(
  request: HttpRequest,
  response: HttpResponse,
  expectations: Expectation[],
  variables: VariableStore,
): ExpectationReport[] {
  return expectations.map((expectation) =>
    validateExpectation(
      request,
      response,
      expectation,
      variables,
    )
  );
}

function validateExpectation(
  request: HttpRequest,
  response: HttpResponse,
  expectation: Expectation,
  variables: VariableStore,
): ExpectationReport {
  switch (expectation.type) {
    case "statusEquals":
      return checkStatusEquals(response, expectation);
    case "bodyEquals":
      return checkBodyEquals(response, expectation, variables);
    case "bodyIncludes":
      return checkBodyIncludes(response, expectation, variables);
  }
}

function checkStatusEquals(
  response: HttpResponse,
  expectation: StatusEqualsExpectation,
): StatusEqualsExpectationReport {
  const statusIsValid = response.status === expectation.expectedStatus;

  return {
    type: "statusEquals",
    expectation,
    expectationMet: statusIsValid,
    context: {
      actualStatus: expectation.expectedStatus,
    },
  };
}

function checkBodyEquals(
  response: HttpResponse,
  expectation: BodyEqualsExpectation,
  varaibles: VariableStore,
): BodyEqualsExpectationReport {
  const mismatch = evaluateMismatch(
    expectation.expectedBody,
    response.body,
    varaibles,
  );
  const bodyIsValid = Object.keys(mismatch).length === 0;

  return {
    type: "bodyEquals",
    expectation,
    expectationMet: bodyIsValid,
    context: {
      body: response.body,
      mismatch: mismatch,
    },
  };
}

function checkBodyIncludes(
  response: HttpResponse,
  expectation: BodyIncludesExpectation,
  variables: VariableStore,
): BodyIncludesExpectationReport {
  const mismatch = evaluateMismatch(
    expectation.expectedBody,
    response.body,
    variables,
  );
  const mismatchesOfRequired = removeMismatchSymbols(
    filterMismatches(
      mismatch,
      (mismatch) => mismatch.mismatchType !== "extra",
    ),
  );
  const bodyIsValid = Object.keys(mismatchesOfRequired).length === 0;

  return {
    type: "bodyIncludes",
    expectation,
    expectationMet: bodyIsValid,
    context: {
      body: response.body,
      mismatch,
    },
  };
}
