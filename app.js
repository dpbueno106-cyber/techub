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
/*function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
*/


//html elems






//automatically brings up dash if already loged in
/*

onAuthStateChanged(auth, (user) => {
  if (user) {
    routeUser(user.uid);
  }
});

*/


let justSignedUp = false;

onAuthStateChanged(auth, (user) => {
  if (user && !justSignedUp) {
    routeUser(user.uid);
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

  if (!docSnap.exists()) {
    console.log("No user record found");
    return;
  }

  const role = docSnap.data().role;
  console.log("ROLE:", role); 

  if (role === "admin") {
    console.log("Redirecting to admin...");
    window.location.href = "adminDashboard.html";
  } else if (role === "instructor") {
    console.log("Redirecting to instructor...");
    window.location.href = "instructorDashboard.html";
  }
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

    // wait briefly for Firestore data to exist
    setTimeout(() => {
      routeUser(userCredential.user.uid);
    }, 500);

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

    justSignedUp = true; 

    await setDoc(doc(db, "users", userCredential.user.uid), {
      email: signupEmail.value,
      role: "instructor"
    });

    signupMessage.textContent = "Account created ✅";
    signupMessage.style.color = "green";

    setTimeout(() => {
      signupBox.style.display = "none";
      signupMessage.textContent = "";
      loginBox.style.display = "block";
      justSignedUp = false; 

    }, 3000);

  } catch (error) {
    signupMessage.textContent = error.message;
    signupMessage.style.color = "red";
  }
});




//help 
  
    helpBtn.addEventListener("click", () => {
      alert("Enter your email and password.\nClick Create Account first if you're new.");

    });

      


  
  
