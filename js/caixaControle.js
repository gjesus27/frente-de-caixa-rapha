import { db } from "./firebaseConfig.js";

import {
collection,
addDoc,
getDocs,
updateDoc,
doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let caixaId = null;
let saldo = 0;

async function verificarCaixa(){

const snapshot = await getDocs(collection(db,"caixa"));

snapshot.forEach(d=>{

const c = d.data();

if(c.aberto){

caixaId = d.id;
saldo = c.saldoAtual;

document.getElementById("caixaFechado").style.display="none";
document.getElementById("caixaAberto").style.display="block";

document.getElementById("saldo").innerText="R$ "+saldo;

}

});

}

verificarCaixa();

/* ABRIR CAIXA */

window.abrirCaixa = async ()=>{

const valor = Number(document.getElementById("valorInicial").value);

const docRef = await addDoc(collection(db,"caixa"),{

aberto:true,
valorInicial:valor,
saldoAtual:valor,
dataAbertura:new Date()

});

location.reload();

};

/* RETIRADA */

window.retirada = async ()=>{

const valor = Number(document.getElementById("valorRetirada").value);

saldo -= valor;

await updateDoc(doc(db,"caixa",caixaId),{

saldoAtual:saldo

});

location.reload();

};

/* FECHAR CAIXA */

window.fecharCaixa = async ()=>{

await updateDoc(doc(db,"caixa",caixaId),{

aberto:false,
dataFechamento:new Date()

});

alert("Caixa fechado");

location.reload();

};