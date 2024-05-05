import ReactDOM from 'react-dom/client'
import Viewer from './viewer.tsx'
import { Routes, Route, HashRouter as Router } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './index.css'

ReactDOM.createRoot(document.getElementById('app')!).render(
  <>
    <Router>
      <Routes>
        <Route path={`/`} element={<Viewer />} />
      </Routes>
    </Router>

    <Toaster />
  </>
)
