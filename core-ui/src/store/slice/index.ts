export { 
    commentingAnnotations, 
    replyingAnnotations, 
    scholarlyAnnotations, 
    taggingAnnotations,
    upvoteAnnotations,
    sliceMap
} from './annotationSlices'
export {  
    registerHighlight, 
    updateHighlightPosition, 
    removeHighlight,
    setHoveredHighlights  
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

export type {DocumentCollectionCreate, Hierarchy, CollectionMetadata} from './documentCollectionSlice'


export {
    clearDocuments,
    setSelectedCollectionId,
    fetchDocumentsByCollection,
    selectAllDocuments,
    selectDocumentsStatus,
    selectDocumentsError,
    selectSelectedCollectionId
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
    selectAllDocumentElements,
    selectDocumentElementsStatus,
    selectDocumentElementsError,
    selectCurrentDocumentId
} from './documentElementsSlice'