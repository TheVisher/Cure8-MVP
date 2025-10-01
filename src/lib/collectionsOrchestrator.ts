import { useCardsStore } from "@/src/state/cardsStore";
import { useCollectionsStore } from "@/src/state/collectionsStore";
import { collectionTagSlug } from "@/src/lib/tags";
import type { Collection, ID } from "@/src/lib/types";

type RemoveMode = "reparent" | "delete-subtree";

type RemoveOptions = {
  mode?: RemoveMode;
};

type RemoveOutcome = {
  removed: Collection[];
  reparented: Collection[];
};

const uniqueSlugs = (collections: Collection[]) => {
  const set = new Set<string>();
  collections.forEach((collection) => {
    const slug = collectionTagSlug(collection);
    if (slug) set.add(slug);
  });
  return Array.from(set);
};

export const collectionsOrchestrator = {
  list(): Collection[] {
    return useCollectionsStore.getState().list();
  },
  create(name: string, parentId?: ID | null): Collection {
    return useCollectionsStore.getState().create(name, parentId);
  },
  rename(id: ID, name: string): Collection {
    const { rename } = useCollectionsStore.getState();
    const result = rename(id, name);
    if (result.previousSlug !== result.collection.slug) {
      useCardsStore.getState().replaceTagAcrossCards(result.previousSlug, result.collection.slug);
    }
    return result.collection;
  },
  remove(id: ID, options?: RemoveOptions): RemoveOutcome {
    const { remove } = useCollectionsStore.getState();
    const result = remove(id, options);
    const slugs = uniqueSlugs(result.removed);
    slugs.forEach((slug) => {
      useCardsStore.getState().removeTagFromAll(slug);
    });
    return result;
  },
  toggleExpanded(id: ID) {
    useCollectionsStore.getState().toggleExpanded(id);
  },
  setExpanded(id: ID, expanded: boolean) {
    useCollectionsStore.getState().setExpanded(id, expanded);
  },
};
