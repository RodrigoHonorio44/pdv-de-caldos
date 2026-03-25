import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp, query, where, getDocs, limit, writeBatch } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Toaster, toast } from 'sonner';

const cardapio = [
  { id: 'caldo_verde', nome: 'Caldo Verde', preco: 20.00, tipo: 'caldo' },
  { id: 'caldo_ervilha', nome: 'Caldo de Ervilha', preco: 20.00, tipo: 'caldo' },
  { id: 'abobora_carne_seca', nome: 'Abóbora c/ Carne Seca', preco: 25.00, tipo: 'caldo' },
  { id: 'feijao_camarao', nome: 'Feijão com Camarão', preco: 25.00, tipo: 'caldo' },
  { id: 'vaca_atolada', nome: 'Vaca Atolada', preco: 25.00, tipo: 'caldo' },
  { id: 'dobradinha_especial', nome: 'Dobradinha Especial', preco: 25.00, tipo: 'caldo' },
  { id: 'imperio_latao', nome: 'Cerveja Império Latão', preco: 10.00, tipo: 'bebida' },
  { id: 'heineken_latao', nome: 'Cerveja Heineken Latão', preco: 12.00, tipo: 'bebida' },
  { id: 'coca_lata', nome: 'Coca-Cola Lata', preco: 7.00, tipo: 'bebida' },
  { id: 'coca_zero_lata', nome: 'Coca-Cola Zero Lata' , preco: 7.00, tipo: 'bebida' }, // ID corrigido
  { id: 'guarana_antarctica', nome: 'Guaraná Antarctica', preco: 7.00, tipo: 'bebida' }, // Adicionado
  { id: 'guaramor', nome: 'Guaramor 290ml', preco: 3.00, tipo: 'bebida' },
  { id: 'agua_sem_gas', nome: 'Água s/ Gás', preco: 3.00, tipo: 'bebida' },
  { id: 'agua_com_gas', nome: 'Água c/ Gás', preco: 5.00, tipo: 'bebida' }, // Adicionado
];

export default function Pdv() {
  const [caixaAtivo, setCaixaAtivo] = useState(null);
  const [carrinho, setCarrinho] = useState([]);
  const [metodoPgto, setMetodoPgto] = useState('dinheiro');
  const [valorRecebido, setValorRecebido] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [verCarrinho, setVerCarrinho] = useState(false);

  const total = carrinho.reduce((acc, i) => acc + (i.preco * i.qtd), 0);
  const troco = valorRecebido > total ? valorRecebido - total : 0;

  useEffect(() => {
    const carregarCaixa = async () => {
      try {
        const q = query(collection(db, "caixas"), where("status", "==", "aberto"), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          setCaixaAtivo({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (e) { console.error(e); }
      finally { setCarregando(false); }
    };
    carregarCaixa();
  }, []);

  const abrirCaixa = async () => {
    setCarregando(true);
    try {
      const dados = {
        abertura: new Date().toISOString(),
        status: 'aberto',
        vendasTotais: 0,
        contagemItens: {},
        data_abertura: new Date().toLocaleDateString('pt-BR')
      };
      const docRef = await addDoc(collection(db, "caixas"), dados);
      setCaixaAtivo({ id: docRef.id, ...dados });
      toast.success("Caixa aberto!");
    } catch (e) { toast.error("Erro ao abrir caixa!"); }
    setCarregando(false);
  };

  const adicionar = (item) => {
    const existe = carrinho.find(i => i.id === item.id);
    if (existe) setCarrinho(carrinho.map(i => i.id === item.id ? { ...i, qtd: i.qtd + 1 } : i));
    else setCarrinho([...carrinho, { ...item, qtd: 1 }]);
    toast.message(`+1 ${item.nome}`, { position: 'bottom-center' });
  };

  // --- FUNÇÃO FINALIZAR VENDA ATUALIZADA COM ABATIMENTO DUPLO ---
  const finalizarVenda = async () => {
    if (carrinho.length === 0) return;
    if (metodoPgto === 'dinheiro' && valorRecebido < total) {
        return toast.error("Valor recebido insuficiente!");
    }

    setCarregando(true);
    const batch = writeBatch(db); // Usando Batch para atualizar tudo de uma vez

    try {
      // 1. Registrar a Venda
      const vendaRef = doc(collection(db, "vendas"));
      batch.set(vendaRef, {
        caixaId: caixaAtivo.id,
        itens: carrinho,
        total,
        pagamento: metodoPgto,
        valorRecebido: metodoPgto === 'dinheiro' ? Number(valorRecebido) : total,
        troco: metodoPgto === 'dinheiro' ? troco : 0,
        data: serverTimestamp()
      });

      // 2. Atualizar Caixa e Estoques
      const caixaRef = doc(db, "caixas", caixaAtivo.id);
      const updatesCaixa = { vendasTotais: increment(total) };

      for (const item of carrinho) {
        updatesCaixa[`contagemItens.${item.id}`] = increment(item.qtd);
        
        // ABATIMENTO DUPLO: Tira do que levou pra rua E do patrimônio total
        const estoqueRef = doc(db, "estoque", item.id);
        batch.update(estoqueRef, {
          quantidade_venda: increment(-item.qtd), // Abate do isopor/carro
          quantidade_total: increment(-item.qtd)  // Abate do estoque geral
        });
      }

      batch.update(caixaRef, updatesCaixa);

      // Executa todas as operações
      await batch.commit();

      toast.success(`Venda no ${metodoPgto.toUpperCase()} finalizada!`);
      setCarrinho([]);
      setValorRecebido('');
      setVerCarrinho(false);
    } catch (e) { 
      console.error(e);
      toast.error("Erro ao salvar venda! Verifique se os produtos existem no estoque."); 
    }
    setCarregando(false);
  };

  if (carregando && !caixaAtivo) return <div className="min-h-screen bg-orange-500 flex items-center justify-center text-white font-black italic">CARREGANDO...</div>;

  if (!caixaAtivo) {
    return (
      <div className="min-h-screen bg-orange-600 flex items-center justify-center p-4">
        <Toaster position="top-center" richColors />
        <button onClick={abrirCaixa} className="bg-white text-orange-600 w-full max-w-xs py-8 rounded-[2rem] font-black text-2xl shadow-2xl active:scale-95 transition-all">
          ABRIR CAIXA 🥣
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans pb-24 lg:pb-0">
      <Toaster position="top-center" richColors />
      
      <header className="p-4 bg-white shadow-sm flex justify-between items-center sticky top-0 z-10">
        <Link to="/" className="text-orange-500 font-black text-sm italic">⬅ VOLTAR</Link>
        <h1 className="font-black text-gray-800 uppercase text-xs tracking-tighter text-center italic">Caldos da Tay<br/><span className="text-green-500 text-[8px]">● Caixa Aberto</span></h1>
        <button onClick={() => setCaixaAtivo(null)} className="text-red-400 text-[10px] font-bold uppercase">Sair</button>
      </header>

      <main className="p-3 grid grid-cols-2 lg:grid-cols-4 gap-2 overflow-y-auto">
        {cardapio.map(item => (
          <button 
            key={item.id} 
            onClick={() => adicionar(item)} 
            className="bg-white p-4 h-28 rounded-3xl shadow-sm border-b-4 border-gray-100 active:translate-y-1 active:border-b-0 flex flex-col justify-center items-center text-center"
          >
            <span className="text-[10px] font-black text-gray-400 uppercase leading-none mb-1">{item.nome}</span>
            <span className="text-lg font-black text-orange-500">R$ {item.preco.toFixed(0)}</span>
          </button>
        ))}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-xl lg:hidden">
        <button 
          onClick={() => setVerCarrinho(true)}
          className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black flex justify-between px-6 items-center active:scale-95 transition-all"
        >
          <span className="text-xs uppercase italic">{carrinho.length} itens</span>
          <span className="text-xl italic">R$ {total.toFixed(2)}</span>
        </button>
      </div>

      {(verCarrinho || window.innerWidth > 1024) && (
        <div className={`fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:relative lg:bg-transparent lg:inset-auto lg:block ${verCarrinho ? 'flex' : 'hidden'} items-end`}>
          <div className="bg-white w-full max-h-[90vh] rounded-t-[3rem] p-6 shadow-2xl flex flex-col lg:fixed lg:right-4 lg:top-24 lg:w-96 lg:rounded-[2.5rem]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-black uppercase italic text-gray-800 tracking-tighter">Resumo</h2>
              <button onClick={() => setVerCarrinho(false)} className="lg:hidden text-gray-300 text-4xl leading-none">×</button>
            </div>

            <div className="flex-grow overflow-y-auto space-y-2 mb-4 pr-1">
              {carrinho.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <span className="font-bold text-gray-700 text-sm">{item.qtd}x {item.nome}</span>
                  <span className="font-black text-orange-500 italic text-sm">R$ {(item.preco * item.qtd).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3 border-t pt-4 border-gray-100">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setMetodoPgto('dinheiro')} className={`py-3 rounded-xl font-black text-[10px] uppercase transition-all ${metodoPgto === 'dinheiro' ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>💵 Dinheiro</button>
                <button onClick={() => setMetodoPgto('pix')} className={`py-3 rounded-xl font-black text-[10px] uppercase transition-all ${metodoPgto === 'pix' ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>💎 PIX</button>
                <button onClick={() => setMetodoPgto('debito')} className={`py-3 rounded-xl font-black text-[10px] uppercase transition-all ${metodoPgto === 'debito' ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>💳 Débito</button>
                <button onClick={() => setMetodoPgto('credito')} className={`py-3 rounded-xl font-black text-[10px] uppercase transition-all ${metodoPgto === 'credito' ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>💳 Crédito</button>
              </div>

              {metodoPgto === 'dinheiro' && (
                <input 
                  type="number" 
                  value={valorRecebido} 
                  onChange={(e) => setValorRecebido(e.target.value)} 
                  className="w-full bg-gray-50 p-4 rounded-2xl font-black text-2xl text-center outline-none border-2 border-orange-100 focus:border-orange-500" 
                  placeholder="RECEBIDO" 
                />
              )}

              <div className="flex justify-between text-3xl font-black text-gray-900 py-1">
                <span className="text-[10px] self-center text-gray-400 uppercase italic">Total:</span>
                <span className="tracking-tighter italic">R$ {total.toFixed(2)}</span>
              </div>

              <button 
                onClick={finalizarVenda} 
                disabled={carregando} 
                className={`w-full py-5 rounded-3xl font-black text-xl shadow-xl transition-all active:scale-95 uppercase italic ${carregando ? 'bg-gray-300' : 'bg-green-500 text-white'}`}
              >
                {carregando ? '...' : 'Finalizar 🚀'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}