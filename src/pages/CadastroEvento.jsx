import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { toast, Toaster } from 'sonner';

export default function GestaoInvestimento() {
  const [eventos, setEventos] = useState([]);
  const [eventoSelecionado, setEventoSelecionado] = useState(null);
  const [valorAdicional, setValorAdicional] = useState('');
  const [carregando, setCarregando] = useState(false);

  // 1. Busca os eventos em tempo real
  useEffect(() => {
    const q = query(collection(db, "eventos"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEventos(lista);
    });
    return () => unsubscribe();
  }, []);

  const handleMoneyChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (!value) { setValorAdicional(""); return; }
    const result = (Number(value) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    setValorAdicional(result);
  };

  const atualizarInvestimento = async () => {
    if (!eventoSelecionado || !valorAdicional) return toast.error("Selecione um evento e digite o valor!");

    const valorNumerico = parseFloat(valorAdicional.replace(/\./g, '').replace(',', '.'));
    
    setCarregando(true);
    try {
      const eventoRef = doc(db, "eventos", eventoSelecionado.id);
      
      await updateDoc(eventoRef, {
        custo_inicial: increment(valorNumerico),
        ultima_atualizacao: serverTimestamp()
      });

      toast.success("Investimento atualizado com sucesso!");
      setValorAdicional('');
      setEventoSelecionado(null);
    } catch (e) {
      toast.error("Erro ao atualizar.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-slate-50 min-h-screen font-sans">
      <Toaster richColors position="top-center" />
      
      <h2 className="text-2xl font-black uppercase italic mb-6 text-slate-800 tracking-tighter">
        💎 Selecione o Evento para Investir
      </h2>

      {/* LISTA DE EVENTOS PARA CLICAR */}
      <div className="grid gap-3 mb-8">
        {eventos.map(evento => (
          <button
            key={evento.id}
            onClick={() => setEventoSelecionado(evento)}
            className={`p-4 rounded-2xl border-2 transition-all text-left flex justify-between items-center ${
              eventoSelecionado?.id === evento.id 
              ? 'border-orange-500 bg-orange-50 ring-4 ring-orange-100' 
              : 'border-white bg-white shadow-sm hover:border-gray-200'
            }`}
          >
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Status: {evento.status}
              </p>
              <h3 className="font-black uppercase italic text-slate-700">{evento.nome}</h3>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-400">TOTAL INVESTIDO</p>
              <p className="font-black text-orange-600">
                R$ {evento.custo_inicial?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* CAMPO DE LANÇAMENTO (Só aparece se algo for selecionado) */}
      {eventoSelecionado && (
        <div className="bg-slate-900 p-6 rounded-[2.5rem] shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-black uppercase italic text-sm">
              Lançar em: <span className="text-orange-400">{eventoSelecionado.nome}</span>
            </h3>
            <button onClick={() => setEventoSelecionado(null)} className="text-gray-400 text-xs font-bold uppercase">Cancelar</button>
          </div>

          <div className="relative mb-4">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-red-500 text-xl">R$</span>
            <input 
              type="text" inputMode="numeric" placeholder="0,00"
              value={valorAdicional} onChange={handleMoneyChange}
              className="w-full p-6 pl-14 bg-white rounded-3xl text-3xl font-black text-slate-900 outline-none focus:ring-4 ring-orange-500/30"
            />
          </div>

          <button 
            onClick={atualizarInvestimento} disabled={carregando}
            className="w-full py-5 bg-orange-500 text-white rounded-3xl font-black uppercase italic shadow-lg hover:bg-orange-600 active:scale-95 transition-all"
          >
            {carregando ? 'PROCESSANDO...' : 'CONFIRMAR NOVO APORTE'}
          </button>
        </div>
      )}
    </div>
  );
}