import { db } from "./firebaseConfig.js";

import {
collection,
addDoc,
getDocs,
updateDoc,
doc,
deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================
// USUARIO (SEM LOOP)
// ==========================
const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));

const elUser = document.getElementById("userName");

if(!usuario){
window.location.href = "login.html";
}else{

elUser.innerText = usuario.nome;

// 🔒 apenas admin acessa
if(!usuario.permissoes.includes("admin")){
alert("Acesso apenas para administradores");
window.location.href = "pdv.html";
}

}

// ==========================
// DOM
// ==========================
document.addEventListener("DOMContentLoaded", ()=>{

const lista = document.getElementById("listaProdutos");
const buscarInput = document.getElementById("buscarProduto");

const modal = document.getElementById("modal");
const abrirModal = document.getElementById("abrirModal");
const fecharModal = document.getElementById("fecharModal");

const nomeInput = document.getElementById("nomeProduto");
const categoriaInput = document.getElementById("categoriaProduto");

const precoInput = document.getElementById("precoProduto");
const precoPromoInput = document.getElementById("precoPromo");

const temEstoqueInput = document.getElementById("temEstoque");
const estoqueInput = document.getElementById("estoqueProduto");

const codigoBarrasInput = document.getElementById("codigoBarras");
const numeroCodigoBarrasInput = document.getElementById("numeroCodigoBarras");

const fotoInput = document.getElementById("fotoProduto");
const preview = document.getElementById("previewImagem");

const btnSalvar = document.getElementById("salvarProduto");
const tituloModal = document.getElementById("tituloModal");

let editandoId = null;
let imagemAtual = "";
let listaProdutos = [];

// ==========================
// MODAL
// ==========================
abrirModal.addEventListener("click", ()=>{
editandoId = null;
imagemAtual = "";
tituloModal.innerText = "Novo Produto";
modal.style.display = "block";
});

fecharModal.addEventListener("click", ()=>{
modal.style.display = "none";
});

// ==========================
// PREVIEW IMAGEM
// ==========================
fotoInput.onchange = ()=>{
const file = fotoInput.files[0];

if(file){
preview.src = URL.createObjectURL(file);
preview.style.display = "block";
}
};

// ==========================
// BUSCA
// ==========================
if(buscarInput){
buscarInput.addEventListener("input", ()=>{

const termo = buscarInput.value.toLowerCase();

const filtrados = listaProdutos.filter(p=>
p.nome.toLowerCase().includes(termo)
);

renderProdutos(filtrados);

});
}

// ==========================
// CAMPOS DINAMICOS
// ==========================
temEstoqueInput.addEventListener("change", ()=>{
estoqueInput.style.display =
temEstoqueInput.value === "sim" ? "block" : "none";
});

codigoBarrasInput.addEventListener("change", ()=>{
numeroCodigoBarrasInput.style.display =
codigoBarrasInput.value === "sim" ? "block" : "none";
});

// ==========================
// FORMATAR PREÇO
// ==========================
function formatar(input){
let v = input.value.replace(/\D/g,"");
v = (Number(v)/100).toFixed(2);
v = v.replace(".",",");
input.value = "R$ " + v;
}

precoInput.addEventListener("input", ()=> formatar(precoInput));
precoPromoInput.addEventListener("input", ()=> formatar(precoPromoInput));

function pegarPrecoNumerico(valor){
return Number(valor.replace("R$","").replace(",",".").trim());
}

// ==========================
// IMG BB
// ==========================
async function uploadImagem(file){

const apiKey = "23ab27ffdb2e70c117fa3d57f8d0cbf9";

const formData = new FormData();
formData.append("image", file);

const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
method: "POST",
body: formData
});

const data = await res.json();

return data.data.url;

}

// ==========================
// SALVAR
// ==========================
async function salvarProduto(){

const nome = nomeInput.value;
const categoria = categoriaInput.value;
const preco = pegarPrecoNumerico(precoInput.value);

const temEstoque = temEstoqueInput.value === "sim";
const estoque = temEstoque ? Number(estoqueInput.value) : null;

const precoPromocional = precoPromoInput.value
? pegarPrecoNumerico(precoPromoInput.value)
: null;

const temCodigo = codigoBarrasInput.value === "sim";
const codigoBarras = temCodigo ? numeroCodigoBarrasInput.value : null;

let imagemURL = imagemAtual;

if(fotoInput.files[0]){
btnSalvar.innerText = "Enviando...";
imagemURL = await uploadImagem(fotoInput.files[0]);
btnSalvar.innerText = "Salvar";
}

if(editandoId){

await updateDoc(doc(db,"produtos",editandoId),{
nome,
categoria,
preco,
precoPromocional,
temEstoque,
estoque,
codigoBarras,
temCodigoBarras: temCodigo,
imagem: imagemURL
});

}else{

await addDoc(collection(db,"produtos"),{
nome,
categoria,
preco,
precoPromocional,
temEstoque,
estoque,
codigoBarras,
temCodigoBarras: temCodigo,
imagem: imagemURL,
ativo:true
});

}

modal.style.display="none";
limpar();
carregarProdutos();

}

btnSalvar.addEventListener("click", salvarProduto);

// ==========================
// LIMPAR
// ==========================
function limpar(){
nomeInput.value="";
categoriaInput.value="";
precoInput.value="";
precoPromoInput.value="";
estoqueInput.value="";
numeroCodigoBarrasInput.value="";
fotoInput.value="";
preview.style.display="none";
imagemAtual="";
}

// ==========================
// EDITAR
// ==========================
window.editarProduto = (p,id)=>{

editandoId = id;
imagemAtual = p.imagem || "";

tituloModal.innerText = "Editar Produto";

nomeInput.value = p.nome;
categoriaInput.value = p.categoria;
precoInput.value = "R$ " + Number(p.preco).toFixed(2).replace(".",",");
precoPromoInput.value = p.precoPromocional 
? "R$ " + Number(p.precoPromocional).toFixed(2).replace(".",",")
: "";

if(p.temEstoque){
temEstoqueInput.value="sim";
estoqueInput.style.display="block";
estoqueInput.value=p.estoque;
}else{
temEstoqueInput.value="nao";
estoqueInput.style.display="none";
}

if(p.temCodigoBarras){
codigoBarrasInput.value="sim";
numeroCodigoBarrasInput.style.display="block";
numeroCodigoBarrasInput.value=p.codigoBarras || "";
}else{
codigoBarrasInput.value="nao";
numeroCodigoBarrasInput.style.display="none";
}

modal.style.display="block";

};

// ==========================
// EXCLUIR
// ==========================
window.excluirProduto = async(id)=>{

if(!confirm("Excluir produto?")) return;

await deleteDoc(doc(db,"produtos",id));
carregarProdutos();

};

// ==========================
// ATIVAR
// ==========================
window.toggleAtivo = async(id, status)=>{

await updateDoc(doc(db,"produtos",id),{
ativo: !status
});

carregarProdutos();

};

// ==========================
// RENDER
// ==========================
function renderProdutos(listaRender){

lista.innerHTML="";

listaRender.forEach(p=>{

lista.innerHTML += `

<div class="cardProduto fadeIn">

${p.imagem ? `<img src="${p.imagem}">` : ""}

<div class="infoProduto">

<h3>${p.nome}</h3>

<p><i class="fa-solid fa-money-bill"></i> R$ ${Number(p.preco).toFixed(2)}</p>

${p.precoPromocional ? 
`<p class="promo"><i class="fa-solid fa-percent"></i> R$ ${Number(p.precoPromocional).toFixed(2)}</p>` 
: ""}

<p><i class="fa-solid fa-layer-group"></i> ${p.categoria || "Sem categoria"}</p>

${p.temEstoque ? 
`<p><i class="fa-solid fa-boxes-stacked"></i> ${p.estoque}</p>` 
: `<p class="semEstoque">Sem controle de estoque</p>`}

${p.temEstoque && p.estoque <= 5 ? 
`<span class="estoqueBaixo">⚠ Estoque baixo</span>` 
: ""}

${p.codigoBarras ? 
`<p><i class="fa-solid fa-barcode"></i> ${p.codigoBarras}</p>` 
: ""}

<p class="status">${p.ativo ? "🟢 Ativo" : "🔴 Inativo"}</p>

</div>

<div class="acoesProduto">

<button class="btnEditar" onclick='editarProduto(${JSON.stringify(p)}, "${p.id}")'>
<i class="fa-solid fa-pen-to-square"></i>
</button>

<button class="btnExcluir" onclick="excluirProduto('${p.id}')">
<i class="fa-solid fa-trash-can"></i>
</button>

<button class="${p.ativo ? "btnAtivo" : "btnInativo"}" onclick="toggleAtivo('${p.id}', ${p.ativo})">
<i class="fa-solid fa-power-off"></i>
</button>

</div>

</div>

`;

});

}

// ==========================
// LISTAR
// ==========================
async function carregarProdutos(){

const snapshot = await getDocs(collection(db,"produtos"));

listaProdutos = [];

snapshot.forEach(docSnap=>{
const p = docSnap.data();
p.id = docSnap.id;
listaProdutos.push(p);
});

renderProdutos(listaProdutos);

}

carregarProdutos();

});