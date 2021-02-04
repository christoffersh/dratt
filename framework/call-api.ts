import { HttpRequest, QueryParams } from "./http-request.ts";
import { Logger, LogLevel } from "./logger.ts";
import { HttpResponse } from "./models.ts";

export async function callApi$(
  request: HttpRequest,
  logger: Logger,
): Promise<
  | HttpResponse
  | "apiCallException"
  | "callCreationFailed"
  | "responseReadFailed"
> {
  logger.log(
    LogLevel.Normal,
    request.method,
    createUrl(request.baseUrl, request.path, request.queryParams),
  );

  try {
    const apiCall$ = createApiCall$(request);

    if (apiCall$ === "callCreationFailed") {
      return "callCreationFailed";
    }

    const res = await apiCall$; // Doing actual call here

    try {
      return await readReponse$(res);
    } catch (err) {
      logger.logData(LogLevel.Min, "Exception", err);
      return "responseReadFailed";
    }
  } catch (err: any) {
    logger.log(LogLevel.Min, "Api call exception", err);
    return "apiCallException";
  }
}

function createApiCall$(request: HttpRequest) {
  const url = createUrl(request.baseUrl, request.path, request.queryParams);
  if (request.method === "GET") {
    // GET
    return fetch(url);
  } else if (request.method === "POST") {
    // POST
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request.body),
    });
  } else if (request.method === "PUT") {
    // PUT
    return fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request.body),
    });
  } else if (request.method === "DELETE") {
    // DELETE
    return fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });
  } else {
    return "callCreationFailed";
  }
}

function createUrl(
  baseUrl: string,
  path: string,
  queryParams: QueryParams | undefined,
) {
  const queryParamsString = queryParams
    ? createQueryParamString(queryParams)
    : undefined;

  const url = `${baseUrl}${
    !baseUrl.endsWith("/") && !path.startsWith("/") ? "/" : ""
  }${path}${queryParamsString ? "?" : ""}${queryParamsString ?? ""}`;

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw `url "${url}" is missing http:// or https:// prefix`;
  }

  return url;
}

function createQueryParamString(queryParams: QueryParams) {
  return Object.keys(queryParams)
    .map((key) => `${key}=${queryParams[key]}`)
    .join("&");
}

async function readReponse$(response: Response): Promise<HttpResponse> {
  const contentType = response.headers.get("Content-Type");
  return {
    url: response.url,
    status: response.status,
    statusText: response.statusText,
    body: contentType?.includes("application/json") ||
        contentType?.includes("application/problem+json")
      ? await response.json()
      : (await response.text()) ?? undefined,
  };
}
