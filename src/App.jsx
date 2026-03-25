import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Pdv from './pages/Pdv';
import Estoque from './pages/Estoque';
import Configuracoes from './pages/Configuracoes';
import Relatorios from './pages/Relatorios'; // Importação do novo componente

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Painel Central - Rodhon System */}
        <Route path="/" element={<Home />} />
        
        {/* PDV / Vendas - Caldos da Tay */}
        <Route path="/vender" element={<Pdv />} />
        
        {/* Gestão de Estoque */}
        <Route path="/estoque" element={<Estoque />} />
        
        {/* Relatórios de Faturamento e PDF */}
        <Route path="/relatorios" element={<Relatorios />} />
        
        {/* Configurações de Chave Pix */}
        <Route path="/config-pix" element={<Configuracoes />} />

        {/* ROTA DE SEGURANÇA: 
            Qualquer caminho não reconhecido redireciona para a Home.
            Isso evita telas brancas no seu domínio personalizado.
        */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}