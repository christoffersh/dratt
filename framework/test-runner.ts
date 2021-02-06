import { callApi$ } from "./call-api.ts";
import { checkExpectations } from "./check-expectations.ts";
import { FAILED, Logger, LogLevel, SUCCESS } from "./logger.ts";
import {
  combineVariables,
  TestDefinition,
  TestFlow,
  TestRunnerSettings,
  TestStepDefinition,
  TestSuiteDefinition,
  Variables,
  VariableStore,
} from "./models.ts";
import { TestReport, TestStepReport, TestSuiteReport } from "./report.ts";
import {
  substitueVariablesInExpectations,
  substitueVariablesInRequest,
} from "./variable-substitution.ts";

export function createTestRunner(
  options?: { logLevel?: LogLevel },
): TestRunner {
  return new TestRunner({
    logLevel: options?.logLevel ?? LogLevel.Normal,
  });
}

export class TestRunner {
  settings: TestRunnerSettings;

  constructor(settings: TestRunnerSettings) {
    this.settings = settings;
  }

  async runTestSuites$(
    testSuites: TestSuiteDefinition[],
  ): Promise<"success" | "failed" | "error"> {
    let testHasFailed = false;
    const logger = new Logger(this.settings.logLevel);

    for (const suite of testSuites) {
      const res = await runTestSuite$(suite, logger);
      if (res === "error") {
        return "error";
      } else if (!res.testSuiteSuccessful) {
        testHasFailed = true;
      }
    }

    return testHasFailed ? "failed" : "success";
  }
}

async function runTestSuite$(
  testSuite: TestSuiteDefinition,
  logger: Logger,
): Promise<TestSuiteReport | "error"> {
  logger.log(LogLevel.Min, "Test suite", testSuite.name);

  let testCounter = 0;
  const testReports: TestReport[] = [];

  for (const test of testSuite.tests) {
    testCounter += 1;
    console.log("------------------------------------------------------");
    const testTitle = `Test ${testCounter}/${testSuite.tests.length}`;
    const result = await runTest$(test, testTitle, testSuite.variables, logger);

    if (result === "error") {
      return "error";
    }

    testReports.push(result);

    if (result.testSuccessful) {
      logger.log(LogLevel.Min, `^ ${testTitle}`, test.name, SUCCESS);
    } else {
      logger.log(
        LogLevel.Min,
        `^ ${testTitle}`,
        test.name,
        FAILED,
        testSuite.ignoreFailedTests ? "Continuing..." : "Aborting...",
      );

      if (!testSuite.ignoreFailedTests) {
        logger.log(LogLevel.Min, "^ Test suite", testSuite.name, FAILED);
        return {
          testSuite,
          testReports,
          testSuiteSuccessful: false,
        };
      }
    }
  }

  const everyTestSuccessful = testReports.every((testReport) =>
    testReport.testSuccessful
  );

  logger.log(
    LogLevel.Min,
    "^ Test suite",
    testSuite.name,
    everyTestSuccessful ? SUCCESS : FAILED,
  );
  return {
    testSuite,
    testReports,
    testSuiteSuccessful: everyTestSuccessful,
  };
}

async function runTest$(
  test: TestDefinition,
  testTitle: string,
  suiteVariables: VariableStore,
  logger: Logger,
): Promise<TestReport | "error"> {
  let testFailed = false;
  const testVariables: VariableStore = {};
  const variables = {
    test: testVariables,
    suite: suiteVariables,
  };

  logger.log(LogLevel.Min, testTitle, test.name);

  if (!!test.continueAfterFailedSteps) {
    logger.log(
      LogLevel.Min,
      "Warning",
      `Running test with continueAfterFailedExpectations=true`,
    );
  }

  // Seeding setup
  const setupResult = await runSteps$(
    "Setup step",
    variables,
    !!test.continueAfterFailedSteps,
    (test.dataSeeders ?? []).flatMap((seeder) => seeder.setup),
    logger,
  );

  if (setupResult === "error") {
    return "error";
  }

  if (
    !setupResult.every((stepReport) => stepReport.testStepSuccessful)
  ) {
    if (test.continueAfterFailedSteps) {
      testFailed = true;
    } else {
      return {
        test: test,
        septupStepReports: setupResult,
        testStepReports: [],
        teardownStepReports: [],
        testSuccessful: false,
      };
    }
  }

  // Test steps
  const mainResult = await runSteps$(
    "Step",
    variables,
    !!test.continueAfterFailedSteps,
    test.steps,
    logger,
  );

  if (mainResult === "error") {
    return "error";
  }

  if (
    !mainResult.every((stepReport) => stepReport.testStepSuccessful)
  ) {
    if (test.continueAfterFailedSteps) {
      testFailed = true;
    } else {
      return {
        test: test,
        septupStepReports: setupResult,
        testStepReports: mainResult,
        teardownStepReports: [],
        testSuccessful: false,
      };
    }
  }

  // Seeding teardown
  const teardownResult = await runSteps$(
    "Teardown step",
    variables,
    !!test.continueAfterFailedSteps,
    (test.dataSeeders ?? []).flatMap((seeder) => seeder.setup),
    logger,
  );

  if (teardownResult === "error") {
    return "error";
  }

  if (
    !teardownResult.every((stepReport) => stepReport.testStepSuccessful)
  ) {
    if (test.continueAfterFailedSteps) {
      testFailed = true;
    } else {
      return {
        test: test,
        septupStepReports: setupResult,
        testStepReports: mainResult,
        teardownStepReports: teardownResult,
        testSuccessful: false,
      };
    }
  }

  return {
    test,
    testSuccessful: true,
    septupStepReports: setupResult,
    testStepReports: mainResult,
    teardownStepReports: teardownResult,
  };
}

async function runSteps$(
  stepName: string,
  variables: Variables,
  ignoreFailed: boolean,
  steps: TestStepDefinition[],
  logger: Logger,
): Promise<TestStepReport[] | "error"> {
  const totalSetupStepCount = steps.length;
  let stepCounter = 0;
  const testStepReports: TestStepReport[] = [];

  for (const step of steps) {
    stepCounter += 1;

    const testFlow = await runStepAndDetermineTestFlow$(
      step,
      `${stepName} ${stepCounter}/${totalSetupStepCount}`,
      variables,
      ignoreFailed,
      logger,
    );

    if (testFlow.result === "error") {
      return "error";
    }

    testStepReports.push(testFlow.result);

    if (!testFlow.result.testStepSuccessful && !ignoreFailed) {
      return testStepReports;
    }
  }
  return testStepReports;
}

async function runStepAndDetermineTestFlow$(
  step: TestStepDefinition,
  stepTitle: string,
  variables: Variables,
  continueAfterFail: boolean,
  logger: Logger,
) {
  logger.log(LogLevel.Min, stepTitle, step.description);

  const testStepReport = await runStep$(
    step,
    variables,
    continueAfterFail,
    logger,
  );

  return determineTestFlow(
    stepTitle,
    testStepReport,
    step,
    continueAfterFail,
    logger,
  );
}

async function runStep$(
  step: TestStepDefinition,
  variables: Variables,
  shouldSkipVariableSettersOnFail: boolean,
  logger: Logger,
): Promise<TestStepReport | "error"> {
  try {
    const request = substitueVariablesInRequest(
      variables,
      step.request,
      logger,
    );

    if (request === "error") {
      return "error";
    }

    const response = await callApi$(request, logger);

    if (
      response === "callCreationFailed" ||
      response === "apiCallException" ||
      response === "responseReadFailed"
    ) {
      logger.log(
        LogLevel.Min,
        "Error",
        "Unexpected error when attempting to call api",
        response,
      );
      return "error";
    }

    const resultingExpectations = substitueVariablesInExpectations(
      variables,
      step.expectations,
      logger,
    );

    if (resultingExpectations === "error") {
      return "error";
    }

    const expectationReports = checkExpectations(
      request,
      response,
      resultingExpectations,
      combineVariables(variables),
      logger,
    );

    const allExpectationsMet = expectationReports.every((report) =>
      report.expectationMet
    );

    if (
      (allExpectationsMet || !shouldSkipVariableSettersOnFail) && step.afterStep
    ) {
      step.afterStep((name, value) => {
        logger.log(LogLevel.Info, "Setting variable", `${name}=${value}`);
        if (value === undefined) {
          throw `Tried to set variable '${name}' to undefined`;
        }
        variables.test[name] = value;
      }, response);
    }

    return {
      testStep: step,
      testStepSuccessful: allExpectationsMet,
      expectationReports,
      request,
    };
  } catch (err: any) {
    logger.logData(LogLevel.Min, "Exception", err);
    return "error";
  }
}

function determineTestFlow(
  stepTitle: string,
  testStepResult: TestStepReport | "error",
  step: TestStepDefinition,
  continueAfterFailedSteps: boolean,
  logger: Logger,
): TestFlow {
  if (testStepResult === "error") {
    // Some exception or other error occured. Abort test.
    logger.log(
      LogLevel.Min,
      `^ ${stepTitle}`,
      "Exiting...",
      "Unexpected error encounted",
    );
    return { action: "exit", result: "error" };
  }

  if (testStepResult.testStepSuccessful) {
    return { action: "continue", result: testStepResult };
  } else {
    logger.log(
      LogLevel.Min,
      `^ ${stepTitle}`,
      step.description,
      FAILED,
      continueAfterFailedSteps ? "Continuing..." : "Aborting...",
    );

    if (continueAfterFailedSteps) {
      return { action: "continue", result: testStepResult };
    } else {
      return { action: "exit", result: testStepResult };
    }
  }
}
