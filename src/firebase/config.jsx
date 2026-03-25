import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Suas credenciais reais do Caldos da Tay
const firebaseConfig = {
  apiKey: "AIzaSyCHEeG-nqZPo1egxkBJcRYBMSyhVZjfjIY",
  authDomain: "vendas-caldos.firebaseapp.com",
  projectId: "vendas-caldos",
  storageBucket: "vendas-caldos.firebasestorage.app",
  messagingSenderId: "1053084678461",
  appId: "1:1053084678461:web:f5fac3c8444ccf98946d54"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta o banco de dados (Firestore) para usarmos no PDV e no Estoque
export const db = getFirestore(app);