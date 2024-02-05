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
    {/* <Draggable>
      <div className='z-50 bg-[#000000bb] text-white rounded-lg w-fit p-3'>
        <h3 className='text-lg text-[#bcf124] font-medium'>
          I can be dragged anywhere
        </h3>
      </div>
    </Draggable> */}
  </>
)
