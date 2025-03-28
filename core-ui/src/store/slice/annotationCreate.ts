import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface createAnnotation {
    selectedText: string;
    sourceURI: string;
}

const initialState: createAnnotation = {
    selectedText: "",
    sourceURI: ""
}

const createAnnotationSlice = createSlice({
    name: 'annotationCreate',
    initialState,
    reducers:{
        setSelectedText: (state, action: PayloadAction<createAnnotation>) => {
            state = action.payload
        }
    }
})

export default createAnnotationSlice.reducer