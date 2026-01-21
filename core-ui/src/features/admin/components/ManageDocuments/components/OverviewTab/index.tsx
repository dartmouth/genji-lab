// ManageDocuments/components/OverviewTab/index.tsx

import React from "react";
import { Typography } from "@mui/material";

const OverviewTab: React.FC = () => {
  return (
    <>
      <Typography variant="h5" gutterBottom>
        Documents Overview
      </Typography>
      <div>
        <p>Features for managing documents:</p>
        <ul>
          <li>
            <strong>Import Word Document:</strong> Create a new document and
            import Word content
          </li>
          <li>
            <strong>Delete:</strong> Remove documents and their content
            permanently
          </li>
          <li>
            <strong>Delete Document Content:</strong> Remove all content from a
            document while keeping the document itself
          </li>
          <li>
            <strong>Rename:</strong> Change document titles
          </li>
          <li>
            <strong>Update Description:</strong> Modify document descriptions
          </li>
        </ul>
      </div>
    </>
  );
};

export { OverviewTab };