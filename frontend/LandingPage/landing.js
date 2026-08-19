// Dashboard navigation

function goToSeeker() {
  window.location.href = "../SeekerPage/SeekerPage.html";
}

function goToEmployer() {
  window.location.href = "../EmployerPage/EmployerPage.html";
}

// Redirect users when a role is included in the URL

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);

  const role = params.get("role");

  if (role === "seeker") {
    goToSeeker();
  } else if (role === "employer") {
    goToEmployer();
  }
});
