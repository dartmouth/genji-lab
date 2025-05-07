import React, { useEffect, useState, useMemo } from 'react';
import { 
  HighlightedText,
  AnnotationsSidebar,
  MenuContext
} from '.';
import { 
  RootState, 
  commentingAnnotations, 
  scholarlyAnnotations,
  fetchDocumentElements,
  fetchComparisonDocumentElements,
  selectElementsByDocumentId,
  selectDocumentStatusById,
  selectDocumentErrorById,
  fetchDocumentsByCollection,
  setActiveParagraph,
  selectActiveParagraphId,
  selectAllDocumentCollections,
  fetchDocumentCollections,
  selectAllDocuments,
  selectCurrentDocumentId,
  selectComparisonDocumentIds,
  removeComparisonDocument,
  clearAllComparisonDocuments
} from '@store';
import { useLocation, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@store/hooks';
import '../styles/DocumentContentStyles.css';

// Define a base interface that matches your actual data structure
interface BaseDocumentElement {
  id: number;
  content: {
    text: string;
    [key: string]: unknown;
  };
  document_id?: number;
  [key: string]: unknown;
}

interface Document {
  id: number;
  title: string;
  description?: string;
  created?: string;
  modified?: string;
  document_collection_id: number;
  [key: string]: unknown;
}

const DocumentContentPanel: React.FC = () => {
  // Get route params directly in the component
  const { collectionId, documentId } = useParams<{ collectionId: string; documentId: string }>();
  const numericDocumentId = documentId ? Number(documentId) : 0;
  const numericCollectionId = collectionId ? Number(collectionId) : 0;
  
  // STATE
  const [collapsedComments, setCollapsedComments] = useState<boolean>(false);
  const [collapsedAnnotations, setCollapsedAnnotations] = useState<boolean>(false);
  const [hasAutoOpened, setHasAutoOpened] = useState<boolean>(false);
  const [showCompareView, setShowCompareView] = useState<boolean>(false);
  const [selectedCompareDocumentId, setSelectedCompareDocumentId] = useState<number | null>(null);
  const [selectedCompareCollection, setSelectedCompareCollection] = useState<number | null>(null);
  const [activeAnnotationView, setActiveAnnotationView] = useState<'master' | 'detail'>('master');
  const [isLoadingCompareCollection, setIsLoadingCompareCollection] = useState<boolean>(false);
  const [compareCollectionDocuments, setCompareCollectionDocuments] = useState<Document[]>([]);
  const [compareCollectionError, setCompareCollectionError] = useState<string | null>(null);
  
  // Redux
  const dispatch = useAppDispatch();
  const location = useLocation();
  
  // Get data from Redux
  const activeParagraphId = useSelector(selectActiveParagraphId);
  const currentDocumentId = useSelector(selectCurrentDocumentId);
  const comparisonDocumentIds = useSelector(selectComparisonDocumentIds);
  const documents = useSelector(selectAllDocuments);
  const documentCollections = useSelector(selectAllDocumentCollections);
  
  // Get document elements using the new selectors
  const mainDocumentElements = useSelector((state: RootState) => 
    selectElementsByDocumentId(state, numericDocumentId)
  ) as BaseDocumentElement[];
  
  const mainDocumentStatus = useSelector((state: RootState) => 
    selectDocumentStatusById(state, numericDocumentId)
  );
  
  const mainDocumentError = useSelector((state: RootState) => 
    selectDocumentErrorById(state, numericDocumentId)
  );
  
  // Get compare document elements if a comparison document is selected
  const compareDocumentElements = useSelector((state: RootState) => 
    selectedCompareDocumentId ? 
    selectElementsByDocumentId(state, selectedCompareDocumentId) : 
    []
  ) as BaseDocumentElement[];
  
  const compareDocumentStatus = useSelector((state: RootState) => 
    selectedCompareDocumentId ? 
    selectDocumentStatusById(state, selectedCompareDocumentId) : 
    'idle'
  );
  
  const compareDocumentError = useSelector((state: RootState) => 
    selectedCompareDocumentId ? 
    selectDocumentErrorById(state, selectedCompareDocumentId) : 
    null
  );
  
  // Get current document from Redux
  const currentDocument = useMemo(() => 
    documents.find(doc => doc.id === numericDocumentId),
    [documents, numericDocumentId]
  );
  
  // Get compare document from the compare collection documents
  const compareDocument = useMemo(() => 
    selectedCompareDocumentId ? compareCollectionDocuments.find(doc => doc.id === selectedCompareDocumentId) : null,
    [compareCollectionDocuments, selectedCompareDocumentId]
  );
  
  // FETCH DATA
  
  // Fetch document elements for main document
  useEffect(() => {
    if (numericDocumentId) {
      dispatch(fetchDocumentElements(numericDocumentId));
    }
  }, [dispatch, numericDocumentId]);
  
  // Fetch documents for current collection
  useEffect(() => {
    if (numericCollectionId) {
      dispatch(fetchDocumentsByCollection(numericCollectionId));
    }
  }, [dispatch, numericCollectionId]);
  
  // Fetch all document collections
  useEffect(() => {
    dispatch(fetchDocumentCollections());
  }, [dispatch]);
  
  // Sync URL hash to Redux (when URL changes)
  useEffect(() => {
    if (location.hash) {
      const paragraphId = location.hash.slice(1);
      dispatch(setActiveParagraph(paragraphId));
    } else {
      // If there's no hash, clear the active paragraph
      dispatch(setActiveParagraph(''));
    }
  }, [location.hash, dispatch]);
  
  // Scroll to active paragraph when it changes
  useEffect(() => {
    if (activeParagraphId) {
      const targetElement = document.getElementById(activeParagraphId);
      if (targetElement) {
        setTimeout(() => {
          targetElement.scrollIntoView({ behavior: 'smooth' });
          
          // Add highlight effect
          targetElement.classList.add('highlight-target');
          setTimeout(() => targetElement.classList.remove('highlight-target'), 3000);
        }, 100);
      }
    }
  }, [activeParagraphId]);
  
  // Cleanup comparison documents when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearAllComparisonDocuments());
    };
  }, [dispatch]);
  
  // ANNOTATION HANDLING
  
  // Your selectors
  const hoveredHighlightIds = useSelector(
    (state: RootState) => state.highlightRegistry.hoveredHighlightIds[numericDocumentId] || []
  );
  
  const compareHoveredHighlightIds = useSelector(
    (state: RootState) => selectedCompareDocumentId ? 
      state.highlightRegistry.hoveredHighlightIds[selectedCompareDocumentId] || [] : 
      []
  );
  
  const makeSelectAnnotationsById = useMemo(
    () => commentingAnnotations.selectors.makeSelectAnnotationsById(),
    []
  );
  const makeSelectScholarlyAnnotationsById = useMemo(
    () => scholarlyAnnotations.selectors.makeSelectAnnotationsById(),
    []
  );
  
  // Main document annotations
  const hoveredAnnotations = useSelector(
    (state: RootState) => makeSelectAnnotationsById(state, hoveredHighlightIds)
  );
  const hoveredScholarlyAnnotations = useSelector(
    (state: RootState) => makeSelectScholarlyAnnotationsById(state, hoveredHighlightIds)
  );
  
  // Compare document annotations
  const compareHoveredAnnotations = useSelector(
    (state: RootState) => makeSelectAnnotationsById(state, compareHoveredHighlightIds)
  );
  const compareHoveredScholarlyAnnotations = useSelector(
    (state: RootState) => makeSelectScholarlyAnnotationsById(state, compareHoveredHighlightIds)
  );
  
  // Auto-open annotations when hovering
  useEffect(() => {
    const anyHoveredAnnotations = hoveredAnnotations.length > 0 || compareHoveredAnnotations.length > 0;
    if (anyHoveredAnnotations && !hasAutoOpened && !collapsedComments) {
      setCollapsedComments(true);
      setCollapsedAnnotations(true);
      setHasAutoOpened(true);
    }
  }, [hoveredAnnotations, compareHoveredAnnotations, hasAutoOpened, collapsedComments]);
  
  // EVENT HANDLERS
  
  // Handle selecting a collection for comparison
  const handleCompareCollectionChange = (collectionId: number) => {
    setSelectedCompareCollection(collectionId);
    // Reset the compare document when changing collections
    setSelectedCompareDocumentId(null);
    
    // Fetch documents for this specific collection
    const fetchCompareCollectionDocuments = async () => {
      try {
        setIsLoadingCompareCollection(true);
        setCompareCollectionError(null);
        
        console.log(`Fetching documents for comparison collection ID: ${collectionId}`);
        const response = await fetch(`/api/v1/collections/${collectionId}/documents`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch documents: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`Fetched ${data.length} documents for collection ${collectionId}`);
        setCompareCollectionDocuments(data);
      } catch (error) {
        console.error('Error fetching comparison collection documents:', error);
        setCompareCollectionError(error instanceof Error ? error.message : 'Unknown error');
        setCompareCollectionDocuments([]);
      } finally {
        setIsLoadingCompareCollection(false);
      }
    };
    
    fetchCompareCollectionDocuments();
  };
  
  // Handle opening compare document
  const handleOpenCompare = (docId: number) => {
    setSelectedCompareDocumentId(docId);
    // Fetch the comparison document elements
    dispatch(fetchComparisonDocumentElements(docId));
    setShowCompareView(true);
  };
  
  // Handle closing compare document
  const handleCloseCompare = () => {
    setShowCompareView(false);
    if (selectedCompareDocumentId) {
      dispatch(removeComparisonDocument(selectedCompareDocumentId));
      setSelectedCompareDocumentId(null);
    }
  };
  
  // Toggle which document's annotations to show
  const handleToggleAnnotationView = () => {
    setActiveAnnotationView(activeAnnotationView === 'master' ? 'detail' : 'master');
  };
  
  // RENDER METHODS
  
  // Render document compare selector
  const renderDocumentSelector = () => {
    // Filter documents from the compare collection that aren't the current document
    const compareDocuments = compareCollectionDocuments.filter(doc => 
      doc.id !== numericDocumentId
    );
    
    return (
      <div className="document-compare-selector">
        {!showCompareView ? (
          <button 
            onClick={() => setShowCompareView(true)}
            className="compare-toggle-button"
          >
            Compare with Document
          </button>
        ) : (
          <>
            <button 
              onClick={handleCloseCompare}
              className="compare-toggle-button"
            >
              Hide Compare View
            </button>
            
            <div className="document-selector-controls">
              {/* Collection selector */}
              <div className="collection-selector-dropdown">
                <select 
                  value={selectedCompareCollection || ''}
                  onChange={(e) => handleCompareCollectionChange(Number(e.target.value))}
                  className="collection-select"
                >
                  <option value="">Select a collection</option>
                  {documentCollections.map(collection => (
                    <option key={collection.id} value={collection.id}>
                      {collection.title}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Document selector - only show if a collection is selected */}
              {selectedCompareCollection && (
                <div className="document-selector-dropdown">
                  <select 
                    value={selectedCompareDocumentId || ''}
                    onChange={(e) => handleOpenCompare(Number(e.target.value))}
                    className="document-select"
                    disabled={isLoadingCompareCollection || compareDocuments.length === 0}
                  >
                    {isLoadingCompareCollection ? (
                      <option value="">Loading documents...</option>
                    ) : compareCollectionError ? (
                      <option value="">Error loading documents</option>
                    ) : (
                      <>
                        <option value="">
                          {compareDocuments.length === 0 
                            ? "No other documents in this collection" 
                            : "Select a document"}
                        </option>
                        {compareDocuments.map(doc => (
                          <option key={doc.id} value={doc.id}>
                            {doc.title}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              )}
            </div>
            
            {selectedCompareDocumentId && (
              <button 
                onClick={handleToggleAnnotationView}
                className="annotation-toggle-button"
              >
                Show {activeAnnotationView === 'master' ? 'Compare' : 'Main'} Annotations
              </button>
            )}
          </>
        )}
      </div>
    );
  };
  
  // Render compare document content
  const renderCompareContent = () => {
    if (!showCompareView || !selectedCompareDocumentId) {
      return null;
    }
    
    if (compareDocumentStatus === 'loading') {
      return <div className="loading-indicator">Loading compare document...</div>;
    }
    
    if (compareDocumentStatus === 'failed') {
      return (
        <div className="error-message">
          Error loading compare document: {compareDocumentError}
          <br />
          <button 
            onClick={() => {
              if (selectedCompareDocumentId) {
                dispatch(fetchComparisonDocumentElements(selectedCompareDocumentId));
              }
            }}
            className="retry-button"
          >
            Retry
          </button>
        </div>
      );
    }
    
    if (!compareDocumentElements || compareDocumentElements.length === 0) {
      return (
        <div className="warning-message">
          No content found for the comparison document.
        </div>
      );
    }
    
    return (
      <div className="compare-document-content">
        {compareDocument && (
          <h2 className="document-title">{compareDocument.title}</h2>
        )}
        {compareDocumentElements.map((content) => {
          const paragraphId = `CompareDocumentElements/${content.id}`;
          return (
            <div 
              key={content.id} 
              className="document-content"
              id={paragraphId}
            >
              <HighlightedText
                text={content.content.text}
                paragraphId={paragraphId}
                documentCollectionId={selectedCompareCollection || numericCollectionId}
                documentId={selectedCompareDocumentId}
              />
            </div>
          );
        })}
      </div>
    );
  };
  
  // MAIN RENDER
  
  // Loading/Error states
  if (mainDocumentStatus === 'loading' && mainDocumentElements.length === 0) {
    return <div className="loading-indicator">Loading document elements...</div>;
  }
  if (mainDocumentStatus === 'failed') {
    return (
      <div className="error-message">
        Error loading document: {mainDocumentError}
        <br />
        <button 
          onClick={() => dispatch(fetchDocumentElements(numericDocumentId))}
          className="retry-button"
        >
          Retry
        </button>
      </div>
    );
  }
  
  // Check if the redux store has the correct document ID
  const isCurrentDocumentLoaded = currentDocumentId === numericDocumentId;
  
  // Debug info
  console.log('Current document ID from params:', numericDocumentId);
  console.log('Current document ID from Redux:', currentDocumentId);
  console.log('Is current document loaded:', isCurrentDocumentLoaded);
  console.log('Elements count:', mainDocumentElements.length);
  console.log('Compare collection documents:', compareCollectionDocuments.length);
  console.log('Comparison document IDs:', comparisonDocumentIds);
  
  // If document is not loaded and not loading, show a message
  if (!isCurrentDocumentLoaded && mainDocumentStatus !== 'loading') {
    return (
      <div className="document-view-container">
        {renderDocumentSelector()}
        
        <div className="loading-indicator">
          Loading document elements for document ID: {numericDocumentId}...
        </div>
      </div>
    );
  }

  return (
    <div className="document-view-container">
      {renderDocumentSelector()}
      
      <div 
        className={`document-content-panel ${showCompareView ? 'with-compare-view' : ''}`}
      >
        <div className='document-columns-container'>
          <div className='document-content-container'>
            {currentDocument && (
              <h1 className="document-title">{currentDocument.title}</h1>
            )}
            
            {/* Only render elements if we're confident they're for the right document */}
            {isCurrentDocumentLoaded && mainDocumentElements.map((content) => {
              const paragraphId = `DocumentElements/${content.id}`;
              return (
                <div 
                  key={content.id} 
                  className={`document-content ${activeParagraphId === paragraphId ? 'active-paragraph' : ''}`}
                  id={paragraphId}
                >
                  <HighlightedText
                    text={content.content.text}
                    paragraphId={paragraphId}
                    documentCollectionId={numericCollectionId}
                    documentId={numericDocumentId}
                  />
                </div>
              );
            })}
            
            <MenuContext/>
          </div>
          
          {showCompareView && (
            <div className='compare-content-container'>
              {renderCompareContent()}
            </div>
          )}
        </div>
        
        <div className="sidebars-container">
          <AnnotationsSidebar
            collapsedComments={collapsedAnnotations}
            setCollapsedComments={setCollapsedAnnotations}
            hoveredAnnotations={
              activeAnnotationView === 'master' 
                ? hoveredScholarlyAnnotations 
                : compareHoveredScholarlyAnnotations
            }
            motivation='scholarly'
            position='left'
            documentId={
              activeAnnotationView === 'master' 
                ? numericDocumentId 
                : (selectedCompareDocumentId || numericDocumentId)
            }
          />
          <AnnotationsSidebar
            collapsedComments={collapsedComments}
            setCollapsedComments={setCollapsedComments}
            hoveredAnnotations={
              activeAnnotationView === 'master' 
                ? hoveredAnnotations 
                : compareHoveredAnnotations
            }
            motivation='commenting'
            position='right'
            documentId={
              activeAnnotationView === 'master' 
                ? numericDocumentId 
                : (selectedCompareDocumentId || numericDocumentId)
            }
          />
        </div>
      </div>
    </div>
  );
};

export default DocumentContentPanel;