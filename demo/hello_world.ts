import { dratt, ExpectStatus, LogLevel, Test, TestSuite } from "../dratt.ts";

await dratt({ logLevel: LogLevel.Info }).run$(
  TestSuite("Test the biggies", { ignoreFailedTests: true }).tests(
    Test("Google")
      .get(
        "Check google live",
        "http://www.goggle.com",
        [ExpectStatus.toBe(200)],
      ),
    Test("Facebook")
      .get(
        "Check facebook live",
        "http://www.facebook.com",
        [ExpectStatus.toBe(200)],
      ),
    Test("Twitter")
      .get(
        "Check twitter live (but retuns bad request)",
        "http://www.twitter.com",
        [ExpectStatus.toBe(400)],
      ),
  ),
);

export default {};
