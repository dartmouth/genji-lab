import { createSelector } from '@reduxjs/toolkit';
import { commentingAnnotations, scholarlyAnnotations, RootState } from '../index';

export const selectAllAnnotationsForParagraph = createSelector(
  [
    (state: RootState, paragraphId: string) => commentingAnnotations.selectors.selectAnnotationsByParent(state, paragraphId),
    (state: RootState, paragraphId: string) => scholarlyAnnotations.selectors.selectAnnotationsByParent(state, paragraphId)
  ],
  (comments, scholarly) => [...comments, ...scholarly]
);