import React, { useState } from 'react';
import { SearchResult } from "../types/query";
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import AdvancedSettings from './AdvancedSettings';
import { useLocation } from 'react-router-dom';

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  } as React.CSSProperties,
  
  searchHeader: {
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '24px',
    border: '1px solid #e9ecef'
  } as React.CSSProperties,
  
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
    color: '#212529'
  } as React.CSSProperties,
  
  searchIcon: {
    width: '24px',
    height: '24px',
    fill: '#007bff'
  } as React.CSSProperties,
  
  queryText: {
    fontSize: '24px',
    fontWeight: '500',
    margin: '0 0 8px 0',
    color: '#212529'
  } as React.CSSProperties,
  
  resultsCount: {
    fontSize: '14px',
    color: '#6c757d',
    margin: '0 0 16px 0'
  } as React.CSSProperties,
  
  divider: {
    height: '1px',
    backgroundColor: '#dee2e6',
    border: 'none',
    margin: '16px 0'
  } as React.CSSProperties,
  
  queryDetails: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '24px',
    alignItems: 'flex-start'
  } as React.CSSProperties,
  
  detailItem: {
    minWidth: '120px'
  } as React.CSSProperties,
  
  detailLabel: {
    fontSize: '12px',
    color: '#6c757d',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
    display: 'block'
  } as React.CSSProperties,
  
  detailValue: {
    fontSize: '14px',
    color: '#212529',
    fontWeight: '500'
  } as React.CSSProperties,
  
  resultCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    transition: 'box-shadow 0.2s ease-in-out'
  } as React.CSSProperties,
  
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  } as React.CSSProperties,
  
  typeSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  } as React.CSSProperties,
  
  typeIcon: {
    width: '16px',
    height: '16px',
    fill: '#6c757d'
  } as React.CSSProperties,
  
  typeText: {
    fontSize: '14px',
    color: '#6c757d',
    fontWeight: '500'
  } as React.CSSProperties,
  
  chip: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #e9ecef',
    borderRadius: '16px',
    padding: '4px 12px',
    fontSize: '12px',
    color: '#495057',
    fontWeight: '500'
  } as React.CSSProperties,
  
  relevanceText: {
    fontSize: '12px',
    color: '#6c757d'
  } as React.CSSProperties,
  
  content: {
    fontSize: '16px',
    lineHeight: '1.6',
    color: '#212529',
    marginBottom: '16px'
  } as React.CSSProperties,
  
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  } as React.CSSProperties,
  
  sourceText: {
    fontSize: '12px',
    color: '#6c757d'
  } as React.CSSProperties,
  
  button: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#007bff',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'background-color 0.2s'
  } as React.CSSProperties,
  
  noResults: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#6c757d',
    fontSize: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef'
  } as React.CSSProperties
};

// Result Card Component
interface ResultCardProps {
  result: SearchResult;
}

const ResultCard: React.FC<ResultCardProps> = ({ result }) => {
  const [expanded, setExpanded] = useState(false);
  const maxLength = 200;
  const shouldTruncate = result.content.length > maxLength;

  const displayContent = expanded || !shouldTruncate 
    ? result.content 
    : result.content.substring(0, maxLength) + '...';

  const getTypeIcon = (type: string) => {
    const iconProps = { style: styles.typeIcon };
    
    switch (type.toLowerCase()) {
      case 'document':
        return (
          <svg {...iconProps} viewBox="0 0 24 24">
            <path d="M6,2A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6Z" />
          </svg>
        );
      case 'element':
        return (
          <svg {...iconProps} viewBox="0 0 24 24">
            <path d="M5,5H19V7H5V5M5,9H19V11H5V9M5,13H19V15H5V13M3,17H15V19H3V17M17,17V14L22,18.5L17,23V20H15V17H17Z" />
          </svg>
        );
      case 'comment':
        return (
          <svg {...iconProps} viewBox="0 0 24 24">
            <path d="M9,22A1,1 0 0,1 8,21V18H4A2,2 0 0,1 2,16V4C2,2.89 2.9,2 4,2H20A2,2 0 0,1 22,4V16A2,2 0 0,1 20,18H13.9L10.2,21.71C10,21.9 9.75,22 9.5,22V22H9Z" />
          </svg>
        );
      case 'annotation':
        return (
          <svg {...iconProps} viewBox="0 0 24 24">
            <path d="M17,3H7A2,2 0 0,0 5,5V21L12,18L19,21V5C19,3.89 18.1,3 17,3Z" />
          </svg>
        );
      default:
        return (
          <svg {...iconProps} viewBox="0 0 24 24">
            <path d="M6,2A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6Z" />
          </svg>
        );
    }
  };

  const formatRelevanceScore = (score: number) => {
    return (score * 100).toFixed(1) + '%';
  };

  return (
    <div 
      style={styles.resultCard}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
      }}
    >
      {/* Header */}
      <div style={styles.cardHeader}>
        <div style={styles.typeSection}>
          {getTypeIcon(result.type)}
          <span style={styles.typeText}>
            {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
          </span>
          <span style={styles.chip}>
            ID: {result.id}
          </span>
        </div>
        <span style={styles.relevanceText}>
          Relevance: {formatRelevanceScore(result.relevance_score)}
        </span>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {displayContent}
      </div>

      {/* Footer */}
      <div style={styles.cardFooter}>
        <span style={styles.sourceText}>
          Source: {result.source}
        </span>
        {shouldTruncate && (
          <button
            style={styles.button}
            onClick={() => setExpanded(!expanded)}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#f8f9fa';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            }}
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
    </div>
  );
};


const SearchResultsContainer: React.FC= () => {
  const searchData = useSelector((state: RootState) => state.searchResults.searchResults)
  const { query, total_results, results } = searchData;
  const location = useLocation();
  const advanced = location.state?.advanced ?? false;

  const formatSearchTypes = (types: string[]) => {
    return types.map(type => type.charAt(0).toUpperCase() + type.slice(1)).join(', ');
  };

  const SearchIcon = () => (
    <svg style={styles.searchIcon} viewBox="0 0 24 24">
      <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
    </svg>
  );

  return (
    <div style={styles.container}>
      {/* Search Header */}
      <div style={styles.searchHeader}>
        <div style={styles.headerTitle}>
          <SearchIcon />
          <h1 style={{ fontSize: '24px', fontWeight: '500', margin: 0 }}>
            Search Results
          </h1>
        </div>
        
        <div>
          <h2 style={styles.queryText}>
            "{query.query}"
          </h2>
          <p style={styles.resultsCount}>
            {total_results} result{total_results !== 1 ? 's' : ''} found
          </p>
        </div>

        <hr style={styles.divider} />

        {/* Query Details */}
        <div style={styles.queryDetails}>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Search Types</span>
            <div style={styles.detailValue}>
              {formatSearchTypes(query.searchTypes)}
            </div>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Sort By</span>
            <div style={styles.detailValue}>
              {query.sortBy.charAt(0).toUpperCase() + query.sortBy.slice(1)} ({query.sortOrder})
            </div>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Limit</span>
            <div style={styles.detailValue}>
              {query.limit} results
            </div>
          </div>
        </div>
      </div>
      <AdvancedSettings advanced={advanced}></AdvancedSettings>
      <hr style={styles.divider} />
      {/* Results */}
      <div>
        {results.length > 0 ? (
          results.map((result) => (
            <ResultCard key={result.id} result={result} />
          ))
        ) : (
          <div style={styles.noResults}>
            <p>No results found for your search query.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// // Main App Component
// const SearchResultsApp: React.FC = () => {
//   return <SearchResultsContainer searchData={sampleData} />;
// };

export default SearchResultsContainer;