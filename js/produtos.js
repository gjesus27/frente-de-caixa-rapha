import { db } from "./firebaseConfig.js";

import {
collection,
addDoc,
getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const nomeInput = document.getElementById("nomeProduto");
const precoInput = document.getElementById("precoProduto");
const lista = document.getElementById("listaProdutos");
const btnSalvar = document.getElementById("salvarProduto");

async function salvarProduto(){

const nome = nomeInput.value;
const preco = Number(precoInput.value);

await addDoc(collection(db,"produtos"),{

nome:nome,
preco:preco,
ativo:true

});

nomeInput.value="";
precoInput.value="";

carregarProdutos();

}

btnSalvar.addEventListener("click",salvarProduto);

async function carregarProdutos(){

lista.innerHTML="";

const querySnapshot = await getDocs(collection(db,"produtos"));

querySnapshot.forEach((doc)=>{

const produto = doc.data();

lista.innerHTML += `
<div>
${produto.nome} - R$ ${produto.preco}
</div>
`;

});

}

carregarProdutos();