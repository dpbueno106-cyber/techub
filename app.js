import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { 
      getAuth, 
      signInWithEmailAndPassword,
      createUserWithEmailAndPassword
    } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

import { //added db 
  getFirestore, 
  setDoc, 
  doc 
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

import { getDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";


    const firebaseConfig = {
      apiKey: "AIzaSyD9i5yfE80MAsiri8SwiRCFParRb9jPyzY",
      authDomain: "techub-login-system.firebaseapp.com",
      projectId: "techub-login-system",
      storageBucket: "techub-login-system.firebasestorage.app",
      messagingSenderId: "48424106638",
      appId: "1:48424106638:web:9246d83f302b21ab0327df",
      measurementId: "G-PQ5RJ1V0BB"
    };

    //Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
const db = getFirestore(app);
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const helpBtn = document.getElementById("helpBtn");
const message = document.getElementById("message");



//html elems

const emailInput = document.getElementById("username");
const passwordInput = document.getElementById("password");




//automatically brings up dash if already loged in
/*

onAuthStateChanged(auth, (user) => {
  if (user) {
    routeUser(user.uid);
  }
});

*/
/*
onAuthStateChanged(auth, (user) => {
  if (user){
        if (role === "admin")
        {
        window.location.href = "adminDashboard.html";
        }else if (role === "instructor"){
    window.location.href = "userDashboard.html";
  }else if (role === "student"){
              window.location.href = "studentDashboard.html";
        }
});
*/
//
async function routeUser(uid) {
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return;

  const role = docSnap.data().role;

  if (role === "admin") {
    window.location.href = "adminDashboard.html";
  } else if (role === "instructor") {
    window.location.href = "instructorDashboard.html";
  } 
      return
}


    //LOGIN
    
loginBtn.addEventListener("click", async () => {
  try {
        alert("Button works!");
    const email = emailInput.value;
    const password = passwordInput.value;

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    routeUser(userCredential.user.uid);

  } catch (error) {
    message.textContent = error.message;
    message.style.color = "red";
  }
});


//SIGNUP
   
signupBtn.addEventListener("click", async () => {
  try {
    const email = emailInput.value;
    const password = passwordInput.value;

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    //  Save role in Firestore
    await setDoc(doc(db, "users", userCredential.user.uid), {
      email: email,
      role: "instructor"   // default role
    });

    message.textContent = "Account created ✅";
    message.style.color = "green";

  } catch (error) {
    message.textContent = error.message;
    message.style.color = "red";
  }
});



//help 
  
    helpBtn.addEventListener("click", () => {
      alert("Enter your email and password.\nClick Create Account first if you're new.");

    });

      


  
  
