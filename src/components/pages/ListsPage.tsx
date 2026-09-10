"use client";

import React, { useState, useEffect } from "react";
import { CreateNewListButton } from "@/components/ui/CreateNewListButton";
import { AlertDialog } from "@/components/ui/AlertDialog";
import {
  useAllListsQuery,
  useDeleteList,
  setupSSECacheSync,
  type UserList,
} from "@/hooks/useListQueries";
import { cn } from "@/lib/utils";
import { LIST_STACK, PAGE_STACK } from "@/lib/ui-spacing";
import EditListPageClient from "@/components/pages/EditListPage";
import { DataSurfaceSlot } from "@/components/ui/DataSurfaceSlot";
import { Dialog } from "@/components/ui/Dialog";
import { useListDialogRouteState } from "@/hooks/useListDialogRouteState";
import { useWarmSoftNav } from "@/hooks/useWarmSoftNav";
import { CreateListDialog } from "@/components/lists/CreateListDialog";
import { ListsPageChrome } from "@/components/lists/ListsPageChrome";
import { MyListsCard } from "@/components/lists/MyListsCard";
import { MyListsEmptyState } from "@/components/lists/ListEmptyStates";

type List = UserList;

export default function ListsPageClient() {
  const { warmRouterPush } = useWarmSoftNav();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listToDelete, setListToDelete] = useState<List | null>(null);
  const [editPending, setEditPending] = useState(false);
  const {
    createDialogOpen,
    editDialogSlug,
    openCreateDialog,
    openEditDialog,
    closeDialog,
  } = useListDialogRouteState();

  useEffect(() => {
    return setupSSECacheSync();
  }, []);

  const {
    data: listsData,
    isLoading,
    isFetching,
    isPlaceholderData,
  } = useAllListsQuery();
  const lists = listsData?.lists || [];
  // C6.9 / C7.32: never blank — cold or placeholder refetch shows slot (no empty flash)
  const isColdLoading =
    (isLoading && !listsData) || (isFetching && isPlaceholderData);

  const deleteListMutation = useDeleteList();

  const handleDeleteClick = (list: List) => {
    setListToDelete(list);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!listToDelete) return;

    const id = listToDelete.id;
    deleteListMutation.mutate(
      { listId: id, deferOptimistic: true },
      {
      onSuccess: () => {
        requestAnimationFrame(() => {
          setDeleteDialogOpen(false);
          setListToDelete(null);
        });
      },
      onError: () => {
        // Error toast is handled by mutation
      },
    });
  };

  const editList = editDialogSlug
    ? lists.find((list) => list.slug === editDialogSlug)
    : undefined;

  return (
    <div className={cn("w-full", PAGE_STACK)}>
      <ListsPageChrome
        createSlot={<CreateNewListButton onClick={openCreateDialog} />}
      />

      <div className={LIST_STACK}>
        {isColdLoading ? (
          <DataSurfaceSlot
            label="Preparing your lists"
            description="Loading your latest collections…"
          />
        ) : lists.length > 0 ? (
          lists.map((list) => (
            <MyListsCard
              key={list.id}
              list={list}
              onView={() => warmRouterPush(`/list/${list.slug}`)}
              onEdit={() => openEditDialog(list.slug)}
              onDelete={() => handleDeleteClick(list)}
              deletePending={
                deleteListMutation.isPending && listToDelete?.id === list.id
              }
            />
          ))
        ) : (
          <MyListsEmptyState onCreateClick={openCreateDialog} />
        )}
      </div>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!deleteListMutation.isPending) setDeleteDialogOpen(open);
        }}
        title="Delete List"
        description={
          listToDelete
            ? `Are you sure you want to delete "${
                listToDelete.title || listToDelete.slug
              }"? This action cannot be undone.`
            : "Are you sure you want to delete this list? This action cannot be undone."
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
        pending={deleteListMutation.isPending}
        pendingText="Deleting…"
        closeOnConfirm={false}
      />
      <CreateListDialog
        open={createDialogOpen}
        onOpenChange={(open) => !open && closeDialog()}
      />
      {editList ? (
        <Dialog
          open
          onOpenChange={(open) => !open && closeDialog()}
          title="Edit List"
          description="Update your list details and settings."
          size="wide"
          headerMode="scroll"
          pending={editPending}
        >
          <EditListPageClient
            key={editList.id}
            list={editList}
            onClose={closeDialog}
            onPendingChange={setEditPending}
          />
        </Dialog>
      ) : null}
    </div>
  );
}
