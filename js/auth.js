import { db } from "./firebaseConfig.js";

import {
collection,
getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let aberto = null;

/* VERIFICA SE EXISTE LISTA DE USUÁRIOS NA PÁGINA */

const listaUsuarios = document.getElementById("listaUsuarios");

if(!listaUsuarios){

/* logout ainda funciona nas outras páginas */

const logoutBtn = document.getElementById("logout");

if(logoutBtn){

logoutBtn.onclick = ()=>{

localStorage.removeItem("usuarioLogado");
window.location.href="../index.html";

};

}

}else{

carregarUsuarios();

}



/* CARREGAR USUÁRIOS */

async function carregarUsuarios(){

const snapshot = await getDocs(collection(db,"usuarios"));

snapshot.forEach((doc)=>{

const user = doc.data();

if(!user.ativo) return;

const foto = user.foto || "https://cdn-icons-png.flaticon.com/512/149/149071.png";

const card = document.createElement("div");

card.classList.add("usuario");

card.innerHTML = `

<img src="${foto}">
<p>${user.nome}</p>

<div class="areaSenha">

<input type="password" placeholder="Digite sua senha">

<div class="botoes">

<button class="entrar">Entrar</button>
<button class="cancelar">Cancelar</button>

</div>

</div>

`;

const area = card.querySelector(".areaSenha");
const input = card.querySelector("input");
const entrar = card.querySelector(".entrar");
const cancelar = card.querySelector(".cancelar");


/* ABRIR SENHA */

card.onclick = ()=>{

if(aberto && aberto !== area){

aberto.style.display="none";

}

area.style.display="block";

aberto = area;

};


/* CANCELAR */

cancelar.onclick = (e)=>{

e.stopPropagation();

area.style.display="none";

};


/* LOGIN */

entrar.onclick = (e)=>{

e.stopPropagation();

if(input.value !== user.senha){

alert("Senha incorreta");
return;

}

localStorage.setItem("usuarioLogado",JSON.stringify(user));

const p = user.permissoes;

if(p.includes("admin")){

window.location.href="../pages/dashboard.html";

}
else if(p.includes("caixa")){

window.location.href="../pages/pdv.html";

}
else if(p.includes("entregador")){

window.location.href="../pages/entregador.html";

}

};


listaUsuarios.appendChild(card);

});

}