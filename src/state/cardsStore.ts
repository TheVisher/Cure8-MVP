'use client';

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { Card, CardState, ID } from "@/src/lib/types";

const STORAGE_KEY = "cure8.cards.v1";

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
  updateState: (cardId: ID, state: CardState) => void;
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

export const useCardsStore = create<CardsState>()(
  persist(
    (set, get) => ({
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
          tags: normalizeTags(card.tags),
          createdAt: card.createdAt || now(),
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
            tags: normalizeTags(card.tags),
            createdAt: card.createdAt || now(),
            updatedAt: now(),
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
          const updated: Card = {
            ...card,
            tags: [...card.tags, tagSlug],
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
          const updated: Card = {
            ...card,
            tags: card.tags.filter((tag) => tag !== tagSlug),
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
          cardIds.forEach((cardId) => {
            const card = nextCards[cardId];
            if (!card) return;
            if (card.tags.includes(trimmed)) return;
            changed = true;
            nextCards[cardId] = {
              ...card,
              tags: [...card.tags, trimmed],
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
          cardIds.forEach((cardId) => {
            const card = nextCards[cardId];
            if (!card) return;
            if (!card.tags.includes(trimmed)) return;
            changed = true;
            nextCards[cardId] = {
              ...card,
              tags: card.tags.filter((tag) => tag !== trimmed),
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
        set((state) => {
          let changed = false;
          const nextCards = { ...state.cards };
          Object.values(nextCards).forEach((card) => {
            if (!card.tags.includes(from)) return;
            changed = true;
            const tags = card.tags.filter((tag) => tag !== from);
            if (!tags.includes(to)) tags.push(to);
            nextCards[card.id] = { ...card, tags, updatedAt: now() };
          });
          if (!changed) return state;
          return { cards: nextCards };
        });
      },
      removeTagFromAll: (tagSlug) => {
        const trimmed = tagSlug.trim();
        if (!trimmed) return;
        set((state) => {
          let changed = false;
          const nextCards = { ...state.cards };
          Object.values(nextCards).forEach((card) => {
            if (!card.tags.includes(trimmed)) return;
            changed = true;
            nextCards[card.id] = {
              ...card,
              tags: card.tags.filter((tag) => tag !== trimmed),
              updatedAt: now(),
            };
          });
          if (!changed) return state;
          return { cards: nextCards };
        });
      },
      updateState: (cardId, stateValue) => {
        set((state) => {
          const card = state.cards[cardId];
          if (!card) return state;
          return {
            cards: {
              ...state.cards,
              [cardId]: {
                ...card,
                state: stateValue,
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
        set({ selectedIds: [...new Set(cardIds)], selectionAnchor: cardIds[cardIds.length - 1] });
      },
      clearSelection: () => set({ selectedIds: [], selectionAnchor: undefined }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        cards: state.cards,
        order: state.order,
        selectedIds: state.selectedIds,
        selectionAnchor: state.selectionAnchor,
      }),
    },
  ),
);
