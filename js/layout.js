export function obterUsuarioLogado(){
  return JSON.parse(localStorage.getItem("usuarioLogado"));
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
  const alvos = document.querySelectorAll('[data-usuario-logado]');

  alvos.forEach((el)=>{
    if(!usuario){
      el.textContent = "Não autenticado";
      return;
    }

    const nivel = Array.isArray(usuario.permissoes) ? usuario.permissoes.join(", ") : "sem permissão";
    el.textContent = `${usuario.nome || "Usuário"} • ${nivel}`;
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
