import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { RootState } from '../index';

// Updated interface for createAnnotation
interface createAnnotation {
    motivation: string,
    target: {
        selectedText: string;
        segments: Array<{
            sourceURI: string;
            start: number;
            end: number;
            text: string
        }>;
        documentCollectionId: number,
        documentId: number,
        isMultiParagraphSelection: boolean
    },
    content: string
}

// Update initial state
const initialState: createAnnotation = {
   motivation: "",
    target: { 
        selectedText: "",
        segments: [],
        documentCollectionId: 1,
        documentId: 1,
        isMultiParagraphSelection: false
    },
    content: ""
}

const createAnnotationSlice = createSlice({
    name: 'createAnnotation',
    initialState,
    reducers:{
        setTarget: (state, action: PayloadAction<createAnnotation['target']>) => {
            state.target = action.payload;
        },
        setMotivation: (state, action: PayloadAction<string>) => {
            state.motivation = action.payload;
        },
        setContent: (state, action: PayloadAction<string>) => {
            state.content = action.payload;
        },
        resetCreateAnnotation: () => {
            return initialState;
          },
        // Initialize a multi-paragraph selection
        initSelection: (state, action: PayloadAction<{
            documentCollectionId: number,
            documentId: number
        }>) => {
            state.target.segments = [];
            state.target.selectedText = "";
            state.target.documentCollectionId = action.payload.documentCollectionId;
            state.target.documentId = action.payload.documentId;
            // state.target.isMultiParagraphSelection = true;
        },
        // Add a segment to the selection
        addSelectionSegment: (state, action: PayloadAction<{
            sourceURI: string,
            start: number,
            end: number,
            text: string
        }>) => {
            // Check if this segment already exists
            // console.log('Current segments:', state.target.segments);
            const existingIndex = state.target.segments.findIndex(
                segment => segment.sourceURI === action.payload.sourceURI
            );
            
            if (existingIndex >= 0) {
                // Update existing segment
                state.target.segments[existingIndex] = {
                    sourceURI: action.payload.sourceURI,
                    start: action.payload.start,
                    end: action.payload.end,
                    text: action.payload.text
                };
            } else {
                // Add new segment
                state.target.segments.push({
                    sourceURI: action.payload.sourceURI,
                    start: action.payload.start,
                    end: action.payload.end,
                    text: action.payload.text
                });
            }
            
        },
    
        // Complete the multi-paragraph selection
        completeSelection: (state) => {
            // Sort segments by their sourceURI to ensure consistent ordering
            const sortedSegments = [...state.target.segments].sort((a, b) => 
            a.sourceURI.localeCompare(b.sourceURI)
            );
            
            // Combine all text from segments into one string
            state.target.selectedText = sortedSegments.reduce((combinedText, segment, index) => {
            // Add a space between segments if not the first segment
            const prefix = index === 0 ? '' : ' ';
            return combinedText + prefix + segment.text;
            }, '');
            
            // Mark the multi-paragraph selection as complete
            // This could be used to trigger UI changes or further processing
            state.target.isMultiParagraphSelection = false;
        },
        
        // Reset selection (keep existing reset action or enhance it)

        },
    
})

export const { 
    setContent, 
    setTarget, 
    setMotivation, 
    resetCreateAnnotation,
    initSelection,
    addSelectionSegment,
    completeSelection 
} = createAnnotationSlice.actions;

// Selector for the entire annotation state
export const selectAnnotationCreate = (state: RootState) => state.createAnnotation;

// Selector for the motivation
export const selectMotivation = (state: RootState) => state.createAnnotation.motivation;

export const selectSelectedText = (state: RootState) => state.createAnnotation.target.selectedText

// Selector for the content
export const selectTarget = (state: RootState) => state.createAnnotation.target;

export const selectTargetInfo = (state: RootState) => {
    const { motivation, target } = state.createAnnotation;
    return { motivation, target };
};

export const selectNewAnnotationContent = (state: RootState) => state.createAnnotation.content;

// New selectors for multi-paragraph functionality
export const selectIsMultiParagraphSelection = (state: RootState) => 
    state.createAnnotation.target.isMultiParagraphSelection;

export const selectSegments = (state: RootState) => 
    state.createAnnotation.target.segments;

// Get segment for a specific paragraph
export const selectSegmentForParagraph = (state: RootState, paragraphId: string) => 
    state.createAnnotation.target.segments.find(segment => 
        segment.sourceURI === paragraphId
    );


export default createAnnotationSlice.reducer