'use client';

import React from "react";
import { useDroppable } from "@dnd-kit/core";

import { collectionsOrchestrator } from "@/src/lib/collectionsOrchestrator";
import type { Collection, ID, TreeNode } from "@/src/lib/types";
import { useCollectionsStore } from "@/src/state/collectionsStore";

import { CollectionDeleteModal } from "../modals/CollectionDeleteModal";
import { CollectionEditorPopover } from "../modals/CollectionEditorPopover";

type CreateState = {
  mode: "create";
  anchor: HTMLElement;
  parentId?: ID | null;
  parentName?: string;
};

type RenameState = {
  mode: "rename";
  anchor: HTMLElement;
  target: Collection;
};

type EditorState = CreateState | RenameState;

type CollectionsTreeProps = {
  onSelectCollection?: (collectionId: ID) => void;
  activeCollectionId?: ID | null;
};

type CollectionsIndex = Record<ID, Collection>;

function buildTree(collections: CollectionsIndex, order: ID[]): TreeNode[] {
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
}

export function CollectionsTree({ onSelectCollection, activeCollectionId }: CollectionsTreeProps) {
  const collections = useCollectionsStore((state) => state.collections);
  const order = useCollectionsStore((state) => state.order);

  const tree = React.useMemo(() => buildTree(collections, order), [collections, order]);

  const [editorState, setEditorState] = React.useState<EditorState | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Collection | null>(null);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  const handleEditorSubmit = React.useCallback(
    async (name: string) => {
      if (!editorState) return;
      if (editorState.mode === "create") {
        collectionsOrchestrator.create(name, editorState.parentId ?? null);
      } else {
        collectionsOrchestrator.rename(editorState.target.id, name);
      }
      setEditorState(null);
    },
    [editorState],
  );

  const handleKeepChildren = () => {
    if (!deleteTarget) return;
    collectionsOrchestrator.remove(deleteTarget.id, { mode: "reparent" });
    setDeleteTarget(null);
  };

  const handleDeleteCascade = () => {
    if (!deleteTarget) return;
    collectionsOrchestrator.remove(deleteTarget.id, { mode: "delete-subtree" });
    setDeleteTarget(null);
  };

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenuId(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="mt-6 text-sm">
      <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-text-tertiary">
        <span>Collections</span>
        <button
          type="button"
          className="rounded-md border border-white/10 px-2 py-1 text-text-secondary transition hover:border-white/20 hover:text-white"
          onClick={(event) =>
            setEditorState({
              mode: "create",
              anchor: event.currentTarget,
            })
          }
        >
          +
        </button>
      </div>
      <div className="space-y-1">
        {tree.length === 0 ? (
          <p className="text-xs text-text-tertiary">Create folders to start organizing cards.</p>
        ) : (
          tree.map((node) => (
            <TreeNodeRow
              key={node.collection.id}
              node={node}
              activeCollectionId={activeCollectionId}
              onSelect={onSelectCollection}
              onCreateSub={(collection, anchor) =>
                setEditorState({
                  mode: "create",
                  anchor,
                  parentId: collection.id,
                  parentName: collection.name,
                })
              }
              onRename={(collection, anchor) =>
                setEditorState({
                  mode: "rename",
                  anchor,
                  target: collection,
                })
              }
              onDelete={(collection) => setDeleteTarget(collection)}
              menuId={openMenuId}
              setMenuId={setOpenMenuId}
            />
          ))
        )}
      </div>

      <CollectionEditorPopover
        open={Boolean(editorState)}
        mode={editorState?.mode ?? "create"}
        anchorEl={editorState?.anchor ?? null}
        initialName={editorState?.mode === "rename" ? editorState.target.name : ""}
        parentName={editorState?.mode === "create" ? editorState.parentName : undefined}
        onCancel={() => setEditorState(null)}
        onSubmit={handleEditorSubmit}
      />

      <CollectionDeleteModal
        open={Boolean(deleteTarget)}
        collectionName={deleteTarget?.name ?? ""}
        onCancel={() => setDeleteTarget(null)}
        onKeepChildren={handleKeepChildren}
        onDeleteSubtree={handleDeleteCascade}
      />
    </div>
  );
}

type RowProps = {
  node: TreeNode;
  activeCollectionId?: ID | null;
  onSelect?: (collectionId: ID) => void;
  onCreateSub: (collection: Collection, anchor: HTMLElement) => void;
  onRename: (collection: Collection, anchor: HTMLElement) => void;
  onDelete: (collection: Collection) => void;
  menuId: string | null;
  setMenuId: React.Dispatch<React.SetStateAction<string | null>>;
};

function TreeNodeRow({
  node,
  activeCollectionId,
  onSelect,
  onCreateSub,
  onRename,
  onDelete,
  menuId,
  setMenuId,
}: RowProps) {
  const { collection, depth, children } = node;
  const hasChildren = children.length > 0;
  const isExpanded = collection.isExpanded ?? true;
  const toggleExpanded = () => collectionsOrchestrator.toggleExpanded(collection.id);
  const isActive = collection.id === activeCollectionId;

  const rowRef = React.useRef<HTMLDivElement | null>(null);
  const { setNodeRef, isOver } = useDroppable({
    id: `collection:${collection.id}`,
    data: { type: "collection", collectionId: collection.id },
  });

  const assignRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      rowRef.current = node;
    },
    [setNodeRef],
  );

  const menuOpen = menuId === collection.id;

  return (
    <div>
      <div
        ref={assignRefs}
        className={[
          "group relative flex cursor-pointer items-center rounded-md px-2 py-1",
          isActive ? "bg-white/10 text-white" : "text-text-secondary hover:bg-white/5",
          isOver ? "ring-2 ring-violet-400 bg-violet-500/10" : "",
        ].join(" ")}
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={() => onSelect?.(collection.id)}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              toggleExpanded();
            }}
            className="mr-2 inline-flex h-4 w-4 items-center justify-center text-xs text-text-tertiary hover:text-white"
          >
            {isExpanded ? "-" : "+"}
          </button>
        ) : (
          <span className="mr-2 inline-flex h-4 w-4" />
        )}
        <span className="mr-2 text-xs text-violet-300">[F]</span>
        <span className="flex-1 truncate text-sm">{collection.name}</span>
        <div className="relative">
          <button
            type="button"
            className="ml-2 hidden rounded border border-white/10 px-1 text-xs text-text-tertiary transition hover:border-white/20 hover:text-white group-hover:block"
            onClick={(event) => {
              event.stopPropagation();
              setMenuId((current) => (current === collection.id ? null : collection.id));
            }}
          >
            ...
          </button>
          {menuOpen ? (
            <div
              className="absolute right-0 top-full z-50 mt-1 w-44 rounded-md border border-white/10 bg-black/80 p-1 text-xs text-white shadow-lg"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="flex w-full items-center rounded px-2 py-1 text-left hover:bg-white/10"
                onClick={() => {
                  setMenuId(null);
                  const anchor = rowRef.current ?? document.body;
                  onCreateSub(collection, anchor);
                }}
              >
                New sub-folder
              </button>
              <button
                type="button"
                className="flex w-full items-center rounded px-2 py-1 text-left hover:bg-white/10"
                onClick={() => {
                  setMenuId(null);
                  const anchor = rowRef.current ?? document.body;
                  onRename(collection, anchor);
                }}
              >
                Rename
              </button>
              <button
                type="button"
                className="flex w-full items-center rounded px-2 py-1 text-left text-rose-300 hover:bg-rose-500/20"
                onClick={() => {
                  setMenuId(null);
                  onDelete(collection);
                }}
              >
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </div>
      {hasChildren && isExpanded
        ? children.map((child) => (
            <TreeNodeRow
              key={child.collection.id}
              node={child}
              activeCollectionId={activeCollectionId}
              onSelect={onSelect}
              onCreateSub={onCreateSub}
              onRename={onRename}
              onDelete={onDelete}
              menuId={menuId}
              setMenuId={setMenuId}
            />
          ))
        : null}
    </div>
  );
}
