import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase/config';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, increment, writeBatch } from 'firebase/firestore';
import { Toaster, toast } from 'sonner';

export default function Estoque() {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  const [novoNome, setNovoNome] = useState('');
  const [novoPreco, setNovoPreco] = useState(''); // Novo estado para o preço
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

  const buscarEstoque = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "estoque"));
      const lista = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItens(lista);
    } catch (e) { toast.error("Erro ao carregar"); }
    finally { setCarregando(false); }
  };

  useEffect(() => { buscarEstoque(); }, []);

  const cadastrarProduto = async (e) => {
    e.preventDefault();
    if (!novoNome) return toast.warning("Digite o nome!");
    if (!novoPreco && tipo === 'bebida') return toast.warning("Defina um preço para a venda!");
    
    const idFormatado = normalizarID(novoNome);

    try {
      await setDoc(doc(db, "estoque", idFormatado), {
        nome: novoNome,
        preco: Number(novoPreco) || 0, // Salva o preço para o PDV ler
        quantidade_total: 0,
        quantidade_venda: 0,
        tipo: tipo
      });
      toast.success(`Cadastrado: ${idFormatado}`);
      setNovoNome('');
      setNovoPreco('');
      buscarEstoque();
    } catch (e) { toast.error("Erro ao cadastrar"); }
  };

  const adicionarAoCentral = async (id, qtd) => {
    const valor = Number(qtd);
    if (!valor || valor <= 0) return toast.error("Valor inválido!");
    try {
      await updateDoc(doc(db, "estoque", id), { quantidade_total: increment(valor) });
      toast.success("Estoque central atualizado!");
      document.getElementById(`central-${id}`).value = '';
      buscarEstoque();
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
      buscarEstoque();
    } catch (e) { toast.error("Erro na movimentação"); }
  };

  const finalizarDia = async () => {
    if (!window.confirm("Devolver sobras para o estoque central?")) return;
    const batch = writeBatch(db);
    itens.forEach((item) => {
      if (item.quantidade_venda > 0) {
        batch.update(doc(db, "estoque", item.id), {
          quantidade_total: increment(item.quantidade_venda),
          quantidade_venda: 0
        });
      }
    });
    try {
      await batch.commit();
      toast.success("Sobras devolvidas ao central!");
      buscarEstoque();
    } catch (e) { toast.error("Erro ao finalizar"); }
  };

  const excluirProduto = async (id) => {
    if (!window.confirm("Excluir este produto?")) return;
    try {
      await deleteDoc(doc(db, "estoque", id));
      toast.success("Removido!");
      buscarEstoque();
    } catch (e) { toast.error("Erro ao excluir"); }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans pb-20">
      <Toaster position="top-center" richColors />
      
      <header className="flex justify-between items-center mb-6">
        <Link to="/" className="text-orange-500 font-black text-sm italic">⬅ VOLTAR</Link>
        <button onClick={finalizarDia} className="bg-gray-800 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-md">
          Finalizar Turno 🔄
        </button>
      </header>

      {/* Cadastro de Produtos */}
      <form onSubmit={cadastrarProduto} className="bg-white p-6 rounded-[2.5rem] shadow-md mb-8 border-2 border-orange-100">
        <div className="space-y-3">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Nome do Produto" 
              className="flex-grow bg-gray-50 p-4 rounded-2xl font-bold outline-none border border-transparent focus:border-orange-500"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
            />
            <input 
              type="number" 
              placeholder="R$ Preço" 
              className="w-28 bg-gray-50 p-4 rounded-2xl font-black text-orange-600 outline-none border border-transparent focus:border-orange-500"
              value={novoPreco}
              onChange={(e) => setNovoPreco(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select className="flex-1 bg-gray-100 p-4 rounded-2xl font-black text-[10px] uppercase outline-none text-orange-600" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="bebida">🥤 Bebida</option>
              <option value="descartavel">📦 Descartável</option>
              <option value="caldo">🥣 Caldo (Insumo)</option>
            </select>
            <button type="submit" className="bg-orange-500 text-white px-8 rounded-2xl font-black uppercase italic shadow-lg active:scale-95">CADASTRAR</button>
          </div>
        </div>
      </form>

      {/* Listagem de Estoque */}
      <div className="space-y-4">
        {carregando ? (
          <div className="text-center font-bold text-gray-300 py-10 uppercase italic">Sincronizando...</div>
        ) : (
          itens.map((item) => (
            <div key={item.id} className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col gap-3 relative">
              <button onClick={() => excluirProduto(item.id)} className="absolute top-5 right-5 text-gray-200 hover:text-red-500 text-[10px] font-black uppercase">excluir</button>

              <div>
                <div className="flex items-center gap-2 mb-1">
                    <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-[8px] font-black uppercase">{item.tipo}</span>
                    <span className="text-orange-500 font-black text-[10px] italic">R$ {Number(item.preco).toFixed(2)}</span>
                </div>
                <span className="font-black text-gray-800 uppercase text-xs">{item.nome}</span>
                <p className="text-[7px] text-gray-300 font-mono italic">ID: {item.id}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-2xl text-center border border-gray-100">
                  <p className="text-[7px] font-black text-gray-400 uppercase mb-1">Estoque Central</p>
                  <p className="text-xl font-black text-gray-700">{item.quantidade_total}</p>
                  <div className="mt-2 flex gap-1">
                    <input type="number" id={`central-${item.id}`} placeholder="+ qtd" className="w-full bg-white text-[10px] font-bold text-center rounded-lg border border-gray-200 p-1" />
                    <button onClick={() => adicionarAoCentral(item.id, document.getElementById(`central-${item.id}`).value)} className="bg-gray-800 text-white text-[10px] px-2 rounded-lg font-black uppercase">OK</button>
                  </div>
                </div>

                <div className="bg-orange-500 p-3 rounded-2xl text-center shadow-lg flex flex-col justify-center">
                  <p className="text-[7px] font-black text-orange-100 uppercase italic mb-1">Disponível Rua</p>
                  <p className="text-2xl font-black text-white">{item.quantidade_venda}</p>
                </div>
              </div>

              <div className="flex gap-2 bg-orange-50 p-2 rounded-2xl">
                <input type="number" placeholder="Mover para rua..." id={`input-${item.id}`} className="flex-1 bg-white border border-orange-100 rounded-xl px-4 py-3 font-bold text-xs outline-none focus:border-orange-500" />
                <button onClick={() => levarParaTrabalho(item.id, document.getElementById(`input-${item.id}`).value, item.quantidade_total)} className="bg-orange-500 text-white px-6 rounded-xl font-black text-[10px] uppercase shadow-md italic">RETIRAR ➡</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}