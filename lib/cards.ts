import type { Card, Prisma } from "@prisma/client";
import { prisma } from "./db";

type CardStatus = "ok" | "pending" | "error";

export type CreateCardInput = {
  id?: string;
  title: string;
  url: string;
  image?: string | null;
  notes?: string | null;
  description?: string | null;
  domain?: string | null;
  status?: CardStatus;
  metadata?: Prisma.JsonValue;
  createdAt?: string | Date;
};

export type UpdateCardInput = {
  title?: string;
  url?: string;
  image?: string | null;
  notes?: string | null;
  description?: string | null;
  domain?: string | null;
  status?: CardStatus;
  metadata?: Prisma.JsonValue;
};

function sanitize<T extends Record<string, unknown>>(value: T): T {
  const entries = Object.entries(value).filter(([, v]) => v !== undefined);
  return Object.fromEntries(entries) as T;
}

export async function listCards() {
  const cards = await prisma.card.findMany({
    orderBy: { createdAt: "desc" },
  });
  return cards.map(serializeCard);
}

export async function createCard(input: CreateCardInput) {
  const { id, createdAt, ...rest } = input;
  const data = sanitize({
    id,
    ...rest,
    status: (rest.status ?? "ok") as CardStatus,
    createdAt: createdAt ? new Date(createdAt) : undefined,
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
    metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
  });

  const card = await prisma.card.update({
    where: { id },
    data,
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
    title: card.title,
    url: card.url,
    image: card.image,
    notes: card.notes,
    description: card.description,
    domain: card.domain,
    status: card.status as CardStatus,
    metadata: card.metadata,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
}
