import { dratt, ExpectStatus, LogLevel, Test, TestSuite } from "../dratt.ts";

await dratt({ logLevel: LogLevel.Info }).run$(
  TestSuite("Test the biggies").tests(
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
        "http://www.sovsoglort.com",
        [ExpectStatus.toBe(404)],
      ),
  ),
);

export default {};
