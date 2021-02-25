// Http Request

export type HttpRequest =
  | HttpGetRequest
  | HttpPostRequest
  | HttpDeleteRequest
  | HttpPutRequest;

export interface HttpGetRequest {
  method: "GET";
  url: string;
}

export interface HttpPostRequest {
  method: "POST";
  url: string;
  body: unknown;
}

export interface HttpDeleteRequest {
  method: "DELETE";
  url: string;
}

export interface HttpPutRequest {
  method: "PUT";
  url: string;
  body: unknown;
}

export type QueryParams = Record<string, string | number>;

type HttpRequestContainingBody = HttpPostRequest | HttpPutRequest;

export function requestHasBody(
  request: HttpRequest,
): request is HttpRequestContainingBody {
  return request.method === "POST" || request.method === "PUT";
}

// Http Response

export interface HttpResponse {
  url: string;
  status: number;
  statusText: string;
  body?: unknown;
}

// Request execution

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
