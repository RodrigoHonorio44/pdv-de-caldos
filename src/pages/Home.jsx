import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans text-center">
      {/* Logotipo / Header */}
      <header className="mb-12 animate-in fade-in zoom-in duration-700">
        <div className="w-28 h-28 bg-orange-500 rounded-[2.5rem] mx-auto mb-6 flex items-center justify-center shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-300">
          <span className="text-6xl drop-shadow-md">🥣</span>
        </div>
        <h1 className="text-5xl font-black text-gray-900 uppercase tracking-tighter leading-none">
          Caldos da Tay
        </h1>
        <div className="flex items-center justify-center gap-2 mt-3">
          <span className="h-[2px] w-8 bg-orange-500"></span>
          <p className="text-gray-400 font-bold tracking-[0.3em] text-[10px] uppercase">
            Maricá • RJ
          </p>
          <span className="h-[2px] w-8 bg-orange-500"></span>
        </div>
      </header>

      {/* Menu de Navegação */}
      <nav className="w-full max-w-sm space-y-4">
        {/* Botão Vender */}
        <Link 
          to="/vender" 
          className="flex items-center justify-between bg-orange-500 hover:bg-orange-600 text-white p-8 rounded-[2rem] shadow-xl hover:shadow-orange-200 active:scale-95 transition-all group border-b-8 border-orange-700"
        >
          <div className="text-left">
            <span className="block text-3xl font-black uppercase leading-none">Vender</span>
            <span className="text-sm font-medium opacity-80 uppercase tracking-wider">Abrir Caixa</span>
          </div>
          <span className="text-4xl group-hover:translate-x-2 transition-transform">🚀</span>
        </Link>

        {/* Botão Relatórios - NOVO */}
        <Link 
          to="/relatorios" 
          className="flex items-center justify-between bg-green-600 hover:bg-green-700 text-white p-6 rounded-[2rem] shadow-lg active:scale-95 transition-all group border-b-8 border-green-800"
        >
          <div className="text-left">
            <span className="block text-2xl font-black uppercase leading-none italic">Relatórios</span>
            <span className="text-[10px] font-bold opacity-80 uppercase tracking-wider italic">Vendas e Faturamento</span>
          </div>
          <span className="text-3xl group-hover:scale-110 transition-transform">📊</span>
        </Link>

        {/* Botão Estoque */}
        <Link 
          to="/estoque" 
          className="flex items-center justify-between bg-white hover:bg-gray-50 text-gray-800 p-6 rounded-[2rem] shadow-lg active:scale-95 transition-all group border-b-8 border-gray-200"
        >
          <div className="text-left">
            <span className="block text-xl font-black uppercase leading-none">Estoque</span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Gestão de Insumos</span>
          </div>
          <span className="text-3xl opacity-50 group-hover:rotate-12 transition-transform">📦</span>
        </Link>

        {/* Botão Configuração Pix */}
        <Link 
          to="/config-pix" 
          className="flex items-center justify-between bg-blue-500 hover:bg-blue-600 text-white p-5 rounded-[2rem] shadow-lg active:scale-95 transition-all group border-b-8 border-blue-700"
        >
          <div className="text-left">
            <span className="block text-lg font-black uppercase leading-none italic">Config. Pix</span>
            <span className="text-[10px] font-bold opacity-80 uppercase tracking-wider italic">Ajustar Chave do QR Code</span>
          </div>
          <span className="text-2xl group-hover:scale-110 transition-transform">💎</span>
        </Link>

        {/* Rodapé Interno */}
        <div className="pt-10 space-y-1">
          <p className="text-gray-300 text-[9px] uppercase font-black tracking-widest">
            Rodhon System v2.0
          </p>
          <p className="text-gray-200 text-[8px] font-medium italic">
            Desenvolvido por Rodrigo Honório
          </p>
        </div>
      </nav>
    </div>
  );
}