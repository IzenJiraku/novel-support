import { HashRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import Library from './pages/Library'
import WorkShell from './pages/WorkShell'
import Editor from './pages/Editor'
import Pieces from './pages/Pieces'
import { WorkProvider } from './workContext'

function WorkRoute() {
  const { id } = useParams()
  return (
    <WorkProvider key={id} id={id!} fallback={<div className="loading">読み込んでいます…</div>}>
      <Routes>
        <Route path="write/:cid" element={<Editor />} />
        <Route path=":tab" element={<WorkShell />} />
        <Route path="*" element={<Navigate to="overview" replace />} />
      </Routes>
    </WorkProvider>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Library />} />
        <Route path="/pieces" element={<Pieces />} />
        <Route path="/w/:id/*" element={<WorkRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
