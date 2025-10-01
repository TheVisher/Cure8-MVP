import { NextResponse } from "next/server";
import { createCard, listCards, clearCards } from "@/lib/cards";

export const dynamic = "force-dynamic";

function validateStatus(value: unknown) {
  if (value === undefined) return undefined;
  if (value === "ok" || value === "pending" || value === "error") {
    return value;
  }
  return undefined;
}

export async function GET() {
  try {
    const cards = await listCards();
    return NextResponse.json(cards, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[cards.GET]", error);
    return NextResponse.json({ error: "Unable to load cards" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    if (!payload || typeof payload.url !== "string" || payload.url.trim().length === 0) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const card = await createCard({
      id: typeof payload.id === "string" ? payload.id : undefined,
      title: typeof payload.title === "string" && payload.title.trim() ? payload.title : payload.url,
      url: payload.url,
      image: payload.image ?? null,
      notes: payload.notes ?? null,
      description: payload.description ?? null,
      domain: payload.domain ?? null,
      status: validateStatus(payload.status) ?? "ok",
      metadata: payload.metadata ?? null,
      createdAt: payload.createdAt,
    });

    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error("[cards.POST]", error);
    return NextResponse.json({ error: "Unable to create card" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await clearCards();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[cards.DELETE]", error);
    return NextResponse.json({ error: "Unable to clear cards" }, { status: 500 });
  }
}
