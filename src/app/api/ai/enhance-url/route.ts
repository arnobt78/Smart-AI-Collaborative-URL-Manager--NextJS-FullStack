import { NextRequest, NextResponse } from "next/server";
import { aiEnhancementService } from "@/lib/ai/enhancement";
import type { AIProvider } from "@/lib/ai/providers";
import { aiEnhanceSchema, parseJsonBody } from "@/lib/api-validation";

export async function POST(req: NextRequest) {
  try {
    const parsed = await parseJsonBody(req, aiEnhanceSchema);
    if (!parsed.success) return parsed.response;
    const { url, title, description, provider, options } = parsed.data;

    const result = await aiEnhancementService.enhanceUrl(
      {
        url,
        title,
        description,
      },
      {
        provider: provider as AIProvider | undefined,
        ...options,
      }
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || "Failed to enhance URL",
          provider: result.provider,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to enhance URL",
      },
      { status: 500 }
    );
  }
}
