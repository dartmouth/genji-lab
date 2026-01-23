// components/CollectionOverview/index.tsx

import React, { useState, useMemo } from "react";
import {
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  TableSortLabel,
  Chip,
  Button,
} from "@mui/material";

import { CollectionDetailsModal } from "./CollectionDetailsModal";
import {
  DocumentCollection,
  NotificationState,
  //   CollectionDetails,
  OverviewSortOrder,
  SortDirection,
} from "../../types";

export interface CollectionOverviewProps {
  /** List of available collections */
  collections: DocumentCollection[];
  /** Function to show notifications */
  showNotification: (
    message: string,
    severity: NotificationState["severity"]
  ) => void;
}

/**
 * Helper function to display user name
 */
const getUserDisplayName = (user: {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}): string => {
  if (user.first_name || user.last_name) {
    return `${user.first_name || ""} ${user.last_name || ""}`.trim();
  }
  return user.username || "Unknown User";
};

export const CollectionOverview: React.FC<CollectionOverviewProps> = ({
  collections,
  showNotification,
}) => {
  // Pagination state
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  // Sorting state
  const [sortOrder, setSortOrder] = useState<OverviewSortOrder>("modified");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Modal state
  const [selectedCollection, setSelectedCollection] = useState<number | null>(
    null
  );
  const [detailsModalOpen, setDetailsModalOpen] = useState<boolean>(false);

  // Sort handler
  const handleSortChange = (newSortOrder: OverviewSortOrder): void => {
    if (sortOrder === newSortOrder) {
      // Toggle direction if same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New column, set appropriate default direction
      setSortOrder(newSortOrder);
      setSortDirection(newSortOrder === "modified" ? "desc" : "asc");
    }
  };

  // Pagination handlers
  const handlePageChange = (_event: unknown, newPage: number): void => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Modal handlers
  const handleCollectionSelect = (collectionId: number): void => {
    setSelectedCollection(collectionId);
    setDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = (): void => {
    setDetailsModalOpen(false);
    setSelectedCollection(null);
  };

  // Sort collections
  const sortedCollections = useMemo(() => {
    const sorted = [...collections].sort((a, b) => {
      if (sortOrder === "title") {
        const result = a.title.localeCompare(b.title);
        return sortDirection === "asc" ? result : -result;
      } else {
        // Sort by ID as proxy for modified date
        const result = a.id - b.id;
        return sortDirection === "asc" ? result : -result;
      }
    });
    return sorted;
  }, [collections, sortOrder, sortDirection]);

  // Paginate collections
  const paginatedCollections = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return sortedCollections.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedCollections, page, rowsPerPage]);

  return (
    <>
      <Typography variant="h5" gutterBottom>
        Document Collection Overview
      </Typography>

      {/* Collections Table */}
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortOrder === "title"}
                  direction={sortOrder === "title" ? sortDirection : "asc"}
                  onClick={() => handleSortChange("title")}
                >
                  Title
                </TableSortLabel>
              </TableCell>
              <TableCell>Created By</TableCell>
              <TableCell>Visibility</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedCollections.map((collection) => (
              <TableRow key={collection.id} hover sx={{ cursor: "pointer" }}>
                <TableCell>{collection.title}</TableCell>
                <TableCell>
                  {collection.created_by ? (
                    <Typography variant="body2">
                      {getUserDisplayName(collection.created_by)}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Unknown
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={collection.visibility || "Unknown"}
                    size="small"
                    color={
                      collection.visibility === "public"
                        ? "success"
                        : collection.visibility === "private"
                        ? "error"
                        : "default"
                    }
                  />
                </TableCell>
                <TableCell align="center">
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleCollectionSelect(collection.id)}
                  >
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {paginatedCollections.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No collections found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={sortedCollections.length}
        page={page}
        onPageChange={handlePageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowsPerPageOptions={[5, 10, 25, 50]}
      />

      {/* Instructions */}
      <Box sx={{ mt: 3, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          Click "View Details" on any collection to see comprehensive
          information including statistics and metadata
        </Typography>
      </Box>

      {/* Collection Details Modal */}
      <CollectionDetailsModal
        open={detailsModalOpen}
        collectionId={selectedCollection}
        onClose={handleCloseDetailsModal}
        showNotification={showNotification}
      />
    </>
  );
};

export default CollectionOverview;
