import { db } from "./firebaseConfig.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { showAlert, showConfirm } from "./ui-feedback.js";

const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));
if (!usuario) {
  window.location.href = "login.html";
}

if (
  usuario &&
  !usuario.permissoes.includes("admin") &&
  !usuario.permissoes.includes("caixa")
) {
  showAlert("Sem acesso aos produtos");
  window.location.href = "pdv.html";
}

document.addEventListener("DOMContentLoaded", async () => {
  const lista = document.getElementById("listaProdutos");
  const tabelaWrapper = document.getElementById("tabelaWrapper");
  const estadoVazio = document.getElementById("estadoVazio");

  const modal = document.getElementById("modal");
  const abrirModal = document.getElementById("abrirModal");
  const fecharModal = document.getElementById("fecharModal");
  const btnSalvar = document.getElementById("salvarProduto");
  const tituloModal = document.getElementById("tituloModal");

  const buscarInput = document.getElementById("buscarProduto");
  const filtros = document.querySelectorAll(".filtroBtn");

  const nomeInput = document.getElementById("nomeProduto");
  const descricaoInput = document.getElementById("descricaoProduto");
  const categoriaInput = document.getElementById("categoriaProduto");
  const precoInput = document.getElementById("precoProduto");
  const custoInput = document.getElementById("custoProduto");
  const estoqueInput = document.getElementById("estoqueProduto");
  const estoqueMinimoInput = document.getElementById("estoqueMinimo");
  const precoPromoInput = document.getElementById("precoPromo");
  const codigoBarrasInput = document.getElementById("numeroCodigoBarras");
  const fotoInput = document.getElementById("fotoProduto");
  const preview = document.getElementById("previewImagem");

  const logoutBtn = document.getElementById("logout");

  let listaProdutos = [];
  let categoriasPredefinidas = [];
  let editandoId = null;
  let imagemAtual = "";
  let filtroAtual = "all";

  const CLOUD_NAME = "dbzkc4s85";
  const UPLOAD_PRESET = "pdv_produtos";

  logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("usuarioLogado");
    window.location.href = "login.html";
  });

  function parseMoeda(valor) {
    if (!valor) return 0;

    const normalizado = String(valor)
      .replace(/R\$/g, "")
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(",", ".");

    const numero = Number(normalizado);
    return Number.isFinite(numero) ? numero : 0;
  }

  function formatCurrency(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function abrirModalProduto() {
    modal.classList.add("ativo");
    modal.setAttribute("aria-hidden", "false");
  }

  function fecharModalProduto() {
    modal.classList.remove("ativo");
    modal.setAttribute("aria-hidden", "true");
  }

  function limparForm() {
    nomeInput.value = "";
    descricaoInput.value = "";
    categoriaInput.value = "";
    precoInput.value = "";
    custoInput.value = "";
    estoqueInput.value = "0";
    estoqueMinimoInput.value = "0";
    precoPromoInput.value = "";
    codigoBarrasInput.value = "";
    fotoInput.value = "";
    preview.hidden = true;
    preview.src = "";
    imagemAtual = "";
  }


  async function carregarCategoriasPredefinidas() {
    const snapshot = await getDocs(collection(db, "categoriasProduto"));
    categoriasPredefinidas = [];

    snapshot.forEach((docSnap) => {
      const cat = docSnap.data();
      if (cat?.nome) categoriasPredefinidas.push(String(cat.nome));
    });

    categoriasPredefinidas = [...new Set(categoriasPredefinidas)]
      .sort((a, b) => a.localeCompare(b, "pt-BR"));

    categoriaInput.innerHTML = `
      <option value="">Selecione...</option>
      ${categoriasPredefinidas.map((cat) => `<option value="${cat}">${cat}</option>`).join("")}
      <option value="outros">outros</option>
    `;
  }

  function otimizarImagemCloudinary(url, largura = 200) {
    if (!url || !url.includes("res.cloudinary.com")) return url || "";

    return url.replace(
      "/image/upload/",
      `/image/upload/f_auto,q_auto,w_${largura},c_limit/`
    );
  }

  abrirModal.addEventListener("click", () => {
    editandoId = null;
    tituloModal.innerText = "Novo Produto";
    limparForm();
    abrirModalProduto();
  });

  fecharModal.addEventListener("click", fecharModalProduto);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) fecharModalProduto();
  });

  fotoInput.addEventListener("change", () => {
    const file = fotoInput.files[0];
    if (!file) return;

    preview.src = URL.createObjectURL(file);
    preview.hidden = false;
  });

  buscarInput.addEventListener("input", aplicarFiltros);

  filtros.forEach((botao) => {
    botao.addEventListener("click", () => {
      filtros.forEach((b) => b.classList.remove("ativo"));
      botao.classList.add("ativo");
      filtroAtual = botao.dataset.filter || "all";
      aplicarFiltros();
    });
  });

  async function uploadImagem(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("folder", "pdv/produtos");

    try {
      const resposta = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData
        }
      );

      const data = await resposta.json();

      if (!resposta.ok) {
        console.error("Erro Cloudinary:", data);
        throw new Error("Falha ao enviar imagem para o Cloudinary.");
      }

      return data?.secure_url || "";
    } catch (erro) {
      console.error("Erro no upload da imagem:", erro);
      showAlert("Não foi possível enviar a imagem. Tente novamente.");
      return "";
    }
  }

  function getDescricaoProduto(produto) {
    return produto.descricao || produto.categoria || "Sem descrição";
  }

  function getQuantidadeProduto(produto) {
    return Number(produto.estoque ?? produto.quantity ?? 0);
  }

  function getMinimoProduto(produto) {
    return Number(produto.estoqueMinimo ?? produto.minQuantity ?? 0);
  }

  function getPrecoProduto(produto) {
    return Number(produto.preco ?? produto.price ?? 0);
  }

  function getCustoProduto(produto) {
    return Number(produto.custo ?? produto.costPrice ?? 0);
  }

  function renderProdutos(listaRender) {
    lista.innerHTML = "";

    if (!listaRender.length) {
      tabelaWrapper.hidden = true;
      estadoVazio.hidden = false;
      return;
    }

    tabelaWrapper.hidden = false;
    estadoVazio.hidden = true;

    listaRender.forEach((p) => {
      const quantidade = getQuantidadeProduto(p);
      const minimo = getMinimoProduto(p);
      const baixo = quantidade <= minimo;
      const imagemProduto = otimizarImagemCloudinary(
        p.imagem || "https://via.placeholder.com/120"
      );

      lista.innerHTML += `
        <tr>
          <td>
            <div style="display:flex; gap:10px; align-items:center;">
              <img
                src="${imagemProduto}"
                alt="${p.nome || "Produto"}"
                loading="lazy"
                style="width:48px; height:48px; object-fit:cover; border-radius:10px; background:#f3f4f6;"
              >
              <div style="display:flex; flex-direction:column;">
                <span class="produtoNome">${p.nome || "Sem nome"}</span>
                <span class="produtoDesc">${getDescricaoProduto(p)}</span>
              </div>
            </div>
          </td>
          <td class="preco">${formatCurrency(getPrecoProduto(p))}</td>
          <td>${formatCurrency(getCustoProduto(p))}</td>
          <td class="${baixo ? "qtdBaixa" : ""}">${quantidade}</td>
          <td>${minimo}</td>
          <td>
            <span class="badge ${quantidade > 0 ? "ok" : "off"}">
              ${quantidade > 0 ? "Em estoque" : "Esgotado"}
            </span>
          </td>
          <td>
            <div class="acoesLinha">
              <button class="btnEditar" onclick="editarProduto('${p.id}')" title="Editar">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="btnExcluir" onclick="excluirProduto('${p.id}')" title="Excluir">
                <i class="fa-solid fa-trash"></i>
              </button>
              <button class="${p.ativo === false ? "btnInativo" : "btnAtivo"}" onclick="toggleAtivo('${p.id}', ${p.ativo === false})" title="Ativar/desativar">
                <i class="fa-solid fa-power-off"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });
  }

  function aplicarFiltros() {
    const termo = buscarInput.value.trim().toLowerCase();

    const filtrado = listaProdutos.filter((produto) => {
      const nome = String(produto.nome || "").toLowerCase();
      const categoria = String(produto.categoria || "").toLowerCase();
      const quantidade = getQuantidadeProduto(produto);

      const matchBusca = !termo || nome.includes(termo) || categoria.includes(termo);
      if (!matchBusca) return false;

      if (filtroAtual === "inStock") return quantidade > 0;
      if (filtroAtual === "outOfStock") return quantidade === 0;
      return true;
    });

    renderProdutos(filtrado);
  }

  window.editarProduto = (id) => {
    const p = listaProdutos.find((produto) => produto.id === id);
    if (!p) return;

    editandoId = id;
    imagemAtual = p.imagem || "";

    tituloModal.innerText = "Editar Produto";
    nomeInput.value = p.nome || "";
    descricaoInput.value = p.descricao || "";
    categoriaInput.value = p.categoria || "";
    precoInput.value = getPrecoProduto(p) || "";
    custoInput.value = getCustoProduto(p) || "";
    estoqueInput.value = getQuantidadeProduto(p);
    estoqueMinimoInput.value = getMinimoProduto(p);
    precoPromoInput.value = Number(p.precoPromocional || 0) || "";
    codigoBarrasInput.value = p.codigoBarras || "";

    if (imagemAtual) {
      preview.src = imagemAtual;
      preview.hidden = false;
    } else {
      preview.src = "";
      preview.hidden = true;
    }

    abrirModalProduto();
  };

  window.excluirProduto = async (id) => {
    if (!(await showConfirm("Excluir produto?"))) return;
    await deleteDoc(doc(db, "produtos", id));
    await carregarProdutos();
  };

  window.toggleAtivo = async (id, inativo) => {
    await updateDoc(doc(db, "produtos", id), { ativo: inativo });
    await carregarProdutos();
  };

  async function salvarProduto() {
    const nome = nomeInput.value.trim();
    const preco = parseMoeda(precoInput.value);

    if (!nome || !preco) {
      showAlert("Preencha ao menos nome e preço do produto.");
      return;
    }

    let imagemURL = imagemAtual;

    if (fotoInput.files[0]) {
      btnSalvar.disabled = true;
      btnSalvar.innerText = "Enviando...";

      imagemURL = await uploadImagem(fotoInput.files[0]);

      btnSalvar.disabled = false;
      btnSalvar.innerText = "Salvar";

      if (!imagemURL) {
        return;
      }
    }

    const payload = {
      nome,
      descricao: descricaoInput.value.trim(),
      categoria: (categoriaInput.value || "outros").trim(),
      preco,
      custo: parseMoeda(custoInput.value),
      precoPromocional: parseMoeda(precoPromoInput.value) || null,
      estoque: Number(estoqueInput.value || 0),
      estoqueMinimo: Number(estoqueMinimoInput.value || 0),
      temEstoque: true,
      codigoBarras: codigoBarrasInput.value.trim() || null,
      temCodigoBarras: Boolean(codigoBarrasInput.value.trim()),
      imagem: imagemURL,
      ativo: true
    };

    if (editandoId) {
      await updateDoc(doc(db, "produtos", editandoId), payload);
    } else {
      await addDoc(collection(db, "produtos"), payload);
    }

    fecharModalProduto();
    limparForm();
    await carregarProdutos();
  }

  btnSalvar.addEventListener("click", salvarProduto);

  async function carregarProdutos() {
    const snapshot = await getDocs(collection(db, "produtos"));

    listaProdutos = [];
    snapshot.forEach((docSnap) => {
      const produto = docSnap.data();
      produto.id = docSnap.id;
      listaProdutos.push(produto);
    });

    aplicarFiltros();
  }

  await carregarCategoriasPredefinidas();
  await carregarProdutos();
});
