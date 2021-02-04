import { TestBuilder, TestSuiteBuilder } from "./framework/builder.ts";
import { LogLevel } from "./framework/logger.ts";
export { LogLevel } from "./framework/logger.ts";
import { createTestRunner, TestRunner } from "./framework/test-runner.ts";

export {
  ExpectBody,
  ExpectProperty,
  ExpectStatus,
} from "./framework/expect.ts";

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

export const TestSuite = (
  name: string,
  options?: { ignoreFailedTests?: boolean },
) => {
  return new TestSuiteBuilder(name, options);
};

export const Test = (name: string, description?: string) => {
  return new TestBuilder(name, description);
};

export function dratt(options?: { logLevel?: LogLevel }) {
  return new Dratt(options);
}
