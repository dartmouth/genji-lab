// annotationRegistry.ts
import { commentingAnnotations } from './annotationSlices';
import { replyingAnnotations } from './annotationSlices';
import { scholarlyAnnotations } from './annotationSlices';

// The registry maps bucket names to their corresponding slice objects
export const annotationRegistry = {
  commenting: commentingAnnotations,
  replying: replyingAnnotations,
  scholarly: scholarlyAnnotations
  // Add more buckets as needed
};

// Type for the registry to ensure type safety
export type AnnotationBucketName = keyof typeof annotationRegistry;