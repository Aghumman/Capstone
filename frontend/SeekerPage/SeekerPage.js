// Seeker page configuration and state

const API_BASE_URL = "http://127.0.0.1:5001";

const FRONTEND_STORAGE_KEY = "resumePortalFrontendData";
const JOB_STORAGE_KEY = "resumePortalJobs";
const APPLICATION_STORAGE_KEY = "resumePortalApplications";
const CURRENT_USER_KEY = "resumePortalCurrentUser";

let session = null;
let resumes = [];
let selectedResumeId = null;
let editingResumeId = null;
let currentJobId = null;

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
    console.error("Session is missing username.");
    return false;
  }

  if (session.role && session.role !== "seeker") {
    window.location.replace("../EmployerPage/EmployerPage.html");
    return false;
  }

  const seekerName = document.getElementById("seekerName");

  if (seekerName) {
    seekerName.textContent = session.fullName || session.username;
  }

  return true;
}

function logout() {
  sessionStorage.removeItem("currentUser");
  localStorage.removeItem(CURRENT_USER_KEY);

  session = null;

  window.location.replace("../LoginPage/login.html");
}

// General utilities

function createUniqueId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return Date.now().toString() + "-" + Math.random().toString(16).slice(2);
}

function escapeHTML(value) {
  const div = document.createElement("div");

  div.textContent = value == null ? "" : String(value);

  return div.innerHTML;
}

function escapeAttribute(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
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

// Resume ordering

function getResumeTimestamp(resume) {
  if (!resume) {
    return 0;
  }

  const value = resume.updatedAt || resume.createdAt || resume.uploadedAt;

  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortResumesNewestFirst() {
  resumes.sort((resumeA, resumeB) => {
    const timeA = getResumeTimestamp(resumeA);
    const timeB = getResumeTimestamp(resumeB);

    return timeB - timeA;
  });
}

// File handling

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(new Error("Could not read the selected file."));
    };

    reader.readAsDataURL(file);
  });
}

// Frontend resume storage

function getFrontendData() {
  try {
    const raw = localStorage.getItem(FRONTEND_STORAGE_KEY);

    if (!raw) {
      return {
        resumeLibraries: {},
        resumes: {},
      };
    }

    const data = JSON.parse(raw);

    return {
      ...data,
      resumeLibraries: data.resumeLibraries || {},
      resumes: data.resumes || {},
    };
  } catch (error) {
    console.error("Could not load frontend data:", error);

    return {
      resumeLibraries: {},
      resumes: {},
    };
  }
}

function saveFrontendData(data) {
  try {
    localStorage.setItem(FRONTEND_STORAGE_KEY, JSON.stringify(data));

    return true;
  } catch (error) {
    console.error("Could not save frontend data:", error);

    if (error.name === "QuotaExceededError") {
      alert(
        "Browser storage is full. Try deleting an older resume or uploading a smaller file."
      );
    }

    return false;
  }
}

function loadResumes() {
  if (!session || !session.username) {
    return;
  }

  const data = getFrontendData();

  const library = data.resumeLibraries[session.username];

  if (Array.isArray(library)) {
    resumes = library.map((record) => ({
      ...record,
    }));
  } else {
    resumes = [];
  }

  // Supports older accounts that only saved one resume.
  const legacy = data.resumes[session.username];

  if (resumes.length === 0 && legacy) {
    resumes.push({
      ...legacy,

      id: legacy.id || createUniqueId(),

      username: session.username,

      name: session.fullName || session.username,

      updatedAt: legacy.updatedAt || new Date().toISOString(),
    });
  }

  sortResumesNewestFirst();

  if (
    selectedResumeId &&
    !resumes.some((resume) => String(resume.id) === String(selectedResumeId))
  ) {
    selectedResumeId = null;
  }

  if (!selectedResumeId && resumes.length > 0) {
    selectedResumeId = resumes[0].id;
  }

  renderResumeLibrary();
  renderSelectedResume();
  renderJobBoard();
}

function saveResumeLibrary() {
  if (!session || !session.username) {
    return false;
  }

  sortResumesNewestFirst();

  const data = getFrontendData();

  if (!data.resumeLibraries) {
    data.resumeLibraries = {};
  }

  data.resumeLibraries[session.username] = resumes;

  // Keeps compatibility with the older single-resume format.
  if (!data.resumes) {
    data.resumes = {};
  }

  if (resumes.length > 0) {
    data.resumes[session.username] = resumes[0];
  } else {
    delete data.resumes[session.username];
  }

  return saveFrontendData(data);
}

// Upload field labels

function updateFileLabel() {
  const input = document.getElementById("seekerFile");

  const label = document.getElementById("fileLabelText");

  if (!input || !label) {
    return;
  }

  if (input.files && input.files.length > 0) {
    label.textContent = `📄 ${input.files[0].name}`;
  } else {
    label.textContent = "📄 Choose a PDF or Word file";
  }
}

function updateCoverLabel() {
  const input = document.getElementById("coverLetterFile");

  const label = document.getElementById("coverLabelText");

  if (!input || !label) {
    return;
  }

  if (input.files && input.files.length > 0) {
    label.textContent = `📄 ${input.files[0].name}`;
  } else {
    label.textContent = "📄 Choose a file (optional)";
  }
}

// Resume parser request

async function parseResumeFile(file) {
  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/parse-resume`, {
    method: "POST",
    body: formData,
  });

  let data = {};

  try {
    data = await response.json();
  } catch (error) {
    throw new Error("The resume parser returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(data.error || "Resume parsing failed.");
  }

  return data;
}

// Create or update a resume

async function submitResume() {
  const descriptionInput = document.getElementById("seekerDesc");

  const resumeInput = document.getElementById("seekerFile");

  const coverTextInput = document.getElementById("coverLetterText");

  const coverFileInput = document.getElementById("coverLetterFile");

  const saveButton = document.getElementById("saveResumeButton");

  if (!descriptionInput || !resumeInput) {
    return;
  }

  const description = descriptionInput.value.trim();

  const resumeFile = resumeInput.files?.[0];

  const existing = editingResumeId
    ? resumes.find((resume) => String(resume.id) === String(editingResumeId))
    : null;

  if (!resumeFile && !existing) {
    alert("Please choose a PDF or DOCX resume.");

    return;
  }

  if (resumeFile) {
    const extension = resumeFile.name.split(".").pop()?.toLowerCase();

    if (extension !== "pdf" && extension !== "docx") {
      alert("Please upload a PDF or DOCX resume.");

      return;
    }
  }

  if (saveButton) {
    saveButton.disabled = true;
    saveButton.textContent = "Saving and parsing...";
  }

  try {
    let parsed = existing?.parsed || {};

    let fileName = existing?.fileName || "";

    let fileURL = existing?.fileURL || "";

    let backendFileURL = existing?.backendFileURL || "";

    if (resumeFile) {
      parsed = await parseResumeFile(resumeFile);

      fileName = resumeFile.name;

      backendFileURL = parsed.file_url || "";

      fileURL = await fileToDataURL(resumeFile);
    }

    let coverLetterFileName = existing?.coverLetterFileName || "";

    let coverLetterURL = existing?.coverLetterURL || "";

    const coverFile = coverFileInput?.files?.[0];

    if (coverFile) {
      coverLetterFileName = coverFile.name;

      coverLetterURL = await fileToDataURL(coverFile);
    }

    const now = new Date().toISOString();

    const record = {
      id: existing?.id || createUniqueId(),

      username: session.username,

      name: session.fullName || session.username,

      description,
      fileName,
      fileURL,
      backendFileURL,

      coverLetterText: coverTextInput?.value.trim() || "",

      coverLetterFileName,
      coverLetterURL,

      parsed: {
        email: parsed.email || null,

        phone: parsed.phone || null,

        linkedin: parsed.linkedin || null,

        github: parsed.github || null,

        job_titles: Array.isArray(parsed.job_titles) ? parsed.job_titles : [],

        schools: Array.isArray(parsed.schools) ? parsed.schools : [],

        degrees: Array.isArray(parsed.degrees) ? parsed.degrees : [],

        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      },

      createdAt: existing?.createdAt || existing?.updatedAt || now,

      updatedAt: now,
    };

    if (existing) {
      const index = resumes.findIndex(
        (resume) => String(resume.id) === String(existing.id)
      );

      if (index !== -1) {
        resumes[index] = record;
      }
    } else {
      resumes.push(record);
    }

    sortResumesNewestFirst();

    selectedResumeId = record.id;

    if (!saveResumeLibrary()) {
      throw new Error(
        "The resume was parsed, but it could not be saved in browser storage."
      );
    }

    editingResumeId = null;

    descriptionInput.value = "";
    resumeInput.value = "";

    if (coverTextInput) {
      coverTextInput.value = "";
    }

    if (coverFileInput) {
      coverFileInput.value = "";
    }

    updateFileLabel();
    updateCoverLabel();

    const confirmation = document.getElementById("seekerConfirm");

    if (confirmation) {
      confirmation.classList.remove("hidden");
    }

    renderResumeLibrary();
    renderSelectedResume();
    renderJobBoard();

    setTimeout(() => {
      if (confirmation) {
        confirmation.classList.add("hidden");
      }
    }, 4000);
  } catch (error) {
    console.error("Resume save error:", error);

    alert(`Could not save resume. ${error.message}`);
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = "Save New Resume";
    }
  }
}

// Resume library and selected resume display

function renderResumeLibrary() {
  const library = document.getElementById("resumeLibrary");

  const noResume = document.getElementById("noResumeMsg");

  const preview = document.getElementById("resumePreview");

  if (!library) {
    return;
  }

  sortResumesNewestFirst();

  if (resumes.length === 0) {
    library.innerHTML = "";

    if (noResume) {
      noResume.classList.remove("hidden");
    }

    if (preview) {
      preview.classList.add("hidden");
    }

    return;
  }

  if (noResume) {
    noResume.classList.add("hidden");
  }

  library.innerHTML = resumes
    .map(
      (resume) => `
          <div
            class="resume-card ${
              String(resume.id) === String(selectedResumeId) ? "selected" : ""
            }"
            onclick="
              selectResume(
                '${escapeAttribute(resume.id)}'
              )
            "
          >
            <div class="card-name">
              ${escapeHTML(resume.fileName || "Resume")}
            </div>

            <div class="card-desc">
              ${escapeHTML(resume.description || "No summary provided.")}
            </div>

            <div class="card-timestamp">
              ${formatTime(resume.updatedAt)}
            </div>
          </div>
        `
    )
    .join("");
}

function selectResume(resumeId) {
  selectedResumeId = resumeId;

  renderResumeLibrary();
  renderSelectedResume();
}

function renderSelectedResume() {
  const preview = document.getElementById("resumePreview");

  if (!preview) {
    return;
  }

  const selected = resumes.find(
    (resume) => String(resume.id) === String(selectedResumeId)
  );

  if (!selected) {
    preview.classList.add("hidden");

    return;
  }

  preview.classList.remove("hidden");

  const description = document.getElementById("previewDesc");

  if (description) {
    description.textContent = selected.description || "No summary provided.";
  }

  const fileName = document.getElementById("previewFileName");

  if (fileName) {
    fileName.textContent = selected.fileName || "Resume";
  }

  const download = document.getElementById("downloadLink");

  if (download) {
    const resumeURL = selected.fileURL || selected.backendFileURL;

    if (resumeURL) {
      download.href = resumeURL;

      download.download = selected.fileName || "resume";

      download.classList.remove("hidden");
    } else {
      download.removeAttribute("href");

      download.classList.add("hidden");
    }
  }

  const coverText = document.getElementById("previewCoverText");

  if (coverText) {
    coverText.textContent =
      selected.coverLetterText || "No cover letter provided.";
  }

  const updated = document.getElementById("updatedDate");

  if (updated) {
    updated.textContent = `Last updated: ${formatTime(selected.updatedAt)}`;
  }

  displayParsedData(selected.parsed || {});

  const viewerContainer = document.getElementById("resumeViewerContainer");

  const viewer = document.getElementById("resumeViewer");

  const noPreview = document.getElementById("resumeNoPreview");

  const alternateDownload = document.getElementById("resumeDownloadAlt");

  if (!viewerContainer || !viewer || !noPreview || !alternateDownload) {
    return;
  }

  const resumeURL = selected.fileURL || selected.backendFileURL;

  const lowerFileName = (selected.fileName || "").toLowerCase();

  if (resumeURL && lowerFileName.endsWith(".pdf")) {
    viewerContainer.style.display = "block";

    viewer.style.display = "block";

    viewer.src = resumeURL;

    noPreview.style.display = "none";
  } else if (resumeURL) {
    viewerContainer.style.display = "block";

    viewer.style.display = "none";

    viewer.removeAttribute("src");

    noPreview.style.display = "block";

    alternateDownload.href = resumeURL;

    alternateDownload.download = selected.fileName || "resume";
  } else {
    viewerContainer.style.display = "none";
  }
}

// Parsed resume fields

function displayParsedData(parsed) {
  const fields = {
    parsedEmail: parsed.email || "Not found",

    parsedPhone: parsed.phone || "Not found",

    parsedLinkedin: parsed.linkedin || "Not found",

    parsedGithub: parsed.github || "Not found",

    parsedJobTitles: formatArray(parsed.job_titles),

    parsedSchools: formatArray(parsed.schools),

    parsedDegrees: formatArray(parsed.degrees),

    parsedSkills: formatArray(parsed.skills),
  };

  Object.entries(fields).forEach(([id, value]) => {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = value;
    }
  });
}

// Resume actions

function removeApplicationSavedNotice() {
  const notice = document.getElementById("applicationSavedNotice");

  if (notice) {
    notice.remove();
  }
}

function startNewResume() {
  removeApplicationSavedNotice();

  editingResumeId = null;

  const description = document.getElementById("seekerDesc");

  const file = document.getElementById("seekerFile");

  const coverText = document.getElementById("coverLetterText");

  const coverFile = document.getElementById("coverLetterFile");

  const button = document.getElementById("saveResumeButton");

  if (description) {
    description.value = "";
  }

  if (file) {
    file.value = "";
  }

  if (coverText) {
    coverText.value = "";
  }

  if (coverFile) {
    coverFile.value = "";
  }

  if (button) {
    button.textContent = "Save New Resume";
  }

  updateFileLabel();
  updateCoverLabel();

  showSeekerTab("upload");
}

function editResume() {
  const selected = resumes.find(
    (resume) => String(resume.id) === String(selectedResumeId)
  );

  if (!selected) {
    return;
  }

  editingResumeId = selected.id;

  const description = document.getElementById("seekerDesc");

  const coverText = document.getElementById("coverLetterText");

  const button = document.getElementById("saveResumeButton");

  if (description) {
    description.value = selected.description || "";
  }

  if (coverText) {
    coverText.value = selected.coverLetterText || "";
  }

  if (button) {
    button.textContent = "Update Resume";
  }

  const label = document.getElementById("fileLabelText");

  if (label) {
    label.textContent = `📄 Current: ${
      selected.fileName || "Resume"
    } — choose another file to replace it`;
  }

  showSeekerTab("upload");
}

function deleteResume() {
  const selected = resumes.find(
    (resume) => String(resume.id) === String(selectedResumeId)
  );

  if (!selected) {
    return;
  }

  const confirmed = confirm(`Delete "${selected.fileName || "this resume"}"?`);

  if (!confirmed) {
    return;
  }

  resumes = resumes.filter(
    (resume) => String(resume.id) !== String(selectedResumeId)
  );

  sortResumesNewestFirst();

  selectedResumeId = resumes.length > 0 ? resumes[0].id : null;

  if (!saveResumeLibrary()) {
    alert("Could not save the resume deletion.");

    return;
  }

  renderResumeLibrary();
  renderSelectedResume();
  renderJobBoard();
}

// Dashboard tabs

function showSeekerTab(tab) {
  document.querySelectorAll(".seeker-tab").forEach((button) => {
    button.classList.remove("active");
  });

  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.remove("active");

    content.classList.add("hidden");
  });

  const buttons = document.querySelectorAll(".seeker-tab");

  if (tab === "upload") {
    const content = document.getElementById("uploadTab");

    if (content) {
      content.classList.remove("hidden");

      content.classList.add("active");
    }

    if (buttons[0]) {
      buttons[0].classList.add("active");
    }
  } else if (tab === "view") {
    const content = document.getElementById("viewTab");

    if (content) {
      content.classList.remove("hidden");

      content.classList.add("active");
    }

    if (buttons[1]) {
      buttons[1].classList.add("active");
    }

    loadResumes();

    sortResumesNewestFirst();

    renderResumeLibrary();
    renderSelectedResume();
  } else if (tab === "jobs") {
    const content = document.getElementById("jobsTab");

    if (content) {
      content.classList.remove("hidden");

      content.classList.add("active");
    }

    if (buttons[2]) {
      buttons[2].classList.add("active");
    }

    renderJobBoard();
  }
}

// Job storage

function getJobs() {
  try {
    const raw = localStorage.getItem(JOB_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const jobs = JSON.parse(raw);

    if (!Array.isArray(jobs)) {
      return [];
    }

    return jobs.sort(
      (a, b) =>
        new Date(b.postedAt || 0).getTime() -
        new Date(a.postedAt || 0).getTime()
    );
  } catch (error) {
    console.error("Could not load jobs:", error);

    return [];
  }
}

// Application storage

function getApplications() {
  try {
    const raw = localStorage.getItem(APPLICATION_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const applications = JSON.parse(raw);

    return Array.isArray(applications) ? applications : [];
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

function hasApplied(jobId) {
  if (!session || !session.username) {
    return false;
  }

  return getApplications().some(
    (application) =>
      String(application.jobId) === String(jobId) &&
      String(application.candidateUsername) === String(session.username)
  );
}

// Job board

function renderJobBoard() {
  const list = document.getElementById("seekerJobList");

  if (!list) {
    return;
  }

  const jobs = getJobs();

  if (jobs.length === 0) {
    list.innerHTML = `
      <p class="empty-state">
        No jobs have been posted yet.
      </p>
    `;

    return;
  }

  list.innerHTML = jobs
    .map((job) => {
      const applied = hasApplied(job.id);

      return `
          <div class="resume-card">

            <div class="card-name">
              ${escapeHTML(job.title || "Untitled Job")}
            </div>

            <div class="card-desc">
              <strong>
                Employer:
              </strong>

              ${escapeHTML(job.employerName || job.postedBy || "Employer")}
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
                      Skills:
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

            <button
              type="button"
              class="${applied ? "btn-secondary" : "btn-primary"}"
              ${applied ? "disabled" : ""}
              onclick="
                openJobModel(
                  '${escapeAttribute(job.id)}'
                )
              "
            >
              ${applied ? "✓ Applied" : "View & Apply"}
            </button>

          </div>
        `;
    })
    .join("");
}

// Job application modal

function openJobModel(jobId) {
  const job = getJobs().find((item) => String(item.id) === String(jobId));

  if (!job) {
    alert("That job could not be found.");

    return;
  }

  currentJobId = job.id;

  const title = document.getElementById("jobModelTitle");

  const employer = document.getElementById("jobModelEmployer");

  const degree = document.getElementById("jobModelDegree");

  const description = document.getElementById("jobModelDescription");

  const skills = document.getElementById("jobModelSkills");

  if (title) {
    title.textContent = job.title || "Job";
  }

  if (employer) {
    employer.textContent = `Posted by ${
      job.employerName || job.postedBy || "Employer"
    }`;
  }

  if (degree) {
    degree.textContent = job.degree || "Not specified";
  }

  if (description) {
    description.textContent = job.description || "";
  }

  if (skills) {
    skills.textContent = formatArray(job.skills);
  }

  sortResumesNewestFirst();

  populateJobResumeSelect();

  const message = document.getElementById("jobApplicationResumeMessage");

  if (message) {
    if (resumes.length === 0) {
      message.textContent = "You must save a resume before applying.";
    } else {
      message.textContent = "Choose which saved resume you want to submit.";
    }
  }

  const button = document.getElementById("applyJobButton");

  if (button) {
    const applied = hasApplied(job.id);

    button.disabled = applied || resumes.length === 0;

    button.textContent = applied ? "✓ Already Applied" : "Submit Resume";
  }

  const confirmation = document.getElementById("applicationConfirm");

  if (confirmation) {
    confirmation.classList.add("hidden");
  }

  const modal = document.getElementById("jobApplicationModel");

  if (modal) {
    modal.classList.remove("hidden");
  }
}

function populateJobResumeSelect() {
  const select = document.getElementById("jobResumeSelect");

  if (!select) {
    return;
  }

  sortResumesNewestFirst();

  if (resumes.length === 0) {
    select.innerHTML = `
      <option value="">
        No saved resumes
      </option>
    `;

    select.disabled = true;
    return;
  }

  select.disabled = false;

  select.innerHTML = resumes
    .map(
      (resume) => `
          <option
            value="${escapeAttribute(resume.id)}"
            ${String(resume.id) === String(selectedResumeId) ? "selected" : ""}
          >
            ${escapeHTML(resume.fileName || "Resume")}
          </option>
        `
    )
    .join("");
}

function closeJobModel() {
  const modal = document.getElementById("jobApplicationModel");

  if (modal) {
    modal.classList.add("hidden");
  }

  currentJobId = null;
}

// Application confirmation

function showApplicationSavedNotice() {
  removeApplicationSavedNotice();

  const notice = document.createElement("div");

  notice.id = "applicationSavedNotice";

  notice.className = "application-saved-notice";

  const message = document.createElement("span");

  message.className = "application-saved-message";

  message.textContent =
    "✓ Your application has been saved and submitted successfully!";

  notice.appendChild(message);

  document.body.appendChild(notice);
}

// Submit a saved resume to a job posting

function submitJobApplication() {
  if (!currentJobId) {
    return;
  }

  const select = document.getElementById("jobResumeSelect");

  if (!select) {
    alert("Resume selection could not be found.");

    return;
  }

  const resumeId = select.value;

  const selected = resumes.find(
    (record) => String(record.id) === String(resumeId)
  );

  if (!selected) {
    alert("Please choose a resume.");

    return;
  }

  if (hasApplied(currentJobId)) {
    alert("You already applied to this job.");

    return;
  }

  const job = getJobs().find(
    (item) => String(item.id) === String(currentJobId)
  );

  if (!job) {
    alert("That job could not be found.");

    return;
  }

  const applications = getApplications();

  const newApplication = {
    id: createUniqueId(),

    jobId: job.id,

    jobTitle: job.title,

    employerUsername: job.postedBy,

    employerName: job.employerName || job.postedBy,

    candidateUsername: session.username,

    candidateName: session.fullName || session.username,

    resumeId: selected.id,

    resume: {
      ...selected,
    },

    status: "pending",

    appliedAt: new Date().toISOString(),
  };

  applications.push(newApplication);

  const saved = saveApplications(applications);

  if (!saved) {
    alert("Your application could not be saved. Please try again.");

    return;
  }

  console.log("APPLICATION SAVED:", newApplication);

  const button = document.getElementById("applyJobButton");

  if (button) {
    button.disabled = true;
    button.textContent = "✓ Application Submitted";
  }

  renderJobBoard();
  closeJobModel();
  showApplicationSavedNotice();
}

// Page initialization

document.addEventListener("DOMContentLoaded", () => {
  if (!checkSession()) {
    return;
  }

  loadResumes();
  sortResumesNewestFirst();

  showSeekerTab("upload");

  const jobModal = document.getElementById("jobApplicationModel");

  if (jobModal) {
    jobModal.addEventListener("click", (event) => {
      if (event.target === jobModal) {
        closeJobModel();
      }
    });
  }

  console.log("SEEKER PAGE READY");

  console.log(
    "RESUMES SORTED NEWEST -> OLDEST:",
    resumes.map((resume) => ({
      fileName: resume.fileName,

      updatedAt: resume.updatedAt,

      timestamp: getResumeTimestamp(resume),
    }))
  );
});
