import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { RootState } from '../index';

interface createAnnotation {
    motivation: string,
    target: {
        selectedText: string;
        sourceURI: string[];
        documentCollectionId: number,
        documentId: number,
        start: number,
        end: number
    },
    content: string
}

const initialState: createAnnotation = {
   motivation: "",
    target: { 
    selectedText: "",
    sourceURI: [""],
    documentCollectionId: 1,
    documentId: 1,
    start: 0,
    end: 0
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
          }
    }
})

export const { setContent, setTarget, setMotivation, resetCreateAnnotation } = createAnnotationSlice.actions;

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



export default createAnnotationSlice.reducer