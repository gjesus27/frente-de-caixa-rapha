import { db } from "./firebaseConfig.js";

import {
collection,
updateDoc,
doc,
onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
ELEMENTOS
========================= */

const lista = document.getElementById("listaEntregas");
const usuarioLogado = document.getElementById("usuarioLogado");
const menuAdmin = document.getElementById("menuAdmin");
const mapaDiv = document.getElementById("mapa");

/* =========================
USUARIO LOGADO
========================= */

const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));

if(!usuario){

window.location.href="../login.html";

}

usuarioLogado.innerText = usuario.nome;

if(usuario.permissoes && usuario.permissoes.includes("admin")){

menuAdmin.classList.remove("hidden");

}

/* =========================
CONFIGURAÇÕES
========================= */

/* COORDENADAS DA LOJA */

const lojaLat = -23.70;
const lojaLng = -46.62;

/* FILTRO PADRÃO */

let filtroStatus = "pronto_entrega";

/* =========================
VARIÁVEIS
========================= */

let entregaAtualId = null;

let mapa = null;
let marcadorCliente = null;
let marcadorEntregador = null;
let marcadorLoja = null;

/* esconder mapa inicialmente */

mapaDiv.style.display="none";

/* =========================
ESCUTAR ENTREGAS
========================= */

function ouvirEntregas(){

onSnapshot(collection(db,"entregas"),(snapshot)=>{

lista.innerHTML="";

snapshot.forEach((docSnap)=>{

const entrega = docSnap.data();
const id = docSnap.id;

/* FILTRO */

if(filtroStatus === "pronto_entrega" && entrega.status !== "pronto_entrega") return;

if(filtroStatus === "entregue" && entrega.status !== "entregue") return;

criarCardEntrega(entrega,id);

});

});

}

ouvirEntregas();

/* =========================
CRIAR CARD ENTREGA
========================= */

function criarCardEntrega(entrega,id){

const div=document.createElement("div");

div.classList.add("cardEntrega");

div.innerHTML=`

<h3>Pedido #${entrega.idVenda}</h3>

<p><b>Endereço:</b> ${entrega.endereco || "não informado"}</p>

<div class="botoesEntrega">

<button onclick="aceitarEntrega('${id}','${entrega.latitude}','${entrega.longitude}')">
Aceitar entrega
</button>

<button onclick="abrirRota('${entrega.latitude}','${entrega.longitude}')">
Abrir no Google Maps
</button>

</div>

`;

lista.appendChild(div);

}

/* =========================
ACEITAR ENTREGA
========================= */

window.aceitarEntrega = async function(id,lat,lng){

entregaAtualId = id;

await updateDoc(doc(db,"entregas",id),{

status:"em_rota"

});

abrirMapaEntrega(lat,lng);

iniciarGPS();

};

/* =========================
ABRIR MAPA COM ROTA REAL
========================= */

async function abrirMapaEntrega(latCliente,lngCliente){

mapaDiv.style.display="block";

if(mapa){

mapa.remove();

}

mapa = L.map("mapa").setView([latCliente,lngCliente],13);

L.tileLayer(
"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
{
maxZoom:19
}
).addTo(mapa);

/* marcadores */

const loja = [lojaLat,lojaLng];
const cliente = [latCliente,lngCliente];

marcadorLoja = L.marker(loja)
.addTo(mapa)
.bindPopup("Loja");

marcadorCliente = L.marker(cliente)
.addTo(mapa)
.bindPopup("Cliente");

/* =========================
BUSCAR ROTA REAL
========================= */

const url = `https://router.project-osrm.org/route/v1/driving/${lojaLng},${lojaLat};${lngCliente},${latCliente}?overview=full&geometries=geojson`;

const resposta = await fetch(url);
const dados = await resposta.json();

const rota = dados.routes[0];

/* coordenadas */

const coords = rota.geometry.coordinates.map(coord => [coord[1],coord[0]]);

/* desenhar rota */

const linha = L.polyline(coords,{
color:"#00e676",
weight:6
}).addTo(mapa);

/* ajustar zoom */

mapa.fitBounds(linha.getBounds());

/* =========================
DISTÂNCIA E TEMPO
========================= */

const distanciaKm = (rota.distance / 1000).toFixed(2);
const tempoMin = Math.ceil(rota.duration / 60);

const info = document.createElement("div");

info.classList.add("infoRota");

info.innerHTML = `
🚗 Distância: ${distanciaKm} km<br>
⏱ Tempo estimado: ${tempoMin} min
`;

mapaDiv.appendChild(info);

}

/* =========================
ABRIR GOOGLE MAPS
========================= */

window.abrirRota = function(lat,lng){

if(!lat || !lng){

alert("Localização não disponível");
return;

}

const url=`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

window.open(url,"_blank");

};

/* =========================
GPS ENTREGADOR
========================= */

function iniciarGPS(){

if(!navigator.geolocation){

alert("GPS não suportado");
return;

}

navigator.geolocation.watchPosition(async(pos)=>{

if(!entregaAtualId) return;

const lat=pos.coords.latitude;
const lng=pos.coords.longitude;

/* atualizar firebase */

await updateDoc(doc(db,"entregas",entregaAtualId),{

latitudeAtual:lat,
longitudeAtual:lng

});

/* atualizar marcador */

if(marcadorEntregador){

mapa.removeLayer(marcadorEntregador);

}

marcadorEntregador=L.marker([lat,lng]).addTo(mapa);

});

}

/* =========================
FINALIZAR ENTREGA
========================= */

window.finalizarEntrega=async(id)=>{

await updateDoc(doc(db,"entregas",id),{

status:"entregue",
finalizadoEm:new Date(),
temEntrega:false

});

alert("Entrega finalizada");

entregaAtualId=null;

};

/* =========================
FILTROS
========================= */

window.filtroProntas = function(){

filtroStatus="pronto_entrega";

ouvirEntregas();

};

window.filtroConcluidas = function(){

filtroStatus="entregue";

ouvirEntregas();

};

/* =========================
MENU
========================= */

window.irDashboard=()=>{

window.location.href="../pages/dashboard.html";

};

window.irPDV=()=>{

window.location.href="../pages/pdv.html";

};

window.irProdutos=()=>{

window.location.href="../pages/produtos.html";

};

window.logout=()=>{

localStorage.removeItem("usuarioLogado");

window.location.href="../pages/login.html";

};