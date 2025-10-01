'use client';

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { toSlug } from "@/src/lib/slug";
import type { Collection, ID, TreeNode } from "@/src/lib/types";

const STORAGE_KEY = "cure8.collections.v1";
const MAX_DEPTH = 4;

const now = () => new Date().toISOString();
const emptyNameFallback = (name: string) => name.trim() || "Untitled Collection";

const randomId = () => {
  try {
    if (typeof window !== "undefined" && window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }
  } catch {}
  return `col_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
};

type RemoveMode = "reparent" | "delete-subtree";

type RemoveOptions = {
  mode?: RemoveMode;
};

type RemoveResult = {
  removed: Collection[];
  reparented: Collection[];
};

type CollectionsState = {
  collections: Record<ID, Collection>;
  order: ID[];
  list: () => Collection[];
  tree: () => TreeNode[];
  create: (name: string, parentId?: ID | null) => Collection;
  rename: (id: ID, name: string) => { collection: Collection; previousSlug: string };
  remove: (id: ID, options?: RemoveOptions) => RemoveResult;
  toggleExpanded: (id: ID) => void;
  setExpanded: (id: ID, expanded: boolean) => void;
  clear: () => void;
};

const buildChildrenMap = (collections: Record<ID, Collection>) => {
  const map = new Map<ID | null, ID[]>();
  Object.values(collections).forEach((collection) => {
    const parent = collection.parentId ?? null;
    if (!map.has(parent)) {
      map.set(parent, []);
    }
    map.get(parent)!.push(collection.id);
  });
  return map;
};

const buildTree = (collections: Record<ID, Collection>, order: ID[]): TreeNode[] => {
  const map = new Map<ID | null, ID[]>();
  order.forEach((id) => {
    const collection = collections[id];
    if (!collection) return;
    const parent = collection.parentId ?? null;
    if (!map.has(parent)) map.set(parent, []);
    map.get(parent)!.push(id);
  });

  const makeNodes = (parentId: ID | null, depth: number): TreeNode[] => {
    const children = map.get(parentId) ?? [];
    return children.map((childId) => {
      const collection = collections[childId];
      return {
        collection,
        depth,
        children: makeNodes(childId, depth + 1),
      };
    });
  };

  return makeNodes(null, 0);
};

const computeDepth = (collections: Record<ID, Collection>, id?: ID | null): number => {
  if (!id) return 0;
  const target = collections[id];
  if (!target) return 0;
  let depth = 0;
  let current = target.parentId ?? null;
  while (current) {
    depth += 1;
    const parent = collections[current];
    if (!parent) break;
    current = parent.parentId ?? null;
  }
  return depth;
};

const ensureDepthAllowed = (collections: Record<ID, Collection>, parentId?: ID | null) => {
  const parentDepth = parentId ? computeDepth(collections, parentId) + 1 : 0;
  if (parentDepth >= MAX_DEPTH) {
    throw new Error(`Collections can nest up to ${MAX_DEPTH} levels.`);
  }
};

const siblingSlugs = (collections: Record<ID, Collection>, parentId: ID | null | undefined, excludeId?: ID) => {
  const slugs = new Set<string>();
  Object.values(collections).forEach((collection) => {
    const sameParent = (collection.parentId ?? null) === (parentId ?? null);
    if (!sameParent) return;
    if (excludeId && collection.id === excludeId) return;
    slugs.add(collection.slug);
  });
  return slugs;
};

const uniqueSlug = (
  name: string,
  collections: Record<ID, Collection>,
  parentId: ID | null | undefined,
  excludeId?: ID,
) => {
  const base = toSlug(name) || "collection";
  const existing = siblingSlugs(collections, parentId ?? null, excludeId);
  if (!existing.has(base)) return base;
  let suffix = 2;
  while (existing.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
};

const collectSubtreeIds = (collections: Record<ID, Collection>, targetId: ID): ID[] => {
  const ids: ID[] = [];
  const stack = [targetId];
  while (stack.length) {
    const current = stack.pop()!;
    ids.push(current);
    Object.values(collections).forEach((collection) => {
      if ((collection.parentId ?? null) === current) {
        stack.push(collection.id);
      }
    });
  }
  return ids;
};

export const useCollectionsStore = create<CollectionsState>()(
  persist(
    (set, get) => ({
      collections: {},
      order: [],
      list: () => {
        const { collections, order } = get();
        return order
          .map((id) => collections[id])
          .filter((item): item is Collection => Boolean(item));
      },
      tree: () => {
        const { collections, order } = get();
        return buildTree(collections, order);
      },
      create: (rawName, parentId) => {
        const trimmedName = emptyNameFallback(rawName);
        const { collections, order } = get();
        ensureDepthAllowed(collections, parentId ?? null);
        const id = randomId();
        const timestamp = now();
        const slug = uniqueSlug(trimmedName, collections, parentId ?? null);
        const collection: Collection = {
          id,
          name: trimmedName,
          slug,
          parentId: parentId ?? null,
          createdAt: timestamp,
          updatedAt: timestamp,
          isExpanded: true,
        };
        set({
          collections: { ...collections, [id]: collection },
          order: [...order, id],
        });
        return collection;
      },
      rename: (id, rawName) => {
        const trimmedName = emptyNameFallback(rawName);
        const { collections } = get();
        const existing = collections[id];
        if (!existing) {
          throw new Error("Collection not found");
        }
        const previousSlug = existing.slug;
        const slug = uniqueSlug(trimmedName, collections, existing.parentId ?? null, id);
        const updated: Collection = {
          ...existing,
          name: trimmedName,
          slug,
          updatedAt: now(),
        };
        set((state) => ({
          collections: { ...state.collections, [id]: updated },
        }));
        return { collection: updated, previousSlug };
      },
      remove: (id, options) => {
        const mode: RemoveMode = options?.mode ?? "reparent";
        const state = get();
        const { collections, order } = state;
        const target = collections[id];
        if (!target) {
          throw new Error("Collection not found");
        }

        if (mode === "delete-subtree") {
          const idsToRemove = collectSubtreeIds(collections, id);
          const removed: Collection[] = idsToRemove
            .map((collectionId) => collections[collectionId])
            .filter((item): item is Collection => Boolean(item));
          const nextCollections = { ...collections };
          idsToRemove.forEach((collectionId) => {
            delete nextCollections[collectionId];
          });
          const nextOrder = order.filter((collectionId) => !idsToRemove.includes(collectionId));
          set({ collections: nextCollections, order: nextOrder });
          return { removed, reparented: [] };
        }

        const parentId = target.parentId ?? null;
        const nextCollections = { ...collections };
        const reparented: Collection[] = [];
        Object.values(collections).forEach((collection) => {
          if ((collection.parentId ?? null) === id) {
            const updated: Collection = {
              ...collection,
              parentId,
              updatedAt: now(),
            };
            nextCollections[collection.id] = updated;
            reparented.push(updated);
          }
        });

        const removedCollection = nextCollections[id];
        delete nextCollections[id];
        const nextOrder = order.filter((collectionId) => collectionId !== id);
        set({ collections: nextCollections, order: nextOrder });
        const removed = removedCollection ? [removedCollection] : [];
        return { removed, reparented };
      },
      toggleExpanded: (id) => {
        set((state) => {
          const collection = state.collections[id];
          if (!collection) return state;
          return {
            collections: {
              ...state.collections,
              [id]: {
                ...collection,
                isExpanded: !collection.isExpanded,
              },
            },
          };
        });
      },
      setExpanded: (id, expanded) => {
        set((state) => {
          const collection = state.collections[id];
          if (!collection) return state;
          if ((collection.isExpanded ?? false) === expanded) return state;
          return {
            collections: {
              ...state.collections,
              [id]: {
                ...collection,
                isExpanded: expanded,
              },
            },
          };
        });
      },
      clear: () => set({ collections: {}, order: [] }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ collections: state.collections, order: state.order }),
    },
  ),
);
