// annotations.ts
import { createAnnotationSlice } from './factory/createAnnotationSlice';

// Create specific annotation slices
export const commentingAnnotations = createAnnotationSlice('commenting');
export const replyingAnnotations = createAnnotationSlice('replying');
export const scholarlyAnnotations = createAnnotationSlice('scholarly')
// You can add more buckets as needed