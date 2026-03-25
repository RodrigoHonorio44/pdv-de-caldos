import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function Relatorios() {
  const [vendas, setVendas] = useState([]);
  const [caixas, setCaixas] = useState([]);
  const [caixaSelecionado, setCaixaSelecionado] = useState('');
  const [resumo, setResumo] = useState({
    totalGeral: 0,
    metodos: { dinheiro: 0, pix: 0, debito: 0, credito: 0 },
    produtos: {}
  });

  useEffect(() => {
    const buscarCaixas = async () => {
      const q = query(collection(db, "caixas"), orderBy("abertura", "desc"), where("status", "==", "fechado"));
      const snap = await getDocs(q);
      const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCaixas(lista);
      if (lista.length > 0) setCaixaSelecionado(lista[0].id);
    };
    buscarCaixas();
  }, []);

  useEffect(() => {
    if (!caixaSelecionado) return;
    const processarRelatorio = async () => {
      const q = query(collection(db, "vendas"), where("caixaId", "==", caixaSelecionado));
      const snap = await getDocs(q);
      let total = 0;
      let pgtos = { dinheiro: 0, pix: 0, debito: 0, credito: 0 };
      let prods = {};
      snap.forEach(doc => {
        const venda = doc.data();
        total += venda.total;
        pgtos[venda.pagamento] = (pgtos[venda.pagamento] || 0) + venda.total;
        venda.itens.forEach(item => {
          prods[item.nome] = (prods[item.nome] || 0) + item.qtd;
        });
      });
      setResumo({ totalGeral: total, metodos: pgtos, produtos: prods });
    };
    processarRelatorio();
  }, [caixaSelecionado]);

  // --- FUNÇÃO PARA GERAR O PDF ---
  const gerarPDF = () => {
    const doc = new jsPDF();
    const dataAtual = new Date().toLocaleDateString('pt-BR');

    // Cabeçalho
    doc.setFontSize(22);
    doc.setTextColor(255, 102, 0); // Laranja Caldos da Tay
    doc.text("CALDOS DA TAY - RELATÓRIO", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Data de Emissão: ${dataAtual}`, 14, 30);
    doc.text(`ID do Caixa: ${caixaSelecionado}`, 14, 35);

    // Tabela de Resumo Financeiro
    doc.autoTable({
      startY: 45,
      head: [['MÉTODO', 'VALOR (R$)']],
      body: [
        ['DINHEIRO', `R$ ${resumo.metodos.dinheiro.toFixed(2)}`],
        ['PIX', `R$ ${resumo.metodos.pix.toFixed(2)}`],
        ['DÉBITO', `R$ ${resumo.metodos.debito.toFixed(2)}`],
        ['CRÉDITO', `R$ ${resumo.metodos.credito.toFixed(2)}`],
        ['TOTAL GERAL', `R$ ${resumo.totalGeral.toFixed(2)}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [255, 102, 0] },
      styles: { fontStyle: 'bold' }
    });

    // Tabela de Produtos
    const itensTabela = Object.entries(resumo.produtos).map(([nome, qtd]) => [nome, qtd]);
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 15,
      head: [['PRODUTO VENDIDO', 'QUANTIDADE']],
      body: itensTabela,
      theme: 'striped',
      headStyles: { fillColor: [50, 50, 50] }
    });

    // Salvar o arquivo
    doc.save(`Relatorio_Caldos_Tay_${caixaSelecionado.substring(0,5)}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans pb-10">
      <header className="mb-6 flex flex-col gap-4">
        <Link to="/pdv" className="text-orange-500 font-black text-sm italic">⬅ VOLTAR AO PDV</Link>
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-black uppercase italic tracking-tighter">Relatórios</h1>
            <button 
                onClick={gerarPDF}
                className="bg-green-600 text-white px-4 py-2 rounded-xl font-black text-[10px] shadow-lg animate-bounce"
            >
                GERAR PDF 📄
            </button>
        </div>
      </header>

      {/* Seletor */}
      <div className="bg-white p-4 rounded-3xl shadow-sm mb-6 border-2 border-orange-100">
        <label className="text-[10px] font-black text-gray-400 uppercase">Selecione o Turno:</label>
        <select 
          value={caixaSelecionado} 
          onChange={(e) => setCaixaSelecionado(e.target.value)}
          className="w-full bg-transparent font-bold text-gray-700 outline-none p-2"
        >
          {caixas.map(c => (
            <option key={c.id} value={c.id}>{c.data_abertura} - Ref: {c.id.substring(0,5)}</option>
          ))}
        </select>
      </div>

      {/* Grid de Totais */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-orange-500 text-white p-5 rounded-[2rem] shadow-xl col-span-2">
          <span className="text-xs font-bold uppercase opacity-80 italic tracking-widest">Total Geral Bruto</span>
          <div className="text-4xl font-black italic tracking-tighter">R$ {resumo.totalGeral.toFixed(2)}</div>
        </div>
        <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-gray-400 uppercase">💎 PIX</span>
          <div className="text-lg font-black text-blue-600 italic">R$ {resumo.metodos.pix.toFixed(2)}</div>
        </div>
        <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-gray-400 uppercase">💵 Dinheiro</span>
          <div className="text-lg font-black text-green-600 italic">R$ {resumo.metodos.dinheiro.toFixed(2)}</div>
        </div>
      </div>

      {/* Ranking de Produtos */}
      <div className="bg-white rounded-[2.5rem] p-6 shadow-2xl border border-gray-50">
        <h2 className="text-sm font-black uppercase italic mb-4 text-gray-800 border-b-2 border-orange-100 pb-2">Itens Vendidos</h2>
        <div className="space-y-2">
          {Object.entries(resumo.produtos).sort((a,b) => b[1] - a[1]).map(([nome, qtd]) => (
            <div key={nome} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <span className="font-bold text-gray-700 text-xs uppercase">{nome}</span>
              <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-lg font-black text-xs">{qtd} un</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}