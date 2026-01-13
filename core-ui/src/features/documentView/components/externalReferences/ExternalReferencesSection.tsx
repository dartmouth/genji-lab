// src/features/documentView/components/externalReferences/ExternalReferencesSection.tsx

import React, { useState } from "react";
import { IconButton, Collapse } from "@mui/material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { Annotation } from "@documentView/types";
import { useAppDispatch } from "@store/hooks";
import { externalReferenceThunks } from "@store";
import ExternalReferencePreviewModal from "./ExternalReferencePreviewModal";
import "@documentView/styles/ExternalReferenceStyles.css";

interface ExternalReferencesSectionProps {
  references: Annotation[];
  documentElementId: string;
  classroomId?: string;
}

interface PreviewState {
  open: boolean;
  title: string;
  description: string;
  url: string;
  annotation: Annotation | null;
}

const ExternalReferencesSection: React.FC<ExternalReferencesSectionProps> = ({
  references,
  documentElementId,
  classroomId,
}) => {
  const dispatch = useAppDispatch();
  const [expanded, setExpanded] = useState(false);
  const [previewState, setPreviewState] = useState<PreviewState>({
    open: false,
    title: "",
    description: "",
    url: "",
    annotation: null,
  });

  if (references.length === 0) {
    return null;
  }

  const handlePreview = (annotation: Annotation) => {
    try {
      const metadata = JSON.parse(annotation.body.value);
      setPreviewState({
        open: true,
        title: metadata.title || "Untitled Reference",
        description: metadata.description || "",
        url: metadata.url || "",
        annotation: annotation,
      });
    } catch (error) {
      console.error("Failed to parse reference metadata:", error);
    }
  };

  const handleOpenDirect = (annotation: Annotation) => {
    try {
      const metadata = JSON.parse(annotation.body.value);
      if (metadata.url) {
        window.open(metadata.url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      console.error("Failed to parse reference metadata:", error);
    }
  };

  const handleDeleteSuccess = () => {
    // Refetch external references for this document element
    dispatch(
      externalReferenceThunks.fetchAnnotations({
        documentElementId: documentElementId,
        classroomId: classroomId,
      })
    );
  };

  return (
    <>
      <div className="external-references-section">
        <div
          className="external-references-header"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="external-references-title">
            📚 References ({references.length})
          </div>
          <IconButton
            size="small"
            className={`external-references-toggle ${
              expanded ? "expanded" : ""
            }`}
            sx={{ transition: "transform 0.2s ease" }}
          >
            <ExpandMoreIcon />
          </IconButton>
        </div>

        <Collapse in={expanded}>
          <div className="external-references-list">
            {references.map((ref, index) => {
              let metadata = {
                title: "Untitled Reference",
                description: "",
                url: "",
              };

              try {
                metadata = JSON.parse(ref.body.value);
              } catch (error) {
                console.error("Failed to parse reference:", error);
              }

              return (
                <div key={ref.id} className="external-reference-item">
                  <div className="external-reference-item-header">
                    <span className="external-reference-number">
                      [{index + 1}]
                    </span>
                    <div className="external-reference-content">
                      <div className="external-reference-title">
                        {metadata.title}
                      </div>
                      {metadata.description && (
                        <div className="external-reference-description">
                          {metadata.description}
                        </div>
                      )}
                      <div className="external-reference-url">
                        {metadata.url}
                      </div>
                      <div className="external-reference-actions">
                        <button
                          className="external-reference-button"
                          onClick={() => handlePreview(ref)}
                        >
                          Preview
                        </button>
                        <button
                          className="external-reference-button"
                          onClick={() => handleOpenDirect(ref)}
                        >
                          Open in New Tab →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Collapse>
      </div>

      <ExternalReferencePreviewModal
        open={previewState.open}
        onClose={() =>
          setPreviewState({ ...previewState, open: false, annotation: null })
        }
        title={previewState.title}
        description={previewState.description}
        url={previewState.url}
        annotation={previewState.annotation || undefined}
        onDeleteSuccess={handleDeleteSuccess}
      />
    </>
  );
};

export default ExternalReferencesSection;
