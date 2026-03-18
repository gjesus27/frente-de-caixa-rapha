import { db } from "./firebaseConfig.js";

import {
collection,
addDoc,
getDocs,
updateDoc,
doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// USER
const auth = getAuth();

onAuthStateChanged(auth, (user) => {

const userNameEl = document.getElementById("userName");

if(user){
userNameEl.textContent = user.displayName || user.email;
}else{
userNameEl.textContent = "Não logado";
}

});

// ELEMENTOS
const lista = document.getElementById("listaProdutos");

const modal = document.getElementById("modal");
const abrirModal = document.getElementById("abrirModal");
const fecharModal = document.getElementById("fecharModal");

const nomeInput = document.getElementById("nomeProduto");
const categoriaInput = document.getElementById("categoriaProduto");
const precoInput = document.getElementById("precoProduto");
const estoqueInput = document.getElementById("estoqueProduto");
const codigoBarrasInput = document.getElementById("codigoBarras");
const fotoInput = document.getElementById("fotoProduto");

const btnSalvar = document.getElementById("salvarProduto");

// MODAL
abrirModal.onclick = () => modal.style.display = "block";
fecharModal.onclick = () => modal.style.display = "none";

// CONVERTER IMAGEM
function converterImagem(file){
return new Promise((resolve,reject)=>{
const reader = new FileReader();
reader.readAsDataURL(file);
reader.onload = () => resolve(reader.result);
reader.onerror = error => reject(error);
});
}

// SALVAR
async function salvarProduto(){

const nome = nomeInput.value;
const categoria = categoriaInput.value;
const preco = Number(precoInput.value);
const estoque = Number(estoqueInput.value);
const codigoBarras = codigoBarrasInput.value === "sim";

let imagemBase64 = "";

if(fotoInput.files[0]){
imagemBase64 = await converterImagem(fotoInput.files[0]);
}

await addDoc(collection(db,"produtos"),{
nome,
categoria,
preco,
estoque,
codigoBarras,
imagem: imagemBase64,
promocao: false
});

modal.style.display = "none";
limparCampos();
carregarProdutos();
}

btnSalvar.addEventListener("click", salvarProduto);

// LIMPAR
function limparCampos(){
nomeInput.value = "";
categoriaInput.value = "";
precoInput.value = "";
estoqueInput.value = "";
fotoInput.value = "";
}

// ALTERAÇÕES
async function alterarPreco(id, precoAtual){
const novoPreco = prompt("Novo preço:", precoAtual);
if(!novoPreco) return;

await updateDoc(doc(db,"produtos",id),{
preco: Number(novoPreco)
});

carregarProdutos();
}

async function alterarEstoque(id, estoqueAtual){
const novoEstoque = prompt("Novo estoque:", estoqueAtual);
if(!novoEstoque) return;

await updateDoc(doc(db,"produtos",id),{
estoque: Number(novoEstoque)
});

carregarProdutos();
}

async function togglePromocao(id, statusAtual){
await updateDoc(doc(db,"produtos",id),{
promocao: !statusAtual
});

carregarProdutos();
}

// LISTAR
async function carregarProdutos(){

lista.innerHTML = "";

const querySnapshot = await getDocs(collection(db,"produtos"));

querySnapshot.forEach((docSnap)=>{

const produto = docSnap.data();
const id = docSnap.id;

lista.innerHTML += `
<div class="cardProduto">

${produto.imagem ? `<img src="${produto.imagem}">` : ""}

<div class="infoProduto">
<h3>${produto.nome}</h3>
<p>Categoria: ${produto.categoria}</p>
<p>Preço: R$ ${produto.preco}</p>
<p>Estoque: ${produto.estoque}</p>
<p>${produto.promocao ? "🔥 Promoção ativa" : ""}</p>
</div>

<div class="acoesProduto">
<button onclick="alterarPreco('${id}', ${produto.preco})">Preço</button>
<button onclick="alterarEstoque('${id}', ${produto.estoque})">Estoque</button>
<button onclick="togglePromocao('${id}', ${produto.promocao})">Promo</button>
</div>

</div>
`;
});

window.alterarPreco = alterarPreco;
window.alterarEstoque = alterarEstoque;
window.togglePromocao = togglePromocao;

}

carregarProdutos();