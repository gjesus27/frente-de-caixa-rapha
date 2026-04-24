import { db } from "./firebaseConfig.js";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { showAlert } from "./ui-feedback.js";

let usuario = JSON.parse(localStorage.getItem("usuarioLogado"));
if (!usuario) window.location.href = "login.html";

const adminAreas = document.querySelectorAll("[data-admin-area]");
let isAdmin = false;

function atualizarVisibilidadeAdmin() {
  isAdmin = Boolean(usuario?.permissoes?.includes("admin"));
  adminAreas.forEach((el) => {
    el.style.display = isAdmin ? "" : "none";
  });
}

const paginasDisponiveis = ["dashboard", "pdv", "caixa", "produtos", "entregador", "historico", "fiados", "configuracoes"];

const meuFoto = document.getElementById("meuFoto");
const meuNome = document.getElementById("meuNome");
const minhaSenha = document.getElementById("minhaSenha");
const salvarMeuPerfil = document.getElementById("salvarMeuPerfil");

const listaUsuariosAdmin = document.getElementById("listaUsuariosAdmin");
const novaCategoria = document.getElementById("novaCategoria");
const adicionarCategoria = document.getElementById("adicionarCategoria");
const listaCategorias = document.getElementById("listaCategorias");

let usuarios = [];
let categorias = [];

async function sincronizarUsuarioLogado() {
  if (!usuario?.id) return;

  try {
    const snap = await getDoc(doc(db, "usuarios", usuario.id));
    if (!snap.exists()) return;

    usuario = { id: snap.id, ...snap.data() };
    localStorage.setItem("usuarioLogado", JSON.stringify(usuario));
  } catch (erro) {
    console.error("Falha ao sincronizar usuário logado:", erro);
  }
}

function carregarMeuPerfil() {
  meuFoto.value = usuario?.foto || "";
  meuNome.value = usuario?.nome || "";
}

async function salvarPerfil(idAlvo = usuario.id, sobrescrever = {}) {
  const payload = {
    nome: (sobrescrever.nome ?? meuNome.value).trim(),
    foto: (sobrescrever.foto ?? meuFoto.value).trim()
  };

  const senha = (sobrescrever.senha ?? minhaSenha.value || "").trim();
  if (senha) payload.senha = senha;

  if (!payload.nome) {
    showAlert("Nome é obrigatório.");
    return;
  }

  await updateDoc(doc(db, "usuarios", idAlvo), payload);

  if (idAlvo === usuario.id) {
    usuario = { ...usuario, ...payload };
    localStorage.setItem("usuarioLogado", JSON.stringify(usuario));
  }
}

salvarMeuPerfil?.addEventListener("click", async () => {
  if (!usuario?.id) {
    showAlert("Faça login novamente para atualizar seu perfil.");
    return;
  }

  try {
    await salvarPerfil();
    minhaSenha.value = "";
    showAlert("Perfil atualizado.");
  } catch (erro) {
    console.error("Erro ao salvar perfil:", erro);
    showAlert("Não foi possível salvar seu perfil agora.");
  }
});

async function carregarUsuariosAdmin() {
  if (!isAdmin || !listaUsuariosAdmin) return;

  try {
    const snap = await getDocs(collection(db, "usuarios"));
    usuarios = [];
    snap.forEach((d) => usuarios.push({ id: d.id, ...d.data() }));

    listaUsuariosAdmin.innerHTML = "";

    usuarios.forEach((u) => {
      const div = document.createElement("article");
      div.className = "userCard";

      const permissoes = Array.isArray(u.permissoes) ? u.permissoes : [];
      const permissoesPaginas = Array.isArray(u.permissoesPaginas) ? u.permissoesPaginas : paginasDisponiveis;

      div.innerHTML = `
      <div class="userHead">
        <img src="${u.foto || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}" alt="${u.nome}">
        <strong>${u.nome || "Usuário"}</strong>
      </div>

      <div class="userGrid">
        <label>Nome<input data-field="nome" value="${u.nome || ""}"></label>
        <label>Foto URL<input data-field="foto" value="${u.foto || ""}"></label>
        <label>Nova senha<input data-field="senha" type="password" placeholder="Manter atual"></label>
      </div>

      <div class="permissoes">
        <label><input type="checkbox" data-role="admin" ${permissoes.includes("admin") ? "checked" : ""}> Admin</label>
        <label><input type="checkbox" data-role="caixa" ${permissoes.includes("caixa") ? "checked" : ""}> Caixa</label>
        <label><input type="checkbox" data-role="entregador" ${permissoes.includes("entregador") ? "checked" : ""}> Entregador</label>
      </div>

      <div class="permissoes">
        ${paginasDisponiveis
          .map(
            (pagina) =>
              `<label><input type="checkbox" data-page="${pagina}" ${permissoesPaginas.includes(pagina) ? "checked" : ""}> ${pagina}</label>`
          )
          .join("")}
      </div>

      <div class="acoesUser"><button class="btnPrimario" data-salvar="${u.id}">Salvar usuário</button></div>
    `;

      listaUsuariosAdmin.appendChild(div);
    });

    listaUsuariosAdmin.querySelectorAll("[data-salvar]").forEach((btn) => {
      btn.onclick = async () => {
        const card = btn.closest(".userCard");
        const id = btn.dataset.salvar;

        const nome = card.querySelector('[data-field="nome"]').value.trim();
        const foto = card.querySelector('[data-field="foto"]').value.trim();
        const senha = card.querySelector('[data-field="senha"]').value.trim();

        const novasPermissoes = ["admin", "caixa", "entregador"].filter((role) =>
          card.querySelector(`[data-role="${role}"]`).checked
        );

        const paginas = paginasDisponiveis.filter((pagina) =>
          card.querySelector(`[data-page="${pagina}"]`).checked
        );

        const payload = { nome, foto, permissoes: novasPermissoes, permissoesPaginas: paginas };
        if (senha) payload.senha = senha;

        await updateDoc(doc(db, "usuarios", id), payload);

        if (usuario.id === id) {
          usuario = { ...usuario, ...payload };
          localStorage.setItem("usuarioLogado", JSON.stringify(usuario));
          atualizarVisibilidadeAdmin();
        }

        showAlert("Usuário atualizado.");
      };
    });
  } catch (erro) {
    console.error("Erro ao carregar usuários:", erro);
    listaUsuariosAdmin.innerHTML = "<p>Não foi possível carregar os usuários agora.</p>";
  }
}

async function carregarCategorias() {
  if (!isAdmin || !listaCategorias) return;

  try {
    const snap = await getDocs(collection(db, "categoriasProduto"));
    categorias = [];
    snap.forEach((d) => categorias.push({ id: d.id, ...d.data() }));
    categorias.sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));

    listaCategorias.innerHTML = "";
    categorias.forEach((cat) => {
      const chip = document.createElement("div");
      chip.className = "tagCategoria";
      chip.innerHTML = `<span>${cat.nome}</span><button data-remover="${cat.id}">x</button>`;
      listaCategorias.appendChild(chip);
    });

    listaCategorias.querySelectorAll("[data-remover]").forEach((btn) => {
      btn.onclick = async () => {
        try {
          await deleteDoc(doc(db, "categoriasProduto", btn.dataset.remover));
          carregarCategorias();
        } catch (erro) {
          console.error("Erro ao remover categoria:", erro);
          showAlert("Não foi possível remover essa categoria.");
        }
      };
    });
  } catch (erro) {
    console.error("Erro ao carregar categorias:", erro);
    listaCategorias.innerHTML = "<p>Não foi possível carregar as categorias agora.</p>";
  }
}

adicionarCategoria?.addEventListener("click", async () => {
  if (!isAdmin) {
    showAlert("Apenas administradores podem salvar categorias.");
    return;
  }

  const nome = novaCategoria.value.trim();
  if (!nome) return;

  const existe = categorias.some((cat) => String(cat.nome || "").toLowerCase() === nome.toLowerCase());
  if (existe) {
    showAlert("Essa categoria já existe.");
    return;
  }

  try {
    await addDoc(collection(db, "categoriasProduto"), { nome, criadoEm: new Date() });
    novaCategoria.value = "";
    carregarCategorias();
  } catch (erro) {
    console.error("Erro ao salvar categoria:", erro);
    showAlert("Não foi possível salvar a categoria agora.");
  }
});

async function inicializarPagina() {
  await sincronizarUsuarioLogado();
  atualizarVisibilidadeAdmin();
  carregarMeuPerfil();
  carregarUsuariosAdmin();
  carregarCategorias();
}

inicializarPagina();
