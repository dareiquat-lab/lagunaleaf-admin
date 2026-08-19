import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ORDER_PROMPT = `You are parsing a screenshot of a chat that may contain ONE OR MORE customer orders (WhatsApp, iMessage, SMS, Telegram, Instagram DM, etc.).

CRITICAL — extract EVERY separate order visible in the screenshot as its own entry.

CRITICAL — client name rules:
- The contact name or phone number shown at the TOP of the screenshot (the sender/channel header) is NOT a client name. IGNORE IT.
- Employee tags like "@Stephen", "@~Stephen", "~Dr.B" are staff names — NOT client names. IGNORE THEM.
- The client's name is only what a customer writes about THEMSELVES in the message body (e.g. "This is Maria", "It's Jake", "Jirasak Soukchareon", "My name is Lisa").
- If no name is stated inside the message body, leave first_name and last_name as empty strings.
- Never use a phone number as a name.

Return ONLY valid JSON with no extra text:
{
  "orders": [
    {
      "client": {
        "first_name": "string — from message body only, or empty string",
        "last_name": "string — from message body only, or empty string",
        "phone": "string — only if stated inside the message body, otherwise null"
      },
      "items": [
        {
          "product_name": "string — as written in the message",
          "quantity": number,
          "unit_price": number or 0 if not stated
        }
      ],
      "notes": "any pickup/delivery/other notes or null",
      "ordered_at": "ISO date string if mentioned, otherwise null",
      "message_fingerprint": "short string: clientname-item1qty-item2qty etc"
    }
  ]
}

Additional rules:
- Quantity defaults to 1 if not stated.
- unit_price defaults to 0 if not stated.
- Each distinct customer message block = one order entry.
- Return ONLY the JSON object, no markdown fences, no explanation.`;

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
  const rawType = file.type || "image/jpeg";

  const isPdf = rawType === "application/pdf";

  // Anthropic only accepts these four image types — normalise everything else to jpeg
  const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
  type SupportedImage = typeof SUPPORTED_IMAGE_TYPES[number];

  let imageType: SupportedImage = "image/jpeg";
  if (rawType === "image/png") imageType = "image/png";
  else if (rawType === "image/gif") imageType = "image/gif";
  else if (rawType === "image/webp") imageType = "image/webp";
  // image/heic, image/heif, image/jpg, unknown → default jpeg (Claude handles it fine)

  const isImage = rawType.startsWith("image/") || !rawType;

  if (!isImage && !isPdf) {
    return NextResponse.json({ error: "Only images and PDFs are supported" }, { status: 400 });
  }

  const prompt = mode === "order" ? ORDER_PROMPT : INVOICE_PROMPT;

  const contentBlock = isPdf
    ? ({ type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } } as const)
    : ({ type: "image", source: { type: "base64", media_type: imageType, data: base64 } } as const);

  let message;
  try {
    message = await client.messages.create({
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Bubble up meaningful errors to the client
    if (msg.includes("credit balance")) {
      return NextResponse.json({ error: "Anthropic account has no credits. Go to console.anthropic.com → Plans & Billing to add credits." }, { status: 402 });
    }
    if (msg.includes("API key")) {
      return NextResponse.json({ error: "Invalid Anthropic API key. Check your ANTHROPIC_API_KEY environment variable." }, { status: 401 });
    }
    return NextResponse.json({ error: `Claude API error: ${msg}` }, { status: 500 });
  }

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  // Extract the JSON object by finding the outermost { ... } — handles
  // code fences, preamble text, and any other wrapping Claude might add
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    return NextResponse.json({ error: "Claude did not return a JSON object", raw: text }, { status: 422 });
  }

  const cleaned = text.slice(firstBrace, lastBrace + 1);

  try {
    const parsed = JSON.parse(cleaned);
    return NextResponse.json({ mode, data: parsed });
  } catch {
    return NextResponse.json({ error: "Failed to parse Claude response", raw: text }, { status: 422 });
  }
}
