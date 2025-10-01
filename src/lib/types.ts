export type ID = string;

export type CardState = "ok" | "pending" | "error";

export type Card = {
  id: ID;
  title: string;
  url?: string;
  domain?: string | null;
  image?: string | null;
  description?: string | null;
  notes?: string | null;
  state?: CardState;
  createdAt: string;
  updatedAt?: string;
  tags: string[];
  metadata?: unknown;
};

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
