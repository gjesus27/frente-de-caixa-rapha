import { db } from "./firebaseConfig.js";

import {
collection,
getDocs,
updateDoc,
doc,
addDoc,
query,
where,
getDoc,
onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ========================== */
/* ELEMENTOS */
/* ========================== */

const produtosDiv = document.getElementById("produtos");
const carrinhoDiv = document.getElementById("carrinho");
const totalSpan = document.getElementById("total");
const listaPedidosDiv = document.getElementById("listaPedidos");

/* ========================== */
/* VARIÁVEIS */
/* ========================== */

let carrinho = [];
let total = 0;
let listaProdutos = [];

let caixaId = null;
let caixaAberto = false;

/* ========================== */
/* USUARIO */
/* ========================== */

const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));

if(!usuario){
window.location.href="login.html";
}

document.getElementById("usuarioLogado").innerText = usuario.nome;

if(usuario.permissoes.includes("admin")){
document.getElementById("menuAdmin").classList.remove("hidden");
}

/* ========================== */
/* MODAL */
/* ========================== */

function abrirModal(titulo,conteudo,acaoConfirmar,acaoCancelar){

const modal = document.createElement("div");

modal.className = "modalFundo";

modal.innerHTML = `
<div class="modalBox">

<h2>${titulo}</h2>

<div class="modalConteudo">
${conteudo}
</div>

<div class="modalBotoes">
<button id="btnConfirmar">
<i class="fa-solid fa-check"></i> Confirmar
</button>

<button id="btnCancelar">
<i class="fa-solid fa-xmark"></i> Cancelar
</button>
</div>

</div>
`;

document.body.appendChild(modal);

document.getElementById("btnConfirmar").onclick = async ()=>{
if(acaoConfirmar) await acaoConfirmar();
modal.remove();
};

document.getElementById("btnCancelar").onclick = ()=>{
modal.remove();
if(acaoCancelar) acaoCancelar();
};

}

/* ========================== */
/* VERIFICAR CAIXA */
/* ========================== */

async function verificarCaixa(){

const q = query(
collection(db,"caixa"),
where("usuario","==",usuario.nome),
where("aberto","==",true)
);

const snapshot = await getDocs(q);

if(!snapshot.empty){

snapshot.forEach(d=>{
caixaId = d.id;
});

caixaAberto = true;

abrirModal(
"Caixa aberto",
`<p>Deseja continuar com seu caixa?</p>`,
()=>{},
()=>logout()
);

}else{

abrirModal(
"Abrir Caixa",
`<input id="valorInicial" type="number" placeholder="Valor inicial">`,
()=>abrirCaixa(),
()=>logout()
);

}

}

verificarCaixa();

/* ========================== */
/* ABRIR CAIXA */
/* ========================== */

async function abrirCaixa(){

const valor = Number(document.getElementById("valorInicial").value);

if(!valor){
alert("Informe o valor inicial");
return;
}

const docRef = await addDoc(collection(db,"caixa"),{

usuario: usuario.nome,
aberto: true,
valorInicial: valor,
saldoAtual: valor,
dataAbertura: new Date()

});

caixaId = docRef.id;
caixaAberto = true;

alert("Caixa aberto");

}

/* ========================== */
/* FECHAR CAIXA */
/* ========================== */

window.fecharCaixaManual = async ()=>{

if(!caixaAberto){
alert("Nenhum caixa aberto");
return;
}

const q = query(
collection(db,"vendas"),
where("idCaixa","==",caixaId)
);

const snapshot = await getDocs(q);

let dinheiro=0,pix=0,debito=0,credito=0,ticket=0;

/* 🔥 AQUI ESTÁ O QUE FALTAVA */
snapshot.forEach(docSnap=>{

const venda = docSnap.data();

if(venda.pagamentos){

venda.pagamentos.forEach(p=>{

switch(p.tipo){
case "dinheiro": dinheiro+=p.valor; break;
case "pix": pix+=p.valor; break;
case "debito": debito+=p.valor; break;
case "credito": credito+=p.valor; break;
case "ticket": ticket+=p.valor; break;
}

});

}else{

// fallback antigo
const valor = Number(venda.total||0);

switch(venda.formaPagamento){
case "dinheiro": dinheiro+=valor; break;
case "pix": pix+=valor; break;
case "debito": debito+=valor; break;
case "credito": credito+=valor; break;
}

}

});

const caixaRef = doc(db,"caixa",caixaId);
const caixaSnap = await getDoc(caixaRef);

const saldoAtual = caixaSnap.data().saldoAtual;

abrirModal(

"Fechamento de Caixa",

`
<p><i class="fa-solid fa-money-bill"></i> Dinheiro: R$ ${dinheiro.toFixed(2)}</p>
<p><i class="fa-brands fa-pix"></i> Pix: R$ ${pix.toFixed(2)}</p>
<p><i class="fa-solid fa-credit-card"></i> Débito: R$ ${debito.toFixed(2)}</p>
<p><i class="fa-solid fa-credit-card"></i> Crédito: R$ ${credito.toFixed(2)}</p>
<p><i class="fa-solid fa-ticket"></i> Ticket: R$ ${ticket.toFixed(2)}</p>

<hr>

<p><b>Total vendido:</b> R$ ${(dinheiro+pix+debito+credito+ticket).toFixed(2)}</p>
<p><b>Saldo esperado:</b> R$ ${saldoAtual.toFixed(2)}</p>
`,

async ()=>{

await updateDoc(doc(db,"caixa",caixaId),{
aberto:false,
dataFechamento:new Date()
});

alert("Caixa fechado");

caixaAberto=false;

}

);

};

/* ========================== */
/* RETIRADA */
/* ========================== */

window.retirada = ()=>{

abrirModal(

"Registrar retirada",

`
<input id="valorRetirada" type="number" placeholder="Valor">
<input id="motivoRetirada" placeholder="Motivo">
`,

()=>registrarRetirada()

);

};

async function registrarRetirada(){

const valor = Number(document.getElementById("valorRetirada").value);
const motivo = document.getElementById("motivoRetirada").value;

if(!valor) return;

const caixaRef = doc(db,"caixa",caixaId);
const caixaSnap = await getDoc(caixaRef);

const saldoAtual = caixaSnap.data().saldoAtual;

await updateDoc(caixaRef,{
saldoAtual: saldoAtual - valor
});

await addDoc(collection(db,"retiradas"),{
valor,
motivo,
usuario:usuario.nome,
caixaId,
data:new Date()
});

alert("Retirada registrada");

}

/* ========================== */
/* PRODUTOS */
/* ========================== */

async function carregarProdutos(){

const snapshot = await getDocs(collection(db,"produtos"));

listaProdutos=[];

snapshot.forEach(docSnap=>{

const p = docSnap.data();

// 🔥 não vamos mais travar por "ativo"
p.id = docSnap.id;

// garante padrão
p.nome = p.nome || "Produto sem nome";
p.preco = Number(p.preco || 0);
p.imagem = p.imagem || "https://via.placeholder.com/100";

listaProdutos.push(p);

});

renderProdutos(listaProdutos);

}

carregarProdutos();

function renderProdutos(lista){

produtosDiv.innerHTML="";

lista.forEach(p=>{

const div = document.createElement("div");

div.classList.add("produto");

div.innerHTML=`
<img src="${p.imagem}">
<h4>${p.nome}</h4>
<p>R$ ${p.preco.toFixed(2)}</p>
`;

div.onclick=()=>{
carrinho.push(p);
renderCarrinho();
};

produtosDiv.appendChild(div);

});

}

/* ========================== */
/* FILTRO */
/* ========================== */

window.filtrarProdutos=()=>{

const termo=document.getElementById("pesquisaProduto").value.toLowerCase();

const filtrados=listaProdutos.filter(p=>
p.nome.toLowerCase().includes(termo)
);

renderProdutos(filtrados);

};

/* ========================== */
/* CARRINHO */
/* ========================== */

function renderCarrinho(){

carrinhoDiv.innerHTML="";
total=0;

carrinho.forEach((item,i)=>{

total+=Number(item.preco);

const div=document.createElement("div");

div.classList.add("item");

div.innerHTML=`
<span>${item.nome}</span>
<div>
R$ ${item.preco}
<button onclick="remover(${i})">X</button>
</div>
`;

carrinhoDiv.appendChild(div);

});

document.getElementById("badgeCarrinho").innerText = carrinho.length;

}

window.remover=(i)=>{
carrinho.splice(i,1);
renderCarrinho();
};

/* ========================== */
/* FINALIZAR VENDA */
/* ========================== */

window.finalizar=async(tipo)=>{

if(!caixaAberto){
alert("Abra o caixa");
return;
}

if(carrinho.length===0){
alert("Adicione produtos");
return;
}

let itens=carrinho.map(p=>({

idProduto:p.id,
nome:p.nome,
preco:Number(p.preco),
quantidade:1

}));

await addDoc(collection(db,"vendas"),{

criadoEm:new Date(),
formaPagamento:tipo,

idCaixa:caixaId,

idUsuario:usuario.nome,
nomeUsuario:usuario.nome,

itens,

subtotal:total,
total,

tipo:"balcao",
status:"finalizado"

});

const caixaRef=doc(db,"caixa",caixaId);
const caixaSnap=await getDoc(caixaRef);

await updateDoc(caixaRef,{
saldoAtual:caixaSnap.data().saldoAtual+total
});

carrinho=[];
renderCarrinho();

abrirModal(
"Venda Finalizada",
`
<div style="text-align:center">

<h2 style="color:#00c853;">✅ Venda concluída</h2>

<p><b>Total:</b> R$ ${total.toFixed(2)}</p>

${pagamentos.map(p=>`
<p>
${p.tipo.toUpperCase()}: R$ ${p.valor.toFixed(2)}
</p>
`).join("")}

${troco > 0 ? `<p><b>Troco:</b> R$ ${troco.toFixed(2)}</p>` : ""}

</div>
`,
()=>{}
);

};

/* ========================== */
/* PEDIDOS DELIVERY */
/* ========================== */

function ouvirPedidos(){

const q=query(
collection(db,"pedidos"),
where("status","==","aguardando_preparo")
);

onSnapshot(q,(snapshot)=>{

snapshot.docChanges().forEach(change=>{

if(change.type==="added"){

const pedido=change.doc.data();
pedido.id=change.doc.id;

mostrarPopupPedido(pedido);

}

});

});

}

ouvirPedidos();

function mostrarPopupPedido(pedido){

abrirModal(

`Novo Pedido #${pedido.numero}`,

`
<p>Cliente: ${pedido.cliente}</p>
<p>Total: R$ ${pedido.total}</p>
`,

()=>iniciarPreparo(pedido),
()=>adicionarEmEspera(pedido)

);

}

function adicionarEmEspera(pedido){

const div=document.createElement("div");

div.classList.add("pedidoCard");
div.id="pedido_"+pedido.id;

div.innerHTML=`

<div>

<div class="pedidoStatus statusAmarelo">
Pedido #${pedido.numero}
</div>

<div>Aguardando preparo</div>

</div>

<div id="timer_${pedido.id}">00:00</div>

<button onclick="iniciarPreparoManual('${pedido.id}')">
Iniciar
</button>

`;

listaPedidosDiv.appendChild(div);

iniciarTimer(pedido.id);

}

function iniciarTimer(id){

let segundos=0;

const el=document.getElementById("timer_"+id);
const card=document.querySelector("#pedido_"+id+" .pedidoStatus");

setInterval(()=>{

segundos++;

const min=Math.floor(segundos/60);
const sec=segundos%60;

el.innerText=
`${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;

if(segundos>300){

card.classList.remove("statusAmarelo");
card.classList.add("statusVermelho");

}

},1000);

}

/* ========================== */
/* PREPARO */
/* ========================== */

async function iniciarPreparo(pedido){

const pedidoRef=doc(db,"pedidos",pedido.id);
const snap=await getDoc(pedidoRef);

const dados=snap.data();

if(dados.iniciadoPor){

alert("Pedido já iniciado");
return;

}

await updateDoc(pedidoRef,{
status:"em_preparo",
iniciadoPor:usuario.nome,
horaInicio:new Date()
});

mostrarNotaPedido(dados,pedido.id);

}

window.iniciarPreparoManual=async(id)=>{

const pedidoRef=doc(db,"pedidos",id);
const snap=await getDoc(pedidoRef);

const pedido=snap.data();
pedido.id=id;

if(pedido.iniciadoPor){
alert("Pedido já iniciado");
return;
}

await updateDoc(pedidoRef,{
status:"em_preparo",
iniciadoPor:usuario.nome,
horaInicio:new Date()
});

mostrarNotaPedido(pedido,id);

};

function mostrarNotaPedido(pedido,id){

let itensHTML="";

pedido.itens.forEach(item=>{

itensHTML+=`

<div class="linhaItem">
<span>${item.quantidade}x ${item.nome}</span>
<span>R$ ${(item.preco*item.quantidade).toFixed(2)}</span>
</div>

`;

if(item.observacao){

itensHTML+=`
<div class="obsItem">
Obs: ${item.observacao}
</div>
`;

}

});

const div=document.createElement("div");

div.classList.add("notaPedido");

div.innerHTML=`

<h2>Pedido #${pedido.numero}</h2>

<div>${pedido.cliente}</div>

<div class="itensPedido">
${itensHTML}
</div>

<hr>

<div>
<b>Total:</b> R$ ${pedido.total}
</div>

<button onclick="finalizarPreparo('${id}')">
Finalizar preparo
</button>

`;

document.body.appendChild(div);

}

window.finalizarPreparo=async(id)=>{

await updateDoc(doc(db,"pedidos",id),{
status:"saiu_entrega",
horaFimPreparo:new Date()
});

alert("Pedido pronto");

document.querySelector(".notaPedido").remove();

};

/* ========================== */
/* ADMIN */
/* ========================== */

window.irProdutos=()=>{
window.location.href="produtos.html";
};

window.irEntregas=()=>{
window.location.href="entregador.html";
};

window.irDashboard=()=>{
window.location.href="dashboard.html";
};

/* ========================== */
/* LOGOUT */
/* ========================== */

window.logout=()=>{
localStorage.removeItem("usuarioLogado");
window.location.href="login.html";
};

/* ========================== */
/* NOVO SISTEMA DE PAGAMENTO */
/* ========================== */

let pagamentosTemp = [];

/* PAGAMENTO SIMPLES COM TROCO */
window.pagarSimples = (tipo)=>{

if(total <= 0){
alert("Carrinho vazio");
return;
}

if(tipo === "dinheiro"){

abrirModal(
"Pagamento em Dinheiro",

`
<p>Total: R$ ${total.toFixed(2)}</p>
<input id="valorPago" type="number" placeholder="Valor recebido">
<p id="trocoTexto"></p>
`,

async ()=>{

const pago = Number(document.getElementById("valorPago").value);

if(!pago){
alert("Informe o valor");
return;
}

const troco = pago - total;

await finalizarVendaCompleta([
{tipo:"dinheiro", valor: total}
], troco);

}

);

setTimeout(()=>{

document.getElementById("valorPago").oninput = ()=>{
const pago = Number(document.getElementById("valorPago").value);
const troco = pago - total;

document.getElementById("trocoTexto").innerText =
troco >= 0 ? "Troco: R$ "+troco.toFixed(2) : "Faltam: R$ "+Math.abs(troco).toFixed(2);
};

},100);

}else{

finalizarVendaCompleta([
{tipo, valor: total}
],0);

}

};

/* PAGAMENTO MISTO */
window.abrirPagamentoMisto = ()=>{

pagamentosTemp = [];

abrirModal(
"Pagamento Misto",

`
<select id="tipoPagamento">
<option value="dinheiro">Dinheiro</option>
<option value="pix">PIX</option>
<option value="debito">Débito</option>
<option value="credito">Crédito</option>
<option value="ticket">Ticket</option>
</select>

<input id="valorPagamento" type="number" placeholder="Valor">

<button onclick="adicionarPagamento()">Adicionar</button>

<div id="listaPagamentos"></div>

<p>Total: R$ ${total.toFixed(2)}</p>
<p id="totalPago">Pago: R$ 0.00</p>
<p id="restante"></p>
`,

()=>confirmarPagamentoMisto()

);

};

/* ADICIONAR PAGAMENTO */
window.adicionarPagamento = ()=>{

const tipo = document.getElementById("tipoPagamento").value;
const valor = Number(document.getElementById("valorPagamento").value);

if(!valor) return;

pagamentosTemp.push({tipo,valor});

atualizarPagamentos();

};

/* ATUALIZA TELA */
function atualizarPagamentos(){

const lista = document.getElementById("listaPagamentos");

if(!lista) return;

lista.innerHTML = "";

let totalPago = 0;

pagamentosTemp.forEach(p=>{

totalPago += p.valor;

lista.innerHTML += `<p>${p.tipo}: R$ ${p.valor.toFixed(2)}</p>`;

});

document.getElementById("totalPago").innerText =
"Pago: R$ "+totalPago.toFixed(2);

const resto = total - totalPago;

document.getElementById("restante").innerText =
resto > 0 ? "Falta: R$ "+resto.toFixed(2) :
"Troco: R$ "+Math.abs(resto).toFixed(2);

}

/* CONFIRMAR MISTO */
async function confirmarPagamentoMisto(){

let totalPago = pagamentosTemp.reduce((s,p)=>s+p.valor,0);

if(totalPago < total){
alert("Pagamento incompleto");
return;
}

const troco = totalPago - total;

await finalizarVendaCompleta(pagamentosTemp,troco);

}

/* FINALIZAÇÃO REAL */
async function finalizarVendaCompleta(pagamentos,troco){

if(!caixaAberto){
alert("Abra o caixa");
return;
}

if(carrinho.length===0){
alert("Carrinho vazio");
return;
}

let itens = carrinho.map(p=>({
idProduto:p.id,
nome:p.nome,
preco:Number(p.preco),
quantidade:1
}));

await addDoc(collection(db,"vendas"),{

criadoEm:new Date(),
pagamentos,

troco,

idCaixa:caixaId,

idUsuario:usuario.nome,
nomeUsuario:usuario.nome,

itens,

subtotal:total,
total,

tipo:"balcao",
status:"finalizado"

});

const caixaRef=doc(db,"caixa",caixaId);
const caixaSnap=await getDoc(caixaRef);

await updateDoc(caixaRef,{
saldoAtual:caixaSnap.data().saldoAtual+total
});

carrinho=[];
renderCarrinho();

alert("Venda finalizada");

}

window.toggleMenu = ()=>{

const menu = document.getElementById("menuMobile");

menu.classList.toggle("ativo");

};

function mostrarLoading(){
const div = document.createElement("div");
div.className = "loading";
div.id = "loading";

div.innerHTML = `<div class="spinner"></div>`;

document.body.appendChild(div);
}

function esconderLoading(){
document.getElementById("loading")?.remove();
}

window.trocarTela = (tela)=>{

document.querySelector(".areaProdutos").style.display = "none";
document.querySelector(".caixa").style.display = "none";

if(tela === "produtos"){
document.querySelector(".areaProdutos").style.display = "block";
}

if(tela === "carrinho"){
document.querySelector(".caixa").style.display = "block";
document.querySelector(".pagamentos").style.display = "none";
}

if(tela === "pagamento"){
document.querySelector(".caixa").style.display = "block";
document.querySelector(".pagamentos").style.display = "grid";
}

};

function renderCategorias(){

const categorias = [...new Set(listaProdutos.map(p=>p.categoria || "outros"))];

const div = document.getElementById("categorias");

div.innerHTML = `
<button onclick="filtrarCategoria('todas')">
🧾 Todas
</button>
`;

categorias.forEach(cat=>{

const icone = iconesCategorias[cat] || "📦";

div.innerHTML += `
<button onclick="filtrarCategoria('${cat}')">
${icone} ${cat}
</button>
`;

});

}

window.filtrarCategoria = (cat)=>{

if(cat === "todas"){
renderProdutos(listaProdutos);
return;
}

const filtrados = listaProdutos.filter(p=>p.categoria === cat);

renderProdutos(filtrados);

};

const iconesCategorias = {
acai: "🍓",
bebidas: "🥤",
combos: "🍔",
sobremesa: "🍰",
outros: "📦"
};

window.filtrarCategoria = (cat)=>{

document.querySelectorAll(".categorias button")
.forEach(b=>b.classList.remove("ativa"));

event.target.classList.add("ativa");

if(cat === "todas"){
renderProdutos(listaProdutos);
return;
}

const filtrados = listaProdutos.filter(p=>p.categoria === cat);

renderProdutos(filtrados);

};

document.querySelectorAll(".mobileNav button")
.forEach(b=>b.classList.remove("ativo"));

event.currentTarget.classList.add("ativo");