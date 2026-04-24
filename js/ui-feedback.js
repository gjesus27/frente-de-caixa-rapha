let modalRoot;

function garantirEstilos() {
  if (document.getElementById("appFeedbackStyle")) return;

  const style = document.createElement("style");
  style.id = "appFeedbackStyle";
  style.textContent = `
    .appFeedbackOverlay{
      position:fixed; inset:0; background:rgba(15,23,42,.45); display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px;
    }
    .appFeedbackBox{
      width:min(460px, 100%); background:#fff; border-radius:18px; box-shadow:0 24px 48px rgba(15,23,42,.28); padding:20px; color:#0f172a;
    }
    .appFeedbackBox h3{ margin:0 0 8px; font-size:1.1rem; }
    .appFeedbackBox p{ margin:0 0 16px; color:#334155; white-space:pre-line; }
    .appFeedbackInput{ width:100%; border:1px solid #cbd5e1; border-radius:12px; padding:12px; margin-bottom:14px; font:inherit; }
    .appFeedbackActions{ display:flex; justify-content:flex-end; gap:10px; }
    .appBtn{ border:0; border-radius:12px; padding:10px 14px; font-weight:600; cursor:pointer; }
    .appBtnPrimario{ background:#22c55e; color:#fff; }
    .appBtnSecundario{ background:#e2e8f0; color:#0f172a; }
  `;
  document.head.appendChild(style);
}

function garantirRoot() {
  if (modalRoot) return modalRoot;
  modalRoot = document.createElement("div");
  document.body.appendChild(modalRoot);
  return modalRoot;
}

function renderModal({ titulo = "Aviso", mensagem = "", withInput = false, defaultValue = "", placeholder = "", onConfirm, onCancel, textoConfirmar = "Ok", textoCancelar = "Cancelar" }) {
  garantirEstilos();
  const root = garantirRoot();
  const overlay = document.createElement("div");
  overlay.className = "appFeedbackOverlay";

  const inputHtml = withInput
    ? `<input class="appFeedbackInput" id="appFeedbackInput" value="${String(defaultValue).replaceAll('"', "&quot;")}" placeholder="${placeholder.replaceAll('"', "&quot;")}">`
    : "";

  overlay.innerHTML = `
    <div class="appFeedbackBox">
      <h3>${titulo}</h3>
      <p>${mensagem}</p>
      ${inputHtml}
      <div class="appFeedbackActions">
        ${onCancel ? `<button class="appBtn appBtnSecundario" data-cancelar>${textoCancelar}</button>` : ""}
        <button class="appBtn appBtnPrimario" data-confirmar>${textoConfirmar}</button>
      </div>
    </div>
  `;

  const close = () => overlay.remove();
  overlay.querySelector("[data-confirmar]")?.addEventListener("click", () => {
    const valor = withInput ? overlay.querySelector("#appFeedbackInput")?.value ?? "" : undefined;
    onConfirm?.(valor);
    close();
  });

  overlay.querySelector("[data-cancelar]")?.addEventListener("click", () => {
    onCancel?.();
    close();
  });

  overlay.addEventListener("click", (e) => {
    if (e.target !== overlay) return;
    onCancel?.();
    close();
  });

  root.appendChild(overlay);
}

export function showAlert(mensagem, titulo = "Aviso") {
  renderModal({ titulo, mensagem, onConfirm: () => {} });
}

export function showConfirm(mensagem, titulo = "Confirmação") {
  return new Promise((resolve) => {
    renderModal({
      titulo,
      mensagem,
      textoConfirmar: "Confirmar",
      textoCancelar: "Voltar",
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false)
    });
  });
}

export function showPrompt({ mensagem, titulo = "Preencher", valorPadrao = "", placeholder = "" }) {
  return new Promise((resolve) => {
    renderModal({
      titulo,
      mensagem,
      withInput: true,
      defaultValue: valorPadrao,
      placeholder,
      textoConfirmar: "Salvar",
      textoCancelar: "Cancelar",
      onConfirm: (valor) => resolve((valor || "").trim()),
      onCancel: () => resolve(null)
    });
  });
}
