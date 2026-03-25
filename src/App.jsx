import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home'; // Se ainda não criou, me avisa!
import Pdv from './pages/Pdv';
import Estoque from './pages/Estoque';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/vender" element={<Pdv />} />
        <Route path="/estoque" element={<Estoque />} />
      </Routes>
    </BrowserRouter>
  );
}