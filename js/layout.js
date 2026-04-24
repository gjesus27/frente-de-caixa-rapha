export function obterUsuarioLogado(){
  return JSON.parse(localStorage.getItem("usuarioLogado"));
}

const LINKS_SIDEBAR = [
  { href: "dashboard.html", label: "Dashboard", icon: "📊", onlyAdmin: true },
  { href: "pdv.html", label: "PDV", icon: "🛒" },
  { href: "caixa.html", label: "Caixa", icon: "💰" },
  { href: "produtos.html", label: "Produtos", icon: "📦" },
  { href: "entregador.html", label: "Entregas", icon: "🛵" },
  { href: "historico.html", label: "Histórico", icon: "🕘", onlyAdmin: true },
  { href: "fiados.html", label: "Cobrança Fiado", icon: "🤝" },
  { href: "configuracoes.html", label: "Configurações", icon: "⚙️" }
];

function obterPaginaAtual() {
  const partes = window.location.pathname.split("/");
  return partes[partes.length - 1] || "dashboard.html";
}

function iniciaisNome(nome = "") {
  const nomes = nome.trim().split(/\s+/).filter(Boolean);
  if (!nomes.length) return "U";
  if (nomes.length === 1) return nomes[0][0].toUpperCase();
  return `${nomes[0][0]}${nomes[nomes.length - 1][0]}`.toUpperCase();
}

export function montarSidebar() {
  const sidebar = document.querySelector(".sidebarAdmin");
  if (!sidebar) return;

  const atual = obterPaginaAtual();
  const links = LINKS_SIDEBAR.map((item) => {
    const ativo = item.href === atual ? "ativo" : "";
    const admin = item.onlyAdmin ? 'data-only-admin="true"' : "";
    return `<a href="${item.href}" class="${ativo}" ${admin}><span class="navIcon">${item.icon}</span> ${item.label}</a>`;
  }).join("");

  const botaoRelatorio = atual === "dashboard.html"
    ? `<button onclick="baixarExcel()" class="sidebarAction"><span>📥</span> Relatório Excel</button>`
    : "";

  sidebar.innerHTML = `
    <div class="sidebarBrand">
      <img src="../img/Logo.png" alt="Logo da loja">
      <div>
        <strong>Açaí do Rapha</strong>
        <small>Sistema da loja</small>
      </div>
    </div>
    <div class="sidebarPerfil">
      <div class="avatarPerfil" data-avatar-logado>U</div>
      <div>
        <p class="sidebarUserNome" data-usuario-logado-nome>Não autenticado</p>
        <p class="sidebarUser" data-usuario-logado>Sem permissão</p>
      </div>
    </div>
    <nav>${links}</nav>
    ${botaoRelatorio}
    <a class="sidebarAction suporte" href="https://wa.me/11987293823" target="_blank" rel="noopener noreferrer"><span>💬</span> Solicitar suporte</a>
    <button id="logout" class="sidebarAction sair"><span>↩</span> Sair</button>
  `;
}

export function exigirLogin(){
  const usuario = obterUsuarioLogado();
  if(!usuario){
    window.location.href = "login.html";
    return null;
  }
  return usuario;
}

export function aplicarUsuarioLogado(){
  const usuario = obterUsuarioLogado();
  const alvos = document.querySelectorAll("[data-usuario-logado]");
  const nomes = document.querySelectorAll("[data-usuario-logado-nome]");
  const avatars = document.querySelectorAll("[data-avatar-logado]");

  alvos.forEach((el)=>{
    if(!usuario){
      el.textContent = "Não autenticado";
      return;
    }

    const nivel = Array.isArray(usuario.permissoes) ? usuario.permissoes.join(", ") : "sem permissão";
    el.textContent = nivel;
  });

  nomes.forEach((el)=>{
    el.textContent = usuario?.nome || "Usuário";
  });

  avatars.forEach((el)=>{
    el.textContent = iniciaisNome(usuario?.nome || "");
  });

  const soAdmin = document.querySelectorAll("[data-only-admin]");
  const isAdmin = Boolean(usuario?.permissoes?.includes("admin"));
  soAdmin.forEach((el)=>{
    if(!isAdmin){
      el.style.display = "none";
    }
  });

  const logoutBtn = document.getElementById("logout");
  if(logoutBtn){
    logoutBtn.onclick = ()=>{
      localStorage.removeItem("usuarioLogado");
      window.location.href = "login.html";
    };
  }

  return usuario;
}
