// src/documentView/components/TabbedAnnotationsPanel.tsx - Improved UI for different panel positions
import React, { useState, useEffect } from 'react';
import { FaStar, FaComment, FaBook, FaArrowDown, FaArrowRight, FaArrowLeft, FaTimes } from 'react-icons/fa';
import { Annotation } from '../types/annotation';
import '../styles/TabbedAnnotationsPanel.css';

// Types
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
  
  // Helper function to get display name from creator
  const getDisplayName = (creator: Annotation['creator']): string => {
    if (!creator) return 'Anonymous';
    
    if (typeof creator === 'string') return creator;
    
    if (creator.first_name || creator.last_name) {
      return `${creator.first_name || ''} ${creator.last_name || ''}`.trim();
    }
    
    if (creator.id) return `User ${creator.id}`;
    
    return 'Anonymous';
  };
  
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
  
  // Get document color by ID
  const getDocumentColor = (docId: number) => {
    const doc = documents.find(d => d.id === docId);
    return doc?.color || '#6c757d';
  };
  
  // Get document title by ID
  const getDocumentTitle = (docId: number) => {
    const doc = documents.find(d => d.id === docId);
    return doc?.title || `Document ${docId}`;
  };
  
  // Render annotation color and icon based on type
  const renderAnnotationTypeIndicator = (type: AnnotationType) => {
    if (type === 'scholarly') {
      return (
        <div className="annotation-type scholarly">
          <FaStar className="annotation-icon" />
          <span className="annotation-type-text">Scholarly</span>
        </div>
      );
    } else {
      return (
        <div className="annotation-type commenting">
          <FaComment className="annotation-icon" />
          <span className="annotation-type-text">Comment</span>
        </div>
      );
    }
  };
  
  // Update active tab when activeDocumentId changes
  useEffect(() => {
    if (activeDocumentId) {
      setActiveTab(`doc-${activeDocumentId}`);
    }
  }, [activeDocumentId]);
  
  // Handle position change
  const handlePositionChange = (newPosition: PanelPosition) => {
    if (onChangePosition && position !== newPosition) {
      onChangePosition(newPosition);
    }
  };
  
  // Generate dynamic styles based on panel position
  const getHeaderStyles = () => {
    const baseStyles = {
      display: 'flex',
      padding: '8px',
      backgroundColor: '#f0f2f5',
      borderBottom: '1px solid #ddd',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
    };
    
    if (position === 'bottom') {
      return {
        ...baseStyles,
        flexDirection: 'row' as const,
        justifyContent: 'space-between',
        alignItems: 'center'
      };
    } else {
      return {
        ...baseStyles,
        flexDirection: 'column' as const,
        gap: '8px'
      };
    }
  };
  
  const getTabsContainerStyles = () => {
    const baseStyles = {
      display: 'flex',
      gap: '4px',
      overflow: 'auto'
    };
    
    if (position === 'bottom') {
      return {
        ...baseStyles,
        flexDirection: 'row' as const,
        flexWrap: 'nowrap' as const
      };
    } else {
      return {
        ...baseStyles,
        flexDirection: 'column' as const,
        width: '100%'
      };
    }
  };
  
  const getTabButtonStyles = (isActive: boolean) => {
    const baseStyles = {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      border: 'none',
      borderRadius: '4px',
      padding: position === 'bottom' ? '6px 12px' : '8px 10px',
      fontSize: '12px',
      fontWeight: isActive ? 600 : 400,
      color: isActive ? '#212529' : '#6c757d',
      backgroundColor: isActive ? '#e9ecef' : 'transparent',
      cursor: 'pointer'
    };
    
    if (position === 'bottom') {
      return {
        ...baseStyles,
        whiteSpace: 'nowrap' as const
      };
    } else {
      return {
        ...baseStyles,
        justifyContent: 'space-between',
        width: '100%',
        textAlign: 'left' as const
      };
    }
  };
  
  const getPanelControlsStyles = () => {
    if (position === 'bottom') {
      return {
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      };
    } else {
      return {
        display: 'flex',
        flexDirection: 'row' as const,
        justifyContent: 'space-between',
        width: '100%',
        paddingTop: '4px'
      };
    }
  };
  
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
      {/* Tabs header with panel controls */}
      <div className="tabs-header" style={{
        ...getHeaderStyles(),
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div className="tabs-container" style={getTabsContainerStyles()}>
            {documents.map(doc => {
              const docColor = doc.color || '#6c757d';
              return (
                <button
                  key={`tab-doc-${doc.id}`}
                  style={{
                    ...getTabButtonStyles(activeTab === `doc-${doc.id}`),
                    borderLeft: `3px solid ${docColor}`
                  }}
                  onClick={() => setActiveTab(`doc-${doc.id}`)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FaBook style={{ fontSize: '10px', color: docColor }} />
                    <span>{doc.title}</span>
                  </div>
                  {/* Badge showing number of annotations for this document */}
                  <span style={{ 
                    backgroundColor: docColor,
                    color: '#fff',
                    borderRadius: '999px',
                    padding: '2px 6px',
                    fontSize: '10px'
                  }}>
                    {annotations.filter(a => a.document_id === doc.id).length}
                  </span>
                </button>
              );
            })}
          <button
            style={getTabButtonStyles(activeTab === 'all')}
            onClick={() => setActiveTab('all')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>All Annotations</span>
            </div>
            <span style={{ 
              backgroundColor: '#eee',
              borderRadius: '999px',
              padding: '2px 6px',
              fontSize: '10px'
            }}>
              {annotations.length}
            </span>
          </button>
        </div>
        
        {/* Panel position controls */}
        {onChangePosition && (
          <div className="panel-controls" style={getPanelControlsStyles()}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button 
                style={{
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: position === 'bottom' ? '#e9ecef' : 'transparent',
                  color: position === 'bottom' ? '#212529' : '#6c757d',
                  width: '26px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => handlePositionChange('bottom')}
                title="Bottom panel"
              >
                <FaArrowDown />
              </button>
              <button 
                style={{
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: position === 'right' ? '#e9ecef' : 'transparent',
                  color: position === 'right' ? '#212529' : '#6c757d',
                  width: '26px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => handlePositionChange('right')}
                title="Right panel"
              >
                <FaArrowRight />
              </button>
              <button 
                style={{
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: position === 'left' ? '#e9ecef' : 'transparent',
                  color: position === 'left' ? '#212529' : '#6c757d',
                  width: '26px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => handlePositionChange('left')}
                title="Left panel"
              >
                <FaArrowLeft />
              </button>
            </div>
            
            {onToggleVisibility && (
              <button 
                style={{
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: 'transparent',
                  color: '#6c757d',
                  width: '26px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                onClick={onToggleVisibility}
                title="Hide panel"
              >
                <FaTimes />
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Annotations content */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto',
        padding: '10px'
      }}>
        {filteredAnnotations.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#6c757d',
            fontSize: '14px',
            textAlign: 'center',
            padding: '20px'
          }}>
            {isHovering 
              ? "Hover over highlighted text to view annotations" 
              : `No annotations found for ${activeTab === 'all' ? 'any document' : getDocumentTitle(Number(activeTab.replace('doc-', '')))}`
            }
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gap: '12px',
            gridTemplateColumns: position === 'bottom' ? 'repeat(auto-fill, minmax(300px, 1fr))' : '1fr'
          }}>
            {filteredAnnotations.map(annotation => {
              const creatorName = getDisplayName(annotation.creator);
              const docColor = getDocumentColor(annotation.document_id);
              
              return (
                <div 
                  key={annotation.id} 
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '6px',
                    border: '1px solid #e2e6ea',
                    borderLeft: `4px solid ${docColor}`,
                    padding: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    {activeTab === 'all' && (
                      <div style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        color: docColor,
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <FaBook style={{ fontSize: '10px' }} />
                        {getDocumentTitle(annotation.document_id)}
                      </div>
                    )}
                    {renderAnnotationTypeIndicator(annotation.motivation as AnnotationType)}
                  </div>
                  
                  {/* Simplified author information */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <div style={{
                      backgroundColor: '#f0f2f5',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '8px',
                      fontSize: '10px',
                      color: '#495057'
                    }}>
                      {creatorName.charAt(0).toUpperCase()}
                    </div>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#212529'
                    }}>
                      {creatorName}
                    </span>
                  </div>
                  
                  {/* Annotation content */}
                  <div style={{
                    fontSize: '13px',
                    lineHeight: 1.5,
                    color: '#212529',
                    marginBottom: '12px',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {annotation.body.value}
                  </div>
                  <div>
                    <button 
                      style={{
                        border: 'none',
                        borderRadius: '4px',
                        backgroundColor: '#f0f2f5',
                        color: '#495057',
                        padding: '4px 8px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                      title="Scroll to this annotation in the document"
                    >
                      View in context
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TabbedAnnotationsPanel;