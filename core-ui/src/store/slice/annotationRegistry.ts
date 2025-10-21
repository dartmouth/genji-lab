// annotationRegistry.ts
import { commentingAnnotations } from "./annotationSlices";
import { replyingAnnotations } from "./annotationSlices";
import { scholarlyAnnotations } from "./annotationSlices";
import { externalReferenceAnnotations } from "./annotationSlices";

export const annotationRegistry = {
  commenting: commentingAnnotations,
  replying: replyingAnnotations,
  scholarly: scholarlyAnnotations,
  external_reference: externalReferenceAnnotations,
};

export type AnnotationBucketName = keyof typeof annotationRegistry;
