import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { 
      getAuth, 
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

    //Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const helpBtn = document.getElementById("helpBtn");
const message = document.getElementById("message");

    //LOGIN
    loginBtn.addEventListener("click",() => {
      let email = document.getElementById("username").value;
      let password = document.getElementById("password").value;
      let message = document.getElementById("message");

      signInWithEmailAndPassword(auth, email, password)
        .then(() => {
          message.textContent = "Login successful ✅";
          message.style.color = "green";
          window.location.href = "userDashboard.html";
        })
        .catch(() => {
          message.textContent = "Login failed ❌";
          message.style.color = "red";
        });
    });

//SIGNUP
    signupBtn.addEventListener("click", () => {
      let email = document.getElementById("username").value;
      let password = document.getElementById("password").value;
      let message = document.getElementById("message");

      createUserWithEmailAndPassword(auth, email, password).then(() => {
          message.textContent = "Account created ✅";
          message.style.color = "green";
        })
        .catch((error) => {
          message.textContent = error.message;
          message.style.color = "red";
        });
    });



  
    helpBtn.addEventListener("click", () => {
      alert("Enter your email and password.\nClick Create Account first if you're new.");
    });

  
  
