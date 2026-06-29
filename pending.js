import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const auth = getAuth();

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});