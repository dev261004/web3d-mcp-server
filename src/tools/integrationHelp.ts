import { z } from "zod";
import { getIntegrationHelp } from "../services/integrationService.js";
import { createToolResult } from "../utils/toolPayload.js";

export const integrationHelpTool = {
  name: "integration_help",
  description: `
Provide guidance on how to integrate a generated 3D scene into an application.

Your job:
- Explain how to use exported assets
- Provide step-by-step instructions
- Include code examples when helpful

Supported platforms:
- react (React Three Fiber)
- nextjs
- html (basic usage)

Rules:
- Keep instructions simple and practical
- Focus on helping user run the scene quickly
`,

  parameters: z.object({
    platform: z.enum(["react", "nextjs", "html"]),
    format: z.enum(["r3f", "json"]).optional()
  }),

  async execute({ platform, format }: any) {
    const help = getIntegrationHelp(platform, format || "r3f");

    return createToolResult({
      integration_guide: help
    });
  }
};
