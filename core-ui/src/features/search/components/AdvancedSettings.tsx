import React, { useState, useEffect } from 'react';
import { SearchSettings } from '../types/query';
import { setSettingsState, RootState } from '@/store';
import { useDispatch, useSelector } from 'react-redux';
const styles = {
  container: {
    maxWidth: '100%',
    margin: '0 auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    // padding: '20px'
  } as React.CSSProperties,

  advancedSettings: {
    backgroundColor: '#ffffff',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    transition: 'box-shadow 0.2s ease-in-out'
  } as React.CSSProperties,

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    cursor: 'pointer',
    borderBottom: '1px solid #e9ecef',
    transition: 'background-color 0.2s ease-in-out'
  } as React.CSSProperties,

  headerHover: {
    backgroundColor: '#f8f9fa'
  } as React.CSSProperties,

  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#212529'
  } as React.CSSProperties,

  settingsIcon: {
    width: '20px',
    height: '20px',
    fill: '#007bff'
  } as React.CSSProperties,

  titleText: {
    fontSize: '16px',
    fontWeight: '500',
    margin: 0
  } as React.CSSProperties,

  chevronIcon: {
    width: '16px',
    height: '16px',
    fill: '#6c757d',
    transition: 'transform 0.2s ease-in-out'
  } as React.CSSProperties,

  chevronRotated: {
    transform: 'rotate(180deg)'
  } as React.CSSProperties,

  content: {
    padding: '20px',
    display: 'none'
  } as React.CSSProperties,

  contentExpanded: {
    display: 'block'
  } as React.CSSProperties,

  settingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '24px'
  } as React.CSSProperties,

  settingGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  } as React.CSSProperties,

  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#212529',
    marginBottom: '4px'
  } as React.CSSProperties,

  checkboxGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  } as React.CSSProperties,

  checkboxItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  } as React.CSSProperties,

  checkbox: {
    width: '16px',
    height: '16px',
    accentColor: '#007bff'
  } as React.CSSProperties,

  checkboxLabel: {
    fontSize: '14px',
    color: '#495057',
    cursor: 'pointer',
    textTransform: 'capitalize'
  } as React.CSSProperties,

  select: {
    padding: '8px 12px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '14px',
    color: '#495057',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    transition: 'border-color 0.2s ease-in-out'
  } as React.CSSProperties,

  selectFocus: {
    borderColor: '#007bff',
    outline: 'none'
  } as React.CSSProperties,

  numberInput: {
    padding: '8px 12px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '14px',
    color: '#495057',
    backgroundColor: '#ffffff',
    width: '100px',
    transition: 'border-color 0.2s ease-in-out'
  } as React.CSSProperties,

  numberInputFocus: {
    borderColor: '#007bff',
    outline: 'none'
  } as React.CSSProperties,

  resetButton: {
    backgroundColor: 'transparent',
    border: '1px solid #6c757d',
    borderRadius: '4px',
    padding: '8px 16px',
    fontSize: '14px',
    color: '#6c757d',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    alignSelf: 'flex-start'
  } as React.CSSProperties,

  resetButtonHover: {
    backgroundColor: '#6c757d',
    color: '#ffffff'
  } as React.CSSProperties,

  // Demo styles
  demoInfo: {
    backgroundColor: '#e3f2fd',
    border: '1px solid #bbdefb',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    fontSize: '14px',
    color: '#1565c0'
  } as React.CSSProperties,

  currentSettings: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '24px'
  } as React.CSSProperties,

  settingsTitle: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#212529',
    marginBottom: '12px'
  } as React.CSSProperties,

  settingsDisplay: {
    fontSize: '14px',
    color: '#495057',
    whiteSpace: 'pre-wrap'
  } as React.CSSProperties
};

interface AdvancedSearchProps{
  advanced: boolean | null
}
const AdvancedSettings: React.FC<AdvancedSearchProps> = (advanced) => {
  const dispatch = useDispatch()
  const [isExpanded, setIsExpanded] = useState(false);
  const [headerHovered, setHeaderHovered] = useState(false);
  const [resetHovered, setResetHovered] = useState(false);
  const settings = useSelector((state: RootState) => state.searchResults.settings)

  useEffect(() => {
    setIsExpanded(advanced.advanced === null ? false: advanced.advanced);
  }, [advanced]);
  
  const defaultSettings: SearchSettings = {
    searchTypes: ["documents", "comments", "annotations"],
    sortBy: "relevance",
    sortOrder: "desc",
    limit: 25
  };
  const onSettingsChange = (newSettings: SearchSettings) => {
    dispatch(setSettingsState(newSettings))
  }

  const handleSettingsChange = (newSettings: SearchSettings) => {
    onSettingsChange(newSettings);
  };

  const handleSearchTypeChange = (type: "documents" | "comments" | "annotations", checked: boolean) => {
    const newSearchTypes = checked 
      ? [...settings.searchTypes, type]
      : settings.searchTypes.filter(t => t !== type);
    
    const newSettings = { ...settings, searchTypes: newSearchTypes };
    handleSettingsChange(newSettings);
  };

  const handleSortByChange = (sortBy: string) => {
    const newSettings = { ...settings, sortBy };
    handleSettingsChange(newSettings);
  };

  const handleSortOrderChange = (sortOrder: "asc" | "desc") => {
    const newSettings = { ...settings, sortOrder };
    handleSettingsChange(newSettings);
  };

  const handleLimitChange = (limit: number) => {
    const newSettings = { ...settings, limit };
    handleSettingsChange(newSettings);
  };

  const handleReset = () => {
    handleSettingsChange(defaultSettings);
  };

  const SettingsIcon = () => (
    <svg style={styles.settingsIcon} viewBox="0 0 24 24">
      <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" />
    </svg>
  );

  const ChevronIcon = () => (
    <svg 
      style={{
        ...styles.chevronIcon,
        ...(isExpanded ? styles.chevronRotated : {})
      }} 
      viewBox="0 0 24 24"
    >
      <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" />
    </svg>
  );

  return (
    <div style={styles.container}>
      <div style={styles.advancedSettings}>
        {/* Header */}
        <div 
          style={{
            ...styles.header,
            ...(headerHovered ? styles.headerHover : {})
          }}
          onClick={() => setIsExpanded(!isExpanded)}
          onMouseEnter={() => setHeaderHovered(true)}
          onMouseLeave={() => setHeaderHovered(false)}
        >
          <div style={styles.headerTitle}>
            <SettingsIcon />
            <h3 style={styles.titleText}>Advanced Settings</h3>
          </div>
          <ChevronIcon />
        </div>

        {/* Content */}
        <div 
          style={{
            ...styles.content,
            ...(isExpanded ? styles.contentExpanded : {})
          }}
        >
          <div style={styles.settingsGrid}>
            {/* Search Types */}
            <div style={styles.settingGroup}>
              <label style={styles.label}>Search Types</label>
              <div style={styles.checkboxGroup}>
                {(["documents", "comments", "annotations"] as const).map((type) => (
                  <div key={type} style={styles.checkboxItem}>
                    <input
                      type="checkbox"
                      id={type}
                      style={styles.checkbox}
                      checked={settings.searchTypes.includes(type)}
                      onChange={(e) => handleSearchTypeChange(type, e.target.checked)}
                    />
                    <label 
                      htmlFor={type}
                      style={styles.checkboxLabel}
                    >
                      {type}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Sort By */}
            <div style={styles.settingGroup}>
              <label style={styles.label} htmlFor="sortBy">Sort By</label>
              <select
                id="sortBy"
                style={styles.select}
                value={settings.sortBy}
                onChange={(e) => handleSortByChange(e.target.value)}
                onFocus={(e) => {
                  (e.target as HTMLSelectElement).style.borderColor = '#007bff';
                }}
                onBlur={(e) => {
                  (e.target as HTMLSelectElement).style.borderColor = '#ced4da';
                }}
              >
                <option value="relevance">Relevance</option>
                <option value="date">Date</option>
              </select>
            </div>

            {/* Sort Order */}
            <div style={styles.settingGroup}>
              <label style={styles.label} htmlFor="sortOrder">Sort Order</label>
              <select
                id="sortOrder"
                style={styles.select}
                value={settings.sortOrder}
                onChange={(e) => handleSortOrderChange(e.target.value as "asc" | "desc")}
                onFocus={(e) => {
                  (e.target as HTMLSelectElement).style.borderColor = '#007bff';
                }}
                onBlur={(e) => {
                  (e.target as HTMLSelectElement).style.borderColor = '#ced4da';
                }}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>

            {/* Limit */}
            <div style={styles.settingGroup}>
              <label style={styles.label} htmlFor="limit">Results Limit</label>
              <input
                type="number"
                id="limit"
                style={styles.numberInput}
                value={settings.limit}
                min="1"
                max="100"
                onChange={(e) => handleLimitChange(parseInt(e.target.value) || 1)}
                onFocus={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = '#007bff';
                }}
                onBlur={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = '#ced4da';
                }}
              />
            </div>

            {/* Reset Button */}
            <div style={styles.settingGroup}>
              <button
                style={{
                  ...styles.resetButton,
                  ...(resetHovered ? styles.resetButtonHover : {})
                }}
                onClick={handleReset}
                onMouseEnter={() => setResetHovered(true)}
                onMouseLeave={() => setResetHovered(false)}
              >
                Reset to Default
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Current Settings Display */}
      {/* <div style={styles.currentSettings}>
        <div style={styles.settingsTitle}>Current Settings:</div>
        <div style={styles.settingsDisplay}>
          {JSON.stringify(settings, null, 2)}
        </div>
      </div> */}
    </div>
  );
};

export default AdvancedSettings;