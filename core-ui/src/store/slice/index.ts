export { 
    commentingAnnotations, 
    replyingAnnotations, 
    scholarlyAnnotations, 
    taggingAnnotations,
    sliceMap
} from './annotationSlices'
export {  
    registerHighlight, 
    updateHighlightPosition, 
    removeHighlight,
    setHoveredHighlights  
} from './highlightRegistrySlice' 

export {
    setContent, 
    setTarget, 
    setMotivation,
    resetCreateAnnotation,
    selectAnnotationCreate,
    selectSelectedText,
    selectTarget,
    selectTargetInfo,
    selectMotivation,
    selectNewAnnotationContent

} from './annotationCreate'

export {
    clearCollections,
    fetchDocumentCollections,
    selectAllDocumentCollections,
    selectDocumentCollectionsStatus,
    selectDocumentCollectionsError
} from './documentCollectionSlice'

export {
    clearDocuments,
    setSelectedCollectionId,
    fetchDocumentsByCollection,
    selectAllDocuments,
    selectDocumentsStatus,
    selectDocumentsError,
    selectSelectedCollectionId
} from './documentSlice'