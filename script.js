/* ============================================================
   KWETUTECH — SCRIPT
   This file adds the page's interactive behavior without replacing its content:
   it controls the mobile menu, accessible application dialog, form validation
   and submission, plus the country choices used by applicants.
   ============================================================ */
/* 
   1. MOBILE MENU
   ============================================================ */

// The hamburger button and the menu it controls
const button = document.getElementById("menu-button");
const menu = document.getElementById("menu");

// Open or close the menu by updating aria-expanded.
// The CSS reads aria-expanded to show/hide the menu.
function setMenu(isOpen) {
  button.setAttribute("aria-expanded", String(isOpen));
}

// 1a. Toggle the menu when the hamburger is clicked
button.addEventListener("click", () => {
  const isOpen = button.getAttribute("aria-expanded") === "true";
  setMenu(!isOpen);
});

// 1b. Close the menu after a link is chosen (useful on mobile)
menu.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    setMenu(false);
  }
});

// 1c. Close the menu with the Escape key
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setMenu(false);
  }
});


/* ============================================================
   2. JOIN FORM
   ============================================================ */

// Rules for the "Why do you want to join?" field
const MIN_WORDS = 150;
const MAX_WORDS = 200;

// Simple email format check
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Grab the elements we need from the form
const joinForm       = document.getElementById("join-form");
const joinType       = document.getElementById("join-type");
const personalFields = document.getElementById("personal-fields");
const studentFields  = document.getElementById("student-fields");
const teacherFields  = document.getElementById("teacher-fields");
const donateInfo     = document.getElementById("donate-info");
const submitButton   = document.getElementById("submit-button");
const successMessage = document.getElementById("form-success");
const errorMessage   = document.getElementById("form-error");
const studentWhy     = document.getElementById("student-why");
const wordCounter    = document.getElementById("word-counter");
const communityLink = document.getElementById("community-link");
const applicationDetails = document.getElementById("join-application");
// Use the configured service origin, with a local-development fallback.
const apiBaseUrl = (
  document.querySelector('meta[name="api-base-url"]').content.trim() ||
  (window.location.protocol === "file:" ? "http://127.0.0.1:8000" : window.location.origin)
).replace(/\/+$/, "");

// Open the square application dialog and place keyboard focus on its control.
communityLink.addEventListener("click", (event) => {
  event.preventDefault();
  applicationDetails.open = true;
  applicationDetails.querySelector("summary").focus();
});

document.addEventListener("click", (event) => {
  if (!applicationDetails.open) {
    return;
  }

  const bounds = applicationDetails.getBoundingClientRect();
  const outsidePanel =
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom;

  if (outsidePanel) {
    event.preventDefault();
    event.stopPropagation();
    applicationDetails.open = false;
    communityLink.focus();
  }
}, true);

// Escape closes the dialog and returns focus to the link that opened it.
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && applicationDetails.open) {
    applicationDetails.open = false;
    communityLink.focus();
  }
});

// --- Helpers ---

// Count whitespace-separated words for the student's required response.
function countWords(text) {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

// Update "0 / 200 words" and turn it red when over the limit
function updateCounter() {
  const words = countWords(studentWhy.value);
  wordCounter.textContent = words + " / " + MAX_WORDS + " words";
  wordCounter.classList.toggle("over", words > MAX_WORDS);
}

// Keep student, teacher, and donation content matched to the selected option.
function showPanels() {
  const type = joinType.value;
  const isApplication = type === "student" || type === "teacher";

  personalFields.hidden = !isApplication;   // name, email, phone, country, city
  studentFields.hidden  = type !== "student";
  teacherFields.hidden  = type !== "teacher";
  donateInfo.hidden     = type !== "donate";
  submitButton.hidden   = !isApplication;
  successMessage.hidden = true;             // hide old success message on switch
  errorMessage.hidden   = true;
}

// Associate validation feedback with its field for visual and assistive use.
function showError(control, message) {
  const error = control.closest(".field").querySelector(".error");
  if (error) {
    error.textContent = message;
  }
  control.setAttribute("aria-invalid", message === "" ? "false" : "true");
}

// Apply required-field, email, consent, and student word-count rules.
function validateControl(control) {
  const value = control.value.trim();
  let message = "";

  if (control.required && value === "") {
    message = "This field is required.";
  } else if (control.type === "checkbox" && control.required && !control.checked) {
    message = "Please give your consent before submitting.";
  } else if (control.type === "email" && !emailPattern.test(value)) {
    message = "Please enter a valid email address.";
  } else if (control === studentWhy) {
    const words = countWords(value);
    if (words < MIN_WORDS) {
      message = "Please write at least " + MIN_WORDS + " words.";
    } else if (words > MAX_WORDS) {
      message = "Please keep your response within " + MAX_WORDS + " words.";
    }
  }

  showError(control, message);
  return message === "";
}

// --- Events ---

// 2a. When the dropdown changes, switch panels
joinType.addEventListener("change", showPanels);

// 2b. While typing: update the counter, and clear an error once it is fixed
joinForm.addEventListener("input", (event) => {
  const control = event.target;

  if (control === studentWhy) {
    updateCounter();
  }

  // If a field was already marked invalid, re-check it live
  if (control.getAttribute("aria-invalid") === "true") {
    validateControl(control);
  }
});

// 2c. On submit: check every visible field
joinForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const type = joinType.value;
  // Only student and teacher use the form
  if (type !== "student" && type !== "teacher") {
    return;
  }

  let firstInvalid = null;

  // Check every input, select and textarea that is currently visible
  joinForm.querySelectorAll("input, select, textarea").forEach((control) => {
    if (control === joinType || control.closest("[hidden]")) {
      return;
    }
    if (!validateControl(control) && !firstInvalid) {
      firstInvalid = control;
    }
  });

  // If something is invalid, focus it and stop
  if (firstInvalid) {
    firstInvalid.focus();
    return;
  }

  // Share common applicant details, then add the selected applicant's answers.
  const payload = {
    joinType: type,
    fullName: document.getElementById("full-name").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
    country: document.getElementById("country").value,
    city: document.getElementById("city").value,
    consent: document.getElementById("consent").checked,
  };
  if (type === "student") {
    Object.assign(payload, {
      heardFrom: document.getElementById("heard-from").value,
      social: document.getElementById("social").value,
      level: document.getElementById("student-level").value,
      experience: document.getElementById("student-experience").value,
      why: studentWhy.value,
    });
  } else {
    Object.assign(payload, {
      experience: document.getElementById("teacher-experience").value,
      why: document.getElementById("teacher-why").value,
    });
  }

  // Prevent duplicate submissions while the application service responds.
  submitButton.disabled = true;
  submitButton.textContent = "Submitting...";
  errorMessage.hidden = true;
  try {
    const response = await fetch(apiBaseUrl + "/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error?.message || "We could not submit your application.");
    }
    successMessage.textContent =
      "Thank you for applying. Your reference is " + result.reference + ".";
    joinForm.reset();
    showPanels();
    updateCounter();
    successMessage.hidden = false;
  } catch (error) {
    errorMessage.textContent = error instanceof Error
      ? error.message
      : "We could not reach the application service. Please try again.";
    errorMessage.hidden = false;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Submit Application";
  }
});

// 2d. Match the page to the dropdown when it loads
// (browsers can remember the last chosen option)
showPanels();
updateCounter();


/* ============================================================
   3. AFRICAN COUNTRIES DROPDOWN
   Fills the "Country" <select> with all African countries.
   If the import fails, add a fallback "Other" option.
   ============================================================ */

const countrySelect = document.getElementById("country");

// Populate the country control from the Africa-only country dataset.
import("https://cdn.jsdelivr.net/npm/countries-list@3/+esm")
  .then(({ countries }) => {
    Object.values(countries)
      .filter((country) => country.continent === "AF")   // only Africa
      .map((country) => country.name)
      .sort((a, b) => a.localeCompare(b))                // alphabetical
      .forEach((name) => countrySelect.add(new Option(name, name)));
  })
  .catch(() => {
    // Keep the form usable when the optional country dataset is unavailable.
    countrySelect.add(new Option("Other", "Other"));
  });