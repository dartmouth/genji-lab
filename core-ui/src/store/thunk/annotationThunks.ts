import { 
    commentingAnnotations, 
    replyingAnnotations, 
    scholarlyAnnotations,
    taggingAnnotations
  } from '../slice/annotationSlices';

  import { 
    createFetchAnnotationsThunk, 
    createSaveAnnotationThunk,
    createPatchAnnotationThunk,
    createDeleteAnnotationThunk
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

  // patch thunks
  export const deleteCommentingAnnotations = createDeleteAnnotationThunk(
    'commenting',
    commentingAnnotations.actions
  )
  export const deleteReplyingAnnotations = createDeleteAnnotationThunk(
    'replying',
    commentingAnnotations.actions
  )
  export const deleteScholarlyAnnotations = createDeleteAnnotationThunk(
    'scholarly',
    commentingAnnotations.actions
  )

  export const deleteTaggingAnnotations = createDeleteAnnotationThunk(
    'tagging',
    taggingAnnotations.actions
  )

  type ThunkMap = {
    [key: string]: {
      get: ReturnType<typeof createFetchAnnotationsThunk>;
      create: ReturnType<typeof createSaveAnnotationThunk>;
      update: ReturnType<typeof createPatchAnnotationThunk>;
      delete: ReturnType<typeof createDeleteAnnotationThunk>
    }
  };

  export const thunkMap: ThunkMap = {
    'commenting' : {
      'get' : fetchCommentingAnnotations,
      'create': saveCommentingAnnotation,
      'update': patchCommentingAnnotations,
      'delete': deleteCommentingAnnotations
    },
    'replying': {
      'get': fetchReplyingAnnotations,
      'create': saveReplyingAnnotation,
      'update': patchReplyingAnnotations,
      'delete': deleteReplyingAnnotations
    },
    'scholarly': {
      'get': fetchScholarlyAnnotations,
      'create': saveScholarlyAnnotation,
      'update': patchScholarlyAnnotations,
      'delete': deleteScholarlyAnnotations
    },
    'tagging' : {
      'get' : fetchTaggingAnnotations,
      'create': saveTaggingAnnotation,
      'update': patchTaggingAnnotations,
      'delete': deleteTaggingAnnotations
    }
  }

