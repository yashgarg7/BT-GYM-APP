const data = window.ROUTINE_DATA;
const storeKey = "gymRoutineCompanion.v1";
const themeKey = "gymRoutineCompanion.theme";

const weekSelect = document.querySelector("#weekSelect");
const daySelect = document.querySelector("#daySelect");
const phaseLabel = document.querySelector("#phaseLabel");
const dayTitle = document.querySelector("#dayTitle");
const dayMeta = document.querySelector("#dayMeta");
const exerciseList = document.querySelector("#exerciseList");
const progressText = document.querySelector("#progressText");
const progressBar = document.querySelector("#progressBar");
const warmupDialog = document.querySelector("#warmupDialog");
const timerDisplay = document.querySelector("#timerDisplay");

let activeWeek = Number(localStorage.getItem("activeWeek") || 1);
let activeDay = Number(localStorage.getItem("activeDay") || 1);
let timerId = null;
let timerRemaining = 0;

function readStore() {
  try {
    return JSON.parse(localStorage.getItem(storeKey)) || {};
  } catch {
    return {};
  }
}

function writeStore(store) {
  localStorage.setItem(storeKey, JSON.stringify(store));
}

function dayKey(week, day) {
  return `w${week}.d${day}`;
}

function exerciseKey(index) {
  return `${dayKey(activeWeek, activeDay)}.e${index}`;
}

function getWeek() {
  return data.weeks.find((week) => week.week === activeWeek) || data.weeks[0];
}

function getDay() {
  return getWeek().days.find((day) => day.day === activeDay) || getWeek().days[0];
}

function parseSetCount(value) {
  const nums = String(value).match(/\d+/g);
  if (!nums) return 1;
  return Math.min(4, Math.max(1, Number(nums[nums.length - 1])));
}

function minutesFromRest(rest) {
  const nums = String(rest).match(/\d+/g);
  if (!nums) return 90;
  return Number(nums[nums.length - 1]) * 60;
}

function formatTime(seconds) {
  const min = Math.floor(seconds / 60).toString().padStart(2, "0");
  const sec = Math.max(0, seconds % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
}

function startTimer(seconds) {
  clearInterval(timerId);
  timerRemaining = seconds;
  timerDisplay.textContent = formatTime(timerRemaining);
  timerId = setInterval(() => {
    timerRemaining -= 1;
    timerDisplay.textContent = formatTime(timerRemaining);
    if (timerRemaining <= 0) {
      clearInterval(timerId);
      timerId = null;
      timerDisplay.textContent = "Done";
      if ("vibrate" in navigator) navigator.vibrate([180, 90, 180]);
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
  timerRemaining = 0;
  timerDisplay.textContent = "00:00";
}

function populateSelectors() {
  weekSelect.innerHTML = data.weeks
    .map((week) => `<option value="${week.week}">Week ${week.week} - ${week.phase}</option>`)
    .join("");
  weekSelect.value = activeWeek;
  renderDayOptions();
}

function renderDayOptions() {
  const week = getWeek();
  daySelect.innerHTML = week.days
    .map((day) => `<option value="${day.day}">Day ${day.day} - ${day.title}</option>`)
    .join("");
  if (!week.days.some((day) => day.day === activeDay)) activeDay = 1;
  daySelect.value = activeDay;
}

function setField(key, value) {
  const store = readStore();
  store[key] = value;
  writeStore(store);
}

function renderProgress() {
  const day = getDay();
  const store = readStore();
  const done = day.exercises.filter((_, index) => store[`${exerciseKey(index)}.done`]).length;
  const pct = day.exercises.length ? Math.round((done / day.exercises.length) * 100) : 0;
  progressText.textContent = `${pct}%`;
  progressBar.style.width = `${pct}%`;
}

function renderWorkout() {
  const week = getWeek();
  const day = getDay();
  const store = readStore();

  phaseLabel.textContent = `Week ${week.week} - ${week.phase}`;
  dayTitle.textContent = `Day ${day.day}: ${day.title}`;
  dayMeta.textContent = `${day.exercises.length} exercises${day.restAfter ? " - Rest day follows" : ""}`;

  exerciseList.innerHTML = day.exercises.map((ex, index) => {
    const sets = parseSetCount(ex.workingSets);
    const key = exerciseKey(index);
    const done = store[`${key}.done`] ? "checked" : "";
    const setRows = Array.from({ length: sets }, (_, setIndex) => {
      const base = `${key}.s${setIndex + 1}`;
      return `
        <div class="set-row">
          <span class="set-label">Set ${setIndex + 1}</span>
          <input inputmode="decimal" aria-label="${ex.exercise} set ${setIndex + 1} load" placeholder="Load" value="${store[`${base}.load`] || ""}" data-save="${base}.load">
          <input inputmode="numeric" aria-label="${ex.exercise} set ${setIndex + 1} reps" placeholder="Reps" value="${store[`${base}.reps`] || ""}" data-save="${base}.reps">
        </div>
      `;
    }).join("");

    return `
      <article class="exercise-card">
        <div class="exercise-head">
          <div>
            <p class="eyebrow">Exercise ${index + 1}</p>
            <h3>${ex.exercise}</h3>
          </div>
          <label class="done-toggle">
            <input type="checkbox" ${done} data-save="${key}.done">
            Done
          </label>
        </div>
        <div class="chips">
          <span class="chip strong">${ex.workingSets} working sets</span>
          <span class="chip">${ex.reps} reps</span>
          <span class="chip">${ex.rest} rest</span>
          <span class="chip">Warm-up ${ex.warmupSets}</span>
          <span class="chip">Early ${ex.earlyRpe}</span>
          <span class="chip">Last ${ex.lastRpe}</span>
          <span class="chip">${ex.intensity}</span>
        </div>
        <div class="card-body">
          <div class="note-box">
            <p>${ex.notes || "No extra notes."}</p>
            <p class="subs">Swap options: ${ex.sub1 || "None listed"} / ${ex.sub2 || "None listed"}</p>
            <button type="button" data-start-rest="${minutesFromRest(ex.rest)}">Start ${ex.rest} timer</button>
          </div>
          <div class="set-grid">
            ${setRows}
            <textarea aria-label="${ex.exercise} notes" placeholder="Form notes, machine setting, pain-free variation..." data-save="${key}.notes">${store[`${key}.notes`] || ""}</textarea>
          </div>
        </div>
      </article>
    `;
  }).join("");

  renderProgress();
}

function renderWarmup() {
  document.querySelector("#generalWarmup").innerHTML = data.warmup.general.map((item) => `<li>${item}</li>`).join("");
  document.querySelector("#specificWarmup").innerHTML = data.warmup.specific.map((item) => `<li>${item}</li>`).join("");
}

document.addEventListener("input", (event) => {
  const target = event.target;
  if (!target.dataset.save) return;
  setField(target.dataset.save, target.type === "checkbox" ? target.checked : target.value);
  renderProgress();
});

document.addEventListener("change", (event) => {
  const target = event.target;
  if (!target.dataset.save) return;
  setField(target.dataset.save, target.type === "checkbox" ? target.checked : target.value);
  renderProgress();
});

document.addEventListener("click", (event) => {
  const rest = event.target.dataset.startRest || event.target.dataset.rest;
  if (rest) startTimer(Number(rest));
});

weekSelect.addEventListener("change", () => {
  activeWeek = Number(weekSelect.value);
  localStorage.setItem("activeWeek", activeWeek);
  renderDayOptions();
  renderWorkout();
});

daySelect.addEventListener("change", () => {
  activeDay = Number(daySelect.value);
  localStorage.setItem("activeDay", activeDay);
  renderWorkout();
});

document.querySelector("#stopTimerBtn").addEventListener("click", stopTimer);

document.querySelector("#warmupBtn").addEventListener("click", () => {
  warmupDialog.showModal();
});

document.querySelector("#resetDayBtn").addEventListener("click", () => {
  if (!confirm("Clear saved logs for this workout day?")) return;
  const store = readStore();
  const prefix = dayKey(activeWeek, activeDay);
  Object.keys(store).forEach((key) => {
    if (key.startsWith(prefix)) delete store[key];
  });
  writeStore(store);
  renderWorkout();
});

document.querySelector("#themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem(themeKey, document.body.classList.contains("dark") ? "dark" : "light");
});

if (localStorage.getItem(themeKey) === "dark") document.body.classList.add("dark");

populateSelectors();
renderWarmup();
renderWorkout();

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
