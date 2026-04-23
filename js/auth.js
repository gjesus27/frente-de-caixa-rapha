import { db } from "./firebaseConfig.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));

function temPermissao(permissao){
  return usuario && usuario.permissoes && usuario.permissoes.includes(permissao);
}

function temAcessoPagina(chave){
  if(!usuario) return false;
  if(temPermissao("admin")) return true;
  const paginas = Array.isArray(usuario.permissoesPaginas) ? usuario.permissoesPaginas : ["pdv","caixa","produtos","entregador","historico","configuracoes"];
  return paginas.includes(chave);
}

let aberto = null;
const listaUsuarios = document.getElementById("listaUsuarios");

if(listaUsuarios){
  carregarUsuarios();
}else{
  if(!usuario){
    window.location.href = "../index.html";
  }

  const pagina = window.location.pathname;

  function validarPagina(chave, mensagem){
    if(!pagina.includes(`${chave}.html`)) return false;
    if(temAcessoPagina(chave)) return false;
    alert(mensagem);
    window.location.href = "pdv.html";
    return true;
  }

  if(pagina.includes("dashboard.html") && !temPermissao("admin")){
    alert("Sem acesso ao dashboard");
    window.location.href = "pdv.html";
  }

  if(pagina.includes("historico.html") && !temPermissao("admin")){
    alert("Sem acesso ao histórico");
    window.location.href = "pdv.html";
  }

  if(validarPagina("configuracoes", "Sem acesso às configurações")) return;
  if(validarPagina("pdv", "Sem acesso ao PDV")) return;
  if(validarPagina("caixa", "Sem acesso ao caixa")) return;
  if(validarPagina("produtos", "Sem acesso aos produtos")) return;
  if(validarPagina("entregador", "Sem acesso às entregas")) return;
  if(validarPagina("historico", "Sem acesso ao histórico")) return;
  if(validarPagina("dashboard", "Sem acesso ao dashboard")) return;

  const logoutBtn = document.getElementById("logout");
  if(logoutBtn){
    logoutBtn.onclick = ()=>{
      localStorage.removeItem("usuarioLogado");
      window.location.href="../index.html";
    };
  }
}

async function carregarUsuarios(){
  const snapshot = await getDocs(collection(db,"usuarios"));
  listaUsuarios.innerHTML = "";

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

    card.onclick = ()=>{
      if(aberto && aberto !== area) aberto.style.display="none";
      area.style.display="block";
      aberto = area;
    };

    cancelar.onclick = (e)=>{
      e.stopPropagation();
      area.style.display="none";
    };

    entrar.onclick = (e)=>{
      e.stopPropagation();

      if(input.value !== user.senha){
        alert("Senha incorreta");
        return;
      }

      localStorage.setItem("usuarioLogado",JSON.stringify({ id: doc.id, ...user }));
      const p = user.permissoes || [];

      if(p.includes("admin")) window.location.href="../pages/dashboard.html";
      else if(p.includes("caixa")) window.location.href="../pages/pdv.html";
      else if(p.includes("entregador")) window.location.href="../pages/entregador.html";
      else window.location.href="../pages/pdv.html";
    };

    listaUsuarios.appendChild(card);
  });
}
