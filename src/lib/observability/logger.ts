type LogFields = Record<string, unknown>;

function safeFields(fields: LogFields) {
  const blocked = new Set(["prompt", "input", "output", "content", "apiKey", "authorization"]);
  return Object.fromEntries(
    Object.entries(fields).filter(([key]) => !blocked.has(key)),
  );
}

export function logEvent(
  level: "info" | "warn" | "error",
  event: string,
  fields: LogFields = {},
) {
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...safeFields(fields),
  });

  if (level === "error") {
    console.error(payload);
    return;
  }

  if (level === "warn") {
    console.warn(payload);
    return;
  }

  console.info(payload);
}
