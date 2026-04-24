import { db } from "./firebaseConfig.js";
import { aplicarUsuarioLogado, exigirLogin } from "./layout.js";
import { showAlert, showConfirm, showPrompt } from "./ui-feedback.js";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const usuario = exigirLogin();
aplicarUsuarioLogado();

const listaFiados = document.getElementById("listaFiados");
const buscaFiado = document.getElementById("buscaFiado");
const filtroStatusFiado = document.getElementById("filtroStatusFiado");
let fiados = [];
const FORMAS_PAGAMENTO = ["dinheiro", "pix", "debito", "credito", "ticket", "cashback"];

function money(v) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function normalizar(texto) {
  return String(texto || "").toLowerCase();
}

function renderizar() {
  const termo = normalizar(buscaFiado.value);
  const filtroStatus = normalizar(filtroStatusFiado?.value || "aberto");
  const lista = fiados.filter((item) => {
    const alvo = `${item.cliente || ""} ${item.whatsapp || ""}`;
    const status = normalizar(item.fiadoStatus || "aberto");
    const filtraStatus = filtroStatus === "todos" ? true : status === filtroStatus;
    return normalizar(alvo).includes(termo) && filtraStatus;
  });

  if (!lista.length) {
    listaFiados.innerHTML = "<p class='vazio'>Nenhum fiado encontrado para este filtro.</p>";
    return;
  }

  listaFiados.innerHTML = lista.map((item) => `
    <article class="fiadoCard">
      <p><strong>Cliente:</strong> ${item.cliente || "-"}</p>
      <p><strong>WhatsApp:</strong> ${item.whatsapp || "-"}</p>
      <p><strong>Total:</strong> ${money(item.total)}</p>
      <p><strong>Status:</strong> <span class="fiadoStatus ${normalizar(item.fiadoStatus) === "pago" ? "pago" : ""}">${item.fiadoStatus || "aberto"}</span></p>
      ${normalizar(item.fiadoStatus) !== "pago"
        ? `<button class="btnPrimario" data-receber="${item.id}">Registrar cobrança</button>`
        : "<p><strong>Forma recebida:</strong> " + (item.fiadoFormaRecebimento || "-") + "</p>"
      }
    </article>
  `).join("");

  listaFiados.querySelectorAll("[data-receber]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.receber;
      const alvo = fiados.find((f) => f.id === id);
      if (!alvo) return;

      const valorTxt = await showPrompt({
        titulo: "Registrar recebimento",
        mensagem: `Total pendente: ${money(alvo.total)}\nInforme o valor recebido`,
        valorPadrao: String(alvo.total || 0),
        placeholder: "0,00"
      });
      if (!valorTxt) return;

      const valor = Number(String(valorTxt).replace(",", "."));
      if (!valor || valor <= 0) {
        showAlert("Informe um valor válido.");
        return;
      }

      const formaTxt = await showPrompt({
        titulo: "Forma de pagamento",
        mensagem: "Informe a forma (dinheiro, pix, debito, credito, ticket ou cashback).",
        placeholder: "pix"
      });
      if (!formaTxt) return;

      const forma = normalizar(formaTxt);
      if (!FORMAS_PAGAMENTO.includes(forma)) {
        showAlert("Forma de pagamento inválida.");
        return;
      }

      const caixaDoDia = await obterCaixaAbertoDoUsuario();
      if (!caixaDoDia) {
        showAlert("Abra o caixa para registrar o recebimento do fiado.");
        return;
      }

      const ok = await showConfirm("Confirmar baixa desta cobrança?");
      if (!ok) return;

      await updateDoc(doc(db, "vendas", alvo.id), {
        fiadoStatus: "pago",
        fiadoPagoEm: new Date(),
        fiadoPagoPor: usuario?.nome || "sistema",
        fiadoValorRecebido: valor,
        fiadoFormaRecebimento: forma
      });

      await addDoc(collection(db, "vendas"), {
        criadoEm: new Date(),
        pagamentos: [{ tipo: forma, valor }],
        troco: 0,
        idCaixa: caixaDoDia.id,
        idUsuario: usuario?.nome || "sistema",
        nomeUsuario: usuario?.nome || "sistema",
        cliente: alvo.cliente || "Cliente fiado",
        total: valor,
        subtotal: valor,
        tipo: "recebimento_fiado",
        status: "finalizado",
        referenciaVendaFiadoId: alvo.id
      });

      await updateDoc(doc(db, "caixa", caixaDoDia.id), {
        saldoAtual: Number(caixaDoDia.saldoAtual || 0) + valor
      });

      showAlert("Cobrança registrada com sucesso.");
      await carregarFiados();
    });
  });
}

async function obterCaixaAbertoDoUsuario() {
  const q = query(
    collection(db, "caixa"),
    where("usuario", "==", usuario?.nome || ""),
    where("aberto", "==", true)
  );
  const snap = await getDocs(q);
  let caixa = null;
  snap.forEach((d) => {
    const atual = { id: d.id, ...d.data() };
    if (!caixa) {
      caixa = atual;
      return;
    }

    const dataAtual = new Date(atual.dataAbertura?.seconds ? atual.dataAbertura.seconds * 1000 : atual.dataAbertura || 0).getTime();
    const dataCaixa = new Date(caixa.dataAbertura?.seconds ? caixa.dataAbertura.seconds * 1000 : caixa.dataAbertura || 0).getTime();
    if (dataAtual > dataCaixa) caixa = atual;
  });

  return caixa;
}

async function carregarFiados() {
  const snap = await getDocs(collection(db, "vendas"));
  fiados = [];

  snap.forEach((docSnap) => {
    const venda = { id: docSnap.id, ...docSnap.data() };
    const ehFiado = String(venda.pagamentos?.[0]?.tipo || venda.formaPagamento || "").toLowerCase() === "fiado";
    const status = String(venda.fiadoStatus || "aberto").toLowerCase();
    if (ehFiado) fiados.push({ ...venda, fiadoStatus: status });
  });

  fiados.sort((a, b) => {
    const da = new Date(a.criadoEm?.seconds ? a.criadoEm.seconds * 1000 : a.criadoEm || 0).getTime();
    const dbv = new Date(b.criadoEm?.seconds ? b.criadoEm.seconds * 1000 : b.criadoEm || 0).getTime();
    return dbv - da;
  });

  renderizar();
}

buscaFiado?.addEventListener("input", renderizar);
filtroStatusFiado?.addEventListener("change", renderizar);
carregarFiados();
