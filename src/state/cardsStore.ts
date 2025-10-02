'use client';

import { create } from "zustand";

import type { Card, CardStatus, ID } from "../lib/types";

const now = () => new Date().toISOString();

const normalizeTags = (tags: string[] | undefined | null) => {
  if (!Array.isArray(tags)) return [];
  const unique = new Set<string>();
  tags.forEach((tag) => {
    if (!tag || typeof tag !== "string") return;
    const trimmed = tag.trim();
    if (trimmed) unique.add(trimmed);
  });
  return Array.from(unique);
};

const normalizeCollections = (collections: string[] | undefined | null) => {
  if (!Array.isArray(collections)) return [];
  const unique = new Set<string>();
  collections.forEach((slug) => {
    if (!slug || typeof slug !== "string") return;
    const trimmed = slug.trim();
    if (trimmed) unique.add(trimmed);
  });
  return Array.from(unique);
};

const isCollectionSlug = (slug: string) => slug.startsWith("#");

type CardsState = {
  cards: Record<ID, Card>;
  order: ID[];
  selectedIds: ID[];
  selectionAnchor?: ID;
  list: () => Card[];
  setCards: (cards: Card[]) => void;
  upsertCard: (card: Card) => void;
  removeCard: (cardId: ID) => void;
  removeCards: (cardIds: ID[]) => void;
  assignTag: (cardId: ID, tagSlug: string) => void;
  removeTag: (cardId: ID, tagSlug: string) => void;
  bulkAssignTag: (cardIds: ID[], tagSlug: string) => void;
  bulkRemoveTag: (cardIds: ID[], tagSlug: string) => void;
  replaceTagAcrossCards: (oldTag: string, newTag: string) => void;
  removeTagFromAll: (tagSlug: string) => void;
  updateStatus: (cardId: ID, status: CardStatus) => void;
  selectOnly: (cardId: ID) => void;
  toggleSelect: (cardId: ID) => void;
  selectRange: (targetId: ID) => void;
  setSelection: (cardIds: ID[]) => void;
  clearSelection: () => void;
};

const sortCardsByCreatedAtDesc = (cards: Card[]) =>
  [...cards].sort((a, b) => {
    const aTime = Date.parse(a.createdAt ?? "");
    const bTime = Date.parse(b.createdAt ?? "");
    return (isNaN(bTime) ? 0 : bTime) - (isNaN(aTime) ? 0 : aTime);
  });

export const useCardsStore = create<CardsState>()((set, get) => ({
      cards: {},
      order: [],
      selectedIds: [],
      selectionAnchor: undefined,
      list: () => {
        const { cards, order } = get();
        return order
          .map((id) => cards[id])
          .filter((card): card is Card => Boolean(card));
      },
      setCards: (incoming) => {
        const cards = sortCardsByCreatedAtDesc(incoming).map((card) => ({
          ...card,
          status: card.status ?? "READY",
          tags: normalizeTags(card.tags),
          collections: normalizeCollections(card.collections),
          createdAt: card.createdAt || now(),
          updatedAt: card.updatedAt || now(),
        }));
        const byId: Record<ID, Card> = {};
        const order: ID[] = [];
        cards.forEach((card) => {
          byId[card.id] = card;
          order.push(card.id);
        });
        set({ cards: byId, order, selectedIds: [], selectionAnchor: undefined });
      },
      upsertCard: (card) => {
        set((state) => {
          const normalized: Card = {
            ...card,
            status: card.status ?? "READY",
            tags: normalizeTags(card.tags),
            collections: normalizeCollections(card.collections),
            createdAt: card.createdAt || now(),
            updatedAt: card.updatedAt || card.createdAt || now(),
          };
          const nextCards = { ...state.cards, [card.id]: normalized };
          const exists = state.order.includes(card.id);
          let nextOrder = state.order;
          if (!exists) {
            nextOrder = [card.id, ...state.order];
          }
          return { cards: nextCards, order: nextOrder };
        });
      },
      removeCard: (cardId) => {
        set((state) => {
          if (!state.cards[cardId]) return state;
          const nextCards = { ...state.cards };
          delete nextCards[cardId];
          const nextOrder = state.order.filter((id) => id !== cardId);
          const nextSelected = state.selectedIds.filter((id) => id !== cardId);
          const nextAnchor = nextSelected.includes(state.selectionAnchor ?? "")
            ? state.selectionAnchor
            : nextSelected[nextSelected.length - 1];
          return {
            cards: nextCards,
            order: nextOrder,
            selectedIds: nextSelected,
            selectionAnchor: nextAnchor,
          };
        });
      },
      removeCards: (cardIds) => {
        set((state) => {
          const removalSet = new Set(cardIds);
          let changed = false;
          const nextCards = { ...state.cards };
          removalSet.forEach((id) => {
            if (nextCards[id]) {
              changed = true;
              delete nextCards[id];
            }
          });
          if (!changed) return state;
          const nextOrder = state.order.filter((id) => !removalSet.has(id));
          const nextSelected = state.selectedIds.filter((id) => !removalSet.has(id));
          const nextAnchor = nextSelected.includes(state.selectionAnchor ?? "")
            ? state.selectionAnchor
            : nextSelected[nextSelected.length - 1];
          return {
            cards: nextCards,
            order: nextOrder,
            selectedIds: nextSelected,
            selectionAnchor: nextAnchor,
          };
        });
      },
      assignTag: (cardId, rawTag) => {
        const tagSlug = rawTag.trim();
        if (!tagSlug) return;
        set((state) => {
          const card = state.cards[cardId];
          if (!card) return state;
          if (card.tags.includes(tagSlug)) return state;
          const isCollection = isCollectionSlug(tagSlug);
          const collections = card.collections ?? [];
          const updated: Card = {
            ...card,
            tags: [...card.tags, tagSlug],
            collections: isCollection
              ? Array.from(new Set([...collections, tagSlug]))
              : collections,
            updatedAt: now(),
          };
          return { cards: { ...state.cards, [cardId]: updated } };
        });
      },
      removeTag: (cardId, rawTag) => {
        const tagSlug = rawTag.trim();
        if (!tagSlug) return;
        set((state) => {
          const card = state.cards[cardId];
          if (!card) return state;
          if (!card.tags.includes(tagSlug)) return state;
          const isCollection = isCollectionSlug(tagSlug);
          const updated: Card = {
            ...card,
            tags: card.tags.filter((tag) => tag !== tagSlug),
            collections: isCollection
              ? (card.collections ?? []).filter((slug) => slug !== tagSlug)
              : card.collections ?? [],
            updatedAt: now(),
          };
          return { cards: { ...state.cards, [cardId]: updated } };
        });
      },
      bulkAssignTag: (cardIds, tagSlug) => {
        const trimmed = tagSlug.trim();
        if (!trimmed) return;
        set((state) => {
          let changed = false;
          const nextCards = { ...state.cards };
          const isCollection = isCollectionSlug(trimmed);
          cardIds.forEach((cardId) => {
            const card = nextCards[cardId];
            if (!card) return;
            if (card.tags.includes(trimmed)) return;
            changed = true;
            nextCards[cardId] = {
              ...card,
              tags: [...card.tags, trimmed],
              collections: isCollection
                ? Array.from(new Set([...(card.collections ?? []), trimmed]))
                : card.collections ?? [],
              updatedAt: now(),
            };
          });
          if (!changed) return state;
          return { cards: nextCards };
        });
      },
      bulkRemoveTag: (cardIds, tagSlug) => {
        const trimmed = tagSlug.trim();
        if (!trimmed) return;
        set((state) => {
          let changed = false;
          const nextCards = { ...state.cards };
          const isCollection = isCollectionSlug(trimmed);
          cardIds.forEach((cardId) => {
            const card = nextCards[cardId];
            if (!card) return;
            if (!card.tags.includes(trimmed)) return;
            changed = true;
            nextCards[cardId] = {
              ...card,
              tags: card.tags.filter((tag) => tag !== trimmed),
              collections: isCollection
                ? (card.collections ?? []).filter((slug) => slug !== trimmed)
                : card.collections ?? [],
              updatedAt: now(),
            };
          });
          if (!changed) return state;
          return { cards: nextCards };
        });
      },
      replaceTagAcrossCards: (oldTag, newTag) => {
        const from = oldTag.trim();
        const to = newTag.trim();
        if (!from || !to || from === to) return;
        const fromIsCollection = isCollectionSlug(from);
        const toIsCollection = isCollectionSlug(to);
        set((state) => {
          let changed = false;
          const nextCards = { ...state.cards };
          Object.values(nextCards).forEach((card) => {
            if (!card.tags.includes(from)) return;
            changed = true;
            const tags = card.tags.filter((tag) => tag !== from);
            if (!tags.includes(to)) tags.push(to);
            let collections = card.collections ?? [];
            if (fromIsCollection) {
              collections = collections.filter((slug) => slug !== from);
            }
            if (toIsCollection && !collections.includes(to)) {
              collections = [...collections, to];
            }
            nextCards[card.id] = { ...card, tags, collections, updatedAt: now() };
          });
          if (!changed) return state;
          return { cards: nextCards };
        });
      },
      removeTagFromAll: (tagSlug) => {
        const trimmed = tagSlug.trim();
        if (!trimmed) return;
        const isCollection = isCollectionSlug(trimmed);
        set((state) => {
          let changed = false;
          const nextCards = { ...state.cards };
          Object.values(nextCards).forEach((card) => {
            if (!card.tags.includes(trimmed)) return;
            changed = true;
            nextCards[card.id] = {
              ...card,
              tags: card.tags.filter((tag) => tag !== trimmed),
              collections: isCollection
                ? (card.collections ?? []).filter((slug) => slug !== trimmed)
                : card.collections ?? [],
              updatedAt: now(),
            };
          });
          if (!changed) return state;
          return { cards: nextCards };
        });
      },
      updateStatus: (cardId, statusValue) => {
        set((state) => {
          const card = state.cards[cardId];
          if (!card) return state;
          return {
            cards: {
              ...state.cards,
              [cardId]: {
                ...card,
                status: statusValue,
                updatedAt: now(),
              },
            },
          };
        });
      },
      selectOnly: (cardId) => {
        set({ selectedIds: [cardId], selectionAnchor: cardId });
      },
      toggleSelect: (cardId) => {
        set((state) => {
          const isSelected = state.selectedIds.includes(cardId);
          const selectedIds = isSelected
            ? state.selectedIds.filter((id) => id !== cardId)
            : [...state.selectedIds, cardId];
          return { selectedIds, selectionAnchor: cardId };
        });
      },
      selectRange: (targetId) => {
        const { selectionAnchor, order } = get();
        if (!selectionAnchor) {
          set({ selectedIds: [targetId], selectionAnchor: targetId });
          return;
        }
        const startIndex = order.indexOf(selectionAnchor);
        const endIndex = order.indexOf(targetId);
        if (startIndex === -1 || endIndex === -1) {
          set({ selectedIds: [targetId], selectionAnchor: targetId });
          return;
        }
        const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
        const slice = order.slice(from, to + 1);
        set({ selectedIds: slice, selectionAnchor });
      },
      setSelection: (cardIds) => {
        set({ selectedIds: Array.from(new Set(cardIds)), selectionAnchor: cardIds[cardIds.length - 1] });
      },
      clearSelection: () => set({ selectedIds: [], selectionAnchor: undefined }),
    }));
