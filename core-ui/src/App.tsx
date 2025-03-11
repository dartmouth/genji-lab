// App.tsx or your main component
import React from 'react';
import DocumentContentPanel from './components/DocumentContentPanel';
import './App.css';
const App: React.FC = () => {


  return (
    <div className="app">
      <DocumentContentPanel documentID={1}/>
    </div>
  );
};

export default App;