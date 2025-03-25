// // annotationSlice.ts
// import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
// import { Annotation } from '../types/annotation';
// import type { RootState } from './index';

// interface AnnotationState {
//   byId: Record<string, Annotation>;
//   byDocumentElement: Record<string, string[]>;
// }

// const initialState: AnnotationState = {
//   byId: {},
//   byDocumentElement: {}
// }

// const annotationsSlice = createSlice({
//   name: 'annotations',
//   initialState,
//   reducers: {
//     addAnnotations(state, action: PayloadAction<Annotation[]>) {
//       action.payload.forEach(annotation => {
//         // Add to primary index
//         state.byId[annotation.id] = annotation;
        
//         // Extract document element ID from target
//         annotation.target.forEach(target => {
//           const documentElementId = target.source;
//           if (documentElementId) {
//             // Initialize array if needed
//             if (!state.byDocumentElement[documentElementId]) {
//               state.byDocumentElement[documentElementId] = [];
//             }
//             // Add reference to annotation ID (avoid duplicates)
//             if (!state.byDocumentElement[documentElementId].includes(annotation.id)) {
//               state.byDocumentElement[documentElementId].push(annotation.id);
//             }
//           }
//         });
//       });
//     },
    
//     // Optional: Add a single annotation
//     addAnnotation(state, action: PayloadAction<Annotation>) {
//       const annotation = action.payload;
      
//       // Add to primary index
//       state.byId[annotation.id] = annotation;
      
//       // Extract document element ID from target
//       annotation.target.forEach(target => {
//         const documentElementId = target.source;
//         if (documentElementId) {
//           // Initialize array if needed
//           if (!state.byDocumentElement[documentElementId]) {
//             state.byDocumentElement[documentElementId] = [];
//           }
//           // Add reference to annotation ID (avoid duplicates)
//           if (!state.byDocumentElement[documentElementId].includes(annotation.id)) {
//             state.byDocumentElement[documentElementId].push(annotation.id);
//           }
//         }
//       });
//     }
//   }
// });

// // Export actions
// export const { addAnnotations, addAnnotation } = annotationsSlice.actions;

// // Export selectors
// export const selectAnnotationById = (state: RootState, id: string) => 
//   state.annotations.byId[id];

// export const selectAnnotationsById = (state: RootState, ids: string[]) => 
//     ids.map(key => state.annotations.byId[key])

// export const selectAnnotationsByDocumentElement = (state: RootState, documentElementId: string) => {
//   const annotationIds = state.annotations.byDocumentElement[documentElementId] || [];
//   return annotationIds.map(id => state.annotations.byId[id]);
// };

// export const makeSelectAnnotationsById = () => 
//     createSelector(
//       [(state: RootState) => state.annotations.byId, (_: RootState, ids: string[]) => ids],
//       (byId, ids) => ids.map(key => byId[key])
//     );

// // Export reducer
// export default annotationsSlice.reducer;