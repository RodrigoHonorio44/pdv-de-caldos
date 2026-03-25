import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp, query, where, getDocs, limit, writeBatch, onSnapshot, getDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

export default function Pdv() {
  const [bebidasEstoque, setBebidasEstoque] = useState([]);
  const [caldos, setCaldos] = useState([]);
  const [caixaAtivo, setCaixaAtivo] = useState(null);
  const [carrinho, setCarrinho] = useState([]);
  const [metodoPgto, setMetodoPgto] = useState('dinheiro');
  const [valorRecebido, setValorRecebido] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [verCarrinho, setVerCarrinho] = useState(false);
  const [valorAbertura, setValorAbertura] = useState('');
  
  // Estados para Data, Hora e Configurações
  const [agora, setAgora] = useState(new Date());
  const [dadosPix, setDadosPix] = useState({ chave: '', beneficiario: '', cidade: 'MARICA' });
  const [mostrarResumo, setMostrarResumo] = useState(false);
  const [resumo, setResumo] = useState({ dinheiro: 0, pix: 0, debito: 0, credito: 0, total: 0 });

  const totalVenda = carrinho.reduce((acc, i) => acc + (i.preco * i.qtd), 0);
  const troco = (metodoPgto === 'dinheiro' && Number(valorRecebido) > totalVenda) ? Number(valorRecebido) - totalVenda : 0;

  // 1. RELÓGIO EM TEMPO REAL
  useEffect(() => {
    const timer = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. BUSCAR CONFIGURAÇÕES DO PIX (CHAVE DINÂMICA)
  useEffect(() => {
    const buscarConfig = async () => {
      try {
        const docSnap = await getDoc(doc(db, "configuracoes", "pix"));
        if (docSnap.exists()) {
          setDadosPix(docSnap.data());
        }
      } catch (e) { 
        console.error("Erro ao buscar chave pix", e); 
      }
    };
    buscarConfig();
  }, [metodoPgto]); // Recarrega se o usuário mudar o método para garantir que pegou a última chave

  // 3. BUSCAR CALDOS (DINÂMICO)
  useEffect(() => {
    const q = query(collection(db, "estoque"), where("tipo", "==", "caldo"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCaldos(lista.sort((a, b) => a.nome.localeCompare(b.nome)));
    });
    return () => unsubscribe();
  }, []);

  // 4. BUSCAR BEBIDAS
  useEffect(() => {
    const q = query(collection(db, "estoque"), where("tipo", "==", "bebida"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBebidasEstoque(lista);
    });
    return () => unsubscribe();
  }, []);

  // 5. VERIFICAR CAIXA ABERTO
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
    if (valorAbertura === '' || Number(valorAbertura) < 0) return toast.warning("Digite o valor inicial!");
    setCarregando(true);
    try {
      const dados = {
        abertura: new Date().toISOString(),
        status: 'aberto',
        valorInicial: Number(valorAbertura),
        vendasTotais: 0,
        contagemItens: {},
        data_abertura: agora.toLocaleDateString('pt-BR'),
        hora_abertura: agora.toLocaleTimeString('pt-BR')
      };
      const docRef = await addDoc(collection(db, "caixas"), dados);
      setCaixaAtivo({ id: docRef.id, ...dados });
      toast.success("Caixa aberto!");
    } catch (e) { toast.error("Erro ao abrir caixa!"); }
    setCarregando(false);
  };

  const finalizarVenda = async () => {
    if (carrinho.length === 0) return;
    if (metodoPgto === 'dinheiro' && (!valorRecebido || Number(valorRecebido) < totalVenda)) {
        return toast.error("Valor insuficiente!");
    }

    setCarregando(true);
    const batch = writeBatch(db);

    try {
      const vendaRef = doc(collection(db, "vendas"));
      batch.set(vendaRef, {
        caixaId: caixaAtivo.id,
        itens: carrinho,
        total: totalVenda,
        pagamento: metodoPgto,
        valorRecebido: metodoPgto === 'dinheiro' ? Number(valorRecebido) : totalVenda,
        troco: metodoPgto === 'dinheiro' ? troco : 0,
        data: serverTimestamp()
      });

      const caixaRef = doc(db, "caixas", caixaAtivo.id);
      const updatesCaixa = { vendasTotais: increment(totalVenda) };

      for (const item of carrinho) {
        updatesCaixa[`contagemItens.${item.id}`] = increment(item.qtd);
        if (item.tipo === 'bebida') {
          const estoqueRef = doc(db, "estoque", item.id);
          batch.update(estoqueRef, {
            quantidade_venda: increment(-item.qtd),
            quantidade_total: increment(-item.qtd)
          });
        }
      }

      batch.update(caixaRef, updatesCaixa);
      await batch.commit();

      toast.success("Venda Concluída! 🚀");
      setCarrinho([]);
      setValorRecebido('');
      setVerCarrinho(false);
    } catch (e) { toast.error("Erro ao salvar venda."); }
    setCarregando(false);
  };

  const adicionar = (item) => {
    if (item.esgotado) return toast.error("Caldo esgotado!");
    if (item.tipo === 'bebida' && item.quantidade_venda <= 0) return toast.error("Bebida acabou!");

    const existe = carrinho.find(i => i.id === item.id);
    if (existe) setCarrinho(carrinho.map(i => i.id === item.id ? { ...i, qtd: i.qtd + 1 } : i));
    else setCarrinho([...carrinho, { ...item, qtd: 1 }]);
  };

  const removerUm = (id) => {
    const item = carrinho.find(i => i.id === id);
    if (item.qtd > 1) setCarrinho(carrinho.map(i => i.id === id ? { ...i, qtd: i.qtd - 1 } : i));
    else setCarrinho(carrinho.filter(i => i.id !== id));
  };

  const prepararFechamento = async () => {
    setCarregando(true);
    try {
      const q = query(collection(db, "vendas"), where("caixaId", "==", caixaAtivo.id));
      const querySnapshot = await getDocs(q);
      const totais = { dinheiro: 0, pix: 0, debito: 0, credito: 0, total: 0 };
      querySnapshot.forEach((doc) => {
        const v = doc.data();
        if (totais[v.pagamento] !== undefined) totais[v.pagamento] += v.total;
        totais.total += v.total;
      });
      setResumo(totais);
      setMostrarResumo(true);
    } catch (e) { toast.error("Erro ao gerar relatório"); }
    setCarregando(false);
  };

  const executarFechamento = async () => {
    setCarregando(true);
    try {
      await updateDoc(doc(db, "caixas", caixaAtivo.id), {
        status: 'fechado',
        fechamento: serverTimestamp(),
        valorVendas: resumo.total,
        valorFinalEmCaixa: resumo.dinheiro + caixaAtivo.valorInicial
      });
      setCaixaAtivo(null);
      setCarrinho([]);
      setMostrarResumo(false);
      toast.success("Caixa encerrado!");
    } catch (e) { toast.error("Erro ao fechar!"); }
    setCarregando(false);
  };

  // Gerador de Payload Pix Estático BRCode
  const gerarPixString = () => {
    if (!dadosPix.chave) return "";
    const valor = totalVenda.toFixed(2);
    const chave = dadosPix.chave.replace(/\s/g, "");
    const nome = (dadosPix.beneficiario || "CALDOS DA TAY").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const cidade = (dadosPix.cidade || "MARICA").toUpperCase();

    // Montagem do payload seguindo padrão BACEN
    return `00020126360014br.gov.bcb.pix01${chave.length.toString().padStart(2, '0')}${chave}52040000530398654${valor.length.toString().padStart(2, '0')}${valor}5802BR59${nome.length.toString().padStart(2, '0')}${nome}60${cidade.length.toString().padStart(2, '0')}${cidade}62070503***6304`;
  };

  if (carregando && !caixaAtivo) return <div className="min-h-screen bg-orange-500 flex items-center justify-center text-white font-black uppercase italic text-3xl">Carregando...</div>;

  if (!caixaAtivo) {
    return (
      <div className="min-h-screen bg-orange-600 flex flex-col items-center justify-center p-6 text-white">
        <Toaster position="top-center" richColors />
        <div className="mb-6 text-center">
            <h1 className="text-3xl font-black italic uppercase">Rodhon System</h1>
            <p className="text-orange-200 text-xs font-bold">{agora.toLocaleDateString()} — {agora.toLocaleTimeString()}</p>
        </div>
        <div className="bg-white text-gray-800 w-full max-w-sm rounded-[3rem] p-8 shadow-2xl">
          <h2 className="text-2xl font-black italic uppercase text-center mb-6 text-orange-600">Abrir Caixa</h2>
          <input type="number" value={valorAbertura} onChange={(e) => setValorAbertura(e.target.value)} className="w-full bg-gray-50 border-2 border-orange-100 rounded-2xl py-5 text-4xl font-black text-center outline-none mb-6 text-orange-600" placeholder="0,00" />
          <button onClick={abrirCaixa} className="w-full bg-green-500 py-5 rounded-[2rem] text-white font-black text-xl shadow-xl uppercase italic hover:bg-green-600 transition-all active:scale-95">Iniciar Turno 🥣</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Toaster position="top-center" richColors />

      {/* MODAL FECHAMENTO */}
      {mostrarResumo && (
        <div className="fixed inset-0 z-[100] bg-orange-600/95 backdrop-blur-md p-6 flex items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-8 shadow-2xl text-gray-800">
            <h2 className="text-xl font-black uppercase text-center mb-6 border-b pb-4">Conferência Final</h2>
            <div className="space-y-3 mb-6 font-bold">
              <div className="flex justify-between border-b pb-2 text-blue-600"><span>Fundo Inicial:</span> <span>R$ {caixaAtivo.valorInicial.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>💵 Dinheiro:</span> <span>R$ {resumo.dinheiro.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>💎 PIX:</span> <span>R$ {resumo.pix.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>💳 Cartão:</span> <span>R$ {(resumo.debito + resumo.credito).toFixed(2)}</span></div>
              <div className="flex justify-between border-t pt-2 text-lg font-black text-orange-600 uppercase"><span>Total Vendas:</span> <span>R$ {resumo.total.toFixed(2)}</span></div>
              <div className="bg-green-50 p-4 rounded-2xl border border-green-100 text-center mt-4">
                <p className="text-[10px] uppercase text-green-600 font-black">Dinheiro + Fundo esperado:</p>
                <p className="text-2xl font-black text-green-700">R$ {(resumo.dinheiro + caixaAtivo.valorInicial).toFixed(2)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setMostrarResumo(false)} className="flex-1 py-4 font-black bg-gray-100 rounded-2xl text-gray-400 uppercase">Voltar</button>
              <button onClick={executarFechamento} className="flex-[2] bg-red-500 text-white px-6 py-4 rounded-2xl font-black uppercase italic shadow-lg hover:bg-red-600 transition-all">Fechar Agora 🏁</button>
            </div>
          </div>
        </div>
      )}

      <header className="p-4 bg-white shadow-sm flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
            <Link to="/" className="text-orange-500 font-black text-[10px] italic uppercase px-2 hover:bg-orange-50 py-2 rounded-lg transition-all">⬅ Sair</Link>
            
            {/* BOTÃO DE ATALHO PARA CONFIG PIX */}
            <Link to="/config-pix" className="bg-blue-50 text-blue-500 p-2 rounded-xl text-[9px] font-black uppercase hover:bg-blue-100 transition-all flex items-center gap-1">
              ⚙️ Config Pix
            </Link>
        </div>
        
        <div className="text-center">
            <p className="text-[11px] font-black text-gray-800 leading-none">{agora.toLocaleTimeString()}</p>
            <p className="text-[8px] font-bold text-gray-400 uppercase">{agora.toLocaleDateString()}</p>
        </div>

        <button onClick={prepararFechamento} className="bg-red-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-red-600 transition-all">Encerrar</button>
      </header>

      <main className="p-3 grid grid-cols-2 lg:grid-cols-4 gap-2 pb-24 overflow-y-auto">
        <div className="col-span-full border-b pb-1 mt-2 mb-1">
            <span className="text-[10px] font-black text-orange-500 uppercase italic">🥣 Caldos</span>
        </div>
        
        {caldos.map(item => (
          <button 
            key={item.id} 
            onClick={() => adicionar(item)} 
            className={`p-4 h-28 rounded-[2rem] shadow-sm border-b-4 flex flex-col justify-center items-center relative transition-all active:scale-95 ${item.esgotado ? 'bg-gray-200 grayscale border-gray-300' : 'bg-white border-gray-100 hover:border-orange-200'}`}
          >
            {item.esgotado && <span className="absolute top-2 bg-red-500 text-white text-[7px] font-black px-2 py-0.5 rounded-full uppercase">Esgotado</span>}
            <span className="text-[10px] font-black text-gray-400 uppercase leading-tight mb-1 text-center line-clamp-2">{item.nome}</span>
            <span className={`text-lg font-black italic ${item.esgotado ? 'text-gray-400' : 'text-orange-500'}`}>R$ {Number(item.preco).toFixed(0)}</span>
          </button>
        ))}

        <div className="col-span-full border-b pb-1 mt-4 mb-1">
            <span className="text-[10px] font-black text-blue-500 uppercase italic">🍺 Bebidas</span>
        </div>
        {bebidasEstoque.map(item => (
          <button 
            key={item.id} 
            onClick={() => adicionar(item)} 
            className="bg-white p-4 h-28 rounded-[2rem] shadow-sm border-b-4 border-gray-100 flex flex-col justify-center items-center relative active:scale-95 transition-all hover:border-blue-200"
          >
            <span className="text-[10px] font-black text-gray-400 uppercase leading-tight mb-1 text-center line-clamp-2">{item.nome}</span>
            <span className="text-lg font-black text-orange-500 italic">R$ {Number(item.preco).toFixed(0)}</span>
            <span className={`absolute bottom-2 right-4 text-[8px] font-bold ${item.quantidade_venda < 5 ? 'text-red-500' : 'text-gray-300'}`}>{item.quantidade_venda} UN</span>
          </button>
        ))}
      </main>

      {/* BOTÃO MOBILE CARRINHO */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 lg:hidden flex gap-2 z-30">
         <button onClick={() => setVerCarrinho(true)} className="flex-grow bg-orange-500 text-white py-4 rounded-2xl font-black flex justify-between px-6 items-center shadow-lg active:scale-95 transition-all">
          <span className="text-xs uppercase italic">{carrinho.reduce((a,b)=>a+b.qtd,0)} ITENS</span>
          <span className="text-xl italic font-mono">R$ {totalVenda.toFixed(2)}</span>
        </button>
      </div>

      {/* PAINEL CARRINHO E PIX */}
      {(verCarrinho || (typeof window !== 'undefined' && window.innerWidth > 1024)) && (
        <div className={`fixed inset-0 z-[60] lg:z-20 bg-black/60 backdrop-blur-sm lg:relative lg:bg-transparent lg:inset-auto lg:block ${verCarrinho ? 'flex' : 'hidden'} items-end`}>
          <div className="bg-white w-full max-h-[95vh] rounded-t-[3rem] p-6 shadow-2xl flex flex-col lg:fixed lg:right-4 lg:top-20 lg:w-96 lg:rounded-[3rem] lg:h-[85vh] animate-in slide-in-from-bottom lg:animate-none overflow-y-auto scrollbar-hide">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-xl font-black uppercase italic text-gray-800">Seu Pedido</h2>
              <button onClick={() => setVerCarrinho(false)} className="lg:hidden text-gray-300 text-4xl leading-none px-2">×</button>
            </div>

            <div className="flex-grow space-y-2 mb-4">
              {carrinho.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <div className="flex flex-col">
                    <span className="font-bold text-[10px] uppercase">{item.nome}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <button onClick={() => removerUm(item.id)} className="bg-white border w-8 h-8 rounded-full font-black shadow-sm">-</button>
                      <span className="font-black text-sm w-4 text-center">{item.qtd}</span>
                      <button onClick={() => adicionar(item)} className="bg-white border w-8 h-8 rounded-full font-black shadow-sm">+</button>
                    </div>
                  </div>
                  <span className="font-black text-orange-500 text-sm italic">R$ {(item.preco * item.qtd).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="grid grid-cols-2 gap-2">
                {['dinheiro', 'pix', 'debito', 'credito'].map((m) => (
                  <button key={m} onClick={() => setMetodoPgto(m)} className={`py-3 rounded-xl font-black text-[9px] uppercase transition-all ${metodoPgto === m ? 'bg-slate-900 text-white shadow-md scale-105' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                    {m === 'dinheiro' ? '💵 Dinheiro' : m === 'pix' ? '💎 PIX' : '💳 ' + m}
                  </button>
                ))}
              </div>

              {metodoPgto === 'dinheiro' && (
                <div className="animate-in zoom-in-95">
                  <label className="text-[9px] font-black uppercase text-gray-400 ml-2">Recebido:</label>
                  <input type="number" value={valorRecebido} onChange={(e) => setValorRecebido(e.target.value)} className="w-full bg-orange-50 p-3 rounded-xl font-black text-2xl text-center text-orange-600 border-2 border-orange-100 outline-none" placeholder="0,00" />
                  {troco > 0 && <div className="mt-1 text-center bg-green-500 text-white rounded-lg py-1 text-xs font-black uppercase italic">Troco: R$ {troco.toFixed(2)}</div>}
                </div>
              )}

              {metodoPgto === 'pix' && totalVenda > 0 && (
                <div className="bg-blue-50 p-4 rounded-[2rem] flex flex-col items-center gap-2 border-2 border-blue-100 animate-in zoom-in-95">
                    <p className="text-[9px] font-black text-blue-600 uppercase italic">Pague com Pix</p>
                    <div className="bg-white p-2 rounded-2xl shadow-inner border border-blue-100">
                        {dadosPix.chave ? (
                           <QRCodeSVG value={gerarPixString()} size={140} />
                        ) : (
                          <div className="w-[140px] h-[140px] flex items-center justify-center text-[8px] text-red-500 font-bold text-center uppercase">
                            Chave Pix não configurada!
                          </div>
                        )}
                    </div>
                    {dadosPix.chave && (
                      <button 
                          onClick={() => { navigator.clipboard.writeText(gerarPixString()); toast.info("Copia e Cola copiado!"); }}
                          className="text-[8px] font-black text-blue-400 uppercase underline mt-1"
                      >
                          Copiar Código Pix
                      </button>
                    )}
                </div>
              )}

              <div className="flex justify-between text-2xl font-black text-gray-900 px-1 italic">
                <span className="text-[10px] self-center text-gray-400 uppercase">Total:</span>
                <span className="text-orange-600">R$ {totalVenda.toFixed(2)}</span>
              </div>

              <button 
                onClick={finalizarVenda} 
                disabled={carregando || carrinho.length === 0} 
                className={`w-full py-5 rounded-3xl font-black text-xl shadow-xl uppercase italic transition-all active:scale-95 ${carregando || carrinho.length === 0 ? 'bg-gray-300 text-gray-400' : 'bg-green-500 text-white hover:bg-green-600'}`}
              >
                {carregando ? 'SALVANDO...' : 'Concluir 🚀'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}