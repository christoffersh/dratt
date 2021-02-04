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
  TestStepResult,
  TestSuiteDefinition,
  Variables,
  VariableStore,
} from "./models.ts";
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

      if (testFlow.action !== "continue") {
        return testFlow.result;
      } else if (testFlow.result === "testFailed") {
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

    if (testFlow.action !== "continue") {
      return testFlow.result;
    } else if (testFlow.result === "testFailed") {
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

      if (testFlow.action !== "continue") {
        return testFlow.result;
      } else if (testFlow.result === "testFailed") {
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

  const stepResult = await runStep$(
    step,
    variables,
    continueAfterFail,
    logger,
  );

  return determineTestFlow(
    stepTitle,
    stepResult,
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
): Promise<"stepSuccess" | "stepFailed" | "error"> {
  try {
    const resultingRequest = substitueVariablesInRequest(
      variables,
      step.request,
      logger,
    );

    if (resultingRequest === "error") {
      return "error";
    }

    const response = await callApi$(resultingRequest, logger);

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

    const validationResult = checkExpectations(
      resultingRequest,
      response,
      resultingExpectations,
      combineVariables(variables),
      logger,
    );

    if (validationResult === "failed" && !shouldSkipVariableSettersOnFail) {
      return "stepFailed";
    }

    if (step.afterStep) {
      step.afterStep((name, value) => {
        logger.log(LogLevel.Info, "Setting variable", `${name}=${value}`);
        if (value === undefined) {
          throw `Tried to set variable '${name}' to undefined`;
        }
        variables.test[name] = value;
      }, response);
    }

    if (validationResult === "failed") {
      return "stepFailed";
    }

    return "stepSuccess";
  } catch (err: any) {
    logger.logData(LogLevel.Min, "Exception", err);
    return "error";
  }
}

function determineTestFlow(
  stepTitle: string,
  testResult: TestStepResult,
  step: TestStepDefinition,
  continueAfterFailedSteps: boolean,
  logger: Logger,
): TestFlow {
  switch (testResult) {
    case "stepSuccess":
      return { action: "continue", result: "testSuccess" };
    case "stepFailed":
      logger.log(
        LogLevel.Min,
        `^ ${stepTitle}`,
        step.description,
        FAILED,
        continueAfterFailedSteps ? "Continuing..." : "Aborting...",
      );
      if (continueAfterFailedSteps) {
        return { action: "continue", result: "testFailed" };
      } else {
        return { action: "exit", result: "testFailed" };
      }
    case "error":
      // Some exception or other error occured. Abort test.
      logger.log(
        LogLevel.Min,
        `^ ${stepTitle}`,
        "Exiting...",
        "Unexpected error encounted",
      );
      return { action: "exit", result: "error" };
  }
}
