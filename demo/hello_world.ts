import { dratt, ExpectStatus, LogLevel, Test, TestSuite } from "../dratt.ts";

await dratt({ logLevel: LogLevel.Info }).run$(
  TestSuite("Test the biggies").tests(
    Test("Google").get("http://www.goggle.com", [ExpectStatus.toBe(200)]),
    Test("Facebook").get("http://www.facebook.com", [ExpectStatus.toBe(200)]),
    Test("Twitter").get("http://www.twitter.com", [ExpectStatus.toBe(400)]),
  ),
);

export default {};
