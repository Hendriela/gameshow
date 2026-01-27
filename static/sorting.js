const CFG = window.GAME_CFG;

let QUESTIONS = [];

const $ = (id) => document.getElementById(id);

let state = {
  roundIndex: 0,
  scores: { A: 0, B: 0 },
  team: "A",
  q: null,
  sortedIds: [],
  remainingIds: [],
  selectedId: null,
  secondsLeft: CFG.turnSeconds,
  timer: null,
  roundOver: false,
  isPaused: true,
};

function teamName(code){ return code === "A" ? CFG.teamA : CFG.teamB; }

function byId(q,id){ return q.items.find(x => x.id === id); }

function shuffle(arr){
  const a = [...arr];
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

function computeCorrectOrder(q){
  const items = [...q.items];
  items.sort((a,b) => q.direction === "asc" ? (a.value-b.value) : (b.value-a.value));
  return items.map(x => x.id);
}

function formatValue(q, item){
  const unit = q.unit ? ` ${q.unit}` : "";
  return `${item.value}${unit}`;
}

function setStatus(msg, kind=""){
  const s = $("status");
  s.textContent = msg || "";
  s.classList.remove("good","bad");
  if(kind) s.classList.add(kind);
}

function updateScoreboard(){
  $("teamAScore").textContent = state.scores.A;
  $("teamBScore").textContent = state.scores.B;
  $("turnTeam").textContent = teamName(state.team);
  $("teamABox").classList.toggle("active", state.team === "A");
  $("teamBBox").classList.toggle("active", state.team === "B");
}

function resetTurnTimer(){
  state.secondsLeft = CFG.turnSeconds;
  renderTimer();
  state.isPaused = false;
  updatePauseButton();
}

function updatePauseButton(){
  const btn = $("pauseBtn");
  if(!btn) return;
  btn.textContent = state.isPaused ? "Resume" : "Pause";
  btn.classList.toggle("paused", state.isPaused);
}

function stopTimer(){
  if(state.timer){ clearInterval(state.timer); state.timer = null; }
}

function renderTimer(){
  const t = $("timer");
  t.textContent = String(state.secondsLeft);
  t.classList.toggle("low", state.secondsLeft <= 10);
}

function startTimer(){
  stopTimer();
  state.isPaused = false;
  updatePauseButton();

  // Don't reset seconds here if you want to preserve remaining time across pauses.
  // We DO reset at the start of each turn via resetTurnTimer().
  state.timer = setInterval(() => {
    if(state.isPaused || state.roundOver) return;

    state.secondsLeft -= 1;
    renderTimer();

    if(state.secondsLeft <= 0){
      const loser = state.team;
      const winner = loser === "A" ? "B" : "A";
      endRound({
        reason: "timeout",
        message: `${teamName(loser)} ran out of time.`,
        pointTo: winner,
      });
    }
  }, 1000);
}


function nextTeam(){
  state.team = state.team === "A" ? "B" : "A";
  updateScoreboard();
}

function setDirectionLabels(){
  const labels = (state.q && state.q.labels) ? state.q.labels : { more: "more", less: "less" };

  if(state.q.direction === "desc"){
    $("topDir").textContent = `${labels.more} ↑`;
    $("bottomDir").textContent = `${labels.less} ↓`;
  } else {
    $("topDir").textContent = `${labels.less} ↑`;
    $("bottomDir").textContent = `${labels.more} ↓`;
  }
}


function renderHeader(){
  const q = state.q;
  $("roundLabel").textContent = `Round ${state.roundIndex + 1}`;
  $("qTitle").textContent = `${q.title} — ${q.criterion}`;
  $("qPrompt").textContent = q.prompt;
  setDirectionLabels();
}

function renderChoices(){
  const q = state.q;
  const wrap = $("choices");
  wrap.innerHTML = "";

  state.remainingIds.forEach(id => {
    const item = byId(q,id);
    const chip = document.createElement("button");
    chip.className = "choice";
    chip.textContent = item.label;
    chip.onclick = () => {
      if(state.roundOver) return;
      state.selectedId = id;
      renderChoices(); // update highlighting
      setStatus(`Selected: ${item.label}. Now choose a position.`, "");
      renderPositionButtonsEnabled();
    };
    if(state.selectedId === id) chip.classList.add("selected");
    wrap.appendChild(chip);
  });
}

function positionRailButtons(){
  const list = $("sortedList");
  const rail = $("posRail");

  const items = [...list.querySelectorAll(".sortedItem")];
  const N = items.length;

  if(N === 0) return;

  const listRect = list.getBoundingClientRect();

  // Compute gap Y positions (above first, between, below last)
  // Labels are 1..N+1 with 1 = bottom, N+1 = top.
  const gapYs = [];

  // top gap (label N+1)
  gapYs.push(items[0].getBoundingClientRect().top);

  // between gaps
  for(let i=1;i<N;i++){
    const prev = items[i-1].getBoundingClientRect();
    const cur = items[i].getBoundingClientRect();
    gapYs.push((prev.bottom + cur.top) / 2);
  }

  // bottom gap (label 1)
  gapYs.push(items[N-1].getBoundingClientRect().bottom);

  // gapYs is top->bottom, length N+1
  // Map to labels: top is label N+1, bottom is label 1
  rail.innerHTML = "";
  const btnHeight = 42;

  for(let i=0;i<gapYs.length;i++){
    const yViewport = gapYs[i];
    const yInRail = yViewport - listRect.top - (btnHeight/2);

    const label = (N + 1) - i; // i=0 => N+1 (top), last => 1 (bottom)

    const btn = document.createElement("button");
    btn.className = "posBtn";
    btn.textContent = String(label);
    btn.style.top = `${yInRail}px`;
    btn.onclick = () => onPlaceAtLabel(label);

    rail.appendChild(btn);
  }

  renderPositionButtonsEnabled();
}


function renderSortedList(){
  const q = state.q;
  const list = $("sortedList");
  const rail = $("posRail");
  list.innerHTML = "";
  rail.innerHTML = "";

  // Render sorted items (no position buttons on rows)
  state.sortedIds.forEach((id) => {
    const item = byId(q, id);

    const card = document.createElement("div");
    card.className = "sortedItem";
    card.dataset.id = id;

    const left = document.createElement("div");
    left.className = "itemLabel";
    left.textContent = item.label;

    const right = document.createElement("div");
    right.className = "itemValue";
    right.textContent = formatValue(q,item);

    card.appendChild(left);
    card.appendChild(right);

    list.appendChild(card);
  });

  // After the DOM paints, position the rail buttons between items
  requestAnimationFrame(() => positionRailButtons());

  renderPositionButtonsEnabled();
}


function renderPositionButtonsEnabled(){
  // Disable position buttons until a choice is selected
  const enabled = !!state.selectedId && !state.roundOver;
  document.querySelectorAll(".posBtn").forEach(b => {
    b.classList.toggle("disabled", !enabled);
    b.disabled = !enabled;
  });
}

function labelToInsertIndex(labelK){
  const N = state.sortedIds.length;
  // labelK in 1..N+1 => insert index (N+1 - labelK)
  return (N + 1) - labelK;
}

function isCorrectPlacement(chosenId, insertIndex){
  const q = state.q;
  const correct = computeCorrectOrder(q);
  const candidate = [...state.sortedIds];
  candidate.splice(insertIndex, 0, chosenId);
  const idxs = candidate.map(id => correct.indexOf(id));
  for(let i=1;i<idxs.length;i++){
    if(idxs[i] < idxs[i-1]) return false;
  }
  return true;
}

function onPlaceAtLabel(labelK){
  if(state.roundOver) return;
  if(!state.selectedId){
    setStatus("Select an answer first.", "bad");
    return;
  }

  const chosenId = state.selectedId;
  const insertIndex = labelToInsertIndex(labelK);

  const ok = isCorrectPlacement(chosenId, insertIndex);

  if(!ok){
    const loser = state.team;
    const winner = loser === "A" ? "B" : "A";
    endRound({
      reason: "wrong",
      message: `${teamName(loser)} placed an item in the wrong position.`,
      pointTo: winner,
      wrongPick: chosenId,
      wrongLabel: labelK
    });
    return;
  }

  // Apply
  state.sortedIds.splice(insertIndex, 0, chosenId);
  state.remainingIds = state.remainingIds.filter(x => x !== chosenId);

  // Reset selection
  state.selectedId = null;

  // Animate: re-render and add enter class to the inserted item card
  renderSortedList();
  renderChoices();

  // Add a little “enter” animation to the newly inserted card
  // (find card by label text match / position)
  const list = $("sortedList");
  const row = list.children[insertIndex]; // rows align with items; bottom row is extra
  if(row){
    const card = row.querySelector(".sortedItem");
    if(card){
      card.classList.add("enter");
      setTimeout(() => card.classList.remove("enter"), 250);
    }
  }

  setStatus("Correct ✅", "good");

  // Round complete when remaining is empty
  if(state.remainingIds.length === 0){
    endRound({
      reason: "complete",
      message: "All answers were sorted correctly.",
      pointTo: null
    });
    return;
  }

  nextTeam();
  startTimer();
}

function autoCompleteToCorrect(){
  // Fill remaining items into the sorted list in correct positions
  const q = state.q;
  const correct = computeCorrectOrder(q);

  // Merge current placed + remaining, then set sortedIds to the correct order
  const allPlaced = new Set([...state.sortedIds, ...state.remainingIds]);
  state.sortedIds = correct.filter(id => allPlaced.has(id));
  state.remainingIds = [];
  state.selectedId = null;
}

function endRound({reason, message, pointTo, wrongPick=null, wrongLabel=null}){
  state.isPaused = false;
  updatePauseButton();
  state.roundOver = true;
  stopTimer();

  if(pointTo){
    state.scores[pointTo] += 1;
  }
  updateScoreboard();

  // Reveal + auto-complete remaining into correct order
  autoCompleteToCorrect();
  renderSortedList();
  renderChoices();

  document.querySelector(".centerCard").classList.add("revealValues"); // show values

  const q = state.q;
  const correct = computeCorrectOrder(q);

  // Results header
  $("resultsTitle").textContent = "Round over";
  $("resultsSub").textContent = message;

  let pill = "No points";
  if(pointTo) pill = `Point to ${teamName(pointTo)}`;
  $("resultsPill").textContent = pill;

  // Body
  const body = document.createElement("div");

  if(wrongPick){
    const item = byId(q, wrongPick);
    const p = document.createElement("p");
    p.innerHTML =
      `<span style="color: var(--bad); font-weight:900;">Wrong pick:</span>
       ${item.label} (${formatValue(q,item)}) at position <b>${wrongLabel}</b>`;
    body.appendChild(p);
  }

  const resultsBody = $("resultsBody");
  resultsBody.innerHTML = "";
  resultsBody.appendChild(body);

  // Enable next round
  $("nextRoundBtn").disabled = false;

  // Win check
  const winner = (state.scores.A >= CFG.targetWins) ? "A" :
                 (state.scores.B >= CFG.targetWins) ? "B" : null;

  if(winner){
    $("resultsTitle").textContent = `🏆 ${teamName(winner)} wins the game!`;
    $("resultsPill").textContent = "Game over";
    $("nextRoundBtn").textContent = "New game";
    $("nextRoundBtn").onclick = restartGame;
  } else {
    $("nextRoundBtn").textContent = "Next round";
    $("nextRoundBtn").onclick = startNextRound;
  }
}

function startRound(q){
  document.querySelector(".centerCard").classList.remove("revealValues");
  state.q = q;
  state.roundOver = false;

  state.sortedIds = [q.start_id];
  state.remainingIds = shuffle(q.items.map(x => x.id).filter(id => id !== q.start_id));

  // Alternate starting team by round
  state.team = (state.roundIndex % 2 === 0) ? "A" : "B";

  state.selectedId = null;

  $("resultsTitle").textContent = "—";
  $("resultsSub").textContent = "—";
  $("resultsPill").textContent = "—";
  $("resultsBody").innerHTML = "";
  $("nextRoundBtn").disabled = true;

  renderHeader();
  updateScoreboard();
  renderSortedList();
  renderChoices();
  setStatus("Select an answer, then choose its position.", "");
  resetTurnTimer();
  startTimer();
}

function startNextRound(){
  state.roundIndex += 1;
  if(state.roundIndex >= QUESTIONS.length) state.roundIndex = 0;
  startRound(QUESTIONS[state.roundIndex]);
}

function restartGame(){
  stopTimer();
  state.roundIndex = 0;
  state.scores = { A: 0, B: 0 };
  state.team = "A";
  state.selectedId = null;
  updateScoreboard();
  startRound(QUESTIONS[0]);
}

async function init(){
  const res = await fetch("/api/questions");
  const data = await res.json();
  QUESTIONS = (data.by_mode && data.by_mode.sorting) ? data.by_mode.sorting : [];  
  if(!QUESTIONS.length) throw new Error("No questions.");

  // Hook restart button
  $("restartBtn").onclick = restartGame;

  // Keyboard shortcuts (nice at TV)
  window.addEventListener("keydown", (e) => {
    if(e.key === "Escape"){
      state.selectedId = null;
      renderChoices();
      renderPositionButtonsEnabled();
      setStatus("Selection cleared.", "");
    }
  });

  // Hook pause button
  $("pauseBtn").onclick = () => {
  if(state.roundOver) return;
  state.isPaused = !state.isPaused;
  updatePauseButton();
  setStatus(state.isPaused ? "Paused ⏸" : "Resumed ▶", "");
};

  startRound(QUESTIONS[0]);
}

init().catch(err => {
  console.error(err);
  alert("Failed to start: " + err.message);
});
