// Employer page configuration and state

const API_BASE_URL = "http://127.0.0.1:5001";

const STORAGE_KEY = "resumePortalEmployerData";
const FRONTEND_STORAGE_KEY = "resumePortalFrontendData";
const JOB_STORAGE_KEY = "resumePortalJobs";
const APPLICATION_STORAGE_KEY = "resumePortalApplications";
const CURRENT_USER_KEY = "resumePortalCurrentUser";

let resumes = {};
let ratings = {};
let savedCandidates = {};
let session = null;

let currentmodelUsername = null;

const expandedApplications = new Set();

// Employer-specific saved data

function saveState() {
  try {
    const serializable = {
      ratings,

      savedCandidates: Object.fromEntries(
        Object.entries(savedCandidates).map(([username, set]) => [
          username,
          Array.from(set),
        ])
      ),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));

    return true;
  } catch (error) {
    console.error("Could not save employer state:", error);

    return false;
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      ratings = {};
      savedCandidates = {};

      return;
    }

    const data = JSON.parse(raw);

    ratings = data.ratings || {};

    savedCandidates = {};

    Object.entries(data.savedCandidates || {}).forEach(([username, values]) => {
      savedCandidates[username] = new Set(Array.isArray(values) ? values : []);
    });
  } catch (error) {
    console.error("Could not load employer state:", error);

    ratings = {};
    savedCandidates = {};
  }
}

// Session management

function checkSession() {
  let sessionData = sessionStorage.getItem("currentUser");

  if (!sessionData) {
    sessionData = localStorage.getItem(CURRENT_USER_KEY);

    if (sessionData) {
      sessionStorage.setItem("currentUser", sessionData);
    }
  }

  if (!sessionData) {
    window.location.replace("../LoginPage/login.html");

    return false;
  }

  try {
    session = JSON.parse(sessionData);
  } catch (error) {
    console.error("Invalid session:", error);

    sessionStorage.removeItem("currentUser");

    localStorage.removeItem(CURRENT_USER_KEY);

    window.location.replace("../LoginPage/login.html");

    return false;
  }

  if (!session || !session.username) {
    return false;
  }

  if (session.role && session.role !== "employer") {
    window.location.replace("../SeekerPage/SeekerPage.html");

    return false;
  }

  const employerName = document.getElementById("employerName");

  if (employerName) {
    employerName.textContent = session.fullName || session.username;
  }

  if (!ratings[session.username]) {
    ratings[session.username] = {};
  }

  if (!savedCandidates[session.username]) {
    savedCandidates[session.username] = new Set();
  }

  saveState();

  return true;
}

function logout() {
  sessionStorage.removeItem("currentUser");

  localStorage.removeItem(CURRENT_USER_KEY);

  session = null;

  window.location.replace("../LoginPage/login.html");
}

// General display utilities

function escapeHTML(value) {
  const div = document.createElement("div");

  div.textContent = value == null ? "" : String(value);

  return div.innerHTML;
}

function escapeAttr(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/'/g, "&#39;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatTime(value) {
  if (!value) {
    return "Unknown";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatArray(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return "None detected";
  }

  return values.join(", ");
}

function buildResumeKey(username, resumeId) {
  return `${username}::${resumeId}`;
}

// Load resumes submitted by seekers

function loadResumes() {
  try {
    const raw = localStorage.getItem(FRONTEND_STORAGE_KEY);

    resumes = {};

    if (!raw) {
      pruneInvalidSavedResumes();
      renderResumeList();
      updateSavedCount();

      return;
    }

    const data = JSON.parse(raw);

    const libraries = data.resumeLibraries || {};

    // Load all resumes from the newer multiple-resume format.
    Object.entries(libraries).forEach(([username, library]) => {
      if (!Array.isArray(library)) {
        return;
      }

      library.forEach((record, index) => {
        if (!record) {
          return;
        }

        const resumeId = record.id || `${username}-${index}`;

        const resumeKey = buildResumeKey(username, resumeId);

        resumes[resumeKey] = {
          ...record,

          id: resumeId,

          username: record.username || username,

          name: record.name || username,

          resumeKey,

          updatedAt: record.updatedAt || new Date().toISOString(),
        };
      });
    });

    // Older single-resume accounts are still supported.
    const legacy = data.resumes || {};

    Object.entries(legacy).forEach(([username, record]) => {
      if (!record) {
        return;
      }

      const exists = Object.values(resumes).some((resume) => {
        if (resume.username !== username) {
          return false;
        }

        if (record.id && resume.id) {
          return String(record.id) === String(resume.id);
        }

        return record.fileName === resume.fileName;
      });

      if (exists) {
        return;
      }

      const resumeId = record.id || `legacy-${username}`;

      const resumeKey = buildResumeKey(username, resumeId);

      resumes[resumeKey] = {
        ...record,

        id: resumeId,

        username: record.username || username,

        name: record.name || username,

        resumeKey,

        updatedAt: record.updatedAt || new Date().toISOString(),
      };
    });

    pruneInvalidSavedResumes();
    pruneInvalidRatings();

    renderResumeList();
    updateSavedCount();
  } catch (error) {
    console.error("Could not load resumes:", error);

    resumes = {};

    pruneInvalidSavedResumes();

    renderResumeList();
    updateSavedCount();
  }
}

// Remove saved/rated references to resumes that no longer exist

function pruneInvalidSavedResumes() {
  if (!session || !session.username) {
    return;
  }

  if (!savedCandidates[session.username]) {
    savedCandidates[session.username] = new Set();

    return;
  }

  const saved = savedCandidates[session.username];

  let changed = false;

  Array.from(saved).forEach((resumeKey) => {
    if (!resumes[resumeKey]) {
      console.log("Removing stale saved resume:", resumeKey);

      saved.delete(resumeKey);
      changed = true;
    }
  });

  if (changed) {
    saveState();
  }
}

function pruneInvalidRatings() {
  if (!session || !session.username) {
    return;
  }

  const employerRatings = ratings[session.username];

  if (!employerRatings) {
    return;
  }

  let changed = false;

  Object.keys(employerRatings).forEach((resumeKey) => {
    if (!resumes[resumeKey]) {
      delete employerRatings[resumeKey];

      changed = true;
    }
  });

  if (changed) {
    saveState();
  }
}

// Candidate list

function renderResumeList() {
  const list = document.getElementById("resumeList");

  if (!list) {
    return;
  }

  const entries = Object.entries(resumes).sort(
    (a, b) =>
      new Date(b[1].updatedAt).getTime() - new Date(a[1].updatedAt).getTime()
  );

  const count = document.getElementById("candidateCount");

  if (count) {
    count.textContent = entries.length;
  }

  if (entries.length === 0) {
    list.innerHTML = `
      <div class="center-content">
        <p class="empty-state">
          No resumes submitted yet.
        </p>
      </div>
    `;

    return;
  }

  const saved = savedCandidates[session.username] || new Set();

  const employerRatings = ratings[session.username] || {};

  list.innerHTML = entries
    .map(([resumeKey, record]) => {
      const rating = Number(employerRatings[resumeKey] || 0);

      const isSaved = saved.has(resumeKey);

      const parsed = record.parsed || {};

      return `
            <div
              class="resume-card ${isSaved ? "saved" : ""}"
              onclick="
                openResumemodel(
                  '${escapeAttr(resumeKey)}'
                )
              "
            >
              <div class="card-name">
                ${escapeHTML(record.name || record.username || "Candidate")}
              </div>

              <div class="card-desc">
                📄
                ${escapeHTML(record.fileName || "Resume")}
              </div>

              ${
                rating > 0
                  ? `
                    <div class="card-rating">
                      ${"★".repeat(rating)}
                      ${"☆".repeat(5 - rating)}
                      ${rating}/5
                    </div>
                  `
                  : `
                    <div class="card-rating">
                      Not rated
                    </div>
                  `
              }

              <div class="card-desc">
                ${escapeHTML(record.description || "No summary provided.")}
              </div>

              ${
                Array.isArray(parsed.skills) && parsed.skills.length > 0
                  ? `
                    <div class="card-desc">
                      <strong>
                        Skills:
                      </strong>

                      ${escapeHTML(parsed.skills.join(", "))}
                    </div>
                  `
                  : ""
              }

              <div class="card-timestamp">
                ${formatTime(record.updatedAt)}
              </div>
            </div>
          `;
    })
    .join("");
}

// Candidate filters

function filterResumes() {
  const searchElement = document.getElementById("searchInput");

  const ratingElement = document.getElementById("ratingFilter");

  const savedElement = document.getElementById("savedOnly");

  if (!searchElement || !ratingElement || !savedElement) {
    return;
  }

  const searchTerm = searchElement.value.toLowerCase().trim();

  const ratingFilter =
    ratingElement.value === "" ? 0 : Number(ratingElement.value);

  const savedOnly = savedElement.checked;

  const saved = savedCandidates[session.username] || new Set();

  const employerRatings = ratings[session.username] || {};

  const filtered = Object.entries(resumes)
    .filter(([resumeKey, record]) => {
      const parsed = record.parsed || {};

      const searchable = `
            ${record.username || ""}
            ${record.name || ""}
            ${record.fileName || ""}
            ${record.description || ""}
            ${formatArray(parsed.skills)}
            ${formatArray(parsed.job_titles)}
            ${formatArray(parsed.schools)}
            ${formatArray(parsed.degrees)}
          `.toLowerCase();

      if (searchTerm && !searchable.includes(searchTerm)) {
        return false;
      }

      const rating = Number(employerRatings[resumeKey] || 0);

      if (ratingFilter > 0 && rating !== ratingFilter) {
        return false;
      }

      if (savedOnly && !saved.has(resumeKey)) {
        return false;
      }

      return true;
    })
    .sort(
      (a, b) =>
        new Date(b[1].updatedAt).getTime() - new Date(a[1].updatedAt).getTime()
    );

  renderFilteredCandidates(filtered);
}

function renderFilteredCandidates(entries) {
  const list = document.getElementById("resumeList");

  if (!list) {
    return;
  }

  const count = document.getElementById("candidateCount");

  if (count) {
    count.textContent = entries.length;
  }

  if (entries.length === 0) {
    list.innerHTML = `
      <div class="center-content">
        <p class="empty-state">
          No resumes match your filters.
        </p>

        <button
          type="button"
          class="btn-secondary"
          onclick="clearFilters()"
        >
          Clear Filters
        </button>
      </div>
    `;

    return;
  }

  const saved = savedCandidates[session.username] || new Set();

  const employerRatings = ratings[session.username] || {};

  list.innerHTML = entries
    .map(([resumeKey, record]) => {
      const rating = Number(employerRatings[resumeKey] || 0);

      const isSaved = saved.has(resumeKey);

      return `
            <div
              class="resume-card ${isSaved ? "saved" : ""}"
              onclick="
                openResumemodel(
                  '${escapeAttr(resumeKey)}'
                )
              "
            >
              <div class="card-name">
                ${escapeHTML(record.name || record.username || "Candidate")}
              </div>

              <div class="card-desc">
                📄
                ${escapeHTML(record.fileName || "Resume")}
              </div>

              ${
                rating > 0
                  ? `
                    <div class="card-rating">
                      ${"★".repeat(rating)}
                      ${"☆".repeat(5 - rating)}
                      ${rating}/5
                    </div>
                  `
                  : `
                    <div class="card-rating">
                      Not rated
                    </div>
                  `
              }

              <div class="card-desc">
                ${escapeHTML(record.description || "No summary provided.")}
              </div>
            </div>
          `;
    })
    .join("");
}

function clearFilters() {
  const search = document.getElementById("searchInput");

  const rating = document.getElementById("ratingFilter");

  const saved = document.getElementById("savedOnly");

  if (search) {
    search.value = "";
  }

  if (rating) {
    rating.value = "";
  }

  if (saved) {
    saved.checked = false;
  }

  renderResumeList();
}

// Saved candidates

function renderSavedCandidates() {
  const list = document.getElementById("savedList");

  if (!list) {
    return;
  }

  pruneInvalidSavedResumes();

  const saved = savedCandidates[session.username] || new Set();

  const employerRatings = ratings[session.username] || {};

  const entries = Array.from(saved)
    .filter((resumeKey) => Boolean(resumes[resumeKey]))
    .map((resumeKey) => [resumeKey, resumes[resumeKey]])
    .sort(
      (a, b) =>
        new Date(b[1].updatedAt).getTime() - new Date(a[1].updatedAt).getTime()
    );

  const count = document.getElementById("savedCount");

  if (count) {
    count.textContent = entries.length;
  }

  if (entries.length === 0) {
    list.innerHTML = `
      <p class="empty-state">
        No saved resumes yet.
      </p>
    `;

    return;
  }

  list.innerHTML = entries
    .map(([resumeKey, record]) => {
      const rating = Number(employerRatings[resumeKey] || 0);

      return `
            <div
              class="resume-card saved"
              onclick="
                openResumemodel(
                  '${escapeAttr(resumeKey)}'
                )
              "
            >
              <div class="card-name">
                ${escapeHTML(record.name || record.username || "Candidate")}
              </div>

              <div class="card-desc">
                📄
                ${escapeHTML(record.fileName || "Resume")}
              </div>

              ${
                rating > 0
                  ? `
                    <div class="card-rating">
                      ${"★".repeat(rating)}
                      ${"☆".repeat(5 - rating)}
                      ${rating}/5
                    </div>
                  `
                  : ""
              }

              <div class="card-desc">
                ${escapeHTML(record.description || "No summary provided.")}
              </div>
            </div>
          `;
    })
    .join("");
}

function updateSavedCount() {
  if (!session || !session.username) {
    return;
  }

  pruneInvalidSavedResumes();

  const saved = savedCandidates[session.username] || new Set();

  const validSavedCount = Array.from(saved).filter((resumeKey) =>
    Boolean(resumes[resumeKey])
  ).length;

  const count = document.getElementById("savedCount");

  if (count) {
    count.textContent = validSavedCount;
  }
}

// Application storage and employer application list

function getApplications() {
  try {
    const raw = localStorage.getItem(APPLICATION_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const data = JSON.parse(raw);

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Could not load applications:", error);

    return [];
  }
}

function saveApplications(applications) {
  try {
    localStorage.setItem(APPLICATION_STORAGE_KEY, JSON.stringify(applications));

    return true;
  } catch (error) {
    console.error("Could not save applications:", error);

    return false;
  }
}

function getEmployerApplications() {
  if (!session || !session.username) {
    return [];
  }

  return getApplications()
    .filter(
      (application) =>
        String(application.employerUsername) === String(session.username)
    )
    .sort(
      (a, b) =>
        new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
    );
}

function updateApplicationCount() {
  const count = document.getElementById("applicationCount");

  if (count) {
    count.textContent = getEmployerApplications().length;
  }
}

// Applicant cards and application decisions

function toggleApplicantDetails(applicationId) {
  const key = String(applicationId);

  if (expandedApplications.has(key)) {
    expandedApplications.delete(key);
  } else {
    expandedApplications.add(key);
  }

  renderEmployerJobs();

  const applicationsTab = document.getElementById("applicationsTab");

  if (applicationsTab && !applicationsTab.classList.contains("hidden")) {
    renderApplications();
  }
}

function acceptApplication(applicationId) {
  const applications = getApplications();

  const index = applications.findIndex(
    (application) => String(application.id) === String(applicationId)
  );

  if (index === -1) {
    alert("Application could not be found.");

    return;
  }

  const application = applications[index];

  if (String(application.employerUsername) !== String(session.username)) {
    return;
  }

  application.status = "accepted";

  application.statusUpdatedAt = new Date().toISOString();

  applications[index] = application;

  if (!saveApplications(applications)) {
    alert("Could not update the application.");

    return;
  }

  expandedApplications.add(String(applicationId));

  renderEmployerJobs();
  renderApplications();
  updateApplicationCount();
}

function declineApplication(applicationId) {
  const applications = getApplications();

  const application = applications.find(
    (item) => String(item.id) === String(applicationId)
  );

  if (!application) {
    alert("Application could not be found.");

    return;
  }

  if (String(application.employerUsername) !== String(session.username)) {
    return;
  }

  const candidateName =
    application.candidateName ||
    application.candidateUsername ||
    "this applicant";

  const confirmed = confirm(
    `Decline ${candidateName}? They will be removed from this job's applicant pool.`
  );

  if (!confirmed) {
    return;
  }

  const updatedApplications = applications.filter(
    (item) => String(item.id) !== String(applicationId)
  );

  if (!saveApplications(updatedApplications)) {
    alert("Could not decline the application.");

    return;
  }

  expandedApplications.delete(String(applicationId));

  renderEmployerJobs();
  renderApplications();
  updateApplicationCount();
}

function buildApplicantCard(application) {
  const resume = application.resume || {};

  const parsed = resume.parsed || {};

  const candidateUsername =
    application.candidateUsername || resume.username || "candidate";

  const candidateName =
    application.candidateName || resume.name || candidateUsername;

  const resumeId = application.resumeId || resume.id || application.id;

  const resumeKey = buildResumeKey(candidateUsername, resumeId);

  const applicationId = String(application.id);

  const expanded = expandedApplications.has(applicationId);

  const rating = Number(ratings[session.username]?.[resumeKey] || 0);

  const status = application.status || "pending";

  // Applicants first appear as a simple name card.
  if (!expanded) {
    return `
      <div
        class="resume-card"
        onclick="
          toggleApplicantDetails(
            '${escapeAttr(application.id)}'
          )
        "
      >
        <div class="card-name">
          ${escapeHTML(candidateName)}
        </div>

        ${
          status === "accepted"
            ? `
              <div class="card-desc">
                ✓ Accepted
              </div>
            `
            : ""
        }
      </div>
    `;
  }

  // Expanded cards show the submitted resume and parsed information.
  return `
    <div class="resume-card">

      <div
        onclick="
          toggleApplicantDetails(
            '${escapeAttr(application.id)}'
          )
        "
      >
        <div class="card-name">
          ${escapeHTML(candidateName)}
        </div>
      </div>


      <div class="card-desc">
        <strong>
          Status:
        </strong>

        ${status === "accepted" ? "✓ Accepted" : "Pending Review"}
      </div>


      <div class="card-desc">
        <strong>
          Username:
        </strong>

        ${escapeHTML(candidateUsername)}
      </div>


      <div class="card-desc">
        <strong>
          Submitted Resume:
        </strong>

        📄
        ${escapeHTML(resume.fileName || "Resume")}
      </div>


      ${
        rating > 0
          ? `
            <div class="card-rating">
              ${"★".repeat(rating)}
              ${"☆".repeat(5 - rating)}
              ${rating}/5
            </div>
          `
          : `
            <div class="card-rating">
              Not rated
            </div>
          `
      }


      <div class="card-desc">
        <strong>
          Summary:
        </strong>

        ${escapeHTML(resume.description || "No summary provided.")}
      </div>


      <div class="card-desc">
        <strong>
          Email:
        </strong>

        ${escapeHTML(parsed.email || "Not found")}
      </div>


      <div class="card-desc">
        <strong>
          Phone:
        </strong>

        ${escapeHTML(parsed.phone || "Not found")}
      </div>


      <div class="card-desc">
        <strong>
          LinkedIn:
        </strong>

        ${escapeHTML(parsed.linkedin || "Not found")}
      </div>


      <div class="card-desc">
        <strong>
          GitHub:
        </strong>

        ${escapeHTML(parsed.github || "Not found")}
      </div>


      <div class="card-desc">
        <strong>
          Job Titles:
        </strong>

        ${escapeHTML(formatArray(parsed.job_titles))}
      </div>


      <div class="card-desc">
        <strong>
          Schools:
        </strong>

        ${escapeHTML(formatArray(parsed.schools))}
      </div>


      <div class="card-desc">
        <strong>
          Degrees:
        </strong>

        ${escapeHTML(formatArray(parsed.degrees))}
      </div>


      <div class="card-desc">
        <strong>
          Skills:
        </strong>

        ${escapeHTML(formatArray(parsed.skills))}
      </div>


      <div class="card-timestamp">
        Applied:
        ${formatTime(application.appliedAt)}
      </div>


      <div class="card-actions">
        <button
          type="button"
          class="btn-primary"
          onclick="
            event.stopPropagation();

            openApplicationResume(
              '${escapeAttr(application.id)}'
            )
          "
        >
          View Full Resume
        </button>


        ${
          status === "accepted"
            ? `
              <button
                type="button"
                class="btn-secondary"
                disabled
              >
                ✓ Accepted
              </button>
            `
            : `
              <button
                type="button"
                class="btn-primary"
                onclick="
                  event.stopPropagation();

                  acceptApplication(
                    '${escapeAttr(application.id)}'
                  )
                "
              >
                Accept
              </button>
            `
        }


        <button
          type="button"
          class="btn-danger"
          onclick="
            event.stopPropagation();

            declineApplication(
              '${escapeAttr(application.id)}'
            )
          "
        >
          Decline
        </button>
      </div>
    </div>
  `;
}

function renderApplications() {
  const list = document.getElementById("applicationList");

  if (!list) {
    return;
  }

  const applications = getEmployerApplications();

  updateApplicationCount();

  if (applications.length === 0) {
    list.innerHTML = `
      <p class="empty-state">
        No applications yet.
      </p>
    `;

    return;
  }

  list.innerHTML = applications
    .map((application) => buildApplicantCard(application))
    .join("");
}

// Open the exact resume snapshot submitted with an application

function openApplicationResume(applicationId) {
  const application = getApplications().find(
    (item) => String(item.id) === String(applicationId)
  );

  if (!application) {
    alert("Application could not be found.");

    return;
  }

  if (String(application.employerUsername) !== String(session.username)) {
    return;
  }

  const resume = application.resume;

  if (!resume) {
    alert("Resume could not be found.");

    return;
  }

  const username =
    application.candidateUsername || resume.username || "candidate";

  const resumeId = application.resumeId || resume.id || application.id;

  const resumeKey = buildResumeKey(username, resumeId);

  // Keep the application snapshot available even if the original was deleted.
  if (!resumes[resumeKey]) {
    resumes[resumeKey] = {
      ...resume,

      id: resumeId,

      username,

      name: application.candidateName || resume.name || username,

      resumeKey,

      updatedAt: resume.updatedAt || application.appliedAt,
    };
  }

  openResumemodel(resumeKey);
}

// Parsed resume section inside the employer modal

function ensureEmployerParsedSection() {
  let section = document.getElementById("employerParsedResults");

  if (section) {
    return section;
  }

  const modelBody = document.querySelector("#resumemodel .model-body");

  if (!modelBody) {
    return null;
  }

  section = document.createElement("div");

  section.id = "employerParsedResults";

  section.innerHTML = `
    <h3>
      Parsed Resume Information
    </h3>

    <p>
      <strong>Email:</strong>
      <span id="employerParsedEmail"></span>
    </p>

    <p>
      <strong>Phone:</strong>
      <span id="employerParsedPhone"></span>
    </p>

    <p>
      <strong>LinkedIn:</strong>
      <span id="employerParsedLinkedin"></span>
    </p>

    <p>
      <strong>GitHub:</strong>
      <span id="employerParsedGithub"></span>
    </p>

    <p>
      <strong>Job Titles:</strong>
      <span id="employerParsedJobs"></span>
    </p>

    <p>
      <strong>Schools:</strong>
      <span id="employerParsedSchools"></span>
    </p>

    <p>
      <strong>Degrees:</strong>
      <span id="employerParsedDegrees"></span>
    </p>

    <p>
      <strong>Skills:</strong>
      <span id="employerParsedSkills"></span>
    </p>
  `;

  modelBody.appendChild(section);

  return section;
}

function displayEmployerParsedData(parsed) {
  if (!ensureEmployerParsedSection()) {
    return;
  }

  const data = parsed || {};

  const values = {
    employerParsedEmail: data.email || "Not found",

    employerParsedPhone: data.phone || "Not found",

    employerParsedLinkedin: data.linkedin || "Not found",

    employerParsedGithub: data.github || "Not found",

    employerParsedJobs: formatArray(data.job_titles),

    employerParsedSchools: formatArray(data.schools),

    employerParsedDegrees: formatArray(data.degrees),

    employerParsedSkills: formatArray(data.skills),
  };

  Object.entries(values).forEach(([id, value]) => {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = value;
    }
  });
}

// Resume modal

function openResumemodel(resumeKey) {
  const record = resumes[resumeKey];

  if (!record) {
    return;
  }

  currentmodelUsername = resumeKey;

  const employerRatings = ratings[session.username] || {};

  const currentRating = Number(employerRatings[resumeKey] || 0);

  const saved = savedCandidates[session.username] || new Set();

  const isSaved = saved.has(resumeKey);

  const name = document.getElementById("modelUsername");

  if (name) {
    name.textContent = record.name || record.username || "Candidate";
  }

  const desc = document.getElementById("modelDesc");

  if (desc) {
    desc.textContent = record.description || "No summary provided.";
  }

  const fileName = document.getElementById("modelFileName");

  if (fileName) {
    fileName.textContent = record.fileName || "Resume";
  }

  const download = document.getElementById("modelDownloadLink");

  if (download) {
    if (record.fileURL) {
      download.href = record.fileURL;

      download.download = record.fileName || "resume";

      download.style.display = "inline-block";
    } else {
      download.removeAttribute("href");

      download.style.display = "none";
    }
  }

  const coverText = document.getElementById("modelCoverText");

  if (coverText) {
    coverText.textContent =
      record.coverLetterText || "No cover letter provided.";
  }

  const coverSection = document.getElementById("modelCoverFileSection");

  if (coverSection && record.coverLetterFileName && record.coverLetterURL) {
    coverSection.style.display = "block";

    const coverName = document.getElementById("modelCoverFileName");

    if (coverName) {
      coverName.textContent = record.coverLetterFileName;
    }

    const coverDownload = document.getElementById("modelDownloadCoverLink");

    if (coverDownload) {
      coverDownload.href = record.coverLetterURL;

      coverDownload.download = record.coverLetterFileName;
    }
  } else if (coverSection) {
    coverSection.style.display = "none";
  }

  const updated = document.getElementById("modelUpdatedDate");

  if (updated) {
    updated.textContent = `Last updated: ${formatTime(record.updatedAt)}`;
  }

  displayEmployerParsedData(record.parsed || {});

  document.querySelectorAll(".star").forEach((star, index) => {
    star.classList.toggle("active", index + 1 <= currentRating);
  });

  updateRatingText(currentRating);

  const saveButton = document.getElementById("saveBtn");

  if (saveButton) {
    if (isSaved) {
      saveButton.classList.add("saved");

      saveButton.textContent = "★ Saved";
    } else {
      saveButton.classList.remove("saved");

      saveButton.textContent = "☆ Save";
    }
  }

  const model = document.getElementById("resumemodel");

  if (model) {
    model.classList.remove("hidden");

    model.style.display = "flex";
  }
}

function closeResumemodel() {
  const model = document.getElementById("resumemodel");

  if (model) {
    model.classList.add("hidden");

    model.style.display = "none";
  }

  currentmodelUsername = null;
}

// Ratings and saved candidates

function setRating(rating) {
  if (!currentmodelUsername) {
    return;
  }

  if (!ratings[session.username]) {
    ratings[session.username] = {};
  }

  ratings[session.username][currentmodelUsername] = Number(rating);

  saveState();

  document.querySelectorAll(".star").forEach((star, index) => {
    star.classList.toggle("active", index + 1 <= Number(rating));
  });

  updateRatingText(Number(rating));

  filterResumes();
  renderEmployerJobs();
  renderSavedCandidates();
}

function updateRatingText(rating) {
  const messages = {
    0: "Click to rate",
    1: "1 star - Not a fit",
    2: "2 stars - Maybe later",
    3: "3 stars - Interested",
    4: "4 stars - Strong candidate",
    5: "5 stars - Excellent match",
  };

  const element = document.getElementById("ratingText");

  if (element) {
    element.textContent = messages[Number(rating)] || messages[0];
  }
}

function toggleSaveCandidate() {
  if (!currentmodelUsername) {
    return;
  }

  if (!savedCandidates[session.username]) {
    savedCandidates[session.username] = new Set();
  }

  const saved = savedCandidates[session.username];

  if (saved.has(currentmodelUsername)) {
    saved.delete(currentmodelUsername);
  } else {
    saved.add(currentmodelUsername);
  }

  saveState();

  pruneInvalidSavedResumes();
  updateSavedCount();

  const button = document.getElementById("saveBtn");

  if (button) {
    if (saved.has(currentmodelUsername)) {
      button.classList.add("saved");

      button.textContent = "★ Saved";
    } else {
      button.classList.remove("saved");

      button.textContent = "☆ Save";
    }
  }

  renderResumeList();
  renderSavedCandidates();
}

// Job storage

function getAllJobs() {
  try {
    const raw = localStorage.getItem(JOB_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const data = JSON.parse(raw);

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Could not load jobs:", error);

    return [];
  }
}

function saveAllJobs(jobs) {
  try {
    localStorage.setItem(JOB_STORAGE_KEY, JSON.stringify(jobs));

    return true;
  } catch (error) {
    console.error("Could not save jobs:", error);

    return false;
  }
}

// Create a job posting

async function postJob() {
  const title = document.getElementById("jobTitle");

  const degree = document.getElementById("jobDegree");

  const description = document.getElementById("jobDescription");

  if (!title || !degree || !description) {
    return;
  }

  const jobTitle = title.value.trim();

  const jobDegree = degree.value.trim();

  const jobDescription = description.value.trim();

  if (!jobTitle || !jobDegree || !jobDescription) {
    alert("Please complete all job fields.");

    return;
  }

  let parsedSkills = [];
  let parserResult = null;

  // The posting is still saved if the optional parser is unavailable.
  try {
    const response = await fetch(`${API_BASE_URL}/parse-job-description`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        job_title: jobTitle,

        degree: jobDegree,

        description: jobDescription,
      }),
    });

    if (response.ok) {
      const data = await response.json();

      parserResult = data;

      if (Array.isArray(data.skills)) {
        parsedSkills = data.skills;
      }
    }
  } catch (error) {
    console.warn("Job parser unavailable. Job will still be posted.");
  }

  const jobs = getAllJobs();

  jobs.push({
    id: Date.now(),

    title: jobTitle,

    degree: jobDegree,

    description: jobDescription,

    skills: parsedSkills,

    parserResult,

    employerName: session.fullName || session.username,

    postedBy: session.username,

    postedAt: new Date().toISOString(),
  });

  if (!saveAllJobs(jobs)) {
    alert("Could not save job.");

    return;
  }

  clearJobForm();
  renderEmployerJobs();

  const confirmation = document.getElementById("jobConfirm");

  if (confirmation) {
    confirmation.classList.remove("hidden");

    setTimeout(() => {
      confirmation.classList.add("hidden");
    }, 3000);
  }
}

// Employer job cards and their applicant pools

function renderEmployerJobs() {
  const list = document.getElementById("employerJobList");

  if (!list) {
    return;
  }

  const jobs = getAllJobs()
    .filter((job) => String(job.postedBy) === String(session.username))
    .sort(
      (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
    );

  const jobCount = document.getElementById("jobCount");

  if (jobCount) {
    jobCount.textContent = jobs.length;
  }

  if (jobs.length === 0) {
    list.innerHTML = `
      <p class="empty-state">
        You haven't posted any jobs yet.
      </p>
    `;

    return;
  }

  list.innerHTML = jobs
    .map((job) => {
      const applications = getEmployerApplications().filter(
        (application) => String(application.jobId) === String(job.id)
      );

      const applicantCards =
        applications.length > 0
          ? applications
              .map((application) => buildApplicantCard(application))
              .join("")
          : `
              <p class="section-help">
                No applicants yet.
              </p>
            `;

      return `
          <div class="resume-card">

            <div class="card-name">
              ${escapeHTML(job.title || "Untitled Job")}
            </div>

            <div class="card-desc">
              <strong>
                Required Degree:
              </strong>

              ${escapeHTML(job.degree || "Not specified")}
            </div>

            <div class="card-desc">
              ${escapeHTML(job.description || "")}
            </div>

            ${
              Array.isArray(job.skills) && job.skills.length > 0
                ? `
                  <div class="card-desc">
                    <strong>
                      Detected Skills:
                    </strong>

                    ${escapeHTML(job.skills.join(", "))}
                  </div>
                `
                : ""
            }

            <div class="card-timestamp">
              Posted
              ${formatTime(job.postedAt)}
            </div>


            <div>
              <h3>
                Applicants
                (${applications.length})
              </h3>

              ${applicantCards}
            </div>


            <button
              type="button"
              class="btn-danger"
              onclick="
                deleteJob(
                  '${escapeAttr(job.id)}'
                )
              "
            >
              Delete Posting
            </button>
          </div>
        `;
    })
    .join("");
}

function deleteJob(jobId) {
  if (!confirm("Delete this job posting?")) {
    return;
  }

  const jobs = getAllJobs().filter((job) => String(job.id) !== String(jobId));

  saveAllJobs(jobs);
  renderEmployerJobs();
}

function clearJobForm() {
  const title = document.getElementById("jobTitle");

  const degree = document.getElementById("jobDegree");

  const description = document.getElementById("jobDescription");

  if (title) {
    title.value = "";
  }

  if (degree) {
    degree.value = "";
  }

  if (description) {
    description.value = "";
  }
}

// Employer tab navigation

function showEmployerTab(tab) {
  document.querySelectorAll(".employer-tab").forEach((button) => {
    button.classList.remove("active");
  });

  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.add("hidden");

    content.style.display = "none";
  });

  if (tab === "candidates") {
    document
      .querySelector(".employer-tab:nth-child(1)")
      ?.classList.add("active");

    const content = document.getElementById("candidatesTab");

    if (content) {
      content.classList.remove("hidden");

      content.style.display = "block";
    }

    loadResumes();
    filterResumes();
  } else if (tab === "saved") {
    document
      .querySelector(".employer-tab:nth-child(2)")
      ?.classList.add("active");

    const content = document.getElementById("savedTab");

    if (content) {
      content.classList.remove("hidden");

      content.style.display = "block";
    }

    loadResumes();
    pruneInvalidSavedResumes();
    renderSavedCandidates();
    updateSavedCount();
  } else if (tab === "applications") {
    const content = document.getElementById("applicationsTab");

    if (content) {
      content.classList.remove("hidden");

      content.style.display = "block";
    }

    renderApplications();
  } else if (tab === "jobs") {
    const jobButton = Array.from(
      document.querySelectorAll(".employer-tab")
    ).find((button) => button.getAttribute("onclick")?.includes("'jobs'"));

    if (jobButton) {
      jobButton.classList.add("active");
    }

    const content = document.getElementById("jobsTab");

    if (content) {
      content.classList.remove("hidden");

      content.style.display = "block";
    }

    renderEmployerJobs();
  }
}

// Page initialization

loadState();

document.addEventListener("DOMContentLoaded", () => {
  if (!checkSession()) {
    return;
  }

  loadResumes();

  pruneInvalidSavedResumes();
  pruneInvalidRatings();

  updateSavedCount();
  updateApplicationCount();

  showEmployerTab("candidates");

  const model = document.getElementById("resumemodel");

  if (model) {
    model.addEventListener("click", (event) => {
      if (event.target.id === "resumemodel") {
        closeResumemodel();
      }
    });
  }

  console.log("EMPLOYER PAGE READY");

  console.log(
    "REAL SAVED RESUMES:",
    Array.from(savedCandidates[session.username] || [])
  );
});
