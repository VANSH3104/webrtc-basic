import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./components/room";
import { Sender } from "./components/sender";
import { Receiver } from "./components/receivers";
import {Room} from "./components/streaming";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sender" element={<Sender />} />
        <Route path="/receiver" element={<Receiver />} />
        <Route path="/room/:meetingCode" element={<Room />} />
      </Routes>
    </Router>
  );
};

export default App;
