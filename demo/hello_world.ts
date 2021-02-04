import { createTestRunner, ExpectStatus } from "../dratt.ts";

const testRunner = createTestRunner();

await testRunner.runTestSuites$([
  {
    name: "MyTestSuite",
    tests: [{
      name: "Google",
      description: "Check if google is up and running",
      steps: [
        {
          description: "GET google",
          request: {
            method: "GET",
            path: "/search?q=deno",
            baseUrl: "http://www.google.com",
          },
          expectations: [
            ExpectStatus.toBe(200),
          ],
        },
      ],
    }],
    variables: {},
  },
]);

export default {};
