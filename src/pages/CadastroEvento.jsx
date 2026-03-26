import { useState } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { toast, Toaster } from 'sonner';

export default function CadastroEvento() {
  const [nomeEvento, setNomeEvento] = useState('');
  const [investimento, setInvestimento] = useState(''); 
  const [carregando, setCarregando] = useState(false);

  // MÁSCARA AUTOMÁTICA: Formata 2525262 em 25.252,62
  const handleMoneyChange = (e) => {
    let value = e.target.value.replace(/\D/g, ""); 
    if (!value) {
      setInvestimento("");
      return;
    }
    
    // Converte para padrão decimal BR
    const options = { minimumFractionDigits: 2 };
    const result = (Number(value) / 100).toLocaleString('pt-BR', options);
    setInvestimento(result);
  };

  const salvarEvento = async () => {
    if (!nomeEvento || !investimento) return toast.error("Preencha tudo!");

    // --- LIMPEZA CRÍTICA ---
    // Remove TODOS os pontos (milhares) e troca a vírgula por ponto (decimal)
    // Exemplo: "2.525.262,00" -> "2525262.00"
    const valorParaLimpar = investimento.replace(/\./g, '').replace(',', '.');
    const valorNumerico = parseFloat(valorParaLimpar);

    // LOG DE SEGURANÇA: Verifique isso no console (F12) ao clicar no botão
    console.log("Valor original string:", investimento);
    console.log("Valor enviado ao Firebase:", valorNumerico);

    if (isNaN(valorNumerico)) return toast.error("Valor inválido.");

    setCarregando(true);
    try {
      const batch = writeBatch(db);

      // 1. Localizar e encerrar eventos ativos
      const q = query(collection(db, "eventos"), where("status", "==", "ativo"));
      const querySnapshot = await getDocs(q);
      
      querySnapshot.forEach((documento) => {
        batch.update(doc(db, "eventos", documento.id), { status: 'encerrado' });
      });

      // 2. Criar novo evento com o número REAL
      const novoEventoRef = doc(collection(db, "eventos"));
      batch.set(novoEventoRef, {
        nome: nomeEvento.toLowerCase(),
        custo_inicial: valorNumerico, // Aqui vai o número sem pontos de milhar
        status: 'ativo',
        criado_em: serverTimestamp()
      });

      await batch.commit();

      toast.success(`Evento iniciado: R$ ${investimento}`);
      setNomeEvento(''); 
      setInvestimento('');
    } catch (e) { 
      console.error("Erro Firebase:", e);
      toast.error("Erro ao salvar no banco."); 
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-[2rem] shadow-xl mt-10 text-left border border-gray-100">
      <Toaster richColors position="top-center" />
      <h2 className="text-xl font-black uppercase italic mb-4 text-orange-600 tracking-tighter">
        🚀 Novo Investimento
      </h2>
      
      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Nome do Evento:</label>
          <input 
            placeholder="EX: CARNAVAL 2026" 
            value={nomeEvento} 
            onChange={e => setNomeEvento(e.target.value)}
            className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold focus:ring-2 ring-orange-500 transition-all uppercase text-xs border-none"
          />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Valor de Saída (Investimento):</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-red-500 text-lg">R$</span>
            <input 
              type="text" // DEVE SER TEXT para a máscara funcionar
              inputMode="numeric"
              placeholder="0,00" 
              value={investimento} 
              onChange={handleMoneyChange}
              className="w-full p-5 pl-12 bg-red-50 border-2 border-red-100 rounded-2xl text-2xl font-black text-red-600 outline-none focus:border-red-500 transition-all"
            />
          </div>
        </div>

        <button 
          onClick={salvarEvento} 
          disabled={carregando}
          className={`w-full py-5 rounded-2xl font-black uppercase italic shadow-lg transition-all active:scale-95 ${
            carregando ? 'bg-gray-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-black'
          }`}
        >
          {carregando ? 'Sincronizando Banco...' : 'Confirmar e Iniciar Evento'}
        </button>
      </div>
    </div>
  );
}