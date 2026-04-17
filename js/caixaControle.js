import { db } from "./firebaseConfig.js";
import { aplicarUsuarioLogado, exigirLogin } from "./layout.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const usuario = exigirLogin();
aplicarUsuarioLogado();

const statusCaixa = document.getElementById("statusCaixa");
const resumoPagamentos = document.getElementById("resumoPagamentos");
const listaFechamentos = document.getElementById("listaFechamentos");

if(!usuario.permissoes?.includes("admin")){
  document.querySelectorAll("[data-only-admin]").forEach((el)=>el.remove());
}

let caixaAtual = null;
let vendasDoCaixa = [];

function money(v){
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function carregarCaixaAtual(){
  const q = query(
    collection(db, "caixa"),
    where("usuario", "==", usuario.nome),
    where("aberto", "==", true),
    orderBy("dataAbertura", "desc"),
    limit(1)
  );

  const snap = await getDocs(q);
  caixaAtual = null;

  snap.forEach((d)=>{
    caixaAtual = { id: d.id, ...d.data() };
  });

  if(caixaAtual){
    await carregarVendasDoCaixa(caixaAtual.id);
  }else{
    vendasDoCaixa = [];
  }

  renderStatus();
  renderResumoPagamentos();
}

async function carregarVendasDoCaixa(caixaId){
  const q = query(collection(db, "vendas"), where("idCaixa", "==", caixaId));
  const snap = await getDocs(q);
  vendasDoCaixa = [];

  snap.forEach((d)=>vendasDoCaixa.push({ id: d.id, ...d.data() }));
}

function totalPorPagamento(vendas){
  const totais = { dinheiro: 0, pix: 0, debito: 0, credito: 0, ticket: 0, cashback: 0 };

  vendas.forEach((venda)=>{
    if(Array.isArray(venda.pagamentos) && venda.pagamentos.length){
      venda.pagamentos.forEach((p)=>{
        const tipo = String(p.tipo || "").toLowerCase();
        if(totais[tipo] !== undefined) totais[tipo] += Number(p.valor || 0);
      });
    }else{
      const forma = String(venda.formaPagamento || "").toLowerCase();
      if(totais[forma] !== undefined) totais[forma] += Number(venda.total || 0);
    }
  });

  return totais;
}

function renderStatus(){
  if(!caixaAtual){
    statusCaixa.innerHTML = `
      <h3>Status do Caixa</h3>
      <span class="badgeFechado">Fechado</span>
      <p>Você ainda não abriu seu caixa hoje.</p>
      <input id="valorInicial" class="inputValor" type="number" min="0" step="0.01" placeholder="Valor inicial">
      <div class="grupoBotoes">
        <button class="btnPrimario" id="btnAbrir">Abrir Caixa</button>
      </div>
    `;

    document.getElementById("btnAbrir").onclick = abrirCaixa;
    return;
  }

  const saldo = Number(caixaAtual.saldoAtual || 0);

  statusCaixa.innerHTML = `
    <h3>Status do Caixa</h3>
    <span class="badgeAberto">Aberto</span>
    <div class="infoLinha"><span>Valor inicial</span><strong>${money(caixaAtual.valorInicial)}</strong></div>
    <div class="infoLinha"><span>Saldo atual</span><strong>${money(saldo)}</strong></div>
    <div class="infoLinha"><span>Abertura</span><strong>${new Date(caixaAtual.dataAbertura?.seconds ? caixaAtual.dataAbertura.seconds * 1000 : caixaAtual.dataAbertura).toLocaleString("pt-BR")}</strong></div>
    <input id="valorSangria" class="inputValor" type="number" min="0" step="0.01" placeholder="Valor para sangria">
    <input id="motivoSangria" class="inputValor" placeholder="Motivo da sangria">
    <div class="grupoBotoes">
      <button class="btnSecundario" id="btnSangria">Registrar Sangria</button>
      <button class="btnPerigo" id="btnFechar">Fechar Caixa</button>
    </div>
  `;

  document.getElementById("btnSangria").onclick = registrarSangria;
  document.getElementById("btnFechar").onclick = fecharCaixa;
}

function renderResumoPagamentos(){
  const totais = totalPorPagamento(vendasDoCaixa);
  const totalRecebido = Object.values(totais).reduce((s, v)=>s + v, 0);

  resumoPagamentos.innerHTML = `
    <h3>Recebimentos por forma</h3>
    <div class="infoLinha"><span>Dinheiro</span><strong>${money(totais.dinheiro)}</strong></div>
    <div class="infoLinha"><span>PIX</span><strong>${money(totais.pix)}</strong></div>
    <div class="infoLinha"><span>Débito</span><strong>${money(totais.debito)}</strong></div>
    <div class="infoLinha"><span>Crédito</span><strong>${money(totais.credito)}</strong></div>
    <div class="infoLinha"><span>Ticket</span><strong>${money(totais.ticket)}</strong></div>
    <div class="infoLinha"><span>Cashback</span><strong>${money(totais.cashback)}</strong></div>
    <div class="infoLinha"><span>Total vendido</span><strong>${money(totalRecebido)}</strong></div>
  `;
}

async function abrirCaixa(){
  const valor = Number(document.getElementById("valorInicial").value);
  if(!valor){
    alert("Informe um valor inicial válido.");
    return;
  }

  await addDoc(collection(db, "caixa"), {
    usuario: usuario.nome,
    aberto: true,
    valorInicial: valor,
    saldoAtual: valor,
    dataAbertura: new Date()
  });

  await carregarCaixaAtual();
}

async function registrarSangria(){
  if(!caixaAtual) return;

  const valor = Number(document.getElementById("valorSangria").value);
  const motivo = document.getElementById("motivoSangria").value.trim();

  if(!valor || !motivo){
    alert("Informe valor e motivo da sangria.");
    return;
  }

  const novoSaldo = Number(caixaAtual.saldoAtual || 0) - valor;

  await updateDoc(doc(db, "caixa", caixaAtual.id), { saldoAtual: novoSaldo });
  await addDoc(collection(db, "retiradas"), {
    caixaId: caixaAtual.id,
    usuario: usuario.nome,
    valor,
    motivo,
    data: new Date()
  });

  await carregarCaixaAtual();
}

async function fecharCaixa(){
  if(!caixaAtual) return;

  const totais = totalPorPagamento(vendasDoCaixa);
  const totalVendido = Object.values(totais).reduce((s, v)=>s + v, 0);

  await updateDoc(doc(db, "caixa", caixaAtual.id), {
    aberto: false,
    dataFechamento: new Date(),
    resumoPagamentos: totais,
    totalVendido
  });

  alert("Caixa fechado com sucesso.");
  await carregarCaixaAtual();
  await carregarHistorico();
}

function formatData(data){
  if(!data) return "-";
  if(data?.toDate) return data.toDate().toLocaleString("pt-BR");
  if(data?.seconds) return new Date(data.seconds * 1000).toLocaleString("pt-BR");
  return new Date(data).toLocaleString("pt-BR");
}

async function carregarHistorico(){
  if(!usuario.permissoes?.includes("admin")){
    document.getElementById("historicoFechamentos").style.display = "none";
    return;
  }

  const snap = await getDocs(query(collection(db, "caixa"), orderBy("dataFechamento", "desc"), limit(20)));
  const registros = [];
  snap.forEach((d)=>{
    const item = { id: d.id, ...d.data() };
    if(item.aberto === false) registros.push(item);
  });

  if(!registros.length){
    listaFechamentos.innerHTML = "<p>Nenhum fechamento registrado.</p>";
    return;
  }

  listaFechamentos.innerHTML = registros.map((f)=>{
    const resumo = f.resumoPagamentos || {};
    return `
      <article class="fechamentoCard">
        <p><strong>Caixa:</strong> ${f.id}</p>
        <p><strong>Operador:</strong> ${f.usuario || "-"}</p>
        <p><strong>Fechamento:</strong> ${formatData(f.dataFechamento)}</p>
        <p><strong>Total vendido:</strong> ${money(f.totalVendido || 0)}</p>
        <p><strong>Dinheiro:</strong> ${money(resumo.dinheiro || 0)} • <strong>PIX:</strong> ${money(resumo.pix || 0)} • <strong>Débito:</strong> ${money(resumo.debito || 0)}</p>
        <p><strong>Crédito:</strong> ${money(resumo.credito || 0)} • <strong>Ticket:</strong> ${money(resumo.ticket || 0)} • <strong>Cashback:</strong> ${money(resumo.cashback || 0)}</p>
      </article>
    `;
  }).join("");
}

await carregarCaixaAtual();
await carregarHistorico();
