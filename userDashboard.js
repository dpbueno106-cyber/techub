import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

import { 
      signInWithEmailAndPassword,
      createUserWithEmailAndPassword
    } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

    const firebaseConfig = {
      apiKey: "AIzaSyD9i5yfE80MAsiri8SwiRCFParRb9jPyzY",
      authDomain: "techub-login-system.firebaseapp.com",
      projectId: "techub-login-system",
      storageBucket: "techub-login-system.firebasestorage.app",
      messagingSenderId: "48424106638",
      appId: "1:48424106638:web:9246d83f302b21ab0327df",
      measurementId: "G-PQ5RJ1V0BB"
    };

  
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


const welcome = document.getElementById("welcome");
const logoutBtn = document.getElementById("logoutBtn");
const outlookList = document.getElementById("outlookList");

//  Protect page + load outlook
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  welcome.textContent = "Welcome, " + user.email;

  try {
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);

    //  WAIT until Firestore data exists
    if (!docSnap.exists()) {
      console.log("User document not ready yet");
      return; // ← DO NOT redirect
    }

    const role = docSnap.data().role;
    console.log("ROLE:", role);

    //  Only block if role is DEFINITELY wrong
    if (role !== "instructor") {
      alert("Access denied");
      window.location.href = "index.html";
    }

  } catch (err) {
    console.error("Permission check failed:", err);
  }
});
//  Placeholder outlook (until calendar is built)
function loadTeachingOutlook() {
  onSnapshot(
  collection(db, "schedules", user.uid, "events"),
  (snapshot) => {
    outlookList.innerHTML = "";

    snapshot.docs
      .map(d => d.data())
      .slice(0, 5)
      .forEach(event => {
        const li = document.createElement("li");
        li.textContent =
          new Date(event.start).toDateString() + " – Teaching";
        outlookList.appendChild(li);
      });
  }
);
}


logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "index.html";
  } catch (err) {
    console.error("Sign out error:", err);
    alert("Failed to sign out");
  }
});



