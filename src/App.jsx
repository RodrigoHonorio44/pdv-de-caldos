import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Pdv from './pages/Pdv';
import Estoque from './pages/Estoque';
import Configuracoes from './pages/Configuracoes'; // Importando a nova página

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/vender" element={<Pdv />} />
        <Route path="/estoque" element={<Estoque />} />
        
        {/* Nova rota para gerenciar sua chave Pix */}
        <Route path="/config-pix" element={<Configuracoes />} />
      </Routes>
    </BrowserRouter>
  );
}