import { ExpectationReport } from "./expect.ts";
import { HttpRequest } from "./http-request.ts";
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
    this.logger.log(LogLevel.Min, "Test suite", testSuite.name);
  }

  testSuiteEnd(testSuiteReport: TestSuiteReport): void {
    this.logger.log(
      LogLevel.Min,
      "Test suite",
      testSuiteReport.testSuite.name,
      testSuiteReport.testSuiteSuccessful ? OK : FAIL,
    );
  }

  testStart(test: TestDefinition): void {
    this.logger.log(LogLevel.Min, "Test", test.name);
  }

  testEnd(testReport: TestReport): void {
    // this.logger.log(
    //   LogLevel.Min,
    //   `^ Test ${testReport.testSuccessful ? OK : FAIL}`,
    // );
  }

  setupDataSeeding(testStepReport: DataSeedingReport): void {
    this.logger.log(
      LogLevel.Normal,
      "Setup",
      testStepReport.dataSeederName,
    );
  }

  testStep(testStepReport: TestStepReport): void {
    this.logger.log(
      LogLevel.Min,
      "   >",
      testStepReport.testStep.description,
      testStepReport.testStepSuccessful ? OK : FAIL,
    );
  }

  teardownDataSeeding(testStepReport: DataSeedingReport): void {
    this.logger.log(
      LogLevel.Normal,
      "Teardown",
      testStepReport.dataSeederName,
    );
  }
}
