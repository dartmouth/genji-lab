// hooks/useAnnotationTags.ts
import { useState } from 'react';
import { 
  useAppDispatch, 
  useAppSelector, 
  RootState, 
  taggingAnnotations 
} from '@store';
import { makeTextAnnotationBody, parseURI } from '@documentView/utils';
import { Annotation } from '@documentView/types';

export const useAnnotationTags = (annotation: Annotation, userId?: number) => {
  const dispatch = useAppDispatch();
  const [isTagging, setIsTagging] = useState(false);
  
  const tags = useAppSelector(
    (state: RootState) => taggingAnnotations.selectors.selectAnnotationsByParent(state, `Annotation/${annotation.id}`)
  );

  console.log('blah')
  const handleTagsClick = () => {
    setIsTagging(!isTagging);
  };

  const handleRemoveTag = (tagId: number | string) => {
    dispatch(taggingAnnotations.thunks.deleteAnnotation({'annotationId': tagId as unknown as number}));
  };

  const handleTagSubmit = (newTags: string[]) => {
    if (!userId) return;

    const deId = typeof annotation.document_element_id === "string"
      ? parseInt(parseURI(annotation.document_element_id))
      : annotation.document_element_id;

    newTags.forEach((tag) => {
      const tagAnno = makeTextAnnotationBody(
        annotation.document_collection_id,
        annotation.document_id,
        deId,
        userId,
        'tagging',
        `Annotation/${annotation.id}`,
        tag
      );
      
      dispatch(taggingAnnotations.thunks.saveAnnotation(tagAnno));
    });
    
    setIsTagging(false);
  };

  return {
    tags,
    isTagging,
    setIsTagging,
    handleTagsClick,
    handleRemoveTag,
    handleTagSubmit
  };
};