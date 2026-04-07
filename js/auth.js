import { db } from "./firebaseConfig.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


/* ========================== */
/* USUÁRIO */
/* ========================== */

const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));

function temPermissao(permissao){
  return usuario && usuario.permissoes && usuario.permissoes.includes(permissao);
}

/* ========================== */
/* ELEMENTOS */
/* ========================== */

let aberto = null;
const listaUsuarios = document.getElementById("listaUsuarios");

/* ========================== */
/* LOGIN OU PROTEÇÃO */
/* ========================== */

if(listaUsuarios){
  // 🔓 TELA DE LOGIN
  carregarUsuarios();

}else{

  // 🔒 NÃO LOGADO
  if(!usuario){
    window.location.href = "../index.html";
  }

  const pagina = window.location.pathname;

  // 🔒 dashboard
  if(pagina.includes("dashboard.html")){
    if(!temPermissao("admin")){
      alert("Sem acesso ao dashboard");
      window.location.href = "pdv.html";
    }
  }

  // 🔒 entregas
  if(pagina.includes("entregador.html")){
    if(!temPermissao("admin")){
      alert("Sem acesso às entregas");
      window.location.href = "pdv.html";
    }
  }

  // 🔒 produtos
  if(pagina.includes("produtos.html")){
    if(!temPermissao("admin") && !temPermissao("caixa")){
      alert("Sem acesso aos produtos");
      window.location.href = "pdv.html";
    }
  }

  const logoutBtn = document.getElementById("logout");

  if(logoutBtn){
    logoutBtn.onclick = ()=>{
      localStorage.removeItem("usuarioLogado");
      window.location.href="../index.html";
    };
  }

}

/* ========================== */
/* CARREGAR USUÁRIOS */
/* ========================== */

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

      if(aberto && aberto !== area){
        aberto.style.display="none";
      }

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