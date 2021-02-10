import { isMatcher } from "./expectation-matcher.ts";
import { VariableStore } from "./models.ts";
import { isEmpty, isNullish, isPrimitive } from "./utils.ts";

export const mismatchSymbol = Symbol("mismatchSymbol");

export type JsonValueType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "null"
  | "array";

export function jsonTypeOf(val: any): JsonValueType | undefined {
  if (Array.isArray(val)) {
    return "array";
  }

  if (val === null) {
    return "null";
  }

  const jsType = typeof val;

  if (
    jsType === "bigint" ||
    jsType === "function" ||
    jsType === "symbol" ||
    jsType === "undefined"
  ) {
    return undefined;
  }

  return jsType;
}

export type Mismatch =
  | {
    [mismatchSymbol]: true;
    mismatchType: "missing";
    value: any;
  }
  | {
    [mismatchSymbol]: true;
    mismatchType: "extra";
    value: any;
  }
  | {
    [mismatchSymbol]: true;
    mismatchType: "notEqualValue";
    expectedValue: any;
    actualValue: any;
  }
  | {
    [mismatchSymbol]: true;
    mismatchType: "notEqualType";
    expectedType: JsonValueType | "invalidJsonType";
    actualType: JsonValueType | "invalidJsonType";
  };

interface MismatchTree
  extends Record<string | number, MismatchTree | Mismatch | Mismatch[]> {}

export type MismatchNode = MismatchTree | Mismatch | Mismatch[];

export class MismatchFactory {
  static notEqualValue(expectedValue: any, actualValue: any): Mismatch {
    return {
      [mismatchSymbol]: true,
      mismatchType: "notEqualValue",
      expectedValue,
      actualValue,
    };
  }

  static notEqualType(
    expectedType: JsonValueType,
    actualType: JsonValueType | "invalidJsonType",
  ): Mismatch {
    return {
      [mismatchSymbol]: true,
      mismatchType: "notEqualType",
      expectedType,
      actualType,
    };
  }

  static missing(missing: any): Mismatch {
    return {
      [mismatchSymbol]: true,
      mismatchType: "missing",
      value: missing,
    };
  }

  static extra(extra: any): Mismatch {
    return {
      [mismatchSymbol]: true,
      mismatchType: "extra",
      value: extra,
    };
  }
}

export function isMismatch(value: any): value is Mismatch {
  return value !== null && value !== null && value[mismatchSymbol] === true;
}

export function matches(
  expected: any,
  actual: any,
  variables: VariableStore,
): boolean {
  return isEmpty(evaluateMismatch(expected, actual, variables));
}

// Returns and object or array describing the mismatch between an expected and actual value.
// If a matcher is encountered (e.g. ExpectProperty.arrayIncludes) it will use that matcher
// to check if the coresponding property on the actual object matches or not.
export function evaluateMismatch(
  expected: any,
  actual: any,
  variables: VariableStore,
): MismatchNode {
  if (isMatcher(expected)) {
    return expected.evaluateMatcherMismatch(actual, variables);
  } else if (
    isPrimitive(expected) ||
    isPrimitive(actual) ||
    isNullish(expected) ||
    isNullish(actual)
  ) {
    return expected === actual
      ? {}
      : MismatchFactory.notEqualValue(expected, actual);
  }

  const allKeys = [
    ...new Set([...Object.keys(expected), ...Object.keys(actual)]),
  ];
  return allKeys.reduce((acc, key) => {
    if (!expected.hasOwnProperty(key)) {
      Object.assign(acc, {
        [key]: MismatchFactory.extra(actual[key]),
      });
      return acc;
    }

    if (!actual.hasOwnProperty(key)) {
      Object.assign(acc, {
        [key]: MismatchFactory.missing(expected[key]),
      });
      return acc;
    }

    const diff = evaluateMismatch(expected[key], actual[key], variables);

    if (isEmpty(diff)) {
      return acc;
    } else {
      Object.assign(acc, { [key]: diff });
      return acc;
    }
  }, {});
}

export function filterMismatches(
  miss: MismatchNode,
  shouldKeepMismatch: (mismatch: Mismatch) => boolean,
): MismatchNode {
  if (isMismatch(miss)) {
    if (shouldKeepMismatch(miss)) {
      return miss;
    }
    return {};
  }

  const empty = Array.isArray(miss) ? [] : {};

  return Object.keys(miss ?? empty).reduce((acc, key) => {
    const remainingMiss = filterMismatches(
      miss[key as any],
      shouldKeepMismatch,
    );

    if (isEmpty(remainingMiss)) {
      return acc;
    } else {
      return Object.assign(acc, {
        [key]: filterMismatches(miss[key as any], shouldKeepMismatch),
      });
    }
  }, empty);
}

export function removeMismatchSymbols(miss: MismatchNode): MismatchNode {
  if (isMismatch(miss)) {
    const mismatch = { ...miss };
    delete (mismatch as any)[mismatchSymbol];
    return mismatch;
  }

  const empty = Array.isArray(miss) ? [] : {};

  return Object.keys(miss ?? empty).reduce((acc, key) => {
    return Object.assign(acc, {
      [key]: removeMismatchSymbols(miss[key as any]),
    });
  }, empty);
}
