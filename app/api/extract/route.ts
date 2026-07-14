// route.ts — server-side API route that calls Claude to extract order lines
// This file runs on the server ONLY. The API key never reaches the browser.
// Called by the UI when a coordinator clicks "Extract".

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { loadCatalog, catalogToPromptContext } from '@/lib/catalog';
import { assignWarehouse } from '@/lib/warehouse';
import { ExtractionResult, OrderLine, FlagCode } from '@/lib/types';

interface ClaudeExtractedLine {
  raw_text?: string;
  matched_sku?: string | null;
  matched_name?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  flags?: FlagCode[];
  flag_reasons?: string[];
}

interface ClaudeExtractionResponse {
  extracted_lines?: ClaudeExtractedLine[];
  requested_terms?: string | null;
  requested_delivery?: string | null;
}

// Initialize the Anthropic client inside the handler so env vars are read at request time
function getAnthropicClient(): Anthropic {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Server is missing ANTHROPIC_API_KEY. Add it to .env.local.' },
        { status: 500 }
      );
    }

    // 1. Read the raw order text from the request body
    const body = await req.json();
    const rawText: string = body.rawText?.trim();

    // 2. Reject empty input — never send a blank prompt to Claude
    if (!rawText || rawText.length < 3) {
      return NextResponse.json(
        { error: 'No order content detected. Please paste an order message.' },
        { status: 400 }
      );
    }

    // 3. Load CTI catalog and convert to prompt-ready format
    const catalog = loadCatalog();
    const catalogContext = catalogToPromptContext(catalog);

    // 4. Build the prompt for Claude
    const systemPrompt = `You are a purchase-order parser for CAN Trading Incorporated (CTI), 
a Philippine B2B safety and medical equipment distributor.

Your job: extract each line item from the raw order message and match it to the closest 
entry in the CTI product catalog provided below.

RULES — follow these exactly:
- Currency is always PHP. Never use USD.
- Return ONLY valid JSON. No preamble, no explanation, no markdown.
- If no catalog match exists, set matched_sku to null and add flag UNMATCHED_SKU.
- If 2+ matches are equally likely, add flag AMBIGUOUS_MATCH.
- If quantity is missing, set quantity to null and add flag MISSING_QUANTITY.
- If the customer states a price different from the catalog price, add flag PRICE_MISMATCH.
- Never invent a SKU. Only use SKUs from the catalog below.
- This is decision support only. A human coordinator reviews all output.

REQUIRED JSON SHAPE — return exactly this structure:
{
  "extracted_lines": [
    {
      "raw_text": "the original line from the order",
      "matched_sku": "SKU code or null",
      "matched_name": "product name or null",
      "quantity": number or null,
      "unit_price": number or null,
      "flags": ["FLAG_CODE"],
      "flag_reasons": ["plain language reason for each flag"]
    }
  ],
  "requested_terms": "e.g. Net 30 or null",
  "requested_delivery": "e.g. Friday or null"
}

CTI PRODUCT CATALOG:
${catalogContext}`;

    // 5. Call Claude — verify current model string at docs.anthropic.com before build
    const message = await getAnthropicClient().messages.create({
        model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Parse this order message and return the structured JSON:\n\n${rawText}`,
        },
      ],
      system: systemPrompt,
    });

    // 6. Extract text from Claude's response
    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '';

    // 7. Parse Claude's JSON response safely
    let parsed: ClaudeExtractionResponse;
    try {
      // Strip any accidental markdown fences Claude might add
      const cleaned = responseText
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      parsed = JSON.parse(cleaned) as ClaudeExtractionResponse;
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI response. Please try again.' },
        { status: 500 }
      );
    }

    // 8. Build typed OrderLine array with warehouse routing applied
    const extractedLines: OrderLine[] = (parsed.extracted_lines || []).map(
      (line: ClaudeExtractedLine) => {
        const sku = line.matched_sku ?? null;
        const warehouse = sku ? assignWarehouse(sku) : null;
        const flags: FlagCode[] = line.flags ?? [];

        // Add WRONG_WAREHOUSE flag if routing returned null for a matched SKU
        if (sku && warehouse === null) {
          flags.push('WRONG_WAREHOUSE');
        }

        return {
          rawText: line.raw_text ?? '',
          matchedSku: sku,
          matchedName: line.matched_name ?? null,
          quantity: line.quantity ?? null,
          unitPrice: line.unit_price ?? null,
          lineTotal:
            line.quantity && line.unit_price
              ? line.quantity * line.unit_price
              : null,
          warehouse,
          flags,
          flagReasons: line.flag_reasons ?? [],
          acknowledged: false, // coordinator must acknowledge before export
        };
      }
    );

    // 9. Compute order summary
    const flaggedLines = extractedLines.filter(l => l.flags.length > 0).length;
    const grandTotal = extractedLines.every(
      l => l.lineTotal !== null
    )
      ? extractedLines.reduce((sum, l) => sum + (l.lineTotal ?? 0), 0)
      : null;

    const result: ExtractionResult = {
      extractedLines,
      orderSummary: {
        totalLines: extractedLines.length,
        flaggedLines,
        grandTotal,
        currency: 'PHP',
        requestedTerms: parsed.requested_terms ?? null,
        requestedDelivery: parsed.requested_delivery ?? null,
      },
      status: flaggedLines > 0 ? 'NEEDS_REVIEW' : 'READY',
    };

    // 10. Return clean result to the browser
    return NextResponse.json(result);

  } catch (error) {
    console.error('Extract route error:', error);

    if (error instanceof Anthropic.APIError) {
      const message =
        error.error?.type === 'invalid_request_error' &&
        typeof error.error?.message === 'string'
          ? error.error.message
          : 'Anthropic API request failed. Please try again.';

      return NextResponse.json(
        { error: message },
        { status: error.status ?? 500 }
      );
    }

    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
