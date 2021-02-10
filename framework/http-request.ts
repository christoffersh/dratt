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
  body: Object;
}

export interface HttpDeleteRequest {
  method: "DELETE";
  url: string;
}

export interface HttpPutRequest {
  method: "PUT";
  url: string;
  body: Object;
}

export type QueryParams = Record<string, string | number>;

type HttpRequestContainingBody = HttpPostRequest | HttpPutRequest;

export function requestHasBody(
  request: HttpRequest,
): request is HttpRequestContainingBody {
  return request.method === "POST" || request.method === "PUT";
}
