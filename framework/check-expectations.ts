import {
  BodyEqualsExpectation,
  BodyIncludesExpectation,
  ResponseExpectation,
  StatusEqualsExpectation,
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
  expectations: ResponseExpectation[],
  variables: VariableStore,
  logger: Logger,
): "ok" | "failed" {
  for (let expectation of expectations) {
    const result = validateExpectation(
      request,
      response,
      expectation,
      variables,
      logger,
    );

    if (result === "failed") {
      return "failed";
    }
  }

  return "ok";
}

function validateExpectation(
  request: HttpRequest,
  response: HttpResponse,
  expectation: ResponseExpectation,
  variables: VariableStore,
  logger: Logger,
): "ok" | "failed" {
  switch (expectation.expectation) {
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
): "ok" | "failed" {
  const statusIsValid = response.status === expectation.status;
  if (!statusIsValid) {
    logger.log(
      LogLevel.Min,
      "Expect status equals",
      `Should be ${expectation.status}`,
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

  return statusIsValid ? "ok" : "failed";
}

function checkBodyEquals(
  response: HttpResponse,
  expectation: BodyEqualsExpectation,
  varaibles: VariableStore,
  logger: Logger,
): "ok" | "failed" {
  const mismatches = evaluateMismatch(
    expectation.body,
    response.body,
    varaibles,
  );
  const bodyIsValid = Object.keys(mismatches).length === 0;

  if (!bodyIsValid) {
    logger.log(LogLevel.Min, "Expect body equals", FAILED);
    logger.logData(LogLevel.Info, "Expected body", expectation.body);
    logger.logData(LogLevel.Info, "Response body", response.body);
    logger.logData(
      LogLevel.Normal,
      "Mismatch",
      removeMismatchSymbols(mismatches),
    );
  }

  return bodyIsValid ? "ok" : "failed";
}

function checkBodyIncludes(
  response: HttpResponse,
  expectation: BodyIncludesExpectation,
  variables: VariableStore,
  logger: Logger,
): "ok" | "failed" {
  const difference = evaluateMismatch(
    expectation.body,
    response.body,
    variables,
  );
  const mismatchesOfRequired = removeMismatchSymbols(
    filterMismatches(
      difference,
      (mismatch) => mismatch.mismatchType !== "extra",
    ),
  );
  const bodyIsValid = Object.keys(mismatchesOfRequired).length === 0;

  if (!bodyIsValid) {
    logger.log(LogLevel.Min, "Expect body includes", FAILED);
    logger.logData(LogLevel.Info, "Expected body", expectation.body);
    logger.logData(LogLevel.Info, "Response body", response.body);
    logger.logData(
      LogLevel.Normal,
      "Mismatch",
      mismatchesOfRequired,
    );
  }

  const mismatchesOfExtra = filterMismatches(
    difference,
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

  return bodyIsValid ? "ok" : "failed";
}
