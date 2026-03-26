import { useState } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { toast, Toaster } from 'sonner';

export default function CadastroEvento() {
  const [nomeEvento, setNomeEvento] = useState('');
  const [investimento, setInvestimento] = useState('');
  const [carregando, setCarregando] = useState(false);

  const salvarEvento = async () => {
    if (!nomeEvento || !investimento) return toast.error("Preencha tudo!");
    
    setCarregando(true);
    try {
      // 1. Criar um batch para garantir que as operações sejam atômicas
      const batch = writeBatch(db);

      // 2. Buscar eventos que ainda estejam 'ativos' e marcá-los como 'encerrado'
      const q = query(collection(db, "eventos"), where("status", "==", "ativo"));
      const querySnapshot = await getDocs(q);
      
      querySnapshot.forEach((documento) => {
        const eventoRef = doc(db, "eventos", documento.id);
        batch.update(eventoRef, { status: 'encerrado' });
      });

      // 3. Preparar o novo evento com o valor numérico correto
      // Usamos parseFloat para garantir que 2000.00 não vire 2
      const valorGasto = parseFloat(investimento);
      const novoEventoRef = doc(collection(db, "eventos"));

      batch.set(novoEventoRef, {
        nome: nomeEvento.toLowerCase(), // Padronização para facilitar buscas
        custo_inicial: valorGasto,
        status: 'ativo',
        criado_em: serverTimestamp()
      });

      // Executa todas as mudanças no banco de uma vez
      await batch.commit();

      toast.success(`Evento "${nomeEvento}" iniciado com R$ ${valorGasto.toFixed(2)}`);
      setNomeEvento(''); 
      setInvestimento('');
    } catch (e) { 
      console.error(e);
      toast.error("Erro ao salvar evento."); 
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-[2rem] shadow-xl mt-10">
      <Toaster richColors />
      <h2 className="text-xl font-black uppercase italic mb-4 text-orange-600">Investimento do Evento</h2>
      
      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Nome do Evento:</label>
          <input 
            placeholder="Ex: Encontro de Motociclistas" 
            value={nomeEvento} 
            onChange={e => setNomeEvento(e.target.value)}
            className="w-full p-4 bg-gray-100 rounded-2xl outline-none font-bold focus:ring-2 ring-orange-500 transition-all"
          />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Valor Total Gasto:</label>
          <input 
            type="number" 
            step="0.01" // Permite centavos se necessário
            placeholder="Ex: 2000" 
            value={investimento} 
            onChange={e => setInvestimento(e.target.value)}
            className="w-full p-4 bg-red-50 border-2 border-red-100 rounded-2xl text-2xl font-black text-red-600 outline-none focus:border-red-500 transition-all"
          />
        </div>

        <button 
          onClick={salvarEvento} 
          disabled={carregando}
          className={`w-full py-5 rounded-2xl font-black uppercase italic shadow-lg transition-all active:scale-95 ${
            carregando ? 'bg-gray-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-black'
          }`}
        >
          {carregando ? 'Sincronizando...' : 'Começar do Negativo 📉'}
        </button>
      </div>
      
      <p className="mt-4 text-[9px] text-gray-400 font-bold text-center uppercase">
        * Isso desativará automaticamente o evento anterior.
      </p>
    </div>
  );
}