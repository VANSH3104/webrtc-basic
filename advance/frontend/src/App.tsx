import './App.css'
import { Route, BrowserRouter, Routes } from 'react-router-dom'
import { Sender } from './components/sender'
import { Receiver } from './components/receivers'
import { Room } from './components/room'
import { Stream } from './components/streaming'
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/sender" element={<Sender />} />
        <Route path="/receiver" element={<Receiver />} />
        <Route path='/room' element={<Room/>} />
        <Route path ='/stream' element={<Stream/>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App