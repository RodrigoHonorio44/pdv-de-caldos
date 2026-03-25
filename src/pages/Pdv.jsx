import { useState } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
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
  { id: 'guaramor', nome: 'Guaramor 290ml', preco: 3.00, tipo: 'bebida' },
  { id: 'agua_sem_gas', nome: 'Água s/ Gás', preco: 3.00, tipo: 'bebida' },
];

export default function Pdv() {
  const [caixaAtivo, setCaixaAtivo] = useState(null);
  const [carrinho, setCarrinho] = useState([]);
  const [metodoPgto, setMetodoPgto] = useState('dinheiro');
  const [valorRecebido, setValorRecebido] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [verCarrinho, setVerCarrinho] = useState(false); // Controle para mobile

  const total = carrinho.reduce((acc, i) => acc + (i.preco * i.qtd), 0);
  const troco = valorRecebido > total ? valorRecebido - total : 0;

  const abrirCaixa = async () => {
    setCarregando(true);
    try {
      const docRef = await addDoc(collection(db, "caixas"), {
        abertura: new Date().toISOString(),
        status: 'aberto',
        vendasTotais: 0,
        contagemItens: {},
      });
      setCaixaAtivo({ id: docRef.id });
      toast.success("Caixa aberto!");
    } catch (e) { toast.error("Erro ao abrir!"); }
    setCarregando(false);
  };

  const adicionar = (item) => {
    const existe = carrinho.find(i => i.id === item.id);
    if (existe) setCarrinho(carrinho.map(i => i.id === item.id ? { ...i, qtd: i.qtd + 1 } : i));
    else setCarrinho([...carrinho, { ...item, qtd: 1 }]);
    toast.message(`+1 ${item.nome}`, { position: 'bottom-center' });
  };

  const finalizarVenda = async () => {
    if (carrinho.length === 0) return toast.warning("Carrinho vazio!");
    setCarregando(true);
    try {
      await addDoc(collection(db, "vendas"), {
        caixaId: caixaAtivo.id,
        itens: carrinho,
        total,
        pagamento: metodoPgto,
        data: serverTimestamp()
      });

      const updates = { vendasTotais: increment(total) };
      for (const item of carrinho) {
        updates[`contagemItens.${item.id}`] = increment(item.qtd);
        if (item.tipo === 'bebida') {
          await updateDoc(doc(db, "estoque", item.id), { quantidade: increment(-item.qtd) });
        }
      }
      await updateDoc(doc(db, "caixas", caixaAtivo.id), updates);

      toast.success(`Venda OK! Troco: R$ ${troco.toFixed(2)}`);
      setCarrinho([]);
      setValorRecebido('');
      setVerCarrinho(false);
    } catch (e) { toast.error("Erro no Firebase!"); }
    setCarregando(false);
  };

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
      
      {/* Header Compacto */}
      <header className="p-4 bg-white shadow-sm flex justify-between items-center sticky top-0 z-10">
        <Link to="/" className="text-orange-500 font-black text-sm">⬅ VOLTAR</Link>
        <h1 className="font-black text-gray-800 uppercase text-xs tracking-tighter text-center">Caldos da Tay<br/><span className="text-green-500 text-[8px]">● Caixa Aberto</span></h1>
        <button onClick={() => setCaixaAtivo(null)} className="text-red-400 text-[10px] font-bold uppercase">Fechar</button>
      </header>

      {/* Grade de Produtos - 2 colunas no celular */}
      <main className="p-3 grid grid-cols-2 lg:grid-cols-3 gap-2 overflow-y-auto">
        {cardapio.map(item => (
          <button 
            key={item.id} 
            onClick={() => adicionar(item)} 
            className="bg-white p-4 h-32 rounded-3xl shadow-sm border-b-4 border-gray-100 active:translate-y-1 active:border-b-0 flex flex-col justify-center items-center text-center group"
          >
            <span className="text-[10px] font-black text-gray-400 uppercase leading-none mb-1">{item.nome}</span>
            <span className="text-lg font-black text-orange-500">R$ {item.preco.toFixed(0)}</span>
          </button>
        ))}
      </main>

      {/* Barra Inferior Fixa (Estilo App) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] lg:hidden">
        <button 
          onClick={() => setVerCarrinho(true)}
          className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black flex justify-between px-6 items-center active:scale-95 transition-all"
        >
          <span className="text-sm uppercase tracking-widest">{carrinho.length} itens</span>
          <span className="text-xl">VER PEDIDO • R$ {total.toFixed(2)}</span>
        </button>
      </div>

      {/* Modal do Carrinho (Aparece no Celular quando clica na barra) */}
      {(verCarrinho || window.innerWidth > 1024) && (
        <div className={`fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:relative lg:bg-transparent lg:inset-auto lg:block ${verCarrinho ? 'flex' : 'hidden'} items-end`}>
          <div className="bg-white w-full max-h-[90vh] rounded-t-[3rem] p-6 shadow-2xl flex flex-col lg:fixed lg:right-4 lg:top-24 lg:w-96 lg:rounded-[2.5rem]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black uppercase italic">Pedido</h2>
              <button onClick={() => setVerCarrinho(false)} className="lg:hidden text-gray-300 text-4xl leading-none">×</button>
            </div>

            <div className="flex-grow overflow-y-auto space-y-3 mb-6">
              {carrinho.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <span className="font-bold text-gray-700">{item.qtd}x {item.nome}</span>
                  <div className="flex items-center gap-4">
                    <span className="font-black text-orange-500 italic">R$ {(item.preco * item.qtd).toFixed(2)}</span>
                    <button onClick={() => setCarrinho(carrinho.filter(i => i.id !== item.id))} className="text-red-300">✕</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="flex gap-2">
                <button onClick={() => setMetodoPgto('dinheiro')} className={`flex-1 py-3 rounded-xl font-black text-xs ${metodoPgto === 'dinheiro' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'}`}>DINHEIRO</button>
                <button onClick={() => setMetodoPgto('cartao')} className={`flex-1 py-3 rounded-xl font-black text-xs ${metodoPgto === 'cartao' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'}`}>CARTÃO</button>
              </div>

              {metodoPgto === 'dinheiro' && (
                <input 
                  type="number" 
                  value={valorRecebido} 
                  onChange={(e) => setValorRecebido(e.target.value)} 
                  className="w-full bg-gray-50 p-4 rounded-2xl font-black text-2xl text-center outline-none border border-gray-100" 
                  placeholder="VALOR RECEBIDO" 
                />
              )}

              <div className="flex justify-between text-3xl font-black text-gray-900 pb-2">
                <span className="text-xs self-center text-gray-400 uppercase">Total:</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>

              <button 
                onClick={finalizarVenda} 
                disabled={carregando} 
                className={`w-full py-6 rounded-3xl font-black text-xl shadow-xl transition-all active:scale-95 ${carregando ? 'bg-gray-300' : 'bg-green-500 text-white'}`}
              >
                {carregando ? '...' : 'FINALIZAR AGORA 🚀'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}