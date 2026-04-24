import { db } from "./firebaseConfig.js";
import { aplicarUsuarioLogado, exigirLogin } from "./layout.js";
import { showAlert, showConfirm, showPrompt } from "./ui-feedback.js";
import { collection, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const usuario = exigirLogin();
aplicarUsuarioLogado();

const listaFiados = document.getElementById("listaFiados");
const buscaFiado = document.getElementById("buscaFiado");
let fiados = [];

function money(v) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function normalizar(texto) {
  return String(texto || "").toLowerCase();
}

function renderizar() {
  const termo = normalizar(buscaFiado.value);
  const lista = fiados.filter((item) => {
    const alvo = `${item.cliente || ""} ${item.whatsapp || ""}`;
    return normalizar(alvo).includes(termo);
  });

  if (!lista.length) {
    listaFiados.innerHTML = "<p>Nenhum fiado pendente encontrado.</p>";
    return;
  }

  listaFiados.innerHTML = lista.map((item) => `
    <article class="cardHistorico" style="margin-top:12px;">
      <p><strong>Cliente:</strong> ${item.cliente || "-"}</p>
      <p><strong>WhatsApp:</strong> ${item.whatsapp || "-"}</p>
      <p><strong>Total:</strong> ${money(item.total)}</p>
      <p><strong>Status:</strong> ${item.fiadoStatus || "pendente"}</p>
      <button class="btnPrimario" data-receber="${item.id}">Registrar cobrança</button>
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

      const ok = await showConfirm("Confirmar baixa desta cobrança?");
      if (!ok) return;

      await updateDoc(doc(db, "vendas", alvo.id), {
        fiadoStatus: "pago",
        fiadoPagoEm: new Date(),
        fiadoPagoPor: usuario?.nome || "sistema",
        fiadoValorRecebido: valor
      });

      showAlert("Cobrança registrada com sucesso.");
      await carregarFiados();
    });
  });
}

async function carregarFiados() {
  const snap = await getDocs(collection(db, "vendas"));
  fiados = [];

  snap.forEach((docSnap) => {
    const venda = { id: docSnap.id, ...docSnap.data() };
    const ehFiado = String(venda.pagamentos?.[0]?.tipo || venda.formaPagamento || "").toLowerCase() === "fiado";
    const status = String(venda.fiadoStatus || "pendente").toLowerCase();
    if (ehFiado && status !== "pago") fiados.push(venda);
  });

  fiados.sort((a, b) => {
    const da = new Date(a.criadoEm?.seconds ? a.criadoEm.seconds * 1000 : a.criadoEm || 0).getTime();
    const dbv = new Date(b.criadoEm?.seconds ? b.criadoEm.seconds * 1000 : b.criadoEm || 0).getTime();
    return dbv - da;
  });

  renderizar();
}

buscaFiado?.addEventListener("input", renderizar);
carregarFiados();
