import { createSelector } from '@reduxjs/toolkit';
import { commentingAnnotations, scholarlyAnnotations, RootState } from './index';
// import { scholarlyAnnotations } from './index';
// import { RootState } from './path/to/store';

export const selectAllAnnotationsForParagraph = createSelector(
  [
    (state: RootState, paragraphId: string) => commentingAnnotations.selectors.selectAnnotationsByDocumentElement(state, paragraphId),
    (state: RootState, paragraphId: string) => scholarlyAnnotations.selectors.selectAnnotationsByDocumentElement(state, paragraphId)
  ],
  (comments, scholarly) => [...comments, ...scholarly]
);