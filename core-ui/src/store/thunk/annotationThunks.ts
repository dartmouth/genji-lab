import { 
    commentingAnnotations, 
    replyingAnnotations, 
    scholarlyAnnotations 
  } from '../../slice/annotationSlices';

  import { 
    createFetchAnnotationsThunk, 
    createSaveAnnotationThunk 
  } from './factory/createAnnotationThunks';
  
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

  type ThunkMap = {
    [key: string]: {
      get: ReturnType<typeof createFetchAnnotationsThunk>;
      create: ReturnType<typeof createSaveAnnotationThunk>;
    }
  };

  export const thunkMap: ThunkMap = {
    'commenting' : {
      'get' : fetchCommentingAnnotations,
      'create': saveCommentingAnnotation
    },
    'replying': {
      'get': fetchReplyingAnnotations,
      'create': saveReplyingAnnotation
    },
    'scholarly': {
      'get': fetchScholarlyAnnotations,
      'create': saveScholarlyAnnotation
    }
  }

