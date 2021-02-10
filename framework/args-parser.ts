import args from "https://deno.land/x/args@2.0.6/index.ts";
import {
  EarlyExitFlag,
  PartialOption,
} from "https://deno.land/x/args@2.0.6/flag-types.ts";
import { Choice } from "https://deno.land/x/args@2.0.6/value-types.ts";
import { PARSE_FAILURE } from "https://deno.land/x/args@2.0.6/symbols.ts";
import { LogLevel } from "./logger.ts";

type LogLevelOption = "min" | "normal" | "info" | "max";

const parser = args
  .describe("Add or subtract two numbers")
  .with(
    EarlyExitFlag("help", {
      describe: "Show help",
      exit() {
        console.log(parser.help());
        return Deno.exit();
      },
    }),
  )
  .with(
    PartialOption<"log-level", LogLevelOption, LogLevelOption>("log-level", {
      alias: ["L"],
      describe: "Log level",
      default: "normal",
      type: Choice<LogLevelOption>(
        {
          value: "min",
          describe: "No request info on successful test steps.",
        },
        {
          value: "normal",
          describe: "Default log level. Shows request urls.",
        },
        {
          value: "info",
          describe: "Shows request body in addition to urls.",
        },
        {
          value: "max",
          describe: "Shows all there is to know about requests and responses.",
        },
      ),
    }),
  );

export interface Args {
  logLevel: LogLevel;
}

function logLevelOptionToEnum(option: LogLevelOption) {
  switch (option) {
    case "min":
      return LogLevel.Min;
    case "normal":
      return LogLevel.Normal;
    case "info":
      return LogLevel.Info;
    case "max":
      return LogLevel.Max;
  }
}

export function parseArgs(): Args | "error" {
  const res = parser.parse(Deno.args);

  if (res.tag === PARSE_FAILURE) {
    // Alternatively, `if (res.error) {`
    console.error("Failed to parse CLI arguments");
    console.error(res.error.toString());
    return "error";
  } else {
    return {
      logLevel: logLevelOptionToEnum(res.value["log-level"]),
    };
  }
}
