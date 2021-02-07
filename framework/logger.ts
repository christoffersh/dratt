import {
  green,
  red,
} from "https://cdn.deno.land/std/versions/0.84.0/raw/fmt/colors.ts";

export enum LogLevel {
  Min,
  Normal,
  Info,
  Max,
}

export class Logger {
  currentLogLevel: LogLevel;

  constructor(logLevel: LogLevel) {
    this.currentLogLevel = logLevel;
  }

  log(minLogLevel: LogLevel, title: string, ...parts: (string | number)[]) {
    if (this.currentLogLevel >= minLogLevel) {
      printLog(title, ...parts);
    }
  }

  logData(minLogLevel: LogLevel, title: string, data: any) {
    if (this.currentLogLevel >= minLogLevel) {
      printDataLog(title, data, this.currentLogLevel < LogLevel.Info);
    }
  }
}

export const FAIL = red("FAIL");
export const OK = green("OK");

function printLog(title: string, ...parts: (string | number)[]) {
  console.log(
    [`${title}`, ...parts.map((part) => (part ?? "").toString())].join(
      "\t",
    ),
  );
}

function printDataLog(title: string, data: any, limitData: boolean) {
  console.log(`[${title}]`);
  if (data && typeof data === "string") {
    const numLines = data.split("\n").length;
    // TODO: Handle case for single line mega strings
    if (numLines > 4 && limitData) {
      console.log(data.split("\n").slice(0, 4).join("\n"));
      printLog(
        `^ ${title}`,
        "Output is limited to 4 lines",
        "Run tests with --log-level info to see it all",
      );
    } else {
      console.log(data.length === 0 ? "<empty>" : data);
    }
  } else {
    console.log(
      Deno.inspect(data, {
        colors: true,
        depth: 10,
      }),
    );
  }
}
