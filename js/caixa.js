import { db } from "./firebaseConfig.js";

import {
collection,
addDoc,
serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));

window.abrirCaixa = async ()=>{

const valor = Number(document.getElementById("valorAbertura").value);

await addDoc(collection(db,"caixa"),{

usuario: usuario.nome,

abertura: valor,

status:"aberto",

dataAbertura: serverTimestamp()

});

window.location.href="pdv.html";

}