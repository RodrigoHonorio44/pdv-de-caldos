import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Pdv from './pages/Pdv';
import Estoque from './pages/Estoque';
import Configuracoes from './pages/Configuracoes';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota Principal */}
        <Route path="/" element={<Home />} />
        
        {/* Rota do PDV (Vendas) */}
        <Route path="/vender" element={<Pdv />} />
        
        {/* Rota do Estoque */}
        <Route path="/estoque" element={<Estoque />} />
        
        {/* Rota de Configuração do Pix */}
        <Route path="/config-pix" element={<Configuracoes />} />

        {/* ROTA DE SEGURANÇA: 
          Se o usuário der refresh em uma página que não existe ou digitar algo errado, 
          ele será redirecionado para a Home em vez de ver uma tela branca ou 404.
        */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}