import { callApi$ } from "./call-api.ts";
import { checkExpectations } from "./check-expectations.ts";
import { Logger, LogLevel } from "./logger.ts";
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
import {
  DataSeedingReport,
  LoggerLiveReporter,
  TestReport,
  TestStepReport,
  TestSuiteReport,
} from "./report.ts";
import {
  substitueVariablesInExpectations,
  substituteVariablesInRequest,
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
    const logger = new Logger(this.settings.logLevel);

    try {
      let testHasFailed = false;
      const reporter = new LoggerLiveReporter(logger);

      for (const testSuite of testSuites) {
        reporter.testSuiteStart(testSuite);

        const res = await runTestSuite$(testSuite, reporter);

        reporter.testSuiteEnd(res);

        if (!res.testSuiteSuccessful) {
          testHasFailed = true;
        }
      }

      return testHasFailed ? "failed" : "success";
    } catch (err: any) {
      logger.logData(LogLevel.Min, "Unexpected exception", err);
      return "error";
    }
  }
}

async function runTestSuite$(
  testSuite: TestSuiteDefinition,
  reporter: LoggerLiveReporter,
): Promise<TestSuiteReport> {
  const testReports: TestReport[] = [];

  for (const test of testSuite.tests) {
    reporter.testStart(test);
    const result = await runTest$(
      test,
      testSuite.variables,
      reporter,
    );

    reporter.testEnd(result);

    testReports.push(result);

    if (!result.testSuccessful && !testSuite.ignoreFailedTests) {
      return {
        testSuite,
        testReports,
        testSuiteSuccessful: false,
      };
    }
  }

  const everyTestSuccessful = testReports.every((testReport) =>
    testReport.testSuccessful
  );

  return {
    testSuite,
    testReports,
    testSuiteSuccessful: everyTestSuccessful,
  };
}

async function runTest$(
  test: TestDefinition,
  suiteVariables: VariableStore,
  reporter: LoggerLiveReporter,
): Promise<TestReport> {
  let testFailed = false;
  const testVariables: VariableStore = {};
  const variables = {
    test: testVariables,
    suite: suiteVariables,
  };

  // Setup data seeding
  const setupDataSeedingReports = await Promise.all(
    (test.dataSeeders ?? []).map(
      async (seeder) => {
        const steps = await runDataSeederSteps$(
          variables,
          !!test.continueAfterFailedSteps,
          (test.dataSeeders ?? []).flatMap((seeder) => seeder.setup),
        );
        const report: DataSeedingReport = {
          steps,
          dataSeederName: seeder.name,
          dataSeedingSuccessful: steps.every((step) => step.testStepSuccessful),
        };

        reporter.setupDataSeeding(report);

        return report;
      },
    ),
  );

  if (
    !setupDataSeedingReports.every((dataSeedingReport) =>
      dataSeedingReport.dataSeedingSuccessful
    )
  ) {
    if (test.continueAfterFailedSteps) {
      testFailed = true;
    } else {
      return {
        test: test,
        setupDataseedingReports: setupDataSeedingReports,
        testStepReports: [],
        teardownDataSeedingReports: [],
        testSuccessful: false,
      };
    }
  }

  // Test steps
  const testStepReports: TestStepReport[] = [];
  for (const step of test.steps) {
    const testStepReport = await runStep$(
      step,
      variables,
      !!test.continueAfterFailedSteps,
    );

    reporter.testStep(testStepReport);
    testStepReports.push(testStepReport);

    if (!testStepReport.testStepSuccessful && !test.continueAfterFailedSteps) {
      break;
    }
  }

  if (
    !testStepReports.every((stepReport) => stepReport.testStepSuccessful)
  ) {
    if (test.continueAfterFailedSteps) {
      testFailed = true;
    } else {
      return {
        test: test,
        setupDataseedingReports: setupDataSeedingReports,
        testStepReports: testStepReports,
        teardownDataSeedingReports: [],
        testSuccessful: false,
      };
    }
  }

  // Seeding teardown
  const teardownDataSeedingReports = await Promise.all(
    (test.dataSeeders ?? []).map(
      async (seeder) => {
        const steps = await runDataSeederSteps$(
          variables,
          !!test.continueAfterFailedSteps,
          (test.dataSeeders ?? []).flatMap((seeder) => seeder.setup),
        );
        const report: DataSeedingReport = {
          steps,
          dataSeederName: seeder.name,
          dataSeedingSuccessful: steps.every((step) => step.testStepSuccessful),
        };

        return report;
      },
    ),
  );

  if (
    !teardownDataSeedingReports.every((dataSeedingReport) =>
      dataSeedingReport.dataSeedingSuccessful
    )
  ) {
    if (test.continueAfterFailedSteps) {
      testFailed = true;
    } else {
      return {
        test: test,
        setupDataseedingReports: setupDataSeedingReports,
        testStepReports: testStepReports,
        teardownDataSeedingReports: teardownDataSeedingReports,
        testSuccessful: false,
      };
    }
  }

  return {
    test,
    testSuccessful: !testFailed,
    setupDataseedingReports: setupDataSeedingReports,
    testStepReports: testStepReports,
    teardownDataSeedingReports: teardownDataSeedingReports,
  };
}

async function runDataSeederSteps$(
  variables: Variables,
  ignoreFailed: boolean,
  steps: TestStepDefinition[],
): Promise<TestStepReport[]> {
  const testStepReports: TestStepReport[] = [];

  for (const step of steps) {
    const testStepReport = await runStep$(
      step,
      variables,
      ignoreFailed,
    );

    testStepReports.push(testStepReport);

    if (!testStepReport.testStepSuccessful && !ignoreFailed) {
      return testStepReports;
    }
  }
  return testStepReports;
}

async function runStep$(
  step: TestStepDefinition,
  variables: Variables,
  shouldSkipVariableSettersOnFail: boolean,
): Promise<TestStepReport> {
  const request = substituteVariablesInRequest(
    variables,
    step.request,
  );

  const response = await callApi$(request);

  const resultingExpectations = substitueVariablesInExpectations(
    variables,
    step.expectations,
  );

  const expectationReports = checkExpectations(
    request,
    response,
    resultingExpectations,
    combineVariables(variables),
  );

  const allExpectationsMet = expectationReports.every((report) =>
    report.expectationMet
  );

  if (
    (allExpectationsMet || !shouldSkipVariableSettersOnFail) && step.afterStep
  ) {
    step.afterStep((name, value) => {
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
}
