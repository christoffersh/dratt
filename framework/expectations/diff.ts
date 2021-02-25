// Based on this npm package: https://github.com/mattphillips/deep-object-diff#readme

const isDate = (d: any) => d instanceof Date;
const isEmpty = (o: any) => Object.keys(o).length === 0;
const isObject = (o: any) => o != null && typeof o === "object";
const properObject = (o: any) =>
  isObject(o) && !o.hasOwnProperty ? { ...o } : o;

export function detailedDiff(lhs: any, rhs: any) {
  return {
    added: addedDiff(lhs, rhs),
    deleted: deletedDiff(lhs, rhs),
    updated: updatedDiff(lhs, rhs),
  };
}

function addedDiff(lhs: any, rhs: any) {
  if (lhs === rhs || !isObject(lhs) || !isObject(rhs)) return {};

  const l = properObject(lhs);
  const r = properObject(rhs);

  return Object.keys(r).reduce((acc, key) => {
    if (l.hasOwnProperty(key)) {
      const difference: any = addedDiff(l[key], r[key]);

      if (isObject(difference) && isEmpty(difference)) return acc;

      return { ...acc, [key]: difference };
    }

    return { ...acc, [key]: r[key] };
  }, {});
}
function deletedDiff(lhs: any, rhs: any) {
  if (lhs === rhs || !isObject(lhs) || !isObject(rhs)) return {};

  const l = properObject(lhs);
  const r = properObject(rhs);

  return Object.keys(l).reduce((acc, key) => {
    if (r.hasOwnProperty(key)) {
      const difference: any = deletedDiff(l[key], r[key]);

      if (isObject(difference) && isEmpty(difference)) return acc;

      return { ...acc, [key]: difference };
    }

    return { ...acc, [key]: undefined };
  }, {});
}

function updatedDiff(lhs: any, rhs: any) {
  if (lhs === rhs) return {};

  if (!isObject(lhs) || !isObject(rhs)) return rhs;

  const l = properObject(lhs);
  const r = properObject(rhs);

  if (isDate(l) || isDate(r)) {
    if (l.valueOf() == r.valueOf()) return {};
    return r;
  }

  return Object.keys(r).reduce((acc, key) => {
    if (l.hasOwnProperty(key)) {
      const difference: any = updatedDiff(l[key], r[key]);

      if (isObject(difference) && isEmpty(difference) && !isDate(difference)) {
        return acc;
      }

      return { ...acc, [key]: difference };
    }

    return acc;
  }, {});
}
