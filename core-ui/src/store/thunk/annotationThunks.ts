import { 
    commentingAnnotations, 
    replyingAnnotations, 
    scholarlyAnnotations 
  } from '../slice/annotationSlices';

  import { 
    createFetchAnnotationsThunk, 
    createSaveAnnotationThunk,
    createPatchAnnotationThunk
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
  
  // patch thunks
  export const patchCommentingAnnotations = createPatchAnnotationThunk(
    'commenting',
    commentingAnnotations.actions
  )
  export const patchReplyingAnnotations = createPatchAnnotationThunk(
    'replying',
    commentingAnnotations.actions
  )
  export const patchScholarlyAnnotations = createPatchAnnotationThunk(
    'scholarly',
    commentingAnnotations.actions
  )
  type ThunkMap = {
    [key: string]: {
      get: ReturnType<typeof createFetchAnnotationsThunk>;
      create: ReturnType<typeof createSaveAnnotationThunk>;
      update: ReturnType<typeof createPatchAnnotationThunk>;
    }
  };

  export const thunkMap: ThunkMap = {
    'commenting' : {
      'get' : fetchCommentingAnnotations,
      'create': saveCommentingAnnotation,
      'update': patchCommentingAnnotations
    },
    'replying': {
      'get': fetchReplyingAnnotations,
      'create': saveReplyingAnnotation,
      'update': patchReplyingAnnotations
    },
    'scholarly': {
      'get': fetchScholarlyAnnotations,
      'create': saveScholarlyAnnotation,
      'update': patchScholarlyAnnotations
    }
  }

