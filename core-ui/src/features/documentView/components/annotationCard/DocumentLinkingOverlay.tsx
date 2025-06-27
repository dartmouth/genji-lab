// NEW APPROACH: Replace DocumentLinkingDialog with a non-modal overlay
// src/features/documentView/components/annotationCard/DocumentLinkingOverlay.tsx

import React, { useState, useEffect } from 'react';
import { useAppDispatch } from '@store/hooks';
import { useAuth } from "@hooks/useAuthContext";
import { linkingAnnotations } from '@store';
import { makeTextAnnotationBody } from '@documentView/utils';
import { Link as LinkIcon, Close as CloseIcon, Check as CheckIcon } from "@mui/icons-material";

interface LinkingSelection {
  documentId: number;
  documentElementId: number;
  text: string;
  start: number;
  end: number;
  sourceURI: string;
}

interface DocumentLinkingOverlayProps {
  documents: Array<{
    id: number;
    collectionId: number;
    title: string;
  }>;
  onClose: () => void;
}

const DocumentLinkingOverlay: React.FC<DocumentLinkingOverlayProps> = ({
  documents,
  onClose
}) => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAuth();
  
  const [firstSelection, setFirstSelection] = useState<LinkingSelection | null>(null);
  const [secondSelection, setSecondSelection] = useState<LinkingSelection | null>(null);
  const [currentStep, setCurrentStep] = useState<'first' | 'second' | 'confirm'>('first');
  const [description, setDescription] = useState('');

  // Listen for text selections
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      const selectedText = range.toString().trim();
      
      if (selectedText.length === 0) return;
      
      // Find which document element contains this selection
      let targetElement = range.commonAncestorContainer as Node;
      
      // Walk up the DOM tree to find the document element
      while (targetElement && targetElement.nodeType !== Node.ELEMENT_NODE) {
        targetElement = targetElement.parentNode!;
      }
      
      let elementWithId = targetElement as HTMLElement;
      while (elementWithId && !elementWithId.id?.startsWith('DocumentElements/')) {
        elementWithId = elementWithId.parentElement!;
      }
      
      if (!elementWithId) return;
      
      // Extract document element ID
      const elementId = elementWithId.id.replace('DocumentElements/', '');
      
      // Find which document this belongs to
      const documentPanel = elementWithId.closest('.document-panel-wrapper') as HTMLElement;
      if (!documentPanel) return;
      
      const documentId = parseInt(documentPanel.getAttribute('data-document-id') || '0');
      const document = documents.find(d => d.id === documentId);
      
      if (!document) return;
      
      // Calculate text positions relative to the element
      const elementText = elementWithId.textContent || '';
      const rangeText = range.toString();
      const startOffset = elementText.indexOf(rangeText);
      const endOffset = startOffset + rangeText.length;
      
      const linkingSelection: LinkingSelection = {
        documentId: document.id,
        documentElementId: parseInt(elementId),
        text: selectedText,
        start: startOffset,
        end: endOffset,
        sourceURI: `DocumentElements/${elementId}`
      };
      
      if (currentStep === 'first') {
        setFirstSelection(linkingSelection);
        setCurrentStep('second');
      } else if (currentStep === 'second') {
        // Ensure we're not linking within the same document
        if (firstSelection && linkingSelection.documentId === firstSelection.documentId) {
          // Don't set selection, just show a message
          return;
        }
        setSecondSelection(linkingSelection);
        setCurrentStep('confirm');
      }
      
      // Clear the selection
      selection.removeAllRanges();
    };
    
    document.addEventListener('mouseup', handleSelection);
    return () => {
      document.removeEventListener('mouseup', handleSelection);
    };
  }, [currentStep, firstSelection, documents]);

  const handleSaveLink = () => {
    if (!user || !isAuthenticated || !firstSelection || !secondSelection) {
      return;
    }

    // Create segments for both selections
    const segments = [
      {
        sourceURI: firstSelection.sourceURI,
        start: firstSelection.start,
        end: firstSelection.end,
        text: firstSelection.text
      },
      {
        sourceURI: secondSelection.sourceURI,
        start: secondSelection.start,
        end: secondSelection.end,
        text: secondSelection.text
      }
    ];

    // Use the first document's collection and element for the main annotation body
    const annoBody = makeTextAnnotationBody(
      documents[0].collectionId,
      firstSelection.documentId,
      firstSelection.documentElementId,
      user.id,
      'linking',
      description || 'Document link',
      segments
    );

    dispatch(linkingAnnotations.thunks.saveAnnotation(annoBody));
    onClose();
  };

  const handleReset = () => {
    setFirstSelection(null);
    setSecondSelection(null);
    setCurrentStep('first');
    setDescription('');
  };

  const getDocumentTitle = (docId: number) => {
    return documents.find(d => d.id === docId)?.title || `Document ${docId}`;
  };

  const getStepInstruction = () => {
    switch (currentStep) {
      case 'first':
        return 'Select text in the first document';
      case 'second':
        return 'Select corresponding text in the second document';
      case 'confirm':
        return 'Review your selections and save the link';
      default:
        return '';
    }
  };

  return (
    <>
      {/* Document highlighting overlay - shows which areas can be selected */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 5,
          background: 'rgba(25, 118, 210, 0.05)'
        }}
      />

      {/* Floating control panel */}
      <div 
        style={{
          position: 'fixed',
          top: '50%',
          right: '20px',
          transform: 'translateY(-50%)',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          padding: '20px',
          width: '320px',
          zIndex: 1000,
          border: '2px solid #1976d2'
        }}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: '16px', 
            fontWeight: 600, 
            color: '#1976d2',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <LinkIcon />
            Linking Mode
          </h3>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#666',
              padding: '4px'
            }}
            title="Exit linking mode"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Instructions */}
        <div style={{
          backgroundColor: '#f0f7ff',
          border: '1px solid #b8daff',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '16px',
          fontSize: '14px',
          color: '#004085'
        }}>
          <strong>Step {currentStep === 'first' ? '1' : currentStep === 'second' ? '2' : '3'}:</strong> {getStepInstruction()}
        </div>

        {/* Progress indicators */}
        <div style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '16px'
        }}>
          <div style={{
            flex: 1,
            height: '3px',
            backgroundColor: currentStep !== 'first' ? '#4caf50' : '#e0e0e0',
            borderRadius: '2px'
          }} />
          <div style={{
            flex: 1,
            height: '3px',
            backgroundColor: currentStep === 'confirm' ? '#4caf50' : '#e0e0e0',
            borderRadius: '2px'
          }} />
        </div>

        {/* Selections display */}
        {firstSelection && (
          <div style={{
            backgroundColor: '#e8f5e8',
            border: '1px solid #4caf50',
            borderRadius: '4px',
            padding: '8px',
            marginBottom: '8px',
            fontSize: '12px'
          }}>
            <div style={{ fontWeight: 500, marginBottom: '4px' }}>
              ✓ First: {getDocumentTitle(firstSelection.documentId)}
            </div>
            <div style={{ color: '#666', fontStyle: 'italic' }}>
              "{firstSelection.text.substring(0, 50)}{firstSelection.text.length > 50 ? '...' : ''}"
            </div>
          </div>
        )}

        {secondSelection && (
          <div style={{
            backgroundColor: '#e8f5e8',
            border: '1px solid #4caf50',
            borderRadius: '4px',
            padding: '8px',
            marginBottom: '8px',
            fontSize: '12px'
          }}>
            <div style={{ fontWeight: 500, marginBottom: '4px' }}>
              ✓ Second: {getDocumentTitle(secondSelection.documentId)}
            </div>
            <div style={{ color: '#666', fontStyle: 'italic' }}>
              "{secondSelection.text.substring(0, 50)}{secondSelection.text.length > 50 ? '...' : ''}"
            </div>
          </div>
        )}

        {/* Same document warning */}
        {currentStep === 'second' && (
          <div style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '4px',
            padding: '8px',
            marginBottom: '12px',
            fontSize: '12px',
            color: '#856404'
          }}>
            Select text from the other document to create a link
          </div>
        )}

        {/* Description input for confirmation step */}
        {currentStep === 'confirm' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '6px', 
              fontSize: '12px', 
              fontWeight: 500 
            }}>
              Description (optional):
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this relationship..."
              style={{
                width: '100%',
                minHeight: '60px',
                padding: '6px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>
        )}

        {/* Action buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '8px',
          flexDirection: 'column'
        }}>
          {currentStep === 'confirm' && isAuthenticated && (
            <button
              onClick={handleSaveLink}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px',
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              <CheckIcon sx={{ fontSize: '16px' }} />
              Save Link
            </button>
          )}
          
          {(firstSelection || secondSelection) && (
            <button
              onClick={handleReset}
              style={{
                padding: '8px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Reset Selections
            </button>
          )}

          {!isAuthenticated && (
            <div style={{
              padding: '8px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '4px',
              fontSize: '11px',
              color: '#856404',
              textAlign: 'center'
            }}>
              Login required to save links
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DocumentLinkingOverlay;