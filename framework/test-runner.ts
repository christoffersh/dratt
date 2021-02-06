import { callApi$ } from "./call-api.ts";
import { checkExpectations } from "./check-expectations.ts";
import { FAILED, Logger, LogLevel, SUCCESS } from "./logger.ts";
import {
  combineVariables,
  TestDefinition,
  TestFlow,
  TestResult,
  TestRunnerSettings,
  TestStepDefinition,
  TestSuiteDefinition,
  Variables,
  VariableStore,
} from "./models.ts";
import { TestStepReport } from "./report.ts";
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
      } else if (res == "failed") {
        testHasFailed = true;
      }
    }

    return testHasFailed ? "failed" : "success";
  }
}

async function runTestSuite$(
  suite: TestSuiteDefinition,
  logger: Logger,
): Promise<"success" | "failed" | "error"> {
  logger.log(LogLevel.Min, "Test suite", suite.name);

  let testCounter = 0;
  let failedCounter = 0;

  for (const test of suite.tests) {
    testCounter += 1;
    console.log("------------------------------------------------------");
    const testTitle = `Test ${testCounter}/${suite.tests.length}`;
    const result = await runTest$(test, testTitle, suite.variables, logger);

    if (result === "testFailed") {
      logger.log(
        LogLevel.Min,
        `^ ${testTitle}`,
        test.name,
        FAILED,
        suite.ignoreFailedTests ? "Continuing..." : "Aborting...",
      );

      if (!suite.ignoreFailedTests) {
        logger.log(LogLevel.Min, "^ Test suite", suite.name, FAILED);
        return "failed";
      } else {
        failedCounter += 1;
      }
    } else if (result === "testSuccess") {
      logger.log(LogLevel.Min, `^ ${testTitle}`, test.name, SUCCESS);
    } else if (result === "error") {
      return "error";
    }
  }

  if (failedCounter > 0) {
    logger.log(LogLevel.Min, "^ Test suite", suite.name, FAILED);
    return "failed";
  } else {
    logger.log(LogLevel.Min, "^ Test suite", suite.name, SUCCESS);
    return "success";
  }
}

async function runTest$(
  test: TestDefinition,
  testTitle: string,
  suiteVariables: VariableStore,
  logger: Logger,
): Promise<TestResult> {
  let testExecutionResult: "testSuccess" | "testFailed" = "testSuccess";
  const testVariables: VariableStore = {};
  let stepCounter = 0;
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
  const totalSetupStepCount = (test.dataSeeders || [])
    .map((dataSeeder) => dataSeeder.setup.length)
    .reduce((sum, length) => sum + length, 0);

  for (const dataSeeder of test.dataSeeders || []) {
    for (const setupStep of dataSeeder.setup) {
      stepCounter += 1;

      const testFlow = await runStepAndDetermineTestFlow$(
        setupStep,
        `Setup step ${stepCounter}/${totalSetupStepCount}`,
        variables,
        !!test.continueAfterFailedSteps,
        logger,
      );

      if (testFlow.action === "exit") {
        return testFlow.result === "error" ? "error" : "testFailed";
      } else if (!testFlow.result.testStepSuccessful) {
        testExecutionResult = "testFailed";
      }
    }
  }

  // Test steps
  const testStepCount = test.steps.length;
  stepCounter = 0;
  for (const step of test.steps) {
    stepCounter += 1;

    const testFlow = await runStepAndDetermineTestFlow$(
      step,
      `Step ${stepCounter}/${testStepCount}`,
      variables,
      !!test.continueAfterFailedSteps,
      logger,
    );

    if (testFlow.action === "exit") {
      return testFlow.result === "error" ? "error" : "testFailed";
    } else if (!testFlow.result.testStepSuccessful) {
      testExecutionResult = "testFailed";
    }
  }

  // Seeding teardown
  const totalTeardownStepCount = (test.dataSeeders || [])
    .map((dataSeeder) => dataSeeder.teardown.length)
    .reduce((sum, length) => sum + length, 0);

  stepCounter = 0;
  for (const dataSeeder of [...(test.dataSeeders || [])].reverse()) {
    for (const seederStep of dataSeeder.teardown) {
      stepCounter += 1;

      const testFlow = await runStepAndDetermineTestFlow$(
        seederStep,
        `Teardown step ${stepCounter}/${totalTeardownStepCount}`,
        variables,
        !!test.continueAfterFailedSteps,
        logger,
      );

      if (testFlow.action === "exit") {
        return testFlow.result === "error" ? "error" : "testFailed";
      } else if (!testFlow.result.testStepSuccessful) {
        testExecutionResult = "testFailed";
      }
    }
  }
  return testExecutionResult;
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
