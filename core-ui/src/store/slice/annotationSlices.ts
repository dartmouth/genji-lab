// slice/annotationSlices.ts
import {
  createAnnotationSlice,
  AnnotationSliceMap,
} from "./factory/createAnnotationSlice";

// Create specific annotation slices
export const commentingAnnotations = createAnnotationSlice("commenting");
export const replyingAnnotations = createAnnotationSlice("replying");
export const scholarlyAnnotations = createAnnotationSlice("scholarly");
export const taggingAnnotations = createAnnotationSlice("tagging");
export const upvoteAnnotations = createAnnotationSlice("upvoting");
export const flaggingAnnotations = createAnnotationSlice("flagging");
export const linkingAnnotations = createAnnotationSlice("linking");
export const externalReferenceAnnotations =
  createAnnotationSlice("external_reference");

export const sliceMap: AnnotationSliceMap = {
  commenting: commentingAnnotations,
  replying: replyingAnnotations,
  scholarly: scholarlyAnnotations,
  tagging: taggingAnnotations,
  upvoting: upvoteAnnotations,
  flagging: flaggingAnnotations,
  linking: linkingAnnotations,
  external_reference: externalReferenceAnnotations,
};
