import { useState, useEffect } from 'react';
import { db } from '../firebase/config'; 
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Link } from 'react-router-dom';

// Importações ajustadas para evitar o erro "doc.autoTable is not a function" no Vite
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Relatorios() {
  const [caixas, setCaixas] = useState([]);
  const [caixaSelecionado, setCaixaSelecionado] = useState('');
  const [detalhesCaixa, setDetalhesCaixa] = useState(null);
  const [resumo, setResumo] = useState({
    totalGeral: 0,
    metodos: { dinheiro: 0, pix: 0, debito: 0, credito: 0 },
    produtos: {}
  });

  useEffect(() => {
    const buscarCaixas = async () => {
      const q = query(collection(db, "caixas"), orderBy("abertura", "desc"));
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
      const infoCaixa = caixas.find(c => c.id === caixaSelecionado);
      setDetalhesCaixa(infoCaixa);

      const q = query(collection(db, "vendas"), where("caixaId", "==", caixaSelecionado));
      const snap = await getDocs(q);
      
      let total = 0;
      let pgtos = { dinheiro: 0, pix: 0, debito: 0, credito: 0 };
      let prods = {};

      snap.forEach(doc => {
        const venda = doc.data();
        total += Number(venda.total || 0);
        
        const m = venda.pagamento?.toLowerCase().trim();
        if (m === 'dinheiro') pgtos.dinheiro += (venda.total || 0);
        else if (m === 'pix') pgtos.pix += (venda.total || 0);
        else if (m === 'debito' || m === 'débito') pgtos.debito += (venda.total || 0);
        else if (m === 'credito' || m === 'crédito') pgtos.credito += (venda.total || 0);

        venda.itens?.forEach(item => {
          const nome = item.nome?.toUpperCase();
          prods[nome] = (prods[nome] || 0) + (item.qtd || 0);
        });
      });

      setResumo({ totalGeral: total, metodos: pgtos, produtos: prods });
    };

    processarRelatorio();
  }, [caixaSelecionado, caixas]);

  // FUNÇÃO ATUALIZADA: Suporta String ISO e Timestamp do Firebase
  const formatarHora = (data) => {
    if (!data) return "--:--";
    try {
      // Se for Timestamp do Firebase (objeto com .seconds)
      if (data.seconds) {
        return new Date(data.seconds * 1000).toLocaleTimeString('pt-BR', { 
          hour: '2-digit', minute: '2-digit' 
        });
      }
      // Se for String ISO (ex: "2026-03-25T15:17:09.129Z")
      const d = new Date(data);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      }
      return "--:--";
    } catch (e) {
      return "--:--";
    }
  };

  const gerarPDF = () => {
    const doc = new jsPDF();
    const dataRef = detalhesCaixa?.data_abertura || new Date().toLocaleDateString('pt-BR');

    doc.setFontSize(20);
    doc.setTextColor(255, 102, 0);
    doc.text("CALDOS DA TAY - FECHAMENTO", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Data: ${dataRef} | Caixa ID: ${caixaSelecionado.substring(0,8)}`, 14, 30);
    doc.text(`Abertura: ${formatarHora(detalhesCaixa?.abertura)} | Fechamento: ${formatarHora(detalhesCaixa?.fechamento)}`, 14, 35);

    autoTable(doc, {
      startY: 45,
      head: [['FORMA DE PAGAMENTO', 'VALOR TOTAL']],
      body: [
        ['DINHEIRO', `R$ ${resumo.metodos.dinheiro.toFixed(2)}`],
        ['PIX', `R$ ${resumo.metodos.pix.toFixed(2)}`],
        ['CARTÃO DE DÉBITO', `R$ ${resumo.metodos.debito.toFixed(2)}`],
        ['CARTÃO DE CRÉDITO', `R$ ${resumo.metodos.credito.toFixed(2)}`],
        ['TOTAL DO TURNO', `R$ ${resumo.totalGeral.toFixed(2)}`],
      ],
      headStyles: { fillColor: [255, 102, 0] },
      styles: { fontStyle: 'bold' }
    });

    const itens = Object.entries(resumo.produtos)
      .sort((a,b) => b[1] - a[1])
      .map(([n, q]) => [n, q]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['PRODUTO', 'QUANTIDADE']],
      body: itens,
      headStyles: { fillColor: [50, 50, 50] }
    });

    doc.save(`Fechamento_${caixaSelecionado.substring(0,5)}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans max-w-lg mx-auto">
      <header className="flex justify-between items-center mb-6">
        <Link to="/" className="text-orange-500 font-black text-xs">⬅ VOLTAR</Link>
        <button onClick={gerarPDF} className="bg-green-600 text-white px-4 py-2 rounded-xl font-black text-xs shadow-md active:scale-95">
          COMPARTILHAR PDF 📄
        </button>
      </header>

      <div className="mb-4">
        <select 
          value={caixaSelecionado} 
          onChange={(e) => setCaixaSelecionado(e.target.value)}
          className="w-full p-3 rounded-2xl border-2 border-orange-100 font-bold text-gray-700"
        >
          {caixas.map(c => (
            <option key={c.id} value={c.id}>
              {c.data_abertura || 'Caixa'} - {c.id.substring(0,5)}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white p-4 rounded-3xl shadow-sm mb-4 border border-orange-100 flex justify-between">
        <div className="text-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase">Abertura</p>
          <p className="font-black text-gray-800">{formatarHora(detalhesCaixa?.abertura)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase">Fechamento</p>
          <p className="font-black text-gray-800">{formatarHora(detalhesCaixa?.fechamento)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="col-span-2 bg-orange-500 p-6 rounded-[2rem] text-white shadow-lg">
          <p className="text-xs font-bold uppercase opacity-80">Total Bruto</p>
          <p className="text-4xl font-black">R$ {resumo.totalGeral.toFixed(2)}</p>
        </div>
        
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-[9px] font-black text-gray-400 uppercase">💵 Dinheiro</p>
          <p className="text-lg font-black text-green-600">R$ {resumo.metodos.dinheiro.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-[9px] font-black text-gray-400 uppercase">💎 Pix</p>
          <p className="text-lg font-black text-blue-500">R$ {resumo.metodos.pix.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-[9px] font-black text-gray-400 uppercase">💳 Débito</p>
          <p className="text-lg font-black text-gray-700">R$ {resumo.metodos.debito.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-[9px] font-black text-gray-400 uppercase">💳 Crédito</p>
          <p className="text-lg font-black text-gray-700">R$ {resumo.metodos.credito.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
        <h3 className="text-center font-black uppercase text-gray-800 mb-4 border-b pb-2">Produtos Vendidos</h3>
        <div className="space-y-2">
          {Object.entries(resumo.produtos).map(([nome, qtd]) => (
            <div key={nome} className="flex justify-between items-center text-xs">
              <span className="font-bold text-gray-600">{nome}</span>
              <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded-lg font-black">{qtd} un</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}