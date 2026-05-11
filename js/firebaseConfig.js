import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfigPadrao = {
apiKey: "AIzaSyByiw8kEiG6cmPgK71huzXvRkE",
authDomain: "pdv-acai-do-rapha.firebaseapp.com",
projectId: "pdv-acai-do-rapha",
storageBucket: "pdv-acai-do-rapha.firebasestorage.app",
messagingSenderId: "559895891029",
appId: "1:559895891029:web:9d547c63f8569832a9d8dc"
};

function lerConfigFirebaseOverride() {
  try {
    const bruto = localStorage.getItem("firebaseConfigOverride");
    if (!bruto) return {};
    const parsed = JSON.parse(bruto);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (erro) {
    console.warn("firebaseConfigOverride inválido no localStorage:", erro);
    return {};
  }
}

const firebaseConfig = {
  ...firebaseConfigPadrao,
  ...lerConfigFirebaseOverride()
};

const projectIdOverride = localStorage.getItem("firebaseProjectIdOverride");
if (projectIdOverride) firebaseConfig.projectId = projectIdOverride;

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
