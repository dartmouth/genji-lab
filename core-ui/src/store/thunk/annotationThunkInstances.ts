// src/store/annotationThunkInstances.ts
import { 
    commentingAnnotations, 
    replyingAnnotations, 
    scholarlyAnnotations 
  } from '../annotations';
  import { 
    createFetchAnnotationsThunk, 
    createSaveAnnotationThunk 
  } from './annotationThunks';
  
  // Create fetch thunks for each annotation type
  export const fetchCommentingAnnotations = createFetchAnnotationsThunk(
    'commenting',
    commentingAnnotations.actions
  );
  
  export const fetchReplyingAnnotations = createFetchAnnotationsThunk(
    'replying',
    replyingAnnotations.actions
  );
  
  export const fetchScholarlyAnnotations = createFetchAnnotationsThunk(
    'scholarly',
    scholarlyAnnotations.actions
  );
  
  // Create save thunks for each annotation type
  export const saveCommentingAnnotation = createSaveAnnotationThunk(
    'commenting',
    commentingAnnotations.actions
  );
  
  export const saveReplyingAnnotation = createSaveAnnotationThunk(
    'replying',
    replyingAnnotations.actions
  );
  
  export const saveScholarlyAnnotation = createSaveAnnotationThunk(
    'scholarly',
    scholarlyAnnotations.actions
  );