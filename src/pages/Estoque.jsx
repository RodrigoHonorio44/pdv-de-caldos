import React from 'react';
import { Link } from 'react-router-dom';

export default function Estoque() {
  // Exemplo simples, depois conectamos ao Firebase para ser real
  const itensEstoque = [
    { nome: "Ervilha", qtd: 20 },
    { nome: "Feijão", qtd: 15 },
    { nome: "Mocotó", qtd: 10 }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <header className="flex justify-between items-center mb-8">
        <Link to="/" className="bg-white p-3 rounded-xl shadow-sm border font-bold">← Voltar</Link>
        <h1 className="text-2xl font-black uppercase">Estoque</h1>
      </header>

      <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-800 text-white uppercase text-xs">
            <tr>
              <th className="p-4">Produto</th>
              <th className="p-4">Quantidade</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {itensEstoque.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="p-4 font-bold">{item.nome}</td>
                <td className="p-4 text-orange-500 font-black">{item.qtd} un</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}