import { db } from "./firebaseConfig.js";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { showAlert, showPrompt } from "./ui-feedback.js";

const produtosDiv = document.getElementById("produtos");
const carrinhoDiv = document.getElementById("carrinho");
const totalSpan = document.getElementById("total");
const pesquisaInput = document.getElementById("pesquisaProduto");
const pesquisaMesaInput = document.getElementById("pesquisaProdutoMesa");
const categoriasDiv = document.getElementById("categorias");
const nomeClienteInput = document.getElementById("nomeCliente");
const modalPagamentoMesa = document.getElementById("modalPagamentoMesa");
const opcoesPagamentoMesa = document.getElementById("opcoesPagamentoMesa");
const cancelarPagamentoMesa = document.getElementById("cancelarPagamentoMesa");
const modalFiado = document.getElementById("modalFiado");
const fiadoClienteInput = document.getElementById("fiadoCliente");
const fiadoWhatsappInput = document.getElementById("fiadoWhatsapp");
const fiadoObservacaoInput = document.getElementById("fiadoObservacao");
const confirmarFiadoBtn = document.getElementById("confirmarFiado");
const cancelarFiadoBtn = document.getElementById("cancelarFiado");

let listaProdutos = [];
let carrinho = [];
let total = 0;
let categoriaSelecionada = "todas";
let categoriasSistema = [];

let caixaId = null;
let caixaAberto = false;

let mesasAbertas = [];
let mesaSelecionada = null;
let mesasCarregadas = false;

const formatarMoeda = (valor) => `R$ ${Number(valor || 0).toFixed(2)}`;

const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));
if (!usuario) {
  window.location.href = "login.html";
}

function otimizarImagem(url, largura = 250) {
  if (!url) return "https://via.placeholder.com/120";
  if (!url.includes("res.cloudinary.com")) return url;

  return url.replace(
    "/image/upload/",
    `/image/upload/f_auto,q_auto,w_${largura},c_limit/`
  );
}



function abrirModal(idModal) {
  if (!idModal) return;
  idModal.classList.add("ativo");
  idModal.setAttribute("aria-hidden", "false");
}

function fecharModal(idModal) {
  if (!idModal) return;
  idModal.classList.remove("ativo");
  idModal.setAttribute("aria-hidden", "true");
}

function normalizarContatoWhatsapp(valor) {
  return String(valor || "").replace(/\D/g, "");
}

async function registrarOuAtualizarCadastroFiado({
  cliente,
  whatsapp,
  observacao,
  valor,
  origem,
  itens,
  vendaId,
  mesaNumero = null
}) {
  const contatoNormalizado = normalizarContatoWhatsapp(whatsapp);
  const fiadosRef = collection(db, "fiados");
  const q = query(fiadosRef, where("whatsappNormalizado", "==", contatoNormalizado));
  const snap = await getDocs(q);

  let cadastroExistente = null;
  snap.forEach((d) => {
    const atual = { id: d.id, ...d.data() };
    if (!cadastroExistente || Number(atual.saldoPendente || 0) > 0) cadastroExistente = atual;
  });

  if (cadastroExistente) {
    const novoSaldo = Number(cadastroExistente.saldoPendente || 0) + Number(valor || 0);
    const novasVendas = Array.isArray(cadastroExistente.vendasFiadoIds) ? cadastroExistente.vendasFiadoIds : [];
    if (vendaId) novasVendas.push(vendaId);

    await updateDoc(doc(db, "fiados", cadastroExistente.id), {
      cliente: cliente || cadastroExistente.cliente || "Cliente",
      whatsapp,
      whatsappNormalizado: contatoNormalizado,
      saldoPendente: novoSaldo,
      totalAcumulado: Number(cadastroExistente.totalAcumulado || cadastroExistente.total || 0) + Number(valor || 0),
      status: "pendente",
      ultimaAtualizacao: new Date(),
      ultimaObservacao: observacao || "",
      vendasFiadoIds: [...new Set(novasVendas)],
      mesaNumero: mesaNumero ?? cadastroExistente.mesaNumero ?? null
    });
    return cadastroExistente.id;
  }

  const novo = await addDoc(fiadosRef, {
    cliente,
    whatsapp,
    whatsappNormalizado: contatoNormalizado,
    observacao,
    total: valor,
    totalAcumulado: valor,
    saldoPendente: valor,
    origem,
    itens,
    status: "pendente",
    criadoEm: new Date(),
    criadoPor: usuario.nome,
    vendaId: vendaId || null,
    vendasFiadoIds: vendaId ? [vendaId] : [],
    mesaNumero
  });

  return novo.id;
}

async function carregarCaixaAberto() {
  const q = query(
    collection(db, "caixa"),
    where("usuario", "==", usuario.nome),
    where("aberto", "==", true)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    showAlert("Abra o caixa na tela de Caixa antes de vender.");
    caixaAberto = false;
    return;
  }

  snapshot.forEach((d) => {
    caixaId = d.id;
  });

  caixaAberto = true;
}

async function carregarProdutos() {
  const snapshot = await getDocs(collection(db, "produtos"));
  listaProdutos = [];

  snapshot.forEach((docSnap) => {
    const p = docSnap.data();

    if (p.ativo === false) return;

    listaProdutos.push({
      id: docSnap.id,
      nome: p.nome || "Produto sem nome",
      preco: Number(p.preco || 0),
      imagem: p.imagem || "https://via.placeholder.com/120",
      categoria: (p.categoria || "outros").toLowerCase(),
      estoque: Number(p.estoque || 0)
    });
  });

  listaProdutos.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  renderCategorias();
  renderProdutos();
  renderProdutosMesa();
}

async function carregarCategoriasSistema() {
  const snapshot = await getDocs(collection(db, "categoriasProduto"));
  categoriasSistema = ["todas"];
  snapshot.forEach((docSnap) => {
    const nome = String(docSnap.data()?.nome || "").trim().toLowerCase();
    if (nome) categoriasSistema.push(nome);
  });
  categoriasSistema = [...new Set(categoriasSistema)].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function getProdutosFiltrados() {
  const termo = (pesquisaInput?.value || "").trim().toLowerCase();

  return listaProdutos.filter((p) => {
    const byNome = p.nome.toLowerCase().includes(termo);
    const byCategoria =
      categoriaSelecionada === "todas" || p.categoria === categoriaSelecionada;

    return byNome && byCategoria;
  });
}

function getProdutosMesaFiltrados() {
  const termoMesa = (pesquisaMesaInput?.value || "").trim().toLowerCase();

  return getProdutosFiltrados().filter((p) =>
    p.nome.toLowerCase().includes(termoMesa)
  );
}

function renderProdutos() {
  if (!produtosDiv) return;

  const filtrados = getProdutosFiltrados();
  produtosDiv.innerHTML = "";

  if (!filtrados.length) {
    produtosDiv.innerHTML = "<p>Nenhum produto encontrado.</p>";
    return;
  }

  filtrados.forEach((p) => {
    const card = document.createElement("button");
    card.className = "produto";

    const imagemOtimizada = otimizarImagem(p.imagem, 250);

    card.innerHTML = `
      <img 
        src="${imagemOtimizada}" 
        alt="${p.nome}" 
        loading="lazy"
        decoding="async"
        onerror="this.src='https://via.placeholder.com/120'"
      >
      <h4>${p.nome}</h4>
      <p>R$ ${p.preco.toFixed(2)}</p>
      <small>Estoque: ${p.estoque}</small>
    `;

    card.onclick = () => adicionarAoCarrinho(p);
    produtosDiv.appendChild(card);
  });
}

function renderCategorias() {
  if (!categoriasDiv) return;

  const categorias = categoriasSistema.length
    ? categoriasSistema
    : ["todas", ...new Set(listaProdutos.map((p) => p.categoria || "outros"))];
  categoriasDiv.innerHTML = "";

  categorias.forEach((cat) => {
    const b = document.createElement("button");
    b.textContent = cat === "todas" ? "🧾 Todas" : cat;

    if (cat === categoriaSelecionada) b.classList.add("ativa");

    b.onclick = () => {
      categoriaSelecionada = cat;
      renderCategorias();
      renderProdutos();
      renderProdutosMesa();
    };

    categoriasDiv.appendChild(b);
  });
}

function adicionarAoCarrinho(produto) {
  const existente = carrinho.find((item) => item.id === produto.id);

  if (existente) {
    existente.quantidade += 1;
  } else {
    carrinho.push({ ...produto, quantidade: 1 });
  }

  renderCarrinho();
}

function alterarQuantidade(id, delta) {
  carrinho = carrinho
    .map((item) =>
      item.id === id
        ? { ...item, quantidade: item.quantidade + delta }
        : item
    )
    .filter((item) => item.quantidade > 0);

  renderCarrinho();
}

function renderCarrinho() {
  if (!carrinhoDiv) return;

  total = carrinho.reduce(
    (acc, item) => acc + item.preco * item.quantidade,
    0
  );

  carrinhoDiv.innerHTML = "";

  if (!carrinho.length) {
    carrinhoDiv.innerHTML = "<p>Carrinho vazio.</p>";
  } else {
    carrinho.forEach((item) => {
      const row = document.createElement("div");
      row.className = "item";

      row.innerHTML = `
        <div>
          <div class="itemNome">${item.nome}</div>
          <div class="itemPreco">R$ ${item.preco.toFixed(2)}</div>
        </div>
        <div class="itemAcoes">
          <button data-delta="-1">-</button>
          <strong>${item.quantidade}</strong>
          <button data-delta="1">+</button>
        </div>
        <div class="itemTotal">R$ ${(item.preco * item.quantidade).toFixed(2)}</div>
      `;

      row.querySelectorAll("button").forEach((btn) => {
        btn.onclick = () =>
          alterarQuantidade(item.id, Number(btn.dataset.delta));
      });

      carrinhoDiv.appendChild(row);
    });
  }

  totalSpan.textContent = formatarMoeda(total);
}

window.imprimirReciboPedido = () => {
  if (!carrinho.length) {
    showAlert("Adicione itens no carrinho para emitir o recibo.");
    return;
  }

  const desconto = 0;
  const subtotal = total;
  const totalFinal = Math.max(0, subtotal - desconto);
  const dataHora = new Date().toLocaleString("pt-BR");
  const logoUrl = new URL("../img/Logo.png", window.location.href).href;
  const numeroPedido = `PDV-${Date.now().toString().slice(-6)}`;

  const linhasItens = carrinho
    .map((item, index) => {
      const subtotalItem =
        Number(item.preco || 0) * Number(item.quantidade || 0);

      return `
      <tr>
        <td>${index + 1}</td>
        <td>${item.id}</td>
        <td>${item.nome}</td>
        <td>${item.quantidade} un</td>
        <td>${formatarMoeda(item.preco)}</td>
        <td>${formatarMoeda(subtotalItem)}</td>
      </tr>
    `;
    })
    .join("");

  const htmlCupom = `
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
      <meta charset="UTF-8">
      <title>Cupom Fiscal - ${numeroPedido}</title>
      <style>
        body{
          margin:0;
          padding:16px;
          font-family:"Courier New", monospace;
          color:#111827;
          background:#ffffff;
        }
        .cupom{
          max-width:420px;
          margin:0 auto;
          border:1px dashed #111827;
          padding:16px;
        }
        .logo{
          text-align:center;
          margin-bottom:8px;
        }
        .logo img{
          width:140px;
          max-width:100%;
          object-fit:contain;
        }
        h2,p{
          margin:4px 0;
          text-align:center;
        }
        .meta{
          margin:10px 0;
          font-size:12px;
          border-top:1px dashed #374151;
          border-bottom:1px dashed #374151;
          padding:8px 0;
        }
        table{
          width:100%;
          border-collapse:collapse;
          font-size:12px;
        }
        th,td{
          border-bottom:1px dotted #d1d5db;
          padding:5px 2px;
          text-align:left;
          vertical-align:top;
        }
        .resumo{
          margin-top:10px;
          font-size:13px;
        }
        .resumo div{
          display:flex;
          justify-content:space-between;
          margin:2px 0;
        }
        .total{
          font-weight:700;
          font-size:15px;
          border-top:1px dashed #111827;
          padding-top:6px;
        }
        .agradecimento{
          margin-top:14px;
          text-align:center;
          font-size:12px;
        }
      </style>
    </head>
    <body>
      <div class="cupom">
        <div class="logo"><img src="${logoUrl}" alt="Açaí do Rapha"></div>
        <h2>Açaí do Rapha</h2>
        <p>Cupom do pedido</p>

        <div class="meta">
          <div><strong>Pedido:</strong> ${numeroPedido}</div>
          <div><strong>Data/Hora:</strong> ${dataHora}</div>
          <div><strong>Operador:</strong> ${usuario?.nome || "Não informado"}</div>
          <div><strong>Cliente:</strong> ${nomeClienteInput?.value?.trim() || "Balcão"}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>ID</th>
              <th>Descrição</th>
              <th>QNTD un</th>
              <th>VL.item</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>${linhasItens}</tbody>
        </table>

        <div class="resumo">
          <div><span>Subtotal:</span><strong>${formatarMoeda(subtotal)}</strong></div>
          <div><span>Desconto:</span><strong>${formatarMoeda(desconto)}</strong></div>
          <div class="total"><span>Total:</span><strong>${formatarMoeda(totalFinal)}</strong></div>
        </div>

        <p class="agradecimento">Obrigado por escolher o Açaí do Rapha!</p>
      </div>
      <script>
        window.onload = function(){
          window.print();
        };
      <\/script>
    </body>
    </html>
  `;

  const janela = window.open("", "_blank", "width=480,height=720");
  if (!janela) {
    showAlert("Não foi possível abrir a janela de impressão.");
    return;
  }

  janela.document.open();
  janela.document.write(htmlCupom);
  janela.document.close();
};

async function finalizarVendaCompleta(pagamentos, troco = 0) {
  if (!caixaAberto || !caixaId) {
    showAlert("Abra o caixa antes de vender.");
    return;
  }

  if (!carrinho.length) {
    showAlert("Carrinho vazio.");
    return;
  }

  const itens = carrinho.map((p) => ({
    idProduto: p.id,
    nome: p.nome,
    preco: Number(p.preco),
    quantidade: Number(p.quantidade)
  }));

  await addDoc(collection(db, "vendas"), {
    criadoEm: new Date(),
    pagamentos,
    troco,
    idCaixa: caixaId,
    idUsuario: usuario.nome,
    nomeUsuario: usuario.nome,
    cliente: nomeClienteInput?.value?.trim() || "Balcão",
    itens,
    subtotal: total,
    total,
    tipo: "balcao",
    status: "finalizado"
  });

  const caixaRef = doc(db, "caixa", caixaId);
  const caixaSnap = await getDoc(caixaRef);
  const saldoAtual = Number(caixaSnap.data()?.saldoAtual || 0);

  await updateDoc(caixaRef, { saldoAtual: saldoAtual + total });

  for (const item of carrinho) {
    const pRef = doc(db, "produtos", item.id);
    const produtoAtual = listaProdutos.find((p) => p.id === item.id);
    if (!produtoAtual) continue;

    const novoEstoque = Math.max(
      0,
      Number(produtoAtual.estoque || 0) - Number(item.quantidade || 0)
    );

    await updateDoc(pRef, { estoque: novoEstoque });
  }

  showAlert("Venda finalizada com sucesso.");
  carrinho = [];

  if (nomeClienteInput) nomeClienteInput.value = "";

  await carregarProdutos();
  renderCarrinho();
}



window.abrirModalFiado = () => {
  if (total <= 0) {
    showAlert("Carrinho vazio.");
    return;
  }

  fiadoClienteInput.value = nomeClienteInput?.value?.trim() || "";
  fiadoWhatsappInput.value = "";
  fiadoObservacaoInput.value = "";
  abrirModal(modalFiado);
};

async function registrarFiado() {
  const cliente = fiadoClienteInput.value.trim();
  const whatsapp = fiadoWhatsappInput.value.trim();
  if (!cliente) {
    showAlert("Informe o nome do cliente fiado.");
    return;
  }

  if (!whatsapp) {
    showAlert("Informe o WhatsApp do cliente para registrar o fiado.");
    return;
  }

  const observacao = fiadoObservacaoInput.value.trim();
  const itens = carrinho.map((p) => ({
    idProduto: p.id,
    nome: p.nome,
    preco: Number(p.preco),
    quantidade: Number(p.quantidade)
  }));

  const vendaRef = await addDoc(collection(db, "vendas"), {
    criadoEm: new Date(),
    pagamentos: [{ tipo: "fiado", valor: total }],
    troco: 0,
    idCaixa: caixaId,
    idUsuario: usuario.nome,
    nomeUsuario: usuario.nome,
    cliente,
    whatsapp,
    observacao,
    itens,
    subtotal: total,
    total,
    tipo: "balcao",
    status: "fiado",
    fiadoStatus: "aberto"
  });

  await registrarOuAtualizarCadastroFiado({
    cliente,
    whatsapp,
    observacao,
    valor: total,
    origem: "balcao",
    itens,
    vendaId: vendaRef.id
  });

  for (const item of carrinho) {
    const pRef = doc(db, "produtos", item.id);
    const produtoAtual = listaProdutos.find((p) => p.id === item.id);
    if (!produtoAtual) continue;

    const novoEstoque = Math.max(0, Number(produtoAtual.estoque || 0) - Number(item.quantidade || 0));
    await updateDoc(pRef, { estoque: novoEstoque });
  }

  carrinho = [];
  if (nomeClienteInput) nomeClienteInput.value = "";
  fecharModal(modalFiado);
  await carregarProdutos();
  renderCarrinho();
  showAlert("Fiado registrado com sucesso.");
}

window.pagarSimples = async (tipo) => {
  if (total <= 0) {
    showAlert("Carrinho vazio.");
    return;
  }

  if (tipo === "dinheiro") {
    const recebidoTxt = await showPrompt({
      titulo: "Pagamento em dinheiro",
      mensagem: `Total R$ ${total.toFixed(2)}\nValor recebido em dinheiro:`,
      placeholder: "0,00"
    });
    const recebido = Number((recebidoTxt || "").replace(",", "."));

    if (!recebidoTxt) {
      showAlert("Pagamento cancelado.");
      return;
    }

    if (recebido < total) {
      showAlert("Valor recebido é menor que o total.");
      return;
    }

    const troco = recebido - total;
    showAlert(`Troco: ${formatarMoeda(troco)}`);
    await finalizarVendaCompleta(
      [{ tipo: "dinheiro", valor: total }],
      troco
    );
    return;
  }

  await finalizarVendaCompleta([{ tipo, valor: total }], 0);
};

window.abrirPagamentoMisto = async () => {
  if (total <= 0) {
    showAlert("Carrinho vazio.");
    return;
  }

  const entrada = await showPrompt({
    titulo: "Pagamento misto",
    mensagem: "Digite no formato pix:20,dinheiro:10",
    placeholder: "pix:20,dinheiro:10"
  });
  if (!entrada) return;

  const pagamentos = entrada
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [tipo, valor] = item.split(":");
      return {
        tipo: (tipo || "").trim().toLowerCase(),
        valor: Number(valor || 0)
      };
    })
    .filter((p) => p.tipo && p.valor > 0);

  const pago = pagamentos.reduce((s, p) => s + p.valor, 0);

  if (pago < total) {
    showAlert("Valor pago menor que o total.");
    return;
  }

  await finalizarVendaCompleta(pagamentos, pago - total);
};

window.alternarModoPdv = (modo) => {
  const balcao = document.getElementById("modoBalcao");
  const mesas = document.getElementById("modoMesas");
  const btnB = document.getElementById("btnModoBalcao");
  const btnM = document.getElementById("btnModoMesas");

  if (modo === "mesas") {
    balcao.classList.add("hidden");
    mesas.classList.remove("hidden");
    btnM.classList.add("ativo");
    btnB.classList.remove("ativo");
    carregarMesas();
    renderProdutosMesa();
  } else {
    mesas.classList.add("hidden");
    balcao.classList.remove("hidden");
    btnB.classList.add("ativo");
    btnM.classList.remove("ativo");
  }
};

async function carregarMesas() {
  const snap = await getDocs(
    query(collection(db, "comandas"), where("aberta", "==", true))
  );

  mesasAbertas = [];
  snap.forEach((d) => mesasAbertas.push({ id: d.id, ...d.data() }));
  mesasAbertas.sort(
    (a, b) => Number(a.numeroMesa || 0) - Number(b.numeroMesa || 0)
  );
  mesasCarregadas = true;

  if (mesaSelecionada?.id) {
    mesaSelecionada =
      mesasAbertas.find((mesa) => mesa.id === mesaSelecionada.id) || null;
  }

  renderMesas();
}

function renderMesas() {
  const lista = document.getElementById("listaMesas");
  if (!lista) return;

  lista.innerHTML = "";

  if (!mesasAbertas.length) {
    lista.innerHTML = "<p>Nenhuma mesa aberta.</p>";
    renderMesaDetalhe();
    return;
  }

  mesasAbertas.forEach((m) => {
    const b = document.createElement("button");
    b.className = `mesaCard ${mesaSelecionada?.id === m.id ? "ativa" : ""}`;
    b.innerHTML = `<span>Mesa ${m.numeroMesa}</span><strong>R$ ${Number(
      m.total || 0
    ).toFixed(2)}</strong>`;

    b.onclick = () => {
      mesaSelecionada = m;
      renderMesas();
      renderMesaDetalhe();
    };

    lista.appendChild(b);
  });

  renderMesaDetalhe();
}

window.abrirMesa = async () => {
  const numero = Number(document.getElementById("numeroMesa")?.value);

  if (!numero) {
    showAlert("Informe o número da mesa.");
    return;
  }

  const existe = mesasAbertas.find((m) => Number(m.numeroMesa) === numero);

  if (existe) {
    showAlert("Essa mesa já está aberta.");
    return;
  }

  await addDoc(collection(db, "comandas"), {
    numeroMesa: numero,
    aberta: true,
    criadoEm: new Date(),
    itens: [],
    total: 0
  });

  document.getElementById("numeroMesa").value = "";
  await carregarMesas();
};

function renderProdutosMesa() {
  const div = document.getElementById("produtosMesa");
  if (!div) return;

  const filtrados = getProdutosMesaFiltrados();
  div.innerHTML = "";

  if (!filtrados.length) {
    div.innerHTML = "<p>Nenhum produto encontrado para a mesa.</p>";
    return;
  }

  filtrados.forEach((p) => {
    const b = document.createElement("button");
    b.innerHTML = `<span>${p.nome}</span><strong>R$ ${p.preco.toFixed(2)}</strong>`;
    b.onclick = () => adicionarProdutoMesa(p);
    div.appendChild(b);
  });
}

async function adicionarProdutoMesa(produto) {
  if (!mesaSelecionada) {
    showAlert("Selecione uma mesa.");
    return;
  }

  const itens = Array.isArray(mesaSelecionada.itens)
    ? [...mesaSelecionada.itens]
    : [];

  const idx = itens.findIndex((i) => i.idProduto === produto.id);

  if (idx >= 0) {
    itens[idx].quantidade += 1;
  } else {
    itens.push({
      idProduto: produto.id,
      nome: produto.nome,
      preco: Number(produto.preco),
      quantidade: 1
    });
  }

  const totalMesa = itens.reduce(
    (s, i) => s + Number(i.preco || 0) * Number(i.quantidade || 0),
    0
  );

  await updateDoc(doc(db, "comandas", mesaSelecionada.id), {
    itens,
    total: totalMesa
  });

  mesaSelecionada = { ...mesaSelecionada, itens, total: totalMesa };
  await carregarMesas();
}

window.removerItemMesa = async (idProduto) => {
  if (!mesaSelecionada) return;

  const itens = (mesaSelecionada.itens || [])
    .map((i) =>
      i.idProduto === idProduto
        ? { ...i, quantidade: Number(i.quantidade) - 1 }
        : i
    )
    .filter((i) => Number(i.quantidade) > 0);

  const totalMesa = itens.reduce(
    (s, i) => s + Number(i.preco || 0) * Number(i.quantidade || 0),
    0
  );

  await updateDoc(doc(db, "comandas", mesaSelecionada.id), {
    itens,
    total: totalMesa
  });

  mesaSelecionada = { ...mesaSelecionada, itens, total: totalMesa };
  await carregarMesas();
};

function renderMesaDetalhe() {
  const titulo = document.getElementById("tituloMesa");
  const itensDiv = document.getElementById("mesaItens");
  if (!titulo || !itensDiv) return;

  if (!mesaSelecionada) {
    titulo.textContent = "Selecione uma mesa";
    itensDiv.innerHTML = "<p>Nenhum item adicionado.</p>";
    return;
  }

  titulo.textContent = `Mesa ${mesaSelecionada.numeroMesa} • R$ ${Number(
    mesaSelecionada.total || 0
  ).toFixed(2)}`;

  const itens = mesaSelecionada.itens || [];

  if (!itens.length) {
    itensDiv.innerHTML = "<p>Nenhum item adicionado.</p>";
    return;
  }

  itensDiv.innerHTML = itens
    .map(
      (i) => `
    <div class="mesaItemLinha">
      <div>
        <strong>${i.nome}</strong><br>
        <small>Qtd: ${i.quantidade}</small>
      </div>
      <div>
        <strong>R$ ${(Number(i.preco) * Number(i.quantidade)).toFixed(2)}</strong>
        <button onclick="removerItemMesa('${i.idProduto}')">Remover</button>
      </div>
    </div>
  `
    )
    .join("");
}

window.fecharMesaSelecionada = async () => {
  if (!mesaSelecionada) {
    showAlert("Selecione uma mesa.");
    return;
  }

  if (!caixaAberto || !caixaId) {
    showAlert("Abra o caixa antes de fechar a mesa.");
    return;
  }

  const totalMesa = Number(mesaSelecionada.total || 0);
  if (totalMesa <= 0) {
    showAlert("Mesa sem itens.");
    return;
  }

  const formas = ["dinheiro", "pix", "debito", "credito", "ticket", "cashback", "fiado"];
  opcoesPagamentoMesa.innerHTML = "";

  formas.forEach((forma) => {
    const btn = document.createElement("button");
    btn.textContent = forma.toUpperCase();
    btn.onclick = () => confirmarFechamentoMesa(forma);
    opcoesPagamentoMesa.appendChild(btn);
  });

  abrirModal(modalPagamentoMesa);
};

async function confirmarFechamentoMesa(forma) {
  if (!mesaSelecionada) return;

  const totalMesa = Number(mesaSelecionada.total || 0);
  const itens = (mesaSelecionada.itens || []).map((i) => ({
    idProduto: i.idProduto,
    nome: i.nome,
    preco: Number(i.preco),
    quantidade: Number(i.quantidade)
  }));

  let statusVenda = "finalizado";
  let dadosFiado = null;

  if (forma === "fiado") {
    const cliente = (await showPrompt({
      titulo: "Fiado da mesa",
      mensagem: "Nome do cliente responsável:",
      valorPadrao: `Cliente Mesa ${mesaSelecionada.numeroMesa}`,
      placeholder: "Nome do cliente"
    }))?.trim();

    if (!cliente) {
      showAlert("Informe o nome do cliente para registrar o fiado.");
      return;
    }

    const whatsapp = (await showPrompt({
      titulo: "Fiado da mesa",
      mensagem: "WhatsApp do cliente:",
      placeholder: "(xx) xxxxx-xxxx"
    }))?.trim();

    if (!whatsapp) {
      showAlert("Informe o WhatsApp do cliente para registrar o fiado.");
      return;
    }

    const observacao = (await showPrompt({
      titulo: "Fiado da mesa",
      mensagem: "Observação (opcional):",
      placeholder: "Ex.: pagar sexta-feira"
    }))?.trim() || "";

    dadosFiado = { cliente, whatsapp, observacao };
    statusVenda = "fiado";
  }

  const vendaRef = await addDoc(collection(db, "vendas"), {
    criadoEm: new Date(),
    pagamentos: [{ tipo: forma, valor: totalMesa }],
    troco: 0,
    idCaixa: caixaId,
    idUsuario: usuario.nome,
    nomeUsuario: usuario.nome,
    cliente: dadosFiado?.cliente || `Mesa ${mesaSelecionada.numeroMesa}`,
    whatsapp: dadosFiado?.whatsapp || "",
    observacaoFiado: dadosFiado?.observacao || "",
    itens,
    subtotal: totalMesa,
    total: totalMesa,
    tipo: "mesa",
    mesaNumero: mesaSelecionada.numeroMesa,
    status: statusVenda,
    fiadoStatus: forma === "fiado" ? "aberto" : null
  });

  if (forma === "fiado" && dadosFiado) {
    await registrarOuAtualizarCadastroFiado({
      cliente: dadosFiado.cliente,
      whatsapp: dadosFiado.whatsapp,
      observacao: dadosFiado.observacao || "",
      valor: totalMesa,
      origem: "mesa",
      itens,
      vendaId: vendaRef.id,
      mesaNumero: mesaSelecionada.numeroMesa
    });
  } else {
    const caixaRef = doc(db, "caixa", caixaId);
    const caixaSnap = await getDoc(caixaRef);
    const saldoAtual = Number(caixaSnap.data()?.saldoAtual || 0);
    await updateDoc(caixaRef, { saldoAtual: saldoAtual + totalMesa });
  }

  await updateDoc(doc(db, "comandas", mesaSelecionada.id), {
    aberta: false,
    fechadaEm: new Date(),
    formaPagamento: forma
  });

  fecharModal(modalPagamentoMesa);
  showAlert(`Mesa ${mesaSelecionada.numeroMesa} fechada com sucesso.`);
  mesaSelecionada = null;
  await carregarMesas();
}

window.filtrarProdutos = () => {
  renderProdutos();
};

window.filtrarProdutosMesa = () => {
  renderProdutosMesa();
};

cancelarPagamentoMesa?.addEventListener("click", () => fecharModal(modalPagamentoMesa));
cancelarFiadoBtn?.addEventListener("click", () => fecharModal(modalFiado));
confirmarFiadoBtn?.addEventListener("click", registrarFiado);

async function iniciar() {
  await carregarCaixaAberto();
  await carregarCategoriasSistema();
  await carregarProdutos();
  if (!mesasCarregadas) {
    renderMesas();
  }
  renderCarrinho();
}

iniciar();
