export class ApiError extends Error {
  status: number;
  body?: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export const apiFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const response = await fetch(input, init);
  if (response.ok) {
    return response;
  }

  let body: unknown;
  let message = response.statusText || "Request failed";
  try {
    body = await response.clone().json();
    if (body && typeof body === "object" && "error" in body && typeof (body as any).error === "string") {
      message = (body as any).error;
    }
  } catch {}

  throw new ApiError(response.status, message, body);
};
