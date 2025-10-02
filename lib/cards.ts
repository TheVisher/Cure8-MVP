import { type Card, Prisma } from "@prisma/client";
import { prisma } from "./db";
import type { CardStatus } from "@/src/lib/types";

export type CreateCardInput = {
  id?: string;
  url: string;
  title?: string | null;
  notes?: string | null;
  status?: CardStatus;
  tags?: string[];
  collections?: string[];
  domain?: string | null;
  image?: string | null;
  description?: string | null;
  metadata?: Prisma.JsonValue;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type UpdateCardInput = {
  url?: string;
  title?: string | null;
  notes?: string | null;
  status?: CardStatus;
  tags?: string[];
  collections?: string[];
  domain?: string | null;
  image?: string | null;
  description?: string | null;
  metadata?: Prisma.JsonValue;
};

function sanitize<T extends Record<string, unknown>>(value: T): T {
  const entries = Object.entries(value).filter(([, v]) => v !== undefined);
  return Object.fromEntries(entries) as T;
}

const encodeStringArray = (value: unknown): string => {
  if (!Array.isArray(value)) return "[]";
  return JSON.stringify(value.filter((item): item is string => typeof item === "string"));
};

const decodeStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value !== "string" || value.length === 0) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
};

export async function listCards(options: { limit?: number; cursor?: string } = {}) {
  const rawLimit = Number.isFinite(options.limit) ? Number(options.limit) : undefined;
  const take = Math.min(Math.max(rawLimit ?? 50, 1), 100);
  const hasCursor = typeof options.cursor === "string" && options.cursor.length > 0;

  const query: Prisma.CardFindManyArgs = {
    take: take + 1,
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
  };

  if (hasCursor) {
    query.cursor = { id: options.cursor! };
    query.skip = 1;
  }
  let cards: Card[] = [];
  try {
    cards = await prisma.card.findMany(query);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { items: [], nextCursor: null };
    }
    throw error;
  }
  const hasNextPage = cards.length > take;
  const items = hasNextPage ? cards.slice(0, take) : cards;
  const nextCursor = hasNextPage ? items[items.length - 1]?.id ?? null : null;

  return {
    items: items.map(serializeCard),
    nextCursor,
  };
}

export async function createCard(input: CreateCardInput) {
  const { id, createdAt, updatedAt, ...rest } = input;
  const data = sanitize({
    id,
    ...rest,
    status: (rest.status ?? "PENDING") as CardStatus,
    tags: encodeStringArray(rest.tags),
    collections: encodeStringArray(rest.collections),
    createdAt: createdAt ? new Date(createdAt) : undefined,
    updatedAt: updatedAt ? new Date(updatedAt) : undefined,
  });

  const card = await prisma.card.create({
    data: data as Prisma.CardUncheckedCreateInput,
  });

  return serializeCard(card);
}

export async function updateCard(id: string, input: UpdateCardInput) {
  const data = sanitize({
    ...input,
    status: input.status as CardStatus | undefined,
    tags: input.tags !== undefined ? encodeStringArray(input.tags) : undefined,
    collections: input.collections !== undefined ? encodeStringArray(input.collections) : undefined,
    metadata: input.metadata !== undefined ? (input.metadata as Prisma.InputJsonValue) : undefined,
  });

  const card = await prisma.card.update({
    where: { id },
    data: data as Prisma.CardUncheckedUpdateInput,
  });

  return serializeCard(card);
}

export async function deleteCard(id: string) {
  await prisma.card.delete({ where: { id } });
}

export async function clearCards() {
  await prisma.card.deleteMany();
}

function serializeCard(card: Card) {
  return {
    id: card.id,
    url: card.url,
    title: card.title,
    notes: card.notes,
    status: card.status as CardStatus,
    tags: decodeStringArray(card.tags),
    collections: decodeStringArray(card.collections),
    domain: card.domain,
    image: card.image,
    description: card.description,
    metadata: card.metadata,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
}
