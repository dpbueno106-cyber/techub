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
  }
});
// this makes signup box visiable when prompted
const loginBox = document.getElementById("loginBox");
const signupBox = document.getElementById("signupBox");

document.getElementById("showSignup").addEventListener("click", () => {
  loginBox.style.display = "none";
  signupBox.style.display = "block";
});

document.getElementById("showLogin").addEventListener("click", () => {
  signupBox.style.display = "none";
  loginBox.style.display = "block";
});



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
    
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");

loginBtn.addEventListener("click", async () => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      loginEmail.value,
      loginPassword.value
    );

    routeUser(userCredential.user.uid);

  } catch (error) {
    message.textContent = error.message;
  }
});


//SIGNUP
   

const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");
const signupMessage = document.getElementById("signupMessage");

signupBtn.addEventListener("click", async () => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      signupEmail.value,
      signupPassword.value
    );

    // Save to Firestore
    await setDoc(doc(db, "users", userCredential.user.uid), {
      email: signupEmail.value,
      role: "student"
    });

    signupMessage.textContent = "Account created ✅";
        await delay(3000);
        location.reload();
        

  } catch (error) {
    signupMessage.textContent = error.message;

    message.style.color = "red";
        await delay(3000);
        signupMessage.textContent = "";
  }
});



//help 
  
    helpBtn.addEventListener("click", () => {
      alert("Enter your email and password.\nClick Create Account first if you're new.");

    });

      


  
  
