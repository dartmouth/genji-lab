import React, { useState, useEffect } from 'react';
import { Annotation } from "@documentView/types/annotation";
import PanelHeader from './tabbedAnnotationsPanel/PanelHeader';
import AnnotationsList from './tabbedAnnotationsPanel/AnnotationsList';
import '../styles/TabbedAnnotationsPanel.css';

export type AnnotationType = 'commenting' | 'scholarly' | 'replying' | 'tagging' | 'upvoting' | 'flagging';
export type PanelPosition = 'bottom' | 'right' | 'left';

interface TabbedAnnotationsPanelProps {
  documents: Array<{
    id: number;
    title: string;
    color?: string;
  }>;
  annotations: Annotation[];
  activeDocumentId?: number;
  isHovering?: boolean;
  position?: PanelPosition;
  onChangePosition?: (position: PanelPosition) => void;
  onToggleVisibility?: () => void;
}

const TabbedAnnotationsPanel: React.FC<TabbedAnnotationsPanelProps> = ({
  documents,
  annotations,
  activeDocumentId,
  isHovering = false,
  position = 'bottom',
  onChangePosition,
  onToggleVisibility
}) => {
  
  // State for active tab: 'doc-{id}' for document tabs or 'all' for all annotations
  const [activeTab, setActiveTab] = useState<string>(
    activeDocumentId ? `doc-${activeDocumentId}` : 'all'
  );
  
  // Filter annotations based on active tab
  const getFilteredAnnotations = () => {
    if (activeTab === 'all') {
      return annotations;
    } else {
      const docId = Number(activeTab.replace('doc-', ''));
      return annotations.filter(anno => anno.document_id === docId);
    }
  };
  
  const filteredAnnotations = getFilteredAnnotations();
  
  // Get document title by ID
  const getDocumentTitle = (docId: number) => {
    const doc = documents.find(d => d.id === docId);
    return doc?.title || `Document ${docId}`;
  };
  
  // Update active tab when activeDocumentId changes
  useEffect(() => {
    if (activeDocumentId) {
      setActiveTab(`doc-${activeDocumentId}`);
    }
  }, [activeDocumentId]);

  return (
    <div className={`tabbed-annotations-panel position-${position}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#f9f9f9'
      }}
    >
      {/* Panel Header with Tabs and Controls */}
      <PanelHeader
        documents={documents}
        annotations={annotations}
        activeTab={activeTab}
        position={position}
        onTabChange={setActiveTab}
        onChangePosition={onChangePosition}
        onToggleVisibility={onToggleVisibility}
      />
      
      {/* Annotations Content */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto',
        padding: '10px'
      }}>
        <AnnotationsList
          annotations={filteredAnnotations}
          position={position}
          isHovering={isHovering}
          activeTab={activeTab}
          documents={documents}
          getDocumentTitle={getDocumentTitle}
        />
      </div>
    </div>
  );
};

export default TabbedAnnotationsPanel;