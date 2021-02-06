import { Expectation } from "./expect.ts";
import {
  AfterStepHandler,
  TestDefinition,
  TestStepDefinition,
  TestSuiteDefinition,
  VariableStore,
} from "./models.ts";

export class TestSuiteBuilder {
  private testBuilders: TestBuilder[] = [];
  private variablesStore?: VariableStore;

  constructor(
    private name: string,
    private options?: { ignoreFailedTests?: boolean },
  ) {}

  tests(...testBuilders: TestBuilder[]): TestSuiteBuilder {
    this.testBuilders = testBuilders;
    return this;
  }

  variables(variableStore: VariableStore) {
    this.variablesStore = variableStore;
    return this;
  }

  build(): TestSuiteDefinition {
    return {
      name: this.name,
      variables: this.variablesStore ?? {},
      tests: this.testBuilders.map((builder) => builder.build()),
      ignoreFailedTests: this.options?.ignoreFailedTests ?? false,
    };
  }
}

export class TestBuilder {
  private steps: TestStepDefinition[] = [];

  constructor(private name: string, private description?: string) {}
  // .get("Get all", "${googleBaseUrl}", [ExpectStatus.toBe(200)])
  // .post("Post new search", "${googleBaseUrl}", [ExpectStatus.toBe(200)]),

  get(
    description: string,
    url: string,
    expectations: Expectation[],
  ) {
    this.steps.push({
      description,
      expectations,
      request: {
        method: "GET",
        url,
      },
    });
    return this;
  }

  post(
    description: string,
    url: string,
    body: Object,
    expectations: Expectation[],
  ) {
    this.steps.push({
      description,
      expectations,
      request: {
        method: "POST",
        url,
        body,
      },
    });
    return this;
  }

  put(
    description: string,
    url: string,
    body: Object,
    expectations: Expectation[],
  ) {
    this.steps.push({
      description,
      expectations,
      request: {
        method: "PUT",
        url,
        body,
      },
    });
    return this;
  }

  delete(
    description: string,
    url: string,
    expectations: Expectation[],
  ) {
    this.steps.push({
      description,
      expectations,
      request: {
        method: "DELETE",
        url,
      },
    });
    return this;
  }

  afterStep(afterStepHandler: AfterStepHandler) {
    if (this.steps.length === 0) {
      throw new Error(
        "can't use afterStep when no steps has been declared (no previous call to get, put, post or delete)",
      );
    }
    this.steps[this.steps.length - 1].afterStep = afterStepHandler;
  }

  build(): TestDefinition {
    return {
      name: this.name,
      description: this.description,
      steps: this.steps,
    };
  }
}
