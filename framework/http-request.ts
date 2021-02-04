// Http Request

export type HttpRequest =
  | HttpGetRequest
  | HttpPostRequest
  | HttpDeleteRequest
  | HttpPutRequest;

export interface HttpGetRequest {
  method: "GET";
  baseUrl: string;
  path: string;
  queryParams?: QueryParams;
}

export interface HttpPostRequest {
  method: "POST";
  baseUrl: string;
  path: string;
  body: Object;
  queryParams?: QueryParams;
}

export interface HttpDeleteRequest {
  method: "DELETE";
  baseUrl: string;
  path: string;
  queryParams?: QueryParams;
}

export interface HttpPutRequest {
  method: "PUT";
  baseUrl: string;
  path: string;
  body: Object;
  queryParams?: QueryParams;
}

export type QueryParams = Record<string, string | number>;

type HttpRequestContainingBody = HttpPostRequest | HttpPutRequest;

export function requestHasBody(
  request: HttpRequest,
): request is HttpRequestContainingBody {
  return request.method === "POST" || request.method === "PUT";
}
