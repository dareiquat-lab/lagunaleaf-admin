import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ORDER_PROMPT = `You are parsing a screenshot of a customer order message (e.g. from WhatsApp, text, or DM).

Extract the following and return ONLY valid JSON with no extra text:
{
  "client": {
    "first_name": "string",
    "last_name": "string or empty string",
    "phone": "string or null"
  },
  "items": [
    {
      "product_name": "string — the product name as written",
      "quantity": number,
      "unit_price": number or 0 if not stated
    }
  ],
  "notes": "any extra notes from the message or null",
  "ordered_at": "ISO date string if a date/time is mentioned, otherwise null"
}

Rules:
- If only one name is given, put it in first_name and leave last_name empty.
- Quantity defaults to 1 if not stated.
- unit_price defaults to 0 if not stated.
- Include ALL items mentioned, even if vague.
- Return ONLY the JSON object, no markdown, no explanation.`;

const INVOICE_PROMPT = `You are parsing an invoice image or PDF for a cannabis/wellness product supplier.

Extract every line item and return ONLY valid JSON with no extra text:
{
  "supplier": "supplier/vendor name or null",
  "items": [
    {
      "name": "clean product name",
      "category": "one of: Indica, Sativa, Hybrid, Edibles, Flower, or your best guess",
      "quantity": number,
      "unit_cost": number
    }
  ]
}

Rules:
- "name" should be a clean, readable product name (title case, no invoice codes).
- Infer category from the product: strain letters (I/S/H), product type (gummies→Edibles, flower→Flower, vape/pen/AIO→match strain), etc.
- unit_cost = the Rate/Unit Price column (cost per item to the store).
- quantity = the Qty column.
- Skip subtotal, tax, and total rows.
- Return ONLY the JSON object, no markdown, no explanation.`;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const mode = formData.get("mode") as "order" | "invoice";

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mimeType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf";

  const isImage = mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf";

  if (!isImage && !isPdf) {
    return NextResponse.json({ error: "Only images and PDFs are supported" }, { status: 400 });
  }

  const prompt = mode === "order" ? ORDER_PROMPT : INVOICE_PROMPT;

  const contentBlock = isPdf
    ? ({ type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } } as const)
    : ({ type: "image", source: { type: "base64", media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: base64 } } as const);

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          contentBlock,
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  // Strip markdown code fences if Claude wraps in ```json
  const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    return NextResponse.json({ mode, data: parsed });
  } catch {
    return NextResponse.json({ error: "Failed to parse Claude response", raw: text }, { status: 422 });
  }
}
