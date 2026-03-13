const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));

if(!usuario){

window.location.href = "../pages/login.html";

}

const usuarioSpan = document.getElementById("usuarioLogado");

if(usuarioSpan){

usuarioSpan.innerText = "Usuário: " + usuario.nome;

}