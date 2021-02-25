import { TestSuiteBuilder } from "./framework/builder.ts";
import { LogLevel } from "./framework/logger.ts";
import { createTestRunner, TestRunner } from "./framework/test-runner.ts";

export { Test, TestSuite } from "./framework/builder.ts";
export { LogLevel } from "./framework/logger.ts";
export {
  ExpectBody,
  ExpectProperty,
  ExpectStatus,
} from "./framework/expectations/expectation-types.ts";

class Dratt {
  private runner: TestRunner;

  constructor(private settings?: { logLevel?: LogLevel }) {
    this.runner = createTestRunner({
      logLevel: this.settings?.logLevel ?? LogLevel.Normal,
    });
  }

  async run$(...testSuiteBuilders: TestSuiteBuilder[]) {
    await this.runner.runTestSuites$(
      testSuiteBuilders.map((builders) => builders.build()),
    );
  }
}

export function dratt(options?: { logLevel?: LogLevel }) {
  return new Dratt(options);
}
