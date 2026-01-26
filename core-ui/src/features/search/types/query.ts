
export interface ParsedQueryItem {
  type: "term" | "group" | string;
  term: string | null;
  group: ParsedQueryItem[] | null;
  operator: "AND" | "OR" | null;
}

export interface Query {
  query: string;
  parsedQuery: ParsedQueryItem[];
  searchTypes: ("documents" | "comments"| "annotations")[];
  tags: string[];
  sortBy: "relevance" | "date" | string;
  sortOrder: "asc" | "desc";
  limit: number;
}

export interface SearchResult {
  annotation_id: number;
  element_id: number;
  document_id: number;
  collection_id: number;
  content: string;
  document_title: string;
  collection_title: string;
  type: "annotation" | "element" | string;
  source: string;
  motivation: "commenting" | "scholarly" | null;
  created: string; // ISO date string
  relevance_score: number;
}

export interface SearchResponse {
  query: Query;
  total_results: number;
  results: SearchResult[];
}

export interface SearchSettings {
    searchTypes: ("documents" | "comments"| "annotations")[];
    sortBy: "relevance" | "date" | string;
    sortOrder: "asc" | "desc";
    limit: number;
}