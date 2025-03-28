import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface createAnnotation {
    selectedText: string;
    sourceURI: string[];
    start: number,
    end: number
}

const initialState: createAnnotation = {
    selectedText: "",
    sourceURI: [""],
    start: 0,
    end: 0
}

const createAnnotationSlice = createSlice({
    name: 'annotationCreate',
    initialState,
    reducers:{
        setSelectedText: (state, action: PayloadAction<createAnnotation>) => {
            return {
                ...state,
                ...action.payload
            };
        }
    }
})

export const { setSelectedText } = createAnnotationSlice.actions;

export default createAnnotationSlice.reducer