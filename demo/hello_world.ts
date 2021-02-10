import { dratt, ExpectStatus, LogLevel, Test, TestSuite } from "../dratt.ts";

await dratt({ logLevel: LogLevel.Info }).run$(
  TestSuite("Test the biggies").tests(
    Test("Search engines")
      .get("http://www.goggle.com", [ExpectStatus.toBe(200)])
      .get("https://www.bing.com/", [ExpectStatus.toBe(200)]),
    Test("Social media")
      .get("http://www.facebook.com", [ExpectStatus.toBe(200)])
      .get("http://www.twitter.com", [ExpectStatus.toBe(200)]),
  ),
);
