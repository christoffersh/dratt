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
            url: "${googleBaseUrl}/search?q=${searchString}",
          },
          expectations: [
            ExpectStatus.toBe(200),
          ],
        },
      ],
    }],
    variables: {
      googleBaseUrl: "http://www.google.com",
      searchString: "deno",
    },
  },
]);

export default {};
