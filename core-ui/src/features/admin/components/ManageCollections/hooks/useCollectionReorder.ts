import { useState, useCallback } from "react";
import { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { DocumentCollection } from "@/store/slice/documentCollectionSlice";

export interface UseCollectionReorderReturn {
  orderedCollections: DocumentCollection[];
  hasChanges: boolean;
  handleDragEnd: (event: DragEndEvent) => void;
  resetOrder: () => void;
  getReorderPayload: () => Array<{ collection_id: number; display_order: number }>;
}

/**
 * Custom hook for managing collection reordering logic
 * 
 * @param initialCollections - The initial list of collections to manage
 * @returns Object containing ordered collections, change detection, and handlers
 */
export const useCollectionReorder = (
  initialCollections: DocumentCollection[]
): UseCollectionReorderReturn => {
  const [orderedCollections, setOrderedCollections] = useState<DocumentCollection[]>(
    [...initialCollections]
  );

  /**
   * Handle drag end event from @dnd-kit
   * Updates local state by moving the dragged item to its new position
   */
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setOrderedCollections((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  /**
   * Reset the order back to the initial state
   */
  const resetOrder = useCallback(() => {
    setOrderedCollections([...initialCollections]);
  }, [initialCollections]);

  /**
   * Detect if the current order differs from the initial order
   */
  const hasChanges = orderedCollections.some(
    (collection, index) => collection.id !== initialCollections[index]?.id
  );

  /**
   * Generate the API payload for batch reordering
   * Maps collections to their new display_order (1-indexed)
   */
  const getReorderPayload = useCallback(() => {
    return orderedCollections.map((collection, index) => ({
      collection_id: collection.id,
      display_order: index + 1,
    }));
  }, [orderedCollections]);

  return {
    orderedCollections,
    hasChanges,
    handleDragEnd,
    resetOrder,
    getReorderPayload,
  };
};
