import React from 'react';
import { FaBook } from 'react-icons/fa';
import { Annotation } from "@documentView/types/annotation";
import PanelControls from './PanelControls';

export type PanelPosition = 'bottom' | 'right' | 'left';

export interface PanelHeaderProps {
  documents: Array<{
    id: number;
    title: string;
    color?: string;
  }>;
  annotations: Annotation[];
  activeTab: string;
  position: PanelPosition;
  onTabChange: (tab: string) => void;
  onChangePosition?: (position: PanelPosition) => void;
  onToggleVisibility?: () => void;
}

const PanelHeader: React.FC<PanelHeaderProps> = ({
  documents,
  annotations,
  activeTab,
  position,
  onTabChange,
  onChangePosition,
  onToggleVisibility
}) => {
  
  // Generate dynamic styles based on panel position
  const getHeaderStyles = () => {
    const baseStyles = {
      display: 'flex',
      padding: '8px',
      backgroundColor: '#f0f2f5',
      borderBottom: '1px solid #ddd',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
    };
    
    if (position === 'bottom') {
      return {
        ...baseStyles,
        flexDirection: 'row' as const,
        justifyContent: 'space-between',
        alignItems: 'center'
      };
    } else {
      return {
        ...baseStyles,
        flexDirection: 'column' as const,
        gap: '8px'
      };
    }
  };
  
  const getTabsContainerStyles = () => {
    const baseStyles = {
      display: 'flex',
      gap: '4px',
      overflow: 'auto'
    };
    
    if (position === 'bottom') {
      return {
        ...baseStyles,
        flexDirection: 'row' as const,
        flexWrap: 'nowrap' as const
      };
    } else {
      return {
        ...baseStyles,
        flexDirection: 'column' as const,
        width: '100%'
      };
    }
  };
  
  const getTabButtonStyles = (isActive: boolean) => {
    const baseStyles = {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      border: 'none',
      borderRadius: '4px',
      padding: position === 'bottom' ? '6px 12px' : '8px 10px',
      fontSize: '12px',
      fontWeight: isActive ? 600 : 400,
      color: isActive ? '#212529' : '#6c757d',
      backgroundColor: isActive ? '#e9ecef' : 'transparent',
      cursor: 'pointer'
    };
    
    if (position === 'bottom') {
      return {
        ...baseStyles,
        whiteSpace: 'nowrap' as const
      };
    } else {
      return {
        ...baseStyles,
        justifyContent: 'space-between',
        width: '100%',
        textAlign: 'left' as const
      };
    }
  };

  return (
    <div 
      className="tabs-header" 
      style={{
        ...getHeaderStyles(),
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div className="tabs-container" style={getTabsContainerStyles()}>
        {/* Document Tabs */}
        {documents.map(doc => {
          const docColor = doc.color || '#6c757d';
          const isActive = activeTab === `doc-${doc.id}`;
          
          return (
            <button
              key={`tab-doc-${doc.id}`}
              style={{
                ...getTabButtonStyles(isActive),
                borderLeft: `3px solid ${docColor}`
              }}
              onClick={() => onTabChange(`doc-${doc.id}`)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FaBook style={{ fontSize: '10px', color: docColor }} />
                <span>{doc.title}</span>
              </div>
              {/* Badge showing number of annotations for this document */}
              <span style={{ 
                backgroundColor: docColor,
                color: '#fff',
                borderRadius: '999px',
                padding: '2px 6px',
                fontSize: '10px'
              }}>
                {annotations.filter(a => a.document_id === doc.id).length}
              </span>
            </button>
          );
        })}
        
        {/* All Annotations Tab */}
        <button
          style={getTabButtonStyles(activeTab === 'all')}
          onClick={() => onTabChange('all')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>All Annotations</span>
          </div>
          <span style={{ 
            backgroundColor: '#eee',
            borderRadius: '999px',
            padding: '2px 6px',
            fontSize: '10px'
          }}>
            {annotations.length}
          </span>
        </button>
      </div>
      
      {/* Panel Controls */}
      {onChangePosition && (
        <PanelControls
          position={position}
          onChangePosition={onChangePosition}
          onToggleVisibility={onToggleVisibility}
        />
      )}
    </div>
  );
};

export default PanelHeader;