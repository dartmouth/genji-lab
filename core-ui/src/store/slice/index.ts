// store/slice/index.ts

export {      
    commentingAnnotations,      
    replyingAnnotations,      
    scholarlyAnnotations,      
    taggingAnnotations,     
    upvoteAnnotations,     
    sliceMap,     
    linkingAnnotations 
} from './annotationSlices'

export {       
    registerHighlight,      
    updateHighlightPosition,      
    removeHighlight,     
    setHoveredHighlights,     
    selectHoveredHighlightIds 
} from './highlightRegistrySlice'   


export * from './annotationCreate'  

export {
    createDocumentCollection,
    updateDocumentCollection,
    fetchDocumentCollections,
    selectAllDocumentCollections,
    selectDocumentCollectionsStatus,
    selectDocumentCollectionsError
} from './documentCollectionSlice'


export {     
    createDocumentCollection,     
    clearCollections,     
    fetchDocumentCollections,     
    selectAllDocumentCollections,     
    selectDocumentCollectionsStatus,     
    selectDocumentCollectionsError 
} from './documentCollectionSlice'  

export type {
    DocumentCollectionCreate, 
    Hierarchy, 
    CollectionMetadata
} from './documentCollectionSlice'   


export {
    createDocument,
    updateDocument,
    clearDocuments,
    clearAllDocuments,
    setSelectedCollectionId,     
    fetchDocumentsByCollection,
    fetchAllDocuments,
    fetchAllDocumentsByCollections,
    addToAllDocuments,
    selectAllDocuments,
    selectCollectionDocuments,     
    selectDocumentsStatus,
    selectAllDocumentsStatus,     
    selectDocumentsError,     
    selectSelectedCollectionId,
    selectDocumentById
} from './documentSlice'  


export {     
    setActiveParagraph,     
    clearActiveParagraph,     
    selectActiveParagraphId 
} from './documentNavigationSlice'  

export {     
    fetchDocumentElements,     
    clearElements,     
    setCurrentDocumentId,     
    selectElementsByDocumentId,     
    selectDocumentStatusById,     
    selectDocumentErrorById,     
    selectCurrentDocumentId
} from './documentElementsSlice'

export type {DocumentCreate, DocumentUpdate} from './documentSlice'



// Navigation highlight exports
export {
    fetchDocumentElements,
    clearElements,
    setCurrentDocumentId,
    selectElementsByDocumentId,
    selectDocumentStatusById,
    selectDocumentErrorById,
    selectCurrentDocumentId,
    // Legacy selectors for backward compatibility
    // selectAllDocumentElements,
    // selectDocumentElementsStatus,
    // selectDocumentElementsError
} from './documentElementsSlice'

export * from './searchResultsSlice'

    startNavigationSession,
    addNavigationHighlight,
    removeNavigationHighlight,
    clearNavigationSession,
    clearAllNavigationHighlights,
    selectIsElementHighlighted,
    selectHighlightType,
    selectNavigationHighlights,
    selectCurrentNavigationSession
} from './navigationHighlightSlice';

export { default as navigationHighlightReducer } from './navigationHighlightSlice';

