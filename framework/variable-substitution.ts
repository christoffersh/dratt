import { ResponseExpectation } from "./expect.ts";
import { HttpRequest, requestHasBody } from "./http-request.ts";
import { Logger, LogLevel } from "./logger.ts";
import { combineVariables, Variables, VariableStore } from "./models.ts";
import { deepCopy, isNullish, isPrimitive } from "./utils.ts";

const variablePlaceholderSymbol = Symbol("variablePlaceholder");

export interface VariablePlaceholder {
  [variablePlaceholderSymbol]: true;
  variableName: string;
  variableType: "number" | "string";
}

export function useVariable(
  variableName: string,
  variableType: "number" | "string",
): VariablePlaceholder {
  return {
    [variablePlaceholderSymbol]: true,
    variableName,
    variableType,
  };
}

export function substitueVariablesInRequest(
  variables: Variables,
  requestToSubstitute: HttpRequest,
  logger: Logger,
): HttpRequest | "error" {
  // test variables will overwrite suite variables on collision
  const combinedVariables = combineVariables(variables);
  const request = deepCopy(requestToSubstitute);

  const printSubstitutionErrorContext = (message: string) => {
    logger.log(LogLevel.Min, "Variable substitution error", message);
    logger.logData(LogLevel.Normal, "Variables", variables);
  };

  // base url
  try {
    request.url = substituteVariablesInString(
      combinedVariables,
      request.url,
    );
  } catch (err: any) {
    printSubstitutionErrorContext(
      `Substitution on url '${request.url}': ${err}`,
    );
    return "error";
  }

  // body
  if (requestHasBody(request)) {
    try {
      request.body = substituteVariablesOnObject(
        request.body,
        combinedVariables,
      );
    } catch (err: any) {
      printSubstitutionErrorContext(`Substitution on request body: ${err}`);
      return "error";
    }
  }

  return request;
}

export function substitueVariablesInExpectations(
  variables: Variables,
  expectationsToSubstitute: ResponseExpectation[],
  logger: Logger,
): ResponseExpectation[] | "error" {
  const expectations = deepCopy(expectationsToSubstitute);
  for (const expectation of expectations) {
    if (
      expectation.expectation === "bodyEquals" ||
      expectation.expectation === "bodyIncludes"
    ) {
      expectation.body = substituteVariablesOnObject(
        expectation.body,
        combineVariables(variables),
      );
    }
  }
  return expectations;
}

function isVariablePlaceholder(
  value: any | VariablePlaceholder,
): value is VariablePlaceholder {
  return (
    value &&
    (value as VariablePlaceholder)[variablePlaceholderSymbol] === true
  );
}

// useVariable("myVar", "number" | "string") can be placed on the
// request body object by the user and are substituted here
export function substituteVariablesOnObject<T>(
  objToSubstitute: T,
  variables: VariableStore,
): T {
  const obj = deepCopy(objToSubstitute);
  substituteVariablesOnObjectImpl(obj, variables);
  return obj;
}

function substituteVariablesOnObjectImpl(
  obj: any,
  variables: VariableStore,
): any {
  // TODO: This function should return a new object and not mutate the original
  if (isNullish(obj) || isPrimitive(obj)) {
    return;
  }

  for (const key of Object.keys(obj)) {
    const valuePlaceholderCandidate = obj[key];

    if (isVariablePlaceholder(valuePlaceholderCandidate)) {
      const variablePlaceholder = valuePlaceholderCandidate;
      const variableValue = variables[variablePlaceholder.variableName];

      if (variableValue !== undefined) {
        if (variablePlaceholder.variableType === "string") {
          Object.assign(obj, {
            [key]: `${variables[variablePlaceholder.variableName]}`,
          });
        } else {
          const variableNumberValue = Number.parseFloat(
            `${variableValue}`,
          );
          if (isNaN(variableNumberValue)) {
            throw `Variable named '${variablePlaceholder.variableName}' with value '${variableValue}' could not be used as an integer`;
          } else {
            Object.assign(obj, {
              [key]: variableNumberValue,
            });
          }
        }
      } else {
        throw `Variable named '${variablePlaceholder.variableName}' was not defined`;
      }
    } else if (
      !isPrimitive(valuePlaceholderCandidate) &&
      !isNullish(valuePlaceholderCandidate)
    ) {
      substituteVariablesOnObjectImpl(valuePlaceholderCandidate, variables);
    }
  }
}

function isString(val: string | number): val is string {
  return typeof val === "string";
}

// Variables used in string like this '${myVariable}' are substituted here
export function substituteVariablesInString(
  templateVariables: VariableStore,
  templateString: string,
) {
  return templateString.replace(/\${(.*?)}/g, (_, g) => {
    const value = templateVariables[g];
    if (value === undefined) {
      throw `Variable named '${g}' was not defined`;
    }

    return `${value}`;
  });
}
