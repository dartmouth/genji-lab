import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from '../index';
import { SearchResponse } from "@/features/search/types/query";

interface SearchResultState {
    searchResults: SearchResponse
}

const initialState: SearchResultState = {
    searchResults: {
        query: {
            query: '',
            parsedQuery: [],
            searchTypes: [],
            tags: [],
            sortBy: 'relevance',
            sortOrder: 'desc',
            limit: 50
        },
        total_results: 0,
        results: []
    }
}

const searchResultSlice = createSlice({
    name: 'searchResults',
    initialState, 
    reducers: {
        setResults: (state, action: PayloadAction<SearchResponse>) =>{
            state.searchResults = action.payload
        }
    }
})

export const {
    setResults
} = searchResultSlice.actions;

export const selectSearchResults = (state: RootState) => state.searchResults

export default searchResultSlice.reducer