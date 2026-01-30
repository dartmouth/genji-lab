import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import { Save as SaveIcon, Refresh as ResetIcon } from "@mui/icons-material";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  batchReorderCollections,
  fetchDocumentCollections,
  selectDocumentCollectionsStatus,
} from "@/store/slice/documentCollectionSlice";
import { DocumentCollection } from "@/store/slice/documentCollectionSlice";
import { DraggableCollectionCard } from "./DraggableCollectionCard";
import { useCollectionReorder } from "../../hooks/useCollectionReorder";
import { NotificationState } from "../../types/types";

export interface ReorderCollectionsProps {
  collections: DocumentCollection[];
  onSuccess: () => void;
  showNotification: (
    message: string,
    severity: NotificationState["severity"]
  ) => void;
}

export const ReorderCollections: React.FC<ReorderCollectionsProps> = ({
  collections,
  onSuccess,
  showNotification,
}) => {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectDocumentCollectionsStatus);
  const [isSaving, setIsSaving] = useState(false);

  const {
    orderedCollections,
    hasChanges,
    handleDragEnd,
    resetOrder,
    getReorderPayload,
  } = useCollectionReorder(collections);

  // Configure sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Update local state when collections change
  useEffect(() => {
    resetOrder();
  }, [collections, resetOrder]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        collections: getReorderPayload(),
      };
      console.log(payload)
      const result = await dispatch(batchReorderCollections(payload));

      if (batchReorderCollections.fulfilled.match(result)) {
        showNotification("Collections reordered successfully", "success");
        // Refresh collections to get updated data
        await dispatch(fetchDocumentCollections({ includeUsers: true }));
        onSuccess();
      } else {
        showNotification(
          result.payload as string || "Failed to reorder collections",
          "error"
        );
      }
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : "Failed to reorder collections",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    resetOrder();
    showNotification("Order reset to original", "info");
  };

  if (collections.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="body1" color="text.secondary">
          No collections available to reorder.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Reorder Collections
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Drag and drop collections to reorder them. This will change the display order in the 'Collections' overview page. Click "Save Order" to persist
        your changes.
      </Alert>

      {/* Action Buttons */}
      <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
          onClick={handleSave}
          disabled={!hasChanges || isSaving || status === "loading"}
        >
          {isSaving ? "Saving..." : "Save Order"}
        </Button>
        <Button
          variant="outlined"
          startIcon={<ResetIcon />}
          onClick={handleReset}
          disabled={!hasChanges || isSaving}
        >
          Reset
        </Button>
      </Box>

      {/* Draggable Collection Cards */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={orderedCollections.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {orderedCollections.map((collection, index) => (
            <DraggableCollectionCard
              key={collection.id}
              collection={collection}
              index={index}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Instructions */}
      <Box sx={{ mt: 3, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Keyboard Navigation:</strong> Use Tab to focus on a card, Space
          to pick it up, arrow keys to move it, and Space again to drop it.
        </Typography>
      </Box>
    </Box>
  );
};

export default ReorderCollections;
