import { db } from "./firebaseConfig.js";

import {
collection,
getDocs,
updateDoc,
doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const lista = document.getElementById("listaEntregas");

let entregaAtualId = null;

/* =========================
CARREGAR ENTREGAS
========================= */

async function carregarEntregas(){

lista.innerHTML = "";

const querySnapshot = await getDocs(collection(db,"entregas"));

querySnapshot.forEach((docSnap)=>{

const entrega = docSnap.data();
const id = docSnap.id;

const div = document.createElement("div");

div.innerHTML = `
<b>Pedido:</b> ${entrega.idVenda} <br>
<b>Status:</b> ${entrega.status}
<br><br>

<button onclick="iniciarRota('${id}')">
Iniciar rota
</button>

<button onclick="finalizarEntrega('${id}')">
Finalizar entrega
</button>

<hr>
`;

lista.appendChild(div);

});

}

carregarEntregas();

/* =========================
INICIAR ROTA
========================= */

window.iniciarRota = async function(id){

entregaAtualId = id;

await updateDoc(doc(db,"entregas",id),{

status:"em_rota"

});

alert("Rota iniciada");

iniciarGPS();

};

/* =========================
GPS DO ENTREGADOR
========================= */

function iniciarGPS(){

if(!navigator.geolocation){

alert("GPS não suportado");

return;

}

navigator.geolocation.watchPosition(async(pos)=>{

const lat = pos.coords.latitude;
const lng = pos.coords.longitude;

await updateDoc(doc(db,"entregas",entregaAtualId),{

latitudeAtual:lat,
longitudeAtual:lng

});

});

}

/* =========================
FINALIZAR ENTREGA
========================= */

window.finalizarEntrega = async function(id){

await updateDoc(doc(db,"entregas",id),{

status:"entregue",
finalizadoEm:new Date(),
temEntrega:false

});

alert("Entrega finalizada");

carregarEntregas();

};