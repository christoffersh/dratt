export function isPrimitive(val: any) {
  return (
    typeof val === "string" ||
    typeof val === "number" ||
    typeof val === "boolean"
  );
}

export function isEmpty(val: any) {
  return Object.keys(val).length === 0;
}

export function isNullish<T>(
  val: T | null | undefined,
): val is null | undefined {
  return val === null || val === undefined;
}

export function isObject(value: any) {
  return typeof value === "object";
}

export function deepCopy<T>(obj: T): T {
  return (deepCopyImpl(obj) as unknown) as T;
}

function deepCopyImpl(obj: any): any {
  if (!obj || !isObject(obj)) {
    return obj;
  }

  const emptyNewObj = Array.isArray(obj) ? [] : {};

  return Reflect.ownKeys(obj).reduce((newObj, key) => {
    return Object.assign(newObj, { [key]: deepCopyImpl(obj[key]) });
  }, emptyNewObj);
}
