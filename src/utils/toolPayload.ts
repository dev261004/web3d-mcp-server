import { ContentResult } from "fastmcp";

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJsonString(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function unwrapContentResult(value: unknown): unknown {
  if (!isJsonObject(value) || !Array.isArray(value.content)) {
    return value;
  }

  const textParts = value.content
    .filter((item): item is { type: "text"; text: string } => {
      return isJsonObject(item) && item.type === "text" && typeof item.text === "string";
    })
    .map((item) => item.text);

  if (textParts.length === 0) {
    return value;
  }

  return parseJsonString(textParts.join("\n"));
}

export function unwrapToolPayload<T>(value: unknown, key?: string): T {
  const parsedValue = typeof value === "string" ? parseJsonString(value) : unwrapContentResult(value);

  if (key && isJsonObject(parsedValue) && key in parsedValue) {
    const nestedValue = parsedValue[key];

    return (typeof nestedValue === "string" ? parseJsonString(nestedValue) : unwrapContentResult(nestedValue)) as T;
  }

  return parsedValue as T;
}

export function createToolResult(payload: unknown): ContentResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload)
      }
    ]
  };
}
