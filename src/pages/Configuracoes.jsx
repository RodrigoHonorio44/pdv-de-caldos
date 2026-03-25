import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom'; // Importando para o botão voltar
import { Toaster, toast } from 'sonner';

export default function Configuracoes() {
  const navigate = useNavigate(); // Hook para navegação inteligente
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    chave: '',
    beneficiario: '',
    cidade: 'MARICA'
  });

  // Carrega os dados atuais do banco ao abrir a tela
  useEffect(() => {
    const carregarDados = async () => {
      try {
        const docSnap = await getDoc(doc(db, "configuracoes", "pix"));
        if (docSnap.exists()) {
          setForm(docSnap.data());
        }
      } catch (e) {
        toast.error("Erro ao carregar configurações");
      } finally {
        setLoading(false);
      }
    };
    carregarDados();
  }, []);

  const salvar = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Salva no Firestore
      await setDoc(doc(db, "configuracoes", "pix"), {
        chave: form.chave.trim(),
        beneficiario: form.beneficiario.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
        cidade: form.cidade.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      });
      toast.success("Dados do Pix atualizados! 💎");
    } catch (e) {
      toast.error("Erro ao salvar dados");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-black uppercase italic text-blue-500 text-2xl">Carregando...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <Toaster position="top-center" richColors />
      
      <header className="max-w-md mx-auto flex justify-between items-center mb-8">
        {/* Agora o botão voltar usa o histórico do navegador */}
        <button 
          onClick={() => navigate(-1)} 
          className="text-blue-500 font-black text-xs uppercase italic bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-all"
        >
          ⬅ Voltar
        </button>
        <h1 className="text-xl font-black uppercase italic text-slate-800 tracking-tighter text-right leading-none">
          Ajustes Pix<br/><span className="text-[9px] text-blue-400">Rodhon System</span>
        </h1>
      </header>

      <main className="max-w-md mx-auto bg-white rounded-[3rem] p-8 shadow-xl border-b-8 border-blue-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-500 w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-3 shadow-lg shadow-blue-200">💎</div>
          <p className="text-[10px] font-black uppercase text-blue-400 text-center px-4 leading-tight italic">
            Configure sua chave para que o valor das vendas apareça automático no celular do cliente.
          </p>
        </div>

        <form onSubmit={salvar} className="space-y-6">
          <div>
            <label className="text-[9px] font-black uppercase text-slate-400 ml-4 mb-1 block tracking-widest">Sua Chave Pix</label>
            <input 
              required
              type="text" 
              value={form.chave}
              onChange={(e) => setForm({...form, chave: e.target.value})}
              placeholder="CPF, Celular ou E-mail"
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-bold text-slate-700 outline-none focus:border-blue-300 transition-all"
            />
          </div>

          <div>
            <label className="text-[9px] font-black uppercase text-slate-400 ml-4 mb-1 block tracking-widest">Nome do Beneficiário</label>
            <input 
              required
              type="text" 
              value={form.beneficiario}
              onChange={(e) => setForm({...form, beneficiario: e.target.value})}
              placeholder="EX: RODRIGO SILVA"
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-bold text-slate-700 outline-none focus:border-blue-300 transition-all uppercase"
            />
          </div>

          <div>
            <label className="text-[9px] font-black uppercase text-slate-400 ml-4 mb-1 block tracking-widest">Cidade</label>
            <input 
              required
              type="text" 
              value={form.cidade}
              onChange={(e) => setForm({...form, cidade: e.target.value})}
              placeholder="MARICA"
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-bold text-slate-700 outline-none focus:border-blue-300 transition-all uppercase"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 py-5 rounded-[2rem] text-white font-black text-lg shadow-xl shadow-blue-100 uppercase italic hover:bg-blue-600 active:scale-95 transition-all mt-4"
          >
            {loading ? 'Processando...' : 'Atualizar Dados 🚀'}
          </button>
        </form>

        <div className="mt-8 flex flex-col items-center">
          <p className="text-[8px] font-black text-slate-300 uppercase italic">
            Caldo da Tay — Segurança e Rapidez
          </p>
        </div>
      </main>
    </div>
  );
}