export async function Log(
  stack: Stack,
  level: Level,
  pkg: PackageName,
  message: string
): Promise<LogResult> {
  const token = getLogToken();
  const body = { stack, level, package: pkg, message };

  if (!token) {
    return {
      ok: false,
      status: 0,
      error: "Missing bearer token. Save the Afford access token before sending logs.",
      request: body
    };
  }

  try {
    const startedAt = performance.now();
    const response = await fetch(LOG_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
    const responseBody = await safeJson(response);

    return {
      ok: response.ok,
      status: response.status,
      durationMs: Math.round(performance.now() - startedAt),
      request: body,
      response: responseBody
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : "Unknown logging error",
      request: body
    };
  }
}

export type Stack = "backend" | "frontend";
export type Level = "debug" | "info" | "warn" | "error" | "fatal";
export type PackageName =
  | "component"
  | "hook"
  | "page"
  | "state"
  | "style"
  | "auth"
  | "config"
  | "middleware"
  | "utils";

export type LogRequest = {
  stack: Stack;
  level: Level;
  package: PackageName;
  message: string;
};

export type LogResult = {
  ok: boolean;
  status: number;
  durationMs?: number;
  request: LogRequest;
  response?: unknown;
  error?: string;
};

const LOG_ENDPOINT = "http://20.244.56.144/evaluation-service/logs";
const TOKEN_KEY = "afford_access_token";

export function setLogToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token.trim());
}

export function getLogToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

async function safeJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
