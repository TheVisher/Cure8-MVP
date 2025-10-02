import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { deleteCard } from "@/lib/cards";
import { prisma } from "@/lib/db";
import type { CardStatus } from "@/src/lib/types";
import { sanitizeHtml } from "@/src/lib/sanitize";

export const dynamic = "force-dynamic";

const updateCardSchema = z
  .object({
    title: z.string().optional(),
    notes: z.string().optional(),
    status: z.enum(["PENDING", "READY", "ERROR"]).optional(),
    tags: z.array(z.string()).optional(),
    collections: z.array(z.string()).optional(),
    domain: z.string().optional(),
    image: z.string().optional(),
    description: z.string().optional(),
    url: z.string().url().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "No updatable fields provided",
  });

const sanitizeOptional = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const cleaned = sanitizeHtml(value);
  return cleaned.length > 0 ? cleaned : null;
};

function serializeCard(card: { id: string; url: string; title: string | null; notes: string | null; status: CardStatus; tags: string[]; collections: string[]; domain: string | null; image: string | null; description: string | null; metadata: any; createdAt: Date; updatedAt: Date }) {
  return {
    id: card.id,
    url: card.url,
    title: card.title,
    notes: card.notes,
    status: card.status,
    tags: card.tags,
    collections: card.collections,
    domain: card.domain,
    image: card.image,
    description: card.description,
    metadata: card.metadata,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
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
    const parsed = updateCardSchema.safeParse(payload);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Invalid request body";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) {
      updateData.title = sanitizeOptional(data.title);
    }
    if (data.notes !== undefined) {
      updateData.notes = sanitizeOptional(data.notes);
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    if (data.tags !== undefined && Array.isArray(data.tags)) {
      updateData.tags = data.tags.filter((tag): tag is string => typeof tag === "string");
    }
    if (data.collections !== undefined && Array.isArray(data.collections)) {
      updateData.collections = data.collections.filter((slug): slug is string => typeof slug === "string");
    }
    if (data.domain !== undefined) {
      updateData.domain = sanitizeOptional(data.domain);
    }
    if (data.image !== undefined) {
      updateData.image = typeof data.image === "string" ? data.image : null;
    }
    if (data.description !== undefined) {
      updateData.description = sanitizeOptional(data.description);
    }
    if (data.url !== undefined) {
      updateData.url = data.url;
    }

    try {
      const updatedCard = await prisma.card.update({
        where: { id },
        data: updateData,
      });

      return NextResponse.json(serializeCard(updatedCard));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        return NextResponse.json({ error: "Card not found" }, { status: 404 });
      }
      console.error(`[cards.PATCH] ${id} failed`, error);
      return NextResponse.json({ error: "Unable to update card" }, { status: 500 });
    }
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
    try {
      await deleteCard(id);
      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error(`[cards.DELETE] ${id} failed`, error);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        return NextResponse.json({ error: "Card not found" }, { status: 404 });
      }
      return NextResponse.json({ error: "Unable to delete card" }, { status: 500 });
    }
  } catch (error) {
    console.error(`[cards.DELETE] ${id}`, error);
    return NextResponse.json({ error: "Unable to delete card" }, { status: 500 });
  }
}
