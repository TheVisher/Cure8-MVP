import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { deleteCard, updateCard } from "@/lib/cards";

export const dynamic = "force-dynamic";

function validateStatus(value: unknown) {
  if (value === undefined) return undefined;
  if (value === "ok" || value === "pending" || value === "error") {
    return value;
  }
  return undefined;
}

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: "Missing card id" }, { status: 400 });
  }

  try {
    const payload = await request.json();
    const card = await updateCard(id, {
      title: typeof payload.title === "string" ? payload.title : undefined,
      url: typeof payload.url === "string" ? payload.url : undefined,
      image: payload.image ?? undefined,
      notes: payload.notes ?? undefined,
      description: payload.description ?? undefined,
      domain: payload.domain ?? undefined,
      status: validateStatus(payload.status),
      metadata: payload.metadata ?? undefined,
    });

    return NextResponse.json(card);
  } catch (error) {
    console.error(`[cards.PATCH] ${id}`, error);
    return NextResponse.json({ error: "Unable to update card" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: "Missing card id" }, { status: 400 });
  }

  try {
    await deleteCard(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`[cards.DELETE] ${id}`, error);
    return NextResponse.json({ error: "Unable to delete card" }, { status: 500 });
  }
}
