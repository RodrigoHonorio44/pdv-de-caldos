import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase/config';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, increment, writeBatch } from 'firebase/firestore';
import { Toaster, toast } from 'sonner';

export default function Estoque() {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  // Estados para o novo produto
  const [novoNome, setNovoNome] = useState('');
  const [tipo, setTipo] = useState('bebida');

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
    if (!novoNome) return toast.warning("Digite o nome do produto!");

    // Mantendo seu padrão de IDs em letras minúsculas
    const idFormatado = novoNome.toLowerCase().trim().replace(/\s+/g, '_');

    try {
      await setDoc(doc(db, "estoque", idFormatado), {
        nome: novoNome,
        quantidade_total: 0,
        quantidade_venda: 0,
        tipo: tipo
      });
      toast.success("Produto cadastrado no sistema!");
      setNovoNome('');
      buscarEstoque();
    } catch (e) { toast.error("Erro ao cadastrar"); }
  };

  // Move do Central para o Estoque do Dia
  const levarParaTrabalho = async (id, qtd, totalAtual) => {
    const valor = Number(qtd);
    if (valor > totalAtual) return toast.error("Quantidade maior que o estoque central!");
    
    try {
      await updateDoc(doc(db, "estoque", id), {
        quantidade_total: increment(-valor),
        quantidade_venda: increment(valor)
      });
      toast.success(`Movido ${valor} un para o dia!`);
      buscarEstoque();
    } catch (e) { toast.error("Erro na movimentação"); }
  };

  // Finaliza o dia: Devolve o que sobrou no "dia" para o "central"
  const finalizarDia = async () => {
    if (!window.confirm("Deseja devolver as sobras de hoje para o estoque central?")) return;
    
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
      toast.success("Estoque central reposto com as sobras!");
      buscarEstoque();
    } catch (e) { toast.error("Erro ao finalizar"); }
  };

  const ajustarTotal = async (id, novaQtd) => {
    try {
      await updateDoc(doc(db, "estoque", id), { quantidade_total: Number(novaQtd) });
      toast.success("Estoque central atualizado!");
      buscarEstoque();
    } catch (e) { toast.error("Erro ao salvar"); }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans pb-20">
      <Toaster position="top-center" richColors />
      
      <header className="flex justify-between items-center mb-6">
        <Link to="/" className="text-orange-500 font-black text-sm italic">⬅ VOLTAR</Link>
        <button 
          onClick={finalizarDia}
          className="bg-gray-800 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-md"
        >
          Finalizar Dia 🔄
        </button>
      </header>

      {/* Formulário de Cadastro */}
      <form onSubmit={cadastrarProduto} className="bg-white p-6 rounded-[2.5rem] shadow-md mb-8 border-2 border-orange-100">
        <div className="space-y-3">
          <input 
            type="text" 
            placeholder="Ex: Coca Cola ou Copo 300ml" 
            className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none border border-transparent focus:border-orange-500"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
          />
          <div className="flex gap-2">
            <select 
              className="flex-1 bg-gray-100 p-4 rounded-2xl font-black text-[10px] uppercase outline-none text-orange-600"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              <option value="bebida">🥤 Bebida</option>
              <option value="descartavel">📦 Descartável</option>
              <option value="caldo">🥣 Caldo</option>
            </select>
            <button type="submit" className="bg-orange-500 text-white px-8 rounded-2xl font-black uppercase italic shadow-lg active:scale-95">
              CADASTRAR
            </button>
          </div>
        </div>
      </form>

      {/* Lista de Produtos */}
      <div className="space-y-4">
        {carregando ? (
          <div className="text-center font-bold text-gray-300 py-10">CARREGANDO...</div>
        ) : (
          itens.map((item) => (
            <div key={item.id} className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-[8px] font-black uppercase block w-fit mb-1">{item.tipo}</span>
                  <span className="font-black text-gray-800 uppercase text-xs">{item.nome}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-2">
                <div className="bg-gray-50 p-3 rounded-2xl text-center">
                  <p className="text-[7px] font-black text-gray-400 uppercase">Estoque Central</p>
                  <p className="text-lg font-black text-gray-600">{item.quantidade_total}</p>
                  <input 
                    type="number" 
                    placeholder="Set Total" 
                    className="w-full mt-1 bg-white text-[10px] text-center rounded-lg border border-gray-100 outline-none"
                    onBlur={(e) => e.target.value && ajustarTotal(item.id, e.target.value)}
                  />
                </div>
                <div className="bg-orange-500 p-3 rounded-2xl text-center shadow-lg">
                  <p className="text-[7px] font-black text-orange-100 uppercase italic">Para Venda Hoje</p>
                  <p className="text-xl font-black text-white">{item.quantidade_venda}</p>
                </div>
              </div>

              {/* Ação de Transferência */}
              <div className="flex gap-2">
                <input 
                  type="number" 
                  placeholder="Qtd para levar..." 
                  id={`input-${item.id}`}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-xs outline-none focus:border-orange-500"
                />
                <button 
                  onClick={() => {
                    const val = document.getElementById(`input-${item.id}`).value;
                    if(val) levarParaTrabalho(item.id, val, item.quantidade_total);
                    document.getElementById(`input-${item.id}`).value = '';
                  }}
                  className="bg-orange-500 text-white px-6 rounded-xl font-black text-[10px] uppercase shadow-md active:scale-95"
                >
                  RETIRAR ➡
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}