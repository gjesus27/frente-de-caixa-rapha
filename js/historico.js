import { db } from "./firebaseConfig.js";
import {
  collection,
  getDocs,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { aplicarUsuarioLogado, exigirLogin } from "./layout.js";
import { showAlert } from "./ui-feedback.js";

const usuario = exigirLogin();
aplicarUsuarioLogado();

const tabelaVendas = document.getElementById("tabelaVendas");
const estadoVazio = document.getElementById("estadoVazio");
const tabelaWrapper = document.getElementById("tabelaWrapper");

const filtroStatus = document.getElementById("filtroStatus");
const filtroInicio = document.getElementById("filtroInicio");
const filtroFim = document.getElementById("filtroFim");
const buscaCliente = document.getElementById("buscaCliente");

const modalDetalhes = document.getElementById("modalDetalhes");
const conteudoDetalhes = document.getElementById("conteudoDetalhes");
const btnFecharDetalhes = document.getElementById("btnFecharDetalhes");

const modalCancelar = document.getElementById("modalCancelar");
const btnFecharCancelar = document.getElementById("btnFecharCancelar");
const btnConfirmarCancelamento = document.getElementById("btnConfirmarCancelamento");
const motivoCancelamentoInput = document.getElementById("motivoCancelamento");
const tituloCancelar = document.getElementById("tituloCancelar");

let vendas = [];
let vendaParaCancelar = null;

function formatarMoeda(valor){
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(valor){
  if(!valor) return "-";
  if(valor?.toDate) return valor.toDate().toLocaleString("pt-BR");

  const data = new Date(valor);
  if(Number.isNaN(data.getTime())) return "-";
  return data.toLocaleString("pt-BR");
}

function dataParaComparacao(valor){
  if(!valor) return null;
  if(valor?.toDate) return valor.toDate();
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

function pagamentosTexto(venda){
  if(Array.isArray(venda.pagamentos) && venda.pagamentos.length){
    const tipos = venda.pagamentos.map(p => p.tipo).filter(Boolean);
    return tipos.length ? tipos.join(", ").toUpperCase() : "Misto";
  }

  if(venda.formaPagamento){
    return String(venda.formaPagamento).toUpperCase();
  }

  return "-";
}

function abrirDetalhes(venda){
  const itens = Array.isArray(venda.itens) ? venda.itens : [];
  const itensHtml = itens.length
    ? `<ul>${itens.map(item => `<li>${item.quantidade || 1}x ${item.nome || "Item"} - ${formatarMoeda(item.preco)}</li>`).join("")}</ul>`
    : "<p>Nenhum item registrado.</p>";

  conteudoDetalhes.innerHTML = `
    <p><b>Cliente:</b> ${venda.nomeUsuario || venda.idUsuario || "Sem nome"}</p>
    <p><b>Data:</b> ${formatarData(venda.criadoEm || venda.data)}</p>
    <p><b>Pagamento:</b> ${pagamentosTexto(venda)}</p>
    <p><b>Status:</b> ${venda.status === "cancelado" ? "Cancelada" : "Concluída"}</p>
    ${venda.motivoCancelamento ? `<p><b>Motivo cancelamento:</b> ${venda.motivoCancelamento}</p>` : ""}
    <div>
      <p><b>Itens:</b></p>
      ${itensHtml}
    </div>
    <p><b>Total:</b> ${formatarMoeda(venda.total)}</p>
  `;

  modalDetalhes.classList.remove("hidden");
}

function abrirCancelamento(venda){
  vendaParaCancelar = venda;
  tituloCancelar.innerText = `Cancelar venda ${venda.id}`;
  motivoCancelamentoInput.value = "";
  modalCancelar.classList.remove("hidden");
}

async function confirmarCancelamento(){
  const motivo = motivoCancelamentoInput.value.trim();
  if(!motivo){
    showAlert("Informe o motivo do cancelamento.");
    return;
  }

  if(!vendaParaCancelar){
    return;
  }

  await updateDoc(doc(db, "vendas", vendaParaCancelar.id), {
    status: "cancelado",
    motivoCancelamento: motivo,
    canceladoEm: new Date(),
    canceladoPor: usuario.nome || "sem_nome"
  });

  modalCancelar.classList.add("hidden");
  vendaParaCancelar = null;
  await carregarVendas();
  showAlert("Venda cancelada com sucesso.");
}

function renderizarTabela(lista){
  tabelaVendas.innerHTML = "";

  if(!lista.length){
    estadoVazio.classList.remove("hidden");
    tabelaWrapper.classList.add("hidden");
    return;
  }

  estadoVazio.classList.add("hidden");
  tabelaWrapper.classList.remove("hidden");

  lista.forEach(venda => {
    const tr = document.createElement("tr");
    const status = venda.status === "cancelado" ? "Cancelada" : "Concluída";
    const badgeClass = venda.status === "cancelado" ? "badgeCancelada" : "badgeConcluida";

    tr.innerHTML = `
      <td><b>${venda.id}</b></td>
      <td>${formatarData(venda.criadoEm || venda.data)}</td>
      <td>${venda.nomeUsuario || venda.idUsuario || "Sem nome"}</td>
      <td><b>${formatarMoeda(venda.total)}</b></td>
      <td>${pagamentosTexto(venda)}</td>
      <td><span class="badge ${badgeClass}">${status}</span></td>
      <td>
        <div class="acoes">
          <button class="btnSecundario btnDetalhes"><i class="fa-regular fa-eye"></i> Ver</button>
          ${venda.status !== "cancelado" ? `<button class="btnPerigo btnCancelar"><i class="fa-regular fa-circle-xmark"></i> Cancelar</button>` : ""}
        </div>
      </td>
    `;

    tr.querySelector(".btnDetalhes").addEventListener("click", () => abrirDetalhes(venda));

    const btnCancelar = tr.querySelector(".btnCancelar");
    if(btnCancelar){
      btnCancelar.addEventListener("click", () => abrirCancelamento(venda));
    }

    tabelaVendas.appendChild(tr);
  });
}

function filtrarVendas(){
  const statusEscolhido = filtroStatus.value;
  const textoBusca = buscaCliente.value.trim().toLowerCase();
  const inicio = filtroInicio.value ? new Date(`${filtroInicio.value}T00:00:00`) : null;
  const fim = filtroFim.value ? new Date(`${filtroFim.value}T23:59:59`) : null;

  const filtradas = vendas.filter(venda => {
    if(statusEscolhido !== "todos" && venda.status !== statusEscolhido) return false;

    const cliente = (venda.nomeUsuario || venda.idUsuario || "").toLowerCase();
    const id = String(venda.id || "").toLowerCase();
    if(textoBusca && !cliente.includes(textoBusca) && !id.includes(textoBusca)) return false;

    const dataVenda = dataParaComparacao(venda.criadoEm || venda.data);
    if(inicio && (!dataVenda || dataVenda < inicio)) return false;
    if(fim && (!dataVenda || dataVenda > fim)) return false;

    return true;
  });

  renderizarTabela(filtradas);
}

async function carregarVendas(){
  const snap = await getDocs(collection(db, "vendas"));
  vendas = [];

  snap.forEach(docSnap => {
    vendas.push({
      id: docSnap.id,
      ...docSnap.data()
    });
  });

  vendas.sort((a, b) => {
    const dataA = dataParaComparacao(a.criadoEm || a.data)?.getTime() || 0;
    const dataB = dataParaComparacao(b.criadoEm || b.data)?.getTime() || 0;
    return dataB - dataA;
  });

  filtrarVendas();
}

document.getElementById("btnFiltrar").addEventListener("click", filtrarVendas);
document.getElementById("btnAtualizar").addEventListener("click", carregarVendas);
buscaCliente.addEventListener("input", filtrarVendas);
filtroStatus.addEventListener("change", filtrarVendas);

btnFecharDetalhes.addEventListener("click", () => modalDetalhes.classList.add("hidden"));
btnFecharCancelar.addEventListener("click", () => modalCancelar.classList.add("hidden"));
btnConfirmarCancelamento.addEventListener("click", confirmarCancelamento);

carregarVendas();
