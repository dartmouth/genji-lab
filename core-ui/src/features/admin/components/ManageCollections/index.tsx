// ManageCollections/index.tsx

import React, { useState, useEffect } from "react";
import {
  Tabs,
  Tab,
  Box,
  Typography,
  Snackbar,
  Alert,
} from "@mui/material";

import { useAppDispatch, useAppSelector } from "@store/hooks";
import { selectAllDocumentCollections, fetchDocumentCollections } from "@store";

import { CollectionOverview } from "./components/CollectionOverview";
import { AddCollection } from "./components/AddCollection";
import { DeleteCollection } from "./components/DeleteCollection";
import { RenameCollection } from "./components/RenameCollection";
import { UpdateVisibility } from "./components/UpdateVisibility";
import { useNotification } from "./hooks/useNotification";
import { DocumentCollection } from "@/store/slice/documentCollectionSlice";
import { UpdateMetadata } from "./components/UpdateMetadata"
import { ReorderCollections } from './components/ReorderCollections'

interface SubTabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function SubTabPanel(props: SubTabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`manage-subtabpanel-${index}`}
      aria-labelledby={`manage-subtab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

function a11yPropsSubTab(index: number) {
  return {
    id: `manage-subtab-${index}`,
    "aria-controls": `manage-subtabpanel-${index}`,
  };
}

const ManageCollections: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<number>(0);
  const dispatch = useAppDispatch();

  const { notification, showNotification, hideNotification } = useNotification();

  const documentCollections = useAppSelector(
    selectAllDocumentCollections
  ) as DocumentCollection[];

  useEffect(() => {
    dispatch(fetchDocumentCollections({ includeUsers: true }));
  }, [dispatch]);

  const handleSubTabChange = (
    _event: React.SyntheticEvent,
    newValue: number
  ) => {
    setActiveSubTab(newValue);
  };

  const refreshOverviewData = () => {
    dispatch(fetchDocumentCollections({ includeUsers: true }));
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Manage Document Collections
      </Typography>

      <Box sx={{ display: "flex", height: "auto" }}>
        {/* Sub-tabs for Manage Collections */}
        <Tabs
          orientation="vertical"
          variant="scrollable"
          value={activeSubTab}
          onChange={handleSubTabChange}
          aria-label="Manage collections sub-tabs"
          sx={{
            borderRight: 1,
            borderColor: "divider",
            minWidth: "180px",
            "& .MuiTab-root": {
              alignItems: "flex-start",
              textAlign: "left",
              paddingLeft: 2,
            },
          }}
        >
          <Tab label="Overview" {...a11yPropsSubTab(0)} />
          <Tab label="Add" {...a11yPropsSubTab(1)} />
          <Tab label="Delete" {...a11yPropsSubTab(2)} />
          <Tab label="Rename" {...a11yPropsSubTab(3)} />
          <Tab label="Update Visibility" {...a11yPropsSubTab(4)} />
          <Tab label="Update Metadata" {...a11yPropsSubTab(5)} />
          <Tab label="Sort Collections" {...a11yPropsSubTab(6)} />
        </Tabs>

        {/* Sub-tab content */}
        <SubTabPanel value={activeSubTab} index={0}>
          <CollectionOverview
            collections={documentCollections}
            showNotification={showNotification}
          />
        </SubTabPanel>

        <SubTabPanel value={activeSubTab} index={1}>
          <AddCollection
            collections={documentCollections}
            onSuccess={refreshOverviewData}
            showNotification={showNotification}
          />
        </SubTabPanel>

        <SubTabPanel value={activeSubTab} index={2}>
          <DeleteCollection
            collections={documentCollections}
            onSuccess={refreshOverviewData}
            showNotification={showNotification}
          />
        </SubTabPanel>

        <SubTabPanel value={activeSubTab} index={3}>
          <RenameCollection
            collections={documentCollections}
            onSuccess={refreshOverviewData}
            showNotification={showNotification}
          />
        </SubTabPanel>

        <SubTabPanel value={activeSubTab} index={4}>
          <UpdateVisibility
            collections={documentCollections}
            onSuccess={refreshOverviewData}
            showNotification={showNotification}
          />
        </SubTabPanel>
        <SubTabPanel value={activeSubTab} index={5}>
          <UpdateMetadata
            collections={documentCollections}
            onSuccess={refreshOverviewData}
            showNotification={showNotification}
          />
        </SubTabPanel>
        <SubTabPanel value={activeSubTab} index={6}>
          <ReorderCollections
            collections={documentCollections}
            onSuccess={refreshOverviewData}
            showNotification={showNotification}
          />
        </SubTabPanel>
      </Box>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={hideNotification}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={hideNotification}
          severity={notification.severity}
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ManageCollections;
