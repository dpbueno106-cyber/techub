import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD9i5yfE80MAsiri8SwiRCFParRb9jPyzY",
  authDomain: "techub-login-system.firebaseapp.com",
  projectId: "techub-login-system"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});