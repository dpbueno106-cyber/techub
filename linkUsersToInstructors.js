import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD9i5yfE80MAsiri8SwiRCFParRb9jPyzY",
  authDomain: "techub-login-system.firebaseapp.com",
  projectId: "techub-login-system"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const tableBody = document.querySelector("#linkTable tbody");

async function loadData() {
  tableBody.innerHTML = "";

  const instructorsSnap = await getDocs(collection(db, "instructors"));
  const usersSnap = await getDocs(collection(db, "users"));

  const users = {};
  usersSnap.forEach(docSnap => {
    users[docSnap.id] = docSnap.data();
  });

  instructorsSnap.forEach(docSnap => {
    const instructor = docSnap.data();
    const instructorId = docSnap.id;

    const row = document.createElement("tr");

    // Instructor name
    const instructorCell = document.createElement("td");
    instructorCell.textContent = instructor.name;

    // User dropdown
    const userCell = document.createElement("td");
    const select = document.createElement("select");

    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "— Not linked —";
    select.appendChild(emptyOption);

    Object.entries(users).forEach(([uid, user]) => {
      const option = document.createElement("option");
      option.value = uid;
      option.textContent = user.email || uid;

      if (instructor.userUid === uid) {
        option.selected = true;
      }

      select.appendChild(option);
    });

    userCell.appendChild(select);

    // Save button
    const actionCell = document.createElement("td");
    const btn = document.createElement("button");
    btn.textContent = "Save";

    btn.onclick = async () => {
      const selectedUid = select.value || null;

      // Update instructor
      await updateDoc(doc(db, "instructors", instructorId), {
        userUid: selectedUid
      });

      // Update user (if selected)
      if (selectedUid) {
        await updateDoc(doc(db, "users", selectedUid), {
          instructorRef: instructorId,
          role: "instructor"
        });
      }

      alert("Link updated successfully!");
    };

    actionCell.appendChild(btn);

    row.appendChild(instructorCell);
    row.appendChild(userCell);
    row.appendChild(actionCell);

    tableBody.appendChild(row);
  });
}

loadData();
