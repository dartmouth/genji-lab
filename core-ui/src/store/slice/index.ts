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
    clearDocuments,
    clearAllDocuments, // 🎯 NEW
    setSelectedCollectionId,     
    fetchDocumentsByCollection,
    fetchAllDocuments, // 🎯 NEW
    fetchAllDocumentsByCollections, // 🎯 NEW
    addToAllDocuments, // 🎯 NEW
    selectAllDocuments,
    selectCollectionDocuments, // 🎯 NEW     
    selectDocumentsStatus,
    selectAllDocumentsStatus, // 🎯 NEW     
    selectDocumentsError,     
    selectSelectedCollectionId,
    selectDocumentById // 🎯 NEW
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
    selectCurrentDocumentId,     
    // Legacy selectors for backward compatibility     
    // selectAllDocumentElements,     
    // selectDocumentElementsStatus,     
    // selectDocumentElementsError 
} from './documentElementsSlice'