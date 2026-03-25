import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase/config';
import { collection, doc, setDoc, updateDoc, deleteDoc, increment, writeBatch, onSnapshot } from 'firebase/firestore';
import { Toaster, toast } from 'sonner';

export default function Estoque() {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  const [novoNome, setNovoNome] = useState('');
  const [novoPreco, setNovoPreco] = useState('');
  const [tipo, setTipo] = useState('bebida');

  const normalizarID = (texto) => {
    return texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^\w-]+/g, '');
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "estoque"), (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItens(lista);
      setCarregando(false);
    });
    return () => unsubscribe();
  }, []);

  const cadastrarProduto = async (e) => {
    e.preventDefault();
    if (!novoNome) return toast.warning("Digite o nome!");
    if (!novoPreco) return toast.warning("Defina um preço!");
    
    const idFormatado = normalizarID(novoNome);

    try {
      await setDoc(doc(db, "estoque", idFormatado), {
        nome: novoNome.toLowerCase(), // Padronização para minúsculas
        preco: Number(novoPreco),
        quantidade_total: 0,
        quantidade_venda: 0,
        tipo: tipo,
        esgotado: false 
      });
      toast.success(`Cadastrado: ${idFormatado}`);
      setNovoNome('');
      setNovoPreco('');
    } catch (e) { toast.error("Erro ao cadastrar"); }
  };

  const alternarStatusCaldo = async (id, statusAtual) => {
    try {
      const novoStatus = !statusAtual;
      await updateDoc(doc(db, "estoque", id), { esgotado: novoStatus });
      toast.info(novoStatus ? "Caldo Pausado" : "Caldo Liberado");
    } catch (e) { 
      toast.error("Erro ao atualizar status"); 
    }
  };

  const adicionarAoCentral = async (id, qtd) => {
    const valor = Number(qtd);
    if (!valor || valor <= 0) return toast.error("Valor inválido!");
    try {
      await updateDoc(doc(db, "estoque", id), { quantidade_total: increment(valor) });
      toast.success("Estoque central atualizado!");
      document.getElementById(`central-${id}`).value = '';
    } catch (e) { toast.error("Erro ao atualizar"); }
  };

  const levarParaTrabalho = async (id, qtd, totalAtual) => {
    const valor = Number(qtd);
    if (valor > totalAtual) return toast.error("Estoque insuficiente no central!");
    try {
      await updateDoc(doc(db, "estoque", id), {
        quantidade_total: increment(-valor),
        quantidade_venda: increment(valor)
      });
      toast.success(`Movido ${valor} un para a rua!`);
      document.getElementById(`input-${id}`).value = '';
    } catch (e) { toast.error("Erro na movimentação"); }
  };

  const finalizarDia = async () => {
    if (!window.confirm("Devolver sobras das BEBIDAS para o estoque central?")) return;
    const batch = writeBatch(db);
    itens.forEach((item) => {
      if (item.tipo !== 'caldo' && item.quantidade_venda > 0) {
        batch.update(doc(db, "estoque", item.id), {
          quantidade_total: increment(item.quantidade_venda),
          quantidade_venda: 0
        });
      }
    });
    try {
      await batch.commit();
      toast.success("Sobras devolvidas!");
    } catch (e) { toast.error("Erro ao finalizar"); }
  };

  const excluirProduto = async (id) => {
    if (!window.confirm("Excluir este produto?")) return;
    try {
      await deleteDoc(doc(db, "estoque", id));
      toast.success("Removido!");
    } catch (e) { toast.error("Erro ao excluir"); }
  };

  // Separação de dados
  const caldos = itens.filter(i => i.tipo === 'caldo');
  const outrosItens = itens.filter(i => i.tipo !== 'caldo');

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans pb-24">
      <Toaster position="top-center" richColors />
      
      <header className="flex justify-between items-center mb-6 max-w-5xl mx-auto">
        <Link to="/" className="bg-white px-4 py-2 rounded-xl text-orange-500 font-black text-[10px] uppercase shadow-sm border border-orange-100 italic tracking-tighter">⬅ VOLTAR</Link>
        <button onClick={finalizarDia} className="bg-gray-800 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-md active:scale-95 transition-transform">
          Finalizar Turno 🔄
        </button>
      </header>

      {/* Cadastro */}
      <div className="max-w-5xl mx-auto bg-white p-6 rounded-[2.5rem] shadow-xl shadow-gray-200/50 mb-10 border-2 border-orange-50">
        <h2 className="text-[9px] font-black text-gray-400 uppercase mb-4 tracking-widest px-2 italic">Novo Registro</h2>
        <form onSubmit={cadastrarProduto} className="flex flex-col md:flex-row gap-3">
          <input 
            type="text" 
            placeholder="NOME DO PRODUTO" 
            className="flex-grow bg-gray-50 p-4 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-orange-500 uppercase text-sm"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
          />
          <input 
            type="number" 
            placeholder="R$ PREÇO" 
            className="w-full md:w-32 bg-gray-50 p-4 rounded-2xl font-black text-orange-600 outline-none border-2 border-transparent focus:border-orange-500"
            value={novoPreco}
            onChange={(e) => setNovoPreco(e.target.value)}
          />
          <select className="bg-gray-100 p-4 rounded-2xl font-black text-[10px] uppercase outline-none text-gray-600 border-2 border-transparent focus:border-orange-500" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="bebida">🥤 Bebida</option>
            <option value="caldo">🥣 Caldo</option>
            <option value="descartavel">📦 Descartável</option>
          </select>
          <button type="submit" className="bg-orange-500 text-white px-8 py-4 rounded-2xl font-black uppercase italic shadow-lg shadow-orange-200 active:scale-95 transition-all">CADASTRAR</button>
        </form>
      </div>

      <div className="max-w-5xl mx-auto space-y-12">
        {carregando ? (
          <div className="text-center font-black text-gray-200 py-20 uppercase italic text-4xl animate-pulse">Sincronizando...</div>
        ) : (
          <>
            {/* SEÇÃO CALDOS - GRID ESTILO CARDÁPIO */}
            <section>
              <div className="flex items-center gap-3 mb-6 px-2">
                <div className="h-6 w-1.5 bg-orange-500 rounded-full"></div>
                <h2 className="text-lg font-black text-gray-800 uppercase italic">Caldos (Disponibilidade)</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {caldos.map((item) => (
                  <div key={item.id} className={`relative bg-white p-6 rounded-[2.5rem] shadow-sm border-2 transition-all ${item.esgotado ? 'border-red-100 bg-red-50/20' : 'border-gray-50'}`}>
                    <button onClick={() => excluirProduto(item.id)} className="absolute top-4 right-6 text-gray-200 hover:text-red-500 text-[8px] font-black uppercase">Remover</button>
                    <div className="mb-4">
                      <span className="text-orange-500 font-black text-lg italic tracking-tighter">R$ {Number(item.preco).toFixed(2)}</span>
                      <h3 className={`font-black uppercase text-sm leading-tight ${item.esgotado ? 'text-gray-300 line-through' : 'text-gray-800'}`}>{item.nome}</h3>
                    </div>
                    <button 
                      onClick={() => alternarStatusCaldo(item.id, item.esgotado)}
                      className={`w-full py-4 rounded-2xl font-black uppercase italic text-[10px] transition-all shadow-md active:scale-95 ${item.esgotado ? 'bg-red-500 text-white border-b-4 border-red-700' : 'bg-green-500 text-white border-b-4 border-green-700'}`}
                    >
                      {item.esgotado ? '❌ INDISPONÍVEL' : '✅ NO CARDÁPIO'}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* SEÇÃO BEBIDAS E OUTROS - LISTA COM CONTROLE */}
            <section>
              <div className="flex items-center gap-3 mb-6 px-2">
                <div className="h-6 w-1.5 bg-blue-500 rounded-full"></div>
                <h2 className="text-lg font-black text-gray-800 uppercase italic">Gestão de Bebidas e Estoque</h2>
              </div>
              <div className="space-y-4">
                {outrosItens.map((item) => (
                  <div key={item.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border-2 border-gray-50 flex flex-col lg:flex-row lg:items-center gap-6 relative">
                    <button onClick={() => excluirProduto(item.id)} className="absolute top-4 right-8 text-gray-200 hover:text-red-500 text-[8px] font-black uppercase">Excluir</button>
                    
                    <div className="flex-1 min-w-[150px]">
                      <span className="bg-blue-50 text-blue-600 px-3 py-0.5 rounded-full text-[7px] font-black uppercase mb-1 inline-block">{item.tipo}</span>
                      <h3 className="font-black text-gray-800 uppercase text-sm leading-none mb-1">{item.nome}</h3>
                      <p className="text-blue-500 font-black italic text-xs">R$ {Number(item.preco).toFixed(2)}</p>
                    </div>

                    <div className="flex gap-3">
                      <div className="bg-gray-50 px-4 py-3 rounded-2xl flex flex-col items-center border border-gray-100 min-w-[110px]">
                        <span className="text-[7px] font-black text-gray-400 uppercase">Central</span>
                        <span className="text-xl font-black text-gray-700">{item.quantidade_total}</span>
                        <div className="mt-2 flex gap-1">
                          <input type="number" id={`central-${item.id}`} placeholder="+qtd" className="w-full bg-white text-[10px] font-bold text-center rounded-lg border border-gray-200 p-1 outline-none" />
                          <button onClick={() => adicionarAoCentral(item.id, document.getElementById(`central-${item.id}`).value)} className="bg-gray-800 text-white text-[10px] px-2 rounded-lg font-black uppercase">OK</button>
                        </div>
                      </div>

                      <div className="bg-blue-600 px-6 py-3 rounded-2xl flex flex-col items-center shadow-lg shadow-blue-100 min-w-[110px] justify-center border-b-4 border-blue-800">
                        <span className="text-[7px] font-black text-blue-100 uppercase italic">Na Rua</span>
                        <span className="text-2xl font-black text-white">{item.quantidade_venda}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 bg-blue-50/50 p-2 rounded-2xl border border-blue-100 flex-grow">
                      <input type="number" placeholder="Retirar do central..." id={`input-${item.id}`} className="w-full bg-white border-2 border-transparent rounded-xl px-4 py-3 font-bold text-xs outline-none focus:border-blue-500" />
                      <button onClick={() => levarParaTrabalho(item.id, document.getElementById(`input-${item.id}`).value, item.quantidade_total)} className="bg-blue-600 text-white px-5 rounded-xl font-black text-[10px] uppercase shadow-md active:scale-95 italic">RETIRAR ➡</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}