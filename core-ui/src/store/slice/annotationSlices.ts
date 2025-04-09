// annotations.ts
import { createAnnotationSlice, AnnotationSliceMap } from './factory/createAnnotationSlice';

// Create specific annotation slices
export const commentingAnnotations = createAnnotationSlice('commenting');
export const replyingAnnotations = createAnnotationSlice('replying');
export const scholarlyAnnotations = createAnnotationSlice('scholarly');
export const taggingAnnotations = createAnnotationSlice('tagging')
export const upvoteAnnotations = createAnnotationSlice('upvoting')
// You can add more buckets as needed


export const sliceMap: AnnotationSliceMap = {
    "commenting": commentingAnnotations,
    "replying": replyingAnnotations,
    "scholarly": scholarlyAnnotations,
    "tagging": taggingAnnotations,
    "upvoting": upvoteAnnotations
}