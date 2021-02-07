import { HttpRequest, QueryParams } from "./http-request.ts";
import { Logger, LogLevel } from "./logger.ts";
import { HttpResponse } from "./models.ts";

export async function callApi$(
  request: HttpRequest,
): Promise<
  HttpResponse
> {
  const apiCall$ = createApiCall$(request);

  const res = await apiCall$; // Doing actual call here

  return await readReponse$(res);
}

function createApiCall$(request: HttpRequest) {
  if (
    !request.url.startsWith("http://") && !request.url.startsWith("https://")
  ) {
    throw `url "${request.url}" is missing http:// or https:// prefix`;
  }

  switch (request.method) {
    case "GET":
      return fetch(request.url);
    case "POST":
      return fetch(request.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request.body),
      });
    case "PUT":
      return fetch(request.url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request.body),
      });
    case "DELETE":
      return fetch(request.url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
  }
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
