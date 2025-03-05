// import { useState } from 'react'
// import reactLogo from './assets/react.svg'     
import './App.css'
import DocumentContentPanel from './DocumentContentPanel'
import AnnotationPanel from './AnnotationPanel'

function App() {
  // const [count, setCount] = useState(0)

  return (
    <>
    <div>
      <h1>Tale of Genji</h1>
    </div>
    <div className='document-panel'> 
    <DocumentContentPanel documentID='1' />
    <AnnotationPanel someSortOFID='1' />
    </div>
    </>
  )
}

export default App
