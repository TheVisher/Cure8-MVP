import type { Collection } from "./types";

export const collectionTagSlug = (collection: Collection) => `#${collection.slug}`;
