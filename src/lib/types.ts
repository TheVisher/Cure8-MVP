export type ID = string;

export type CardStatus = "PENDING" | "READY" | "ERROR";

export interface Card {
  id: ID;
  url: string;
  title?: string | null;
  notes?: string | null;
  status: CardStatus;
  tags: string[];
  collections: string[];
  createdAt: string;
  updatedAt: string;
  domain?: string | null;
  image?: string | null;
  description?: string | null;
  metadata?: unknown;
}

export type Collection = {
  id: ID;
  name: string;
  slug: string;
  parentId?: ID | null;
  createdAt: string;
  updatedAt: string;
  isExpanded?: boolean;
};

export type TreeNode = {
  collection: Collection;
  depth: number;
  children: TreeNode[];
};
