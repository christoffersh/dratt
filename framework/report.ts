import { ExpectationReport } from "./expectations/expectation-types.ts";
import { HttpRequest } from "./http.ts";
import { FAIL, Logger, LogLevel, OK } from "./logger.ts";
import {
  TestDefinition,
  TestStepDefinition,
  TestSuiteDefinition,
} from "./models.ts";

export interface TestSuiteReport {
  testSuite: TestSuiteDefinition;
  testSuiteSuccessful: boolean;
  testReports: TestReport[];
}

export interface TestReport {
  test: TestDefinition;
  testSuccessful: boolean;
  setupDataseedingReports: DataSeedingReport[];
  testStepReports: TestStepReport[];
  teardownDataSeedingReports: DataSeedingReport[];
}

export interface TestStepReport {
  testStep: TestStepDefinition;
  request: HttpRequest;
  testStepSuccessful: boolean;
  expectationReports: ExpectationReport[];
}

export interface DataSeedingReport {
  dataSeederName: string;
  steps: TestStepReport[];
  dataSeedingSuccessful: boolean;
}

export interface LiveReporter {
  testSuiteStart(testSuite: TestSuiteDefinition): void;
  testSuiteEnd(testSuiteReport: TestSuiteReport): void;
  testStart(test: TestDefinition): void;
  testEnd(testStart: TestReport): void;
  setupDataSeeding(testStep: DataSeedingReport): void;
  testStep(testStep: TestStepReport): void;
  teardownDataSeeding(testStep: DataSeedingReport): void;
}

export class LoggerLiveReporter implements LiveReporter {
  constructor(private logger: Logger) {
  }

  testSuiteStart(testSuite: TestSuiteDefinition): void {
    this.logger.log(LogLevel.Min, "Suite", testSuite.name);
  }

  testSuiteEnd(testSuiteReport: TestSuiteReport): void {
    if (!testSuiteReport.testSuiteSuccessful) {
      this.logger.log(
        LogLevel.Min,
        "^ Suite",
        testSuiteReport.testSuite.name,
        FAIL,
      );
    }
  }

  testStart(test: TestDefinition): void {
    this.logger.log(LogLevel.Min, "Test", test.name);
  }

  testEnd(testReport: TestReport): void {
    if (!testReport.testSuccessful) {
      this.logger.log(
        LogLevel.Min,
        "^ Test",
        testReport.test.name,
        FAIL,
      );
    }
  }

  setupDataSeeding(testStepReport: DataSeedingReport): void {
    this.logger.log(
      LogLevel.Normal,
      "Data seeder setup",
      testStepReport.dataSeederName,
      testStepReport.dataSeedingSuccessful ? OK : FAIL,
    );
  }

  testStep(testStepReport: TestStepReport): void {
    this.logger.log(
      LogLevel.Normal,
      testStepReport.request.method,
      testStepReport.request.url,
    );

    for (const expectationReport of testStepReport.expectationReports) {
      logExpectationReport(this.logger, expectationReport);
    }
  }

  teardownDataSeeding(testStepReport: DataSeedingReport): void {
    this.logger.log(
      LogLevel.Normal,
      "Data seeder teardown",
      testStepReport.dataSeederName,
    );
  }
}

function logExpectationReport(
  logger: Logger,
  expectationReport: ExpectationReport,
): true {
  if (expectationReport.expectationMet) {
    switch (expectationReport.type) {
      case "statusEquals":
        logger.log(
          LogLevel.Normal,
          `Expected status = ${expectationReport.expectation.expectedStatus}`,
          OK,
        );
        return true;
      case "bodyEquals":
        logger.log(LogLevel.Normal, "Expected body equals", OK);
        return true;
      case "bodyIncludes":
        logger.log(LogLevel.Normal, "Expected body includes", OK);
        return true;
    }
  } else {
    switch (expectationReport.type) {
      case "statusEquals":
        logger.log(
          LogLevel.Min,
          `Expected status = ${expectationReport.expectation.expectedStatus} but was ${expectationReport.context.actualStatus}`,
          FAIL,
        );
        return true;
      case "bodyEquals":
        logger.log(LogLevel.Min, "Expected body equals", FAIL);
        logger.logData(
          LogLevel.Normal,
          "mismatch",
          expectationReport.context.mismatch,
        );
        return true;
      case "bodyIncludes":
        logger.log(LogLevel.Min, "Expected body includes", FAIL);
        logger.logData(
          LogLevel.Normal,
          "mismatch",
          expectationReport.context.mismatch,
        );
        return true;
        return true;
    }
  }
}
