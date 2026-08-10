import { describe, expect, it } from "vitest";
import { describePhoto } from "@/lib/telegram/vision";

const FAKE_JPEG_BASE64 = "/9j/"; // shortest valid-looking JPEG magic bytes prefix; content is never inspected in these tests

function stubClient(response: unknown) {
  return { messages: { create: async () => response } } as never;
}

describe("describePhoto guards", () => {
  it("returns null when no API key is configured and no client is injected", async () => {
    const original = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const result = await describePhoto(FAKE_JPEG_BASE64, "image/jpeg");
      expect(result).toBeNull();
    } finally {
      if (original) process.env.ANTHROPIC_API_KEY = original;
    }
  });

  it("returns null when the model errors out", async () => {
    const client = { messages: { create: async () => Promise.reject(new Error("rate limited")) } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await describePhoto(FAKE_JPEG_BASE64, "image/jpeg", { client: client as any });
    expect(result).toBeNull();
  });

  it("returns null when the model answers with prose instead of calling the tool", async () => {
    // The exact failure this module exists to contain: a fluent description of
    // a specific product instead of a category tag. It must never reach the
    // catalogue search.
    const client = stubClient({
      content: [{ type: "text", text: "Это чёрный бомбер Nike, 42 размер." }],
      stop_reason: "end_turn",
    });
    const result = await describePhoto(FAKE_JPEG_BASE64, "image/jpeg", { client });
    expect(result).toBeNull();
  });

  it("reads a valid category and colours", async () => {
    const client = stubClient({
      content: [
        {
          type: "tool_use",
          id: "1",
          name: "describe_item",
          input: { category: "jacket", colors: ["black"] },
        },
      ],
      stop_reason: "tool_use",
    });
    const result = await describePhoto(FAKE_JPEG_BASE64, "image/jpeg", { client });
    expect(result).toEqual({ category: "jacket", colors: ["black"] });
  });

  it("returns null for 'other' with no colours — too little signal to search on", async () => {
    const client = stubClient({
      content: [
        { type: "tool_use", id: "1", name: "describe_item", input: { category: "other", colors: [] } },
      ],
      stop_reason: "tool_use",
    });
    const result = await describePhoto(FAKE_JPEG_BASE64, "image/jpeg", { client });
    expect(result).toBeNull();
  });

  it("returns null when the tool arguments fail validation", async () => {
    const client = stubClient({
      content: [
        { type: "tool_use", id: "1", name: "describe_item", input: { category: "spaceship", colors: [] } },
      ],
      stop_reason: "tool_use",
    });
    const result = await describePhoto(FAKE_JPEG_BASE64, "image/jpeg", { client });
    expect(result).toBeNull();
  });
});
