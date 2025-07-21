import React, { useState } from "react";
import '../styles/SimpleSearchStyles.css'
import axios, {AxiosInstance} from "axios";

// TypeScript interface for parsed search terms
interface ParsedQueryItem {
  type: "term" | "group" | string;
  term: string | null;
  group: ParsedQueryItem[] | null;
  operator: "AND" | "OR" | null;
}

interface Query {
  query: string;
  parsedQuery: ParsedQueryItem[];
  searchTypes: ("documents" | "elements" | "comments"| "annotations")[];
  tags: string[];
  sortBy: "relevance" | "date" | string;
  sortOrder: "asc" | "desc";
  limit: number;
}

interface SearchResult {
  id: number;
  content: string;
  motivation: "commenting" | "scholarly" | null;
  source: string;
  type: "annotation" | "element" | string;
  relevance_score: number;
}

interface SearchResponse {
  query: Query;
  total_results: number;
  results: SearchResult[];
}

const SimpleSearchBar: React.FC = () => {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);

  const api: AxiosInstance = axios.create({
    baseURL: '/api/v1',
    timeout: 10000,
  });

  // Function to create the API query structure
  const createQueryStructure = (searchQuery: string): Query => {
    return {
      query: searchQuery,
      parsedQuery: parseSearchQuery(searchQuery),
      searchTypes: ["documents", "elements", "comments", "annotations"],
      tags: [],
      sortBy: "relevance",
      sortOrder: "desc",
      limit: 50
    };
  };

  // Main parsing function - handles AND/OR operations with parentheses support
  const parseSearchQuery = (query: string): ParsedQueryItem[] => {
    if (!query.trim()) return [];
    
    // Tokenize the input, preserving parentheses and operators
    const tokenize = (input: string): string[] => {
      const tokens: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < input.length; i++) {
        const char = input[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
          current += char;
        } else if (!inQuotes && (char === '(' || char === ')')) {
          if (current.trim()) {
            tokens.push(current.trim());
            current = '';
          }
          tokens.push(char);
        } else if (!inQuotes && /\s/.test(char)) {
          if (current.trim()) {
            tokens.push(current.trim());
            current = '';
          }
        } else {
          current += char;
        }
      }
      
      if (current.trim()) {
        tokens.push(current.trim());
      }
      
      return tokens;
    };
    
    // Parse tokens into a structured format
    const parseTokens = (tokens: string[], startIndex = 0): { result: ParsedQueryItem[], endIndex: number } => {
      const result: ParsedQueryItem[] = [];
      let i = startIndex;
      
      while (i < tokens.length) {
        const token = tokens[i];
        
        if (token === ')') {
          // End of group
          return { result, endIndex: i };
        } else if (token === '(') {
          // Start of group
          const groupResult = parseTokens(tokens, i + 1);
          const operator = result.length === 0 ? null : getOperatorBefore(tokens, i) || 'AND';
          
          result.push({
            type: 'group',
            term: null,
            group: groupResult.result,
            operator
          });
          
          i = groupResult.endIndex + 1; // Skip past the closing parenthesis
        } else if (token.toUpperCase() === 'AND' || token.toUpperCase() === 'OR') {
          // Skip operators, they're handled when processing the next term
          i++;
        } else {
          // Regular search term
          const operator = result.length === 0 ? null : getOperatorBefore(tokens, i) || 'AND';
          
          // Remove quotes if present
          const cleanTerm = token.replace(/^"(.*)"$/, '$1');
          
          result.push({
            type: 'term',
            term: cleanTerm,
            group: null,
            operator
          });
          
          i++;
        }
      }
      
      return { result, endIndex: i };
    };
    
    // Helper function to get the operator before a given position
    const getOperatorBefore = (tokens: string[], position: number): 'AND' | 'OR' | null => {
      for (let i = position - 1; i >= 0; i--) {
        const token = tokens[i].toUpperCase();
        if (token === 'AND' || token === 'OR') {
          return token as 'AND' | 'OR';
        }
        if (token !== '(' && token !== ')') {
          break;
        }
      }
      return null;
    };
    
    try {
      const tokens = tokenize(query);
      const parsed = parseTokens(tokens);
      return parsed.result;
    } catch (error) {
      console.log(error);
      // Fallback to simple parsing if complex parsing fails
      return parseSimpleQuery(query);
    }
  };

  // Fallback simple parsing (original implementation)
  const parseSimpleQuery = (query: string): ParsedQueryItem[] => {
    const tokens = query.split(/\s+(AND|OR)\s+/i);
    const parsed: ParsedQueryItem[] = [];
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i].trim();
      if (!token) continue;
      
      if (token.toUpperCase() === 'AND' || token.toUpperCase() === 'OR') {
        continue;
      } else {
        const prevToken = i > 0 ? tokens[i - 1] : null;
        const operator = prevToken && (prevToken.toUpperCase() === 'AND' || prevToken.toUpperCase() === 'OR') 
          ? prevToken.toUpperCase() as 'AND' | 'OR'
          : null;
        
        parsed.push({
          type: 'term',
          term: token.replace(/^"(.*)"$/, '$1'),
          group: null,
          operator: parsed.length === 0 ? null : operator || 'AND'
        });
      }
    }
    
    return parsed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const queryStructure = createQueryStructure(query);
    console.log('Query structure:', queryStructure);
    
    try {
      const response = await api.post('/search/', queryStructure);
      setResult(response.data);
      console.log('Search results:', result);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const onAdvancedSearch = () => {
    console.log('Advanced search clicked - placeholder functionality');
  };

  return (
    <div className="search-bar-container">
      <form onSubmit={handleSubmit} className="search-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className="search-input"
        />
        <button type="submit" className="search-submit-button">
          Search
        </button>
        <button
          type="button"
          onClick={onAdvancedSearch}
          className="advanced-search-button"
        >
          Advanced
        </button>
      </form>
    </div>
  );
};

export default SimpleSearchBar;