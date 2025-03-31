import { 
    commentingAnnotations, 
    replyingAnnotations, 
    scholarlyAnnotations,
    taggingAnnotations
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

  export const fetchTaggingAnnotations = createFetchAnnotationsThunk(
    'tagging',
    taggingAnnotations.actions
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
  
  export const saveTaggingAnnotation = createSaveAnnotationThunk(
    'tagging',
    taggingAnnotations.actions
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

  export const patchTaggingAnnotations = createPatchAnnotationThunk(
    'tagging',
    taggingAnnotations.actions
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
    },
    'tagging' : {
      'get' : fetchTaggingAnnotations,
      'create': saveTaggingAnnotation,
      'update': patchTaggingAnnotations
    }
  }

