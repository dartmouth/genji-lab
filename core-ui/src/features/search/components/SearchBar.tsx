import React, { useState, useEffect } from 'react';
import { Search, X, Filter, ChevronDown } from 'lucide-react';

// TypeScript interfaces
interface ParsedSearchTerm {
  type: 'term' | 'group';
  term?: string;
  group?: ParsedSearchTerm[];
  operator: 'AND' | 'OR' | null;
}

interface SearchQuery {
  query: string;
  parsedQuery: ParsedSearchTerm[];
  searchTypes: ('documents' | 'comments' | 'annotations')[];
  tags: string[];
  sortBy: 'relevance' | 'title' | 'created' | 'modified';
  sortOrder: 'asc' | 'desc';
  limit: number;
}

interface SearchBarProps {
  onSearchChange?: (searchQuery: SearchQuery) => void;
  placeholder?: string;
}

const AnnotationSearchBar: React.FC<SearchBarProps> = ({
  onSearchChange,
  placeholder = "Search annotations and documents..."
}) => {
  const [searchQuery, setSearchQuery] = useState<SearchQuery>({
    query: '',
    parsedQuery: [],
    searchTypes: ['documents'], // Default to documents only
    tags: [],
    sortBy: 'relevance',
    sortOrder: 'desc',
    limit: 50
  });

  const [showFilters, setShowFilters] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [showSearchTypeDropdown, setShowSearchTypeDropdown] = useState(false);

  // Parse search query for AND/OR operations with parentheses support
  const parseSearchQuery = (query: string): ParsedSearchTerm[] => {
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
    const parseTokens = (tokens: string[], startIndex = 0): { result: ParsedSearchTerm[], endIndex: number } => {
      const result: ParsedSearchTerm[] = [];
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
      console.log(error)
      // Fallback to simple parsing if complex parsing fails
      return parseSimpleQuery(query);
    }
  };
  
  // Fallback simple parsing (original implementation)
  const parseSimpleQuery = (query: string): ParsedSearchTerm[] => {
    const tokens = query.split(/\s+(AND|OR)\s+/i);
    const parsed: ParsedSearchTerm[] = [];
    
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
          operator: parsed.length === 0 ? null : operator || 'AND'
        });
      }
    }
    
    return parsed;
  };

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onSearchChange) {
        onSearchChange(searchQuery);
      }
      console.log('Search Query JSON:', JSON.stringify(searchQuery, null, 2));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, onSearchChange]);

  const handleQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = event.target.value;
    const parsedQuery = parseSearchQuery(newQuery);
    
    setSearchQuery(prev => ({
      ...prev,
      query: newQuery,
      parsedQuery: parsedQuery
    }));
  };

  // const handleSearchTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
  //   setSearchQuery(prev => ({
  //     ...prev,
  //     searchType: event.target.value as 'annotations' | 'documents' | 'both'
  //   }));
  // };

  const toggleSearchType = (type: 'documents' | 'comments' | 'annotations') => {
    setSearchQuery(prev => {
      const currentTypes = prev.searchTypes;
      const isSelected = currentTypes.includes(type);
      
      if (isSelected && currentTypes.length === 1) {
        // Don't allow deselecting the last option
        return prev;
      }
      
      const newTypes = isSelected
        ? currentTypes.filter(t => t !== type)
        : [...currentTypes, type];
      
      return {
        ...prev,
        searchTypes: newTypes
      };
    });
  };

  const getSearchTypeDisplayText = () => {
    const typeLabels = {
      'documents': 'Documents',
      'comments': 'Comments', 
      'annotations': 'Scholarly Annotations'
    };
    
    if (searchQuery.searchTypes.length === 3) {
      return 'All Types';
    } else if (searchQuery.searchTypes.length === 1) {
      return typeLabels[searchQuery.searchTypes[0]];
    } else {
      return `${searchQuery.searchTypes.length} Types`;
    }
  };

  // const toggleTag = (tag: string) => {
  //   setSearchQuery(prev => ({
  //     ...prev,
  //     tags: prev.tags.includes(tag) 
  //       ? prev.tags.filter(t => t !== tag)
  //       : [...prev.tags, tag]
  //   }));
  // };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !searchQuery.tags.includes(trimmedTag)) {
      setSearchQuery(prev => ({
        ...prev,
        tags: [...prev.tags, trimmedTag]
      }));
    }
    setTagInput('');
  };

  const handleTagInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addTag(tagInput);
    } else if (event.key === ',' || event.key === ';') {
      event.preventDefault();
      addTag(tagInput);
    } else if (event.key === 'Backspace' && tagInput === '' && searchQuery.tags.length > 0) {
      // Remove last tag if input is empty and backspace is pressed
      setSearchQuery(prev => ({
        ...prev,
        tags: prev.tags.slice(0, -1)
      }));
    }
  };

  const removeTag = (tag: string) => {
    setSearchQuery(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleSortByChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSearchQuery(prev => ({
      ...prev,
      sortBy: event.target.value as 'relevance' | 'title' | 'created' | 'modified'
    }));
  };

  const handleSortOrderChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSearchQuery(prev => ({
      ...prev,
      sortOrder: event.target.value as 'asc' | 'desc'
    }));
  };

  const handleLimitChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSearchQuery(prev => ({
      ...prev,
      limit: Number(event.target.value)
    }));
  };

  const clearSearch = () => {
    setSearchQuery({
      query: '',
      parsedQuery: [],
      searchTypes: ['documents'], // Reset to default
      tags: [],
      sortBy: 'relevance',
      sortOrder: 'desc',
      limit: 50
    });
    setTagInput('');
  };

  const hasActiveFilters = searchQuery.tags.length > 0 || 
                          !searchQuery.searchTypes.includes('documents') || 
                          searchQuery.searchTypes.length !== 1 ||
                          searchQuery.sortBy !== 'relevance';

  // Render parsed query visualization
  const renderParsedQuery = (items: ParsedSearchTerm[]): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    
    items.forEach((item, index) => {
      // Add operator before this item (except for the first item)
      if (item.operator) {
        elements.push(
          <span key={`op-${index}`} className="px-2 py-1 bg-blue-600 text-white text-xs rounded font-semibold">
            {item.operator}
          </span>
        );
      }
      
      if (item.type === 'term') {
        elements.push(
          <span key={`term-${index}`} className="px-3 py-1 bg-white border border-blue-300 text-blue-800 text-sm rounded">
            "{item.term}"
          </span>
        );
      } else if (item.type === 'group') {
        elements.push(
          <div key={`group-${index}`} className="flex items-center gap-1 px-2 py-1 bg-purple-100 border border-purple-300 rounded-lg">
            <span className="text-purple-600 font-bold">(</span>
            {renderParsedQuery(item.group || [])}
            <span className="text-purple-600 font-bold">)</span>
          </div>
        );
      }
    });
    
    return elements;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 mb-4">
      {/* Main search input */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder={placeholder}
          value={searchQuery.query}
          onChange={handleQueryChange}
        />
        {searchQuery.query && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button
              onClick={clearSearch}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Parsed query visualization */}
      {searchQuery.parsedQuery.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm font-medium text-blue-800 mb-2">Search Logic:</div>
          <div className="flex flex-wrap items-center gap-2">
            {renderParsedQuery(searchQuery.parsedQuery)}
          </div>
          <div className="text-xs text-blue-600 mt-2">
            💡 Use parentheses for grouping: <code>(python OR java) AND "machine learning"</code>. Quote phrases with spaces.
          </div>
        </div>
      )}

      {/* Quick filters row */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Search in:</label>
          <div className="relative">
            <button
              onClick={() => setShowSearchTypeDropdown(!showSearchTypeDropdown)}
              className="flex items-center gap-2 px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <span>{getSearchTypeDisplayText()}</span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>
            {showSearchTypeDropdown && (
              <div className="absolute z-10 mt-1 bg-white border border-gray-300 rounded-md shadow-lg min-w-[200px]">
                <div className="p-2">
                  <label className="flex items-center px-2 py-1 hover:bg-gray-50 cursor-pointer rounded">
                    <input
                      type="checkbox"
                      checked={searchQuery.searchTypes.includes('documents')}
                      onChange={() => toggleSearchType('documents')}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm">Documents</span>
                  </label>
                  <label className="flex items-center px-2 py-1 hover:bg-gray-50 cursor-pointer rounded">
                    <input
                      type="checkbox"
                      checked={searchQuery.searchTypes.includes('comments')}
                      onChange={() => toggleSearchType('comments')}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm">Comments</span>
                  </label>
                  <label className="flex items-center px-2 py-1 hover:bg-gray-50 cursor-pointer rounded">
                    <input
                      type="checkbox"
                      checked={searchQuery.searchTypes.includes('annotations')}
                      onChange={() => toggleSearchType('annotations')}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={searchQuery.searchTypes.length === 1 && searchQuery.searchTypes.includes('annotations')}
                    />
                    <span className="text-sm">Scholarly Annotations</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-1 rounded-md border text-sm ${
            hasActiveFilters 
              ? 'border-blue-500 text-blue-700 bg-blue-50' 
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
              {searchQuery.tags.length}
            </span>
          )}
        </button>
      </div>

      {/* Selected search types display */}
      {searchQuery.searchTypes.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {searchQuery.searchTypes.map(type => {
            const typeLabels = {
              'documents': 'Documents',
              'comments': 'Comments', 
              'annotations': 'Scholarly Annotations'
            };
            return (
              <span key={type} className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                {typeLabels[type]}
                <button 
                  onClick={() => toggleSearchType(type)} 
                  className="text-green-600 hover:text-green-800"
                  disabled={searchQuery.searchTypes.length === 1}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Selected filters display */}
      {searchQuery.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {searchQuery.tags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
              {tag}
              <button onClick={() => removeTag(tag)} className="text-blue-600 hover:text-blue-800">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Advanced filters (collapsible) */}
      {showFilters && (
        <div className="border-t border-gray-200 pt-4 space-y-4">
          {/* Tags input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
            <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-md bg-gray-50 min-h-[2.5rem]">
              {searchQuery.tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="text-blue-600 hover:text-blue-800">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                placeholder={searchQuery.tags.length === 0 ? "Type tags and press Enter..." : "Add more tags..."}
                className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm placeholder-gray-500"
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Press Enter, comma, or semicolon to add a tag. Backspace to remove the last tag.
            </div>
          </div>

          {/* Sorting and limits */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={searchQuery.sortBy}
                onChange={handleSortByChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="relevance">Relevance</option>
                <option value="title">Title</option>
                <option value="created">Created</option>
                <option value="modified">Modified</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
              <select
                value={searchQuery.sortOrder}
                onChange={handleSortOrderChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Limit</label>
              <select
                value={searchQuery.limit}
                onChange={handleLimitChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Debug output for prototype */}
      {/* <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Current Search Query JSON:
        </h3>
        <pre className="text-xs font-mono text-gray-600 whitespace-pre-wrap max-h-48 overflow-auto">
          {JSON.stringify(searchQuery, null, 2)}
        </pre>
      </div> */}
    </div>
  );
};

export default AnnotationSearchBar;