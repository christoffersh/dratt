// Utils

export type ExhaustiveMap<T extends string, U> = {
  [K in T]: U;
};

export function exhaustiveMap<T extends string, U extends unknown>(
  map: ExhaustiveMap<T, U>,
): ExhaustiveMap<T, U> {
  return map;
}

export function isPrimitive(val: unknown) {
  return (
    typeof val === "string" ||
    typeof val === "number" ||
    typeof val === "boolean"
  );
}

export function isEmpty(val: unknown) {
  return isObject(val) && Object.keys(val).length === 0;
}

export function isNullish<T>(
  val: T | null | undefined,
): val is null | undefined {
  return val === null || val === undefined;
}

export function isObject(value: unknown): value is object {
  return typeof value === "object";
}

export function deepCopy<T>(obj: T): T {
  return (deepCopyImpl(obj) as unknown) as T;
}

function deepCopyImpl(obj: unknown): any {
  if (!obj || !isObject(obj)) {
    return obj;
  }

  const emptyNewObj: Record<string | number, unknown> | unknown[] =
    Array.isArray(obj) ? [] : {};

  return Reflect.ownKeys(obj).reduce((newObj, key) => {
    return Object.assign(newObj, { [key]: deepCopyImpl((obj as any)[key]) });
  }, emptyNewObj);
}
