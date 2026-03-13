import { db } from "./firebaseConfig.js";

import {
collection,
getDocs,
addDoc,
serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* USUARIO LOGADO */

const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));

if(!usuario){

window.location.href="../pages/login.html";

}

document.getElementById("usuarioLogado").innerText =
"Usuário: " + usuario.nome;


/* LOGOUT */

window.logout = ()=>{

localStorage.removeItem("usuarioLogado");

window.location.href="../pages/login.html";

}


/* ELEMENTOS */

const produtosDiv = document.getElementById("produtos");

const listaCarrinho = document.getElementById("listaCarrinho");

const totalSpan = document.getElementById("total");


/* CARRINHO */

let carrinho = [];


/* CARREGAR PRODUTOS */

async function carregarProdutos(){

produtosDiv.innerHTML="";

const snapshot = await getDocs(collection(db,"produtos"));

snapshot.forEach(doc=>{

const p = doc.data();

if(!p.ativo) return;

const div = document.createElement("div");

div.classList.add("produto");

div.innerHTML = `

<img src="${p.foto}">

<h3>${p.nome}</h3>

<p>R$ ${Number(p.preco).toFixed(2)}</p>

`;

div.onclick = ()=>{

adicionarProduto(p);

};

produtosDiv.appendChild(div);

});

}

carregarProdutos();


/* ADICIONAR PRODUTO */

function adicionarProduto(produto){

carrinho.push(produto);

renderCarrinho();

}


/* REMOVER PRODUTO */

window.removerProduto = (index)=>{

carrinho.splice(index,1);

renderCarrinho();

}


/* RENDERIZAR CARRINHO */

function renderCarrinho(){

listaCarrinho.innerHTML="";

let total = 0;

carrinho.forEach((produto,index)=>{

total += Number(produto.preco);

listaCarrinho.innerHTML += `

<div class="itemCarrinho">

<span>${produto.nome}</span>

<span>R$ ${Number(produto.preco).toFixed(2)}</span>

<button onclick="removerProduto(${index})">❌</button>

</div>

`;

});

totalSpan.innerText = "R$ " + total.toFixed(2);

}


/* FINALIZAR VENDA */

window.finalizarVenda = async (tipoPagamento)=>{

if(carrinho.length == 0){

alert("Nenhum produto no carrinho");

return;

}

let total = 0;

carrinho.forEach(p=>{

total += Number(p.preco);

});


try{

await addDoc(collection(db,"vendas"),{

produtos:carrinho,

valorTotal:total,

formaPagamento:tipoPagamento,

usuario:usuario.nome,

data:serverTimestamp()

});

alert("Venda registrada com sucesso");

carrinho=[];

renderCarrinho();

}catch(erro){

console.error("Erro ao registrar venda:",erro);

}

}