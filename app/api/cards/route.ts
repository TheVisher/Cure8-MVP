import { NextResponse } from "next/server";
import { z } from "zod";

import { createCard, listCards, clearCards } from "@/lib/cards";
import type { CardStatus } from "@/src/lib/types";
import { sanitizeHtml } from "@/src/lib/sanitize";

export const dynamic = "force-dynamic";

const createPayloadSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["PENDING", "READY", "ERROR"]).optional(),
  tags: z.array(z.string()).optional(),
  collections: z.array(z.string()).optional(),
  domain: z.string().optional(),
  image: z.string().optional(),
  description: z.string().optional(),
  metadata: z.unknown().optional(),
  createdAt: z.union([z.string(), z.number()]).optional(),
  updatedAt: z.union([z.string(), z.number()]).optional(),
});

function validateStatus(value: unknown): CardStatus | undefined {
  if (value === undefined) return undefined;
  if (value === "PENDING" || value === "READY" || value === "ERROR") {
    return value;
  }
  return undefined;
}

const sanitizeOptional = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const cleaned = sanitizeHtml(value);
  return cleaned.length > 0 ? cleaned : null;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = Number.parseInt(searchParams.get("limit") || "", 10);
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Number.isFinite(limitParam) ? limitParam : undefined;

    const result = await listCards({ limit, cursor });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[cards.GET]", error);
    return NextResponse.json({ error: "Unable to load cards" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = createPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const message = issue?.path[0] === "url" ? "Invalid URL" : issue?.message || "Invalid request";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const data = parsed.data;

    try {
      const card = await createCard({
        id: typeof payload.id === "string" ? payload.id : undefined,
        title: sanitizeOptional(data.title),
        url: data.url,
        notes: sanitizeOptional(data.notes),
        status: validateStatus(data.status) ?? "PENDING",
        tags: Array.isArray(data.tags)
          ? data.tags.filter((tag: unknown) => typeof tag === "string")
          : [],
        collections: Array.isArray(data.collections)
          ? data.collections.filter((slug: unknown) => typeof slug === "string")
          : [],
        domain: sanitizeOptional(data.domain),
        image: typeof data.image === "string" ? data.image : null,
        description: sanitizeOptional(data.description),
        metadata: data.metadata ?? null,
        createdAt: typeof data.createdAt === "number" ? new Date(data.createdAt) : data.createdAt,
        updatedAt: typeof data.updatedAt === "number" ? new Date(data.updatedAt) : data.updatedAt,
      });

      return NextResponse.json(card, { status: 201 });
    } catch (prismaError) {
      console.error("[cards.POST] failed to create card", prismaError);
      return NextResponse.json({ error: "Unable to create card" }, { status: 500 });
    }
  } catch (error) {
    console.error("[cards.POST]", error);
    return NextResponse.json({ error: "Unable to create card" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    try {
      await clearCards();
      return NextResponse.json({ ok: true });
    } catch (prismaError) {
      console.error("[cards.DELETE] failed to clear cards", prismaError);
      return NextResponse.json({ error: "Unable to clear cards" }, { status: 500 });
    }
  } catch (error) {
    console.error("[cards.DELETE]", error);
    return NextResponse.json({ error: "Unable to clear cards" }, { status: 500 });
  }
}
