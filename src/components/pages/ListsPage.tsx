"use client";

import React, { useState, useEffect } from "react";
import { CreateNewListButton } from "@/components/ui/CreateNewListButton";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { LinkIcon } from "@heroicons/react/24/outline";
import {
  useAllListsQuery,
  useDeleteList,
  setupSSECacheSync,
  type UserList,
} from "@/hooks/useListQueries";
import { cn } from "@/lib/utils";
import { HEADING_STACK, LIST_STACK, PAGE_STACK } from "@/lib/ui-spacing";
import EditListPageClient from "@/components/pages/EditListPage";
import { DataSurfaceSlot } from "@/components/ui/DataSurfaceSlot";
import { Dialog } from "@/components/ui/Dialog";
import { useListDialogRouteState } from "@/hooks/useListDialogRouteState";
import { useWarmSoftNav } from "@/hooks/useWarmSoftNav";
import { CreateListDialog } from "@/components/lists/CreateListDialog";
import { ListsPageChrome } from "@/components/lists/ListsPageChrome";
import { MyListsCard } from "@/components/lists/MyListsCard";

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

  const { data: listsData, isLoading } = useAllListsQuery();
  const lists = listsData?.lists || [];
  // C6.9: never blank — cold without data shows slot immediately
  const isColdLoading = isLoading && !listsData;

  const deleteListMutation = useDeleteList();

  const handleDeleteClick = (list: List) => {
    setListToDelete(list);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!listToDelete) return;

    const id = listToDelete.id;
    deleteListMutation.mutate(id, {
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
          <div className="rounded-xl border-2 border-dashed border-white/30 p-2 sm:p-4 text-center bg-white/5 backdrop-blur-md">
            <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-full flex items-center justify-center">
              <LinkIcon className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-blue-400" />
            </div>
            <div className={`${HEADING_STACK} mt-4`}>
              <h3 className="text-base sm:text-lg font-medium text-white">
                No Lists Yet
              </h3>
              <p className="text-sm sm:text-base text-white/60 px-2">
                Start organizing your URLs by creating your first list
              </p>
            </div>
            <div className="mt-6 sm:mt-8">
              <CreateNewListButton onClick={openCreateDialog} />
            </div>
          </div>
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
