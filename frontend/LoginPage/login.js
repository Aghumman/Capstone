// Login account storage and page state

const STORAGE_KEY = "resumePortalData";
const CURRENT_USER_KEY = "resumePortalCurrentUser";

let accounts = {};
let pendingRole = "seeker";

// Account persistence

function saveState() {
  const serializable = {
    accounts,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch (error) {
    console.error("Failed to save account data:", error);
  }
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return;
  }

  try {
    const data = JSON.parse(raw);

    accounts = data.accounts || {};
  } catch (error) {
    console.error("Failed to load account data:", error);

    accounts = {};
  }
}

// Seeker and employer role selection

function setRole(role) {
  pendingRole = role;

  const seekerTab = document.getElementById("tabSeeker");

  const employerTab = document.getElementById("tabEmployer");

  if (seekerTab) {
    seekerTab.classList.toggle("active", role === "seeker");
  }

  if (employerTab) {
    employerTab.classList.toggle("active", role === "employer");
  }

  hideError();
}

// Login error display

function showError(message) {
  const element = document.getElementById("loginError");

  if (!element) {
    return;
  }

  element.textContent = message;

  element.classList.remove("hidden");
}

function hideError() {
  const element = document.getElementById("loginError");

  if (!element) {
    return;
  }

  element.classList.add("hidden");
}

// Login and account creation

function login() {
  const fullNameInput = document.getElementById("fullName");

  const usernameInput = document.getElementById("username");

  const passwordInput = document.getElementById("password");

  const fullName = fullNameInput.value.trim();

  const username = usernameInput.value.trim();

  const password = passwordInput.value;

  if (!fullName || !username || !password) {
    showError("Please enter full name, username, and password.");

    return;
  }

  const existing = accounts[username];

  // Existing accounts must match both password and selected role.
  if (existing) {
    if (existing.password !== password) {
      showError("Incorrect password for that username.");

      return;
    }

    if (existing.role !== pendingRole) {
      showError(
        `That username is registered as ${
          existing.role === "seeker" ? "a Job Seeker" : "an Employer"
        }. Switch tabs to log in.`
      );

      return;
    }

    if (!existing.fullName) {
      existing.fullName = fullName;

      saveState();
    }
  } else {
    // A username that does not exist creates a new account.
    accounts[username] = {
      password,
      fullName,
      role: pendingRole,
    };

    saveState();
  }

  // Store the signed-in user for the dashboard pages.

  const currentUser = {
    username,

    fullName: accounts[username].fullName || fullName,

    role: accounts[username].role || pendingRole,
  };

  try {
    sessionStorage.setItem("currentUser", JSON.stringify(currentUser));

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
  } catch (error) {
    console.error("Could not save login session:", error);

    showError("Could not save your login session.");

    return;
  }

  console.log("LOGIN SUCCESSFUL:", currentUser);

  console.log("SESSION STORAGE:", sessionStorage.getItem("currentUser"));

  console.log("LOCAL STORAGE BACKUP:", localStorage.getItem(CURRENT_USER_KEY));

  hideError();

  redirectToDashboard(currentUser.role);
}

// Send the user to the correct dashboard

function redirectToDashboard(role) {
  if (role === "seeker") {
    window.location.href = "../SeekerPage/SeekerPage.html";
  } else {
    window.location.href = "../EmployerPage/EmployerPage.html";
  }
}

// Prevent the login button from causing an HTML form refresh

function preventLoginRefresh() {
  const button = document.querySelector(".btn-primary");

  if (button) {
    button.type = "button";
  }
}

// Page initialization

loadState();

document.addEventListener("DOMContentLoaded", () => {
  preventLoginRefresh();

  const passwordInput = document.getElementById("password");

  if (passwordInput) {
    passwordInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();

        login();
      }
    });
  }

  console.log("LOGIN PAGE READY");
});
