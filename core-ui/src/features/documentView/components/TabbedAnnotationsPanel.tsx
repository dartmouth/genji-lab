import React, { useState, useEffect } from 'react';
import { FaStar, FaBook, FaArrowDown, FaArrowRight, FaArrowLeft, FaTimes } from 'react-icons/fa';
import { ThumbUp, ChatBubbleOutline, Flag, Settings } from "@mui/icons-material";
import { Menu, MenuItem, Chip, Tooltip, Avatar } from "@mui/material";
import { useAuth } from "@hooks/useAuthContext";
import { useAppDispatch, useAppSelector, RootState, upvoteAnnotations, sliceMap } from "@store";
import { parseURI, makeTextAnnotationBody } from "@documentView/utils";
import '../styles/TabbedAnnotationsPanel.css';

import { Annotation } from "@documentView/types/annotation";

import { TagList, TagInput } from '@documentView/components';
import { AnnotationEditor, ReplyForm } from '.';

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
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  
  // State for active tab: 'doc-{id}' for document tabs or 'all' for all annotations
  const [activeTab, setActiveTab] = useState<string>(
    activeDocumentId ? `doc-${activeDocumentId}` : 'all'
  );
  
  // State for menu anchor elements (one for each annotation)
  const [menuAnchors, setMenuAnchors] = useState<Record<string, HTMLElement | null>>({});
  
  // For debug logging
  useEffect(() => {
    console.log("Menu anchors state:", menuAnchors);
  }, [menuAnchors]);
  
  // States for managing interactions with annotations
  const [replyingAnnotationIds, setReplyingAnnotationIds] = useState<Record<string, boolean>>({});
  const [flaggingAnnotationIds, setFlaggingAnnotationIds] = useState<Record<string, boolean>>({});
  const [editingAnnotationIds, setEditingAnnotationIds] = useState<Record<string, boolean>>({});
  const [taggingAnnotationIds, setTaggingAnnotationIds] = useState<Record<string, boolean>>({});
  
  // Helper function to get display name from creator
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getDisplayName = (creator: any): string => {
    if (!creator) return 'Anonymous';
    
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
  
  // Get upvotes for all annotations (outside the render loop)
  const annotationUpvotes = useAppSelector((state: RootState) => {
    const result: Record<string, unknown[]> = {};
    filteredAnnotations.forEach(annotation => {
      result[annotation.id] = upvoteAnnotations.selectors.selectAnnotationsByParent(
        state, 
        `Annotation/${annotation.id}`
      ) || [];
    });
    return result;
  });
  
  // For replies, let's add code to show them if available
  const annotationReplies = useAppSelector((state: RootState) => {
      const result: Record<string, Annotation[]> = {};
    filteredAnnotations.forEach(annotation => {
      try {
        // If you have a slice for replying annotations, use it here
        const replies = sliceMap.replying?.selectors.selectAnnotationsByParent(
          state, 
          `Annotation/${annotation.id}`
        ) || [];
        result[annotation.id] = replies;
      } catch (error) {
        result[annotation.id] = [];
        console.error("Error getting replies for annotation", annotation.id, error);
      }
    });
    return result;
  });
  
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
  
  // Annotation toolbar handlers
  const toggleMenu = (annotationId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent event from bubbling up
    event.stopPropagation();
    
    console.log("Toggle menu clicked for annotation:", annotationId);
    console.log("Current anchor element:", event.currentTarget);
    
    setMenuAnchors(prev => {
      const newAnchors = {
        ...prev,
        [annotationId]: prev[annotationId] ? null : event.currentTarget
      };
      console.log("New menu anchors:", newAnchors);
      return newAnchors;
    });
  };

  const closeMenu = (annotationId: string) => {
    setMenuAnchors(prev => ({
      ...prev,
      [annotationId]: null
    }));
  };
  
  const handleReplyClick = (annotationId: string) => {
    setReplyingAnnotationIds(prev => ({
      ...prev,
      [annotationId]: !prev[annotationId]
    }));
    // Reset flagging state when replying
    if (flaggingAnnotationIds[annotationId]) {
      setFlaggingAnnotationIds(prev => ({
        ...prev,
        [annotationId]: false
      }));
    }
  };
  
  const handleFlagClick = (annotationId: string) => {
    setFlaggingAnnotationIds(prev => ({
      ...prev,
      [annotationId]: !prev[annotationId]
    }));
    // Reset replying state when flagging
    if (replyingAnnotationIds[annotationId]) {
      setReplyingAnnotationIds(prev => ({
        ...prev,
        [annotationId]: false
      }));
    }
  };
  
  const handleEditClick = (annotationId: string) => {
    setEditingAnnotationIds(prev => ({
      ...prev,
      [annotationId]: true
    }));
    closeMenu(annotationId);
  };

  const handleEditCancel = (annotationId: string) => {
    setEditingAnnotationIds(prev => ({
      ...prev,
      [annotationId]: false
    }));
  };

  const handleEditSave = (annotationId: string, editText: string, motivation: string) => {
    if (!editText.trim()) return;

    const slice = sliceMap[motivation];
    if (!slice) {
      console.error("Bad motivation in update:", motivation);
      return;
    }

    dispatch(slice.thunks.patchAnnotation({
      "annotationId": annotationId as unknown as number,
      "payload": { "body": editText }
    }));

    setEditingAnnotationIds(prev => ({
      ...prev,
      [annotationId]: false
    }));
  };
  
  const handleDeleteClick = (annotationId: string, motivation: string) => {
    const slice = sliceMap[motivation];
    if (!slice) {
      console.error("Bad motivation in delete:", motivation);
      return;
    }
    
    dispatch(slice.thunks.deleteAnnotation({
      'annotationId': annotationId as unknown as number
    }));
    
    closeMenu(annotationId);
  };
  
  const handleTagsClick = (annotationId: string) => {
    setTaggingAnnotationIds(prev => ({
      ...prev,
      [annotationId]: !prev[annotationId]
    }));
    closeMenu(annotationId);
  };

  const handleTagsClose = (annotationId: string) => {
    setTaggingAnnotationIds(prev => ({
      ...prev,
      [annotationId]: false
    }));
  };
  
  const handleTagSubmit = (annotationId: string, tags: string[]) => {
    // This would handle submitting tags - implement based on your useAnnotationTags hook
    console.log(`Submit tags for annotation ${annotationId}:`, tags);
    // Actual implementation will depend on your tags logic
    setTaggingAnnotationIds(prev => ({
      ...prev,
      [annotationId]: false
    }));
  };
  
  const handleUpvote = (annotation: Annotation) => {
    if (!user || !user.id) return;

    const deId = typeof annotation.document_element_id === "string"
      ? parseInt(parseURI(annotation.document_element_id))
      : annotation.document_element_id;

    const segment = [{
      sourceURI: `Annotation/${annotation.id}`,
      start: 1,
      end: 1,
      text: ""
    }];
    
    const upvote = makeTextAnnotationBody(
      annotation.document_collection_id,
      annotation.document_id,
      deId,
      user.id,
      'upvoting',
      "Upvote",
      segment
    );
        
    dispatch(upvoteAnnotations.thunks.saveAnnotation(upvote));
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
            const isReplying = replyingAnnotationIds[annotation.id] || false;
            const isFlagging = flaggingAnnotationIds[annotation.id] || false;
            const isEditing = editingAnnotationIds[annotation.id] || false;
            const isTagging = taggingAnnotationIds[annotation.id] || false;
            const isAuthor = user?.id === annotation.creator.id;
            
            // Get upvotes for this annotation
            const upvotes = annotationUpvotes[annotation.id] || [];
            
            // Properly type check for upvotes
            const hasUserUpvoted = !!(user?.id && upvotes.some((u: any) => u.creator?.id === user.id));
            
            return (
              <div 
                key={annotation.id} 
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '6px',
                  border: '1px solid #e2e6ea',
                  borderLeft: `4px solid ${docColor}`,
                  padding: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  position: 'relative' // For absolute positioning of toolbar
                }}
              >
                {/* Toolbar positioned at top right */}
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  zIndex: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.85)',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}>
                  <button 
                    title="Upvote" 
                    onClick={() => handleUpvote(annotation)} 
                    disabled={hasUserUpvoted} 
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: hasUserUpvoted ? 'not-allowed' : 'pointer',
                      color: hasUserUpvoted ? '#aaa' : '#34A853',
                      opacity: hasUserUpvoted ? 0.5 : 1,
                      pointerEvents: hasUserUpvoted ? 'none' : 'auto',
                      padding: '4px',
                      borderRadius: '4px'
                    }}
                  >
                    <ThumbUp sx={{ fontSize: '1rem' }} />
                  </button>
                  
                  <Tooltip
                    title={
                      upvotes && upvotes.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {upvotes?.map((upvote: any) => (
                            <Chip
                              key={upvote.id}
                              avatar={<Avatar>{`${upvote.creator.first_name?.charAt(0) || ''}${upvote.creator.last_name?.charAt(0) || ''}`.toUpperCase()}</Avatar>}
                              label={`${upvote.creator.first_name || ''} ${upvote.creator.last_name || ''}`.trim()}
                              size="small"
                              color="primary"
                            />
                          ))}
                        </div>
                      ) : ""
                    }
                    arrow
                    placement="bottom-start"
                  >
                    <Chip 
                      label={upvotes?.length || 0} 
                      size="small" 
                      sx={{ 
                        backgroundColor: '#e0f2f1', 
                        fontWeight: 'bold', 
                        height: '24px',
                        minWidth: '28px'
                      }} 
                    />
                  </Tooltip>
                  
                  <button 
                    title="Reply" 
                    onClick={() => handleReplyClick(annotation.id)} 
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      cursor: 'pointer', 
                      color: isReplying ? '#1976d2' : '#6c757d',
                      padding: '4px',
                      borderRadius: '4px'
                    }}
                  >
                    <ChatBubbleOutline sx={{ fontSize: '1rem' }} />
                  </button>
                  
                  <button 
                    title="Flag" 
                    onClick={() => handleFlagClick(annotation.id)} 
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      cursor: 'pointer', 
                      color: isFlagging ? '#f44336' : '#6c757d',
                      padding: '4px',
                      borderRadius: '4px'
                    }}
                  >
                    <Flag sx={{ fontSize: '1rem' }} />
                  </button>
                  
                  <button 
                    title="Settings" 
                    onClick={(e) => toggleMenu(annotation.id, e)} 
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      cursor: 'pointer', 
                      color: '#6c757d',
                      padding: '4px',
                      borderRadius: '4px'
                    }}
                  >
                    <Settings sx={{ fontSize: '1rem' }} />
                  </button>

                  <Menu
                    id={`annotation-menu-${annotation.id}`}
                    anchorEl={menuAnchors[annotation.id] || null}
                    open={Boolean(menuAnchors[annotation.id])}
                    onClose={() => closeMenu(annotation.id)}
                    disableScrollLock
                  >
                    {isAuthor && <MenuItem onClick={() => handleEditClick(annotation.id)}>Edit</MenuItem>}
                    {isAuthor && <MenuItem onClick={() => handleDeleteClick(annotation.id, annotation.motivation)}>Delete</MenuItem>}
                    <MenuItem onClick={() => handleTagsClick(annotation.id)}>Tags</MenuItem>
                  </Menu>
                </div>
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                  paddingRight: '120px' // Make room for the toolbar
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

                {/* Display replies if there are any */}
                {annotationReplies[annotation.id] && (annotationReplies[annotation.id] as any[]).length > 0 && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e6e6e6' }}>
                    <div style={{ 
                      fontSize: '13px',
                      fontWeight: 500,
                      marginBottom: '8px',
                      color: '#666'
                    }}>
  
                      {annotationReplies[annotation.id]?.length || 0} {annotationReplies[annotation.id]?.length === 1 ? 'Reply' : 'Replies'}
                    </div>

                    {(annotationReplies[annotation.id] as any[]).map((reply: any) => (
                      <div 
                        key={reply.id}
                        style={{ 
                          backgroundColor: '#f8f9fa',
                          borderRadius: '4px',
                          padding: '10px',
                          marginBottom: '8px',
                          fontSize: '12px'
                        }}
                      >
                        <div style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          marginBottom: '6px'
                        }}>
                          <div style={{
                            backgroundColor: '#e9ecef',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: '6px',
                            fontSize: '8px'
                          }}>
                            {getDisplayName(reply.creator).charAt(0).toUpperCase()}
                          </div>
                          <span style={{
                            fontWeight: 500,
                            fontSize: '12px'
                          }}>
                            {getDisplayName(reply.creator)}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px' }}>
                          {reply.body.value}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tag input and forms would go here if needed */}
                {isTagging && (
                  <TagInput 
                    onSubmit={(newTags) => handleTagSubmit(annotation.id, newTags)}
                    onClose={() => handleTagsClose(annotation.id)}
                  />
                )}

                {/* Conditionally show editor */}
                {isEditing && (
                  <AnnotationEditor
                    initialText={annotation.body.value}
                    onSave={(text) => handleEditSave(annotation.id, text, annotation.motivation)}
                    onCancel={() => handleEditCancel(annotation.id)}
                  />
                )}

                {/* Conditionally show reply form */}
                {isFlagging && !isReplying && (
                  <ReplyForm
                    annotation={annotation}
                    motivation="flagging"
                    onSave={() => {
                      setFlaggingAnnotationIds(prev => ({
                        ...prev,
                        [annotation.id]: false
                      }));
                    }}
                  />
                )}

                {isReplying && !isFlagging && (
                  <ReplyForm
                    annotation={annotation}
                    motivation="replying"
                    onSave={() => {
                      setReplyingAnnotationIds(prev => ({
                        ...prev,
                        [annotation.id]: false
                      }));
                    }}
                  />
                )}
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