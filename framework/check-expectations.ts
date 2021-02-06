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
import { HttpRequest, requestHasBody } from "./http-request.ts";
import { FAILED, Logger, LogLevel } from "./logger.ts";
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
  logger: Logger,
): ExpectationReport[] {
  return expectations.map((expectation) =>
    validateExpectation(
      request,
      response,
      expectation,
      variables,
      logger,
    )
  );
}

function validateExpectation(
  request: HttpRequest,
  response: HttpResponse,
  expectation: Expectation,
  variables: VariableStore,
  logger: Logger,
): ExpectationReport {
  switch (expectation.type) {
    case "statusEquals":
      return checkStatusEquals(request, response, expectation, logger);
    case "bodyEquals":
      return checkBodyEquals(response, expectation, variables, logger);
    case "bodyIncludes":
      return checkBodyIncludes(response, expectation, variables, logger);
  }
}

function checkStatusEquals(
  request: HttpRequest,
  response: HttpResponse,
  expectation: StatusEqualsExpectation,
  logger: Logger,
): StatusEqualsExpectationReport {
  const statusIsValid = response.status === expectation.expectedStatus;
  if (!statusIsValid) {
    logger.log(
      LogLevel.Min,
      "Expect status equals",
      `Should be ${expectation.expectedStatus}`,
      `Was ${response.status} (${response.statusText})`,
      FAILED,
    );
    if (response.status === 400) {
      // Bad request. User probably wants to inspect request and response bodies
      logger.logData(
        LogLevel.Normal,
        "Request body",
        requestHasBody(request) ? request.body : undefined,
      );
      logger.logData(LogLevel.Normal, "Response body", response.body);
    }
  }

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
  logger: Logger,
): BodyEqualsExpectationReport {
  const mismatch = evaluateMismatch(
    expectation.expectedBody,
    response.body,
    varaibles,
  );
  const bodyIsValid = Object.keys(mismatch).length === 0;

  if (!bodyIsValid) {
    logger.log(LogLevel.Min, "Expect body equals", FAILED);
    logger.logData(LogLevel.Info, "Expected body", expectation.expectedBody);
    logger.logData(LogLevel.Info, "Response body", response.body);
    logger.logData(
      LogLevel.Normal,
      "Mismatch",
      removeMismatchSymbols(mismatch),
    );
  }

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
  logger: Logger,
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

  if (!bodyIsValid) {
    logger.log(LogLevel.Min, "Expect body includes", FAILED);
    logger.logData(LogLevel.Info, "Expected body", expectation.expectedBody);
    logger.logData(LogLevel.Info, "Response body", response.body);
    logger.logData(
      LogLevel.Normal,
      "Mismatch",
      mismatchesOfRequired,
    );
  }

  const mismatchesOfExtra = filterMismatches(
    mismatch,
    (mismatch) => mismatch.mismatchType === "extra",
  );

  if (Object.keys(mismatchesOfExtra).length > 0) {
    logger.log(
      LogLevel.Normal,
      "Note",
      "Some non-required extra properties were found on response body",
      "(will be shown on log level 'info')",
    );

    logger.logData(
      LogLevel.Info,
      "Non-required extra properties on response",
      removeMismatchSymbols(mismatchesOfExtra),
    );
  }

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
