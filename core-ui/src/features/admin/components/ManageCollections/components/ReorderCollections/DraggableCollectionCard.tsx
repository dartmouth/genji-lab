import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
} from "@mui/material";
import { DragIndicator as DragIcon } from "@mui/icons-material";
import { DocumentCollection } from "@/store/slice/documentCollectionSlice";

export interface DraggableCollectionCardProps {
  collection: DocumentCollection;
  index: number;
}

export const DraggableCollectionCard: React.FC<DraggableCollectionCardProps> = ({
  collection,
  index,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: collection.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      sx={{
        mb: 2,
        cursor: isDragging ? "grabbing" : "grab",
        boxShadow: isDragging ? 6 : 2,
        "&:hover": {
          boxShadow: 4,
        },
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" gap={2}>
          {/* Drag Handle */}
          <IconButton
            {...attributes}
            {...listeners}
            size="small"
            sx={{ cursor: "grab", "&:active": { cursor: "grabbing" } }}
          >
            <DragIcon />
          </IconButton>

          {/* Order Number */}
          <Typography
            variant="h6"
            fontWeight="bold"
            color="text.secondary"
            sx={{ minWidth: 40 }}
          >
            #{index + 1}
          </Typography>

          {/* Collection Title */}
          <Box flexGrow={1}>
            <Typography variant="h6" fontWeight="medium">
              {collection.title}
            </Typography>
            {collection.description && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {collection.description}
              </Typography>
            )}
          </Box>

          {/* Visibility Badge */}
          <Chip
            label={collection.visibility}
            size="small"
            color={
              collection.visibility === "public"
                ? "success"
                : collection.visibility === "private"
                ? "error"
                : "default"
            }
          />

          {/* Document Count */}
          {collection.document_count !== undefined && (
            <Chip
              label={`${collection.document_count} docs`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
