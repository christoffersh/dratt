import {
  jsonTypeOf,
  JsonValueType,
  matches,
  MismatchFactory,
  MismatchNode,
} from "./mismatch.ts";
import { VariableStore } from "./models.ts";
import { isNullish } from "./utils.ts";
import { substituteVariablesOnObject } from "./variable-substitution.ts";

// Expectation matcher

const matcherSymbol = Symbol("matcherSymbol");

export interface ExpectationMatcher {
  [matcherSymbol]: string;
  evaluateMatcherMismatch: (
    value: unknown,
    variables: VariableStore,
  ) => MismatchNode;
}

export function isMatcher(value: any): value is ExpectationMatcher {
  return value && typeof value[matcherSymbol] === "string";
}

// Array includes matcher

export function arrayIncludesMatcher(expectedItems: any[]): ExpectationMatcher {
  return {
    [matcherSymbol]: "arrayIncludesMatcher",
    evaluateMatcherMismatch: (
      actualItems: unknown,
      variables: VariableStore,
    ): MismatchNode => {
      expectedItems = substituteVariablesOnObject(expectedItems, variables);

      if (isNullish(actualItems)) {
        return MismatchFactory.notEqualValue(expectedItems, actualItems);
      }

      if (!Array.isArray(actualItems)) {
        return MismatchFactory.notEqualType(
          "array",
          jsonTypeOf(actualItems) ?? "invalidJsonType",
        );
      }

      // Add missing
      return expectedItems
        .filter((expectedItem) => {
          return actualItems.every(
            (actualItem) => !matches(expectedItem, actualItem, variables),
          );
        })
        .map((missingItem) => MismatchFactory.missing(missingItem));
    },
  };
}

// Type maches

export function typeMatcher(type: JsonValueType): ExpectationMatcher {
  return {
    [matcherSymbol]: "typeMatcher",
    evaluateMatcherMismatch: (
      value: unknown,
      _: VariableStore,
    ): MismatchNode => {
      if (jsonTypeOf(value) !== type) {
        return MismatchFactory.notEqualType(
          type,
          jsonTypeOf(value) ?? "invalidJsonType",
        );
      } else {
        return [];
      }
    },
  };
}
