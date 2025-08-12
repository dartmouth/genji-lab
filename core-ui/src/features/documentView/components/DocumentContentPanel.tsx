// src/features/documentView/components/DocumentContentPanel.tsx
// CRITICAL FIXES - Enhanced callback chain and debugging

import React, { useEffect, useCallback, useMemo } from 'react';
import { 
  HighlightedText,
  MenuContext
} from '.';
import { 
  RootState, 
  fetchDocumentElements,
  selectElementsByDocumentId,
  selectDocumentStatusById,
  selectDocumentErrorById
} from '@store';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@store/hooks';
import '../styles/DocumentContentStyles.css';
import { DocumentElement } from '@documentView/types';

interface DocumentContentPanelProps {
  documentId: number;
  documentCollectionId: number;
  // Documents currently being viewed (for context menu)
  viewedDocuments?: Array<{
    id: number;
    collectionId: number;
    title: string;
  }>;
  // Callback to open a linked document
  onOpenLinkedDocument?: (documentId: number, collectionId: number, targetInfo: {
    sourceURI: string;
    start: number;
    end: number;
  }, allTargets?: Array<{
    sourceURI: string;
    start: number;
    end: number;
    text: string;
  }>) => void;
  // Add linking mode prop
  isLinkingModeActive?: boolean;
  // Add show linked text highlights prop
  showLinkedTextHighlights?: boolean;
}

const DocumentContentPanel: React.FC<DocumentContentPanelProps> = ({
  documentId,
  documentCollectionId,
  viewedDocuments = [],
  onOpenLinkedDocument,
  isLinkingModeActive = false,
  showLinkedTextHighlights = false
}) => {
  // Redux - 🎯 FIXED: Use memoized selectors to prevent unnecessary re-renders
  const dispatch = useAppDispatch();
  
  const documentElements = useSelector(
    useMemo(() => (state: RootState) => selectElementsByDocumentId(state, documentId), [documentId])
  ) as DocumentElement[];
  
  const documentStatus = useSelector(
    useMemo(() => (state: RootState) => selectDocumentStatusById(state, documentId), [documentId])
  );
  
  const documentError = useSelector(
    useMemo(() => (state: RootState) => selectDocumentErrorById(state, documentId), [documentId])
  );
  
  // Fetch document elements
  useEffect(() => {
    if (documentId) {
      console.log('🏗️ DocumentContentPanel: Fetching elements for document', documentId);
      console.log('🏗️ Current documentStatus:', documentStatus);
      console.log('🏗️ Current documentError:', documentError);
      console.log('🏗️ Current elements count:', documentElements.length);
      
      dispatch(fetchDocumentElements(documentId))
        .unwrap()
        .then((result) => {
          console.log('🏗️ ✅ Successfully fetched elements for document', documentId, ':', result.elements.length, 'elements');
        })
        .catch((error) => {
          console.error('🏗️ ❌ Failed to fetch elements for document', documentId, ':', error);
        });
    }
  }, [dispatch, documentId]);

  // 🎯 CRITICAL FIX: Enhanced callback wrapper with detailed logging
  const handleOpenLinkedDocumentWrapper = useCallback((
    linkedDocumentId: number, 
    collectionId: number, 
    targetInfo: {
      sourceURI: string;
      start: number;
      end: number;
    }, 
    allTargets?: Array<{
      sourceURI: string;
      start: number;
      end: number;
      text: string;
    }>
  ) => {
    console.log('📄 === DocumentContentPanel: handleOpenLinkedDocumentWrapper called ===');
    console.log('📄 Current document ID:', documentId);
    console.log('📄 Linked document ID:', linkedDocumentId);
    console.log('📄 Collection ID:', collectionId);
    console.log('📄 Target info:', targetInfo);
    console.log('📄 All targets count:', allTargets?.length || 0);
    console.log('📄 Parent callback exists:', !!onOpenLinkedDocument);
    console.log('📄 Document elements loaded:', documentElements.length);
    
    // 🎯 REMOVED: Don't block same document calls - let the parent handle the logic
    // The parent DocumentViewerContainer has sophisticated logic to handle:
    // 1. Same document, same content (scroll)
    // 2. Same document, but links to other documents (navigate)
    // 3. Different documents (open/replace)
    
    if (linkedDocumentId === documentId) {
      console.log('📄 ℹ️ Same document ID detected - passing to parent for cross-document analysis');
    }
    
    if (onOpenLinkedDocument) {
      console.log('📄 === Calling parent onOpenLinkedDocument ===');
      try {
        onOpenLinkedDocument(linkedDocumentId, collectionId, targetInfo, allTargets);
        console.log('📄 ✅ Parent callback executed successfully');
      } catch (error) {
        console.error('📄 ❌ Error in parent callback:', error);
      }
    } else {
      console.error('📄 ❌ No parent callback provided to DocumentContentPanel');
    }
  }, [documentId, onOpenLinkedDocument, documentElements.length]);

  // 🎯 NEW: Debug logging for document elements
  useEffect(() => {
    console.log('📊 DocumentContentPanel state update for document', documentId, ':', {
      elementsCount: documentElements.length,
      status: documentStatus,
      error: documentError,
      elementIds: documentElements.map(el => el.id).slice(0, 5) // First 5 IDs
    });
  }, [documentElements, documentStatus, documentError, documentId]);
  
  // Loading/Error states
  if (documentStatus === 'loading' && documentElements.length === 0) {
    console.log('📄 DocumentContentPanel: Loading document elements for', documentId);
    return (
      <div className="loading-indicator">
        Loading document elements for document {documentId}...
        <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
          API call: /api/v1/documents/{documentId}/elements/
        </div>
      </div>
    );
  }
  
  if (documentStatus === 'failed') {
    console.error('📄 DocumentContentPanel: Failed to load document', documentId, ':', documentError);
    return (
      <div className="error-message">
        <strong>Error loading document {documentId}:</strong>
        <br />
        {documentError}
        <br />
        <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
          Attempted API call: /api/v1/documents/{documentId}/elements/
        </div>
        <button 
          onClick={() => dispatch(fetchDocumentElements(documentId))}
          className="retry-button"
          style={{ marginTop: '8px' }}
        >
          Retry
        </button>
      </div>
    );
  }
  
  if (!documentElements || documentElements.length === 0) {
    console.warn('📄 DocumentContentPanel: No elements found for document', documentId, {
      status: documentStatus,
      error: documentError,
      elementsArray: documentElements
    });
    return (
      <div className="warning-message">
        <p><strong>No content found for document {documentId}.</strong></p>
        <p>Status: {documentStatus}</p>
        {documentError && <p>Error: {documentError}</p>}
        <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
          Expected API call: /api/v1/documents/{documentId}/elements/
        </div>
        <button 
          onClick={() => dispatch(fetchDocumentElements(documentId))}
          className="retry-button"
          style={{ marginTop: '8px' }}
        >
          Retry Loading
        </button>
      </div>
    );
  }

  console.log('📄 DocumentContentPanel: Rendering', documentElements.length, 'elements for document', documentId);

  return (
    <div className="document-panel">
      <div className="document-content-container">
        {/* 🎯 ENHANCED: Add data attributes for better element identification */}
        {documentElements.map((content) => {
          const paragraphId = `DocumentElements/${content.id}`;
          return (
            <div 
              key={content.id} 
              className="document-content"
              id={paragraphId}
              data-element-id={content.id}
              data-document-id={documentId}
              data-source-uri={`/DocumentElements/${content.id}`}
            >
              <HighlightedText
                text={content.content.text}
                paragraphId={paragraphId}
                format={content.content.formatting}
                documentCollectionId={documentCollectionId}
                documentId={documentId}
                isLinkingModeActive={isLinkingModeActive}
                showLinkedTextHighlights={showLinkedTextHighlights}
                viewedDocuments={viewedDocuments}
              />
            </div>
          );
        })}
        
        {/* 🎯 CRITICAL FIX: Pass the enhanced wrapper callback */}
        <MenuContext
          viewedDocuments={viewedDocuments}
          onOpenLinkedDocument={handleOpenLinkedDocumentWrapper}
        />
        
        {/* 🎯 NEW: Debug information panel (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'monospace',
            zIndex: 9999,
            maxWidth: '300px'
          }}>
            <div>Doc {documentId}: {documentElements.length} elements</div>
            <div>Callback: {onOpenLinkedDocument ? '✓' : '✗'}</div>
            <div>Viewed docs: {viewedDocuments.length}</div>
            <div>Linking mode: {isLinkingModeActive ? 'ON' : 'OFF'}</div>
            <div>Show highlights: {showLinkedTextHighlights ? 'ON' : 'OFF'}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentContentPanel;