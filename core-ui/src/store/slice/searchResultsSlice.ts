import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from '../index';
import { SearchResponse, SearchSettings } from "@/features/search/types/query";

interface SearchResultState {
    searchResults: SearchResponse,
    settings: SearchSettings
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
    },
    settings: {
        searchTypes: ["documents", "comments", "annotations"],
        sortBy: "relevance",
        sortOrder: "desc",
        limit: 50
    }
}

const searchResultSlice = createSlice({
    name: 'searchResults',
    initialState, 
    reducers: {
        setResults: (state, action: PayloadAction<SearchResponse>) =>{
            state.searchResults = action.payload
        },
        setSearchType: (state, action: PayloadAction<("documents" | "comments" | "annotations")[]>) =>{
            state.settings.searchTypes = action.payload
        },
        setSortBy: (state, action: PayloadAction<("relevance" | "date" | string)>) =>{
            state.settings.sortBy = action.payload
        },
        setSortOrder: (state, action: PayloadAction<("asc" | "desc")>) =>{
            state.settings.sortOrder = action.payload
        },
        setLimit:  (state, action: PayloadAction<number>) =>{
            state.settings.limit = action.payload
        },
        setSettingsState: (state, action: PayloadAction<SearchSettings>) => {
            state.settings = action.payload
        }
    }
})

export const {
    setResults,
    setSearchType,
    setSortBy,
    setSortOrder,
    setLimit,
    setSettingsState
} = searchResultSlice.actions;

export const selectSearchResults = (state: RootState) => state.searchResults

export default searchResultSlice.reducer