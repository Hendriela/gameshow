let QUESTIONS = [];
let settings = {
  teamA: "Team A",
  teamB: "Team B",
  targetWins: 5,
  turnSeconds: 60,
};

let state = {
  roundIndex: 0,
  scores: { A: 0, B: 0 },
  currentTeam: "A",
  // per-round:
  q: null,
  sortedIds: [],
  remainingIds: [],
  roundOver: false,
  timerHandle: null,
  secondsLeft: 60,
};

const el = (id) => document.getElementById(id);

function byId(q, id){ return q.items.find(x => x.id === id); }

function computeCorrectOrder(q){
  const dir = q.direction; // "asc" or "desc"
  const items = [...q.items];
  items.sort((a,b) => dir === "asc" ? (a.value - b.value) : (b.value - a.value));
  return items.map(x => x.id);
}

function formatValue(item){
  const unit = item.unit ? ` ${item.unit}` : "";
  return `${item.value}${unit}`;
}

function setStatus(msg, kind=""){
  const s = el("status");
  s.textContent = msg || "";
  s.classList.remove("good","bad");
  if(kind) s.classList.add(kind);
}

function updateScoreboard(){
  el("teamAName").textContent = settings.teamA;
  el("teamBName").textContent = settings.teamB;
  el("teamAScore").textContent = state.scores.A;
  el("teamBScore").textContent = state.scores.B;
  el("targetWinsPill").textContent = `First to ${settings.targetWins}`;

  el("teamABox").classList.toggle("active", state.currentTeam === "A");
  el("teamBBox").classList.toggle("active", state.currentTeam === "B");

  el("turnTeam").textContent = state.currentTeam === "A" ? settings.teamA : settings.teamB;
}

function stopTimer(){
  if(state.timerHandle){
    clearInterval(state.timerHandle);
    state.timerHandle = null;
  }
}

function startTimer(){
  stopTimer();
  state.secondsLeft = settings.turnSeconds;
  renderTimer();
  state.timerHandle = setInterval(() => {
    state.secondsLeft -= 1;
    renderTimer();
    if(state.secondsLeft <= 0){
      // timeout -> opponent scores
      const loser = state.currentTeam;
      const winner = loser === "A" ? "B" : "A";
      endRound({
        reason: "timeout",
        message: `${teamName(loser)} ran out of time.`,
        pointTo: winner
      });
    }
  }, 1000);
}

function renderTimer(){
  const t = el("timer");
  t.textContent = String(state.secondsLeft);
  t.classList.toggle("low", state.secondsLeft <= 10);
}

function teamName(code){
  return code === "A" ? settings.teamA : settings.teamB;
}

function nextTeam(){
  state.currentTeam = state.currentTeam === "A" ? "B" : "A";
  updateScoreboard();
}

function renderQuestion(){
  const q = state.q;
  el("roundKicker").textContent = `Round ${state.roundIndex + 1}`;
  el("questionTitle").textContent = `${q.title} — ${q.criterion}`;
  el("questionPrompt").textContent = q.prompt;

  const sorted = el("sorted");
  sorted.innerHTML = "";

  state.sortedIds.forEach((id) => {
    const item = byId(q,id);
    sorted.appendChild(makeSortedCard(item));
  });

  el("sortedHint").textContent =
    `Place items in ${q.direction === "asc" ? "ascending" : "descending"} order by ${q.criterion}.
One item will remain unused when the round is completed.`;

  renderPool();
  renderPickSelect();
  renderPosSelect();
}

function makeSortedCard(item){
  const div = document.createElement("div");
  div.className = "cardItem";
  div.dataset.id = item.id;

  const left = document.createElement("div");
  left.className = "itemLabel";
  left.textContent = item.label;

  const right = document.createElement("div");
  right.className = "itemValue";
  right.textContent = formatValue(item);

  div.appendChild(left);
  div.appendChild(right);
  return div;
}

function renderPool(){
  const q = state.q;
  const pool = el("pool");
  pool.innerHTML = "";
  state.remainingIds.forEach((id) => {
    const item = byId(q,id);
    const chip = document.createElement("div");
    chip.className = "chip pop";
    chip.textContent = item.label;
    pool.appendChild(chip);
  });
}

function renderPickSelect(){
  const q = state.q;
  const sel = el("pickSelect");
  sel.innerHTML = "";
  state.remainingIds.forEach((id) => {
    const item = byId(q,id);
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = item.label;
    sel.appendChild(opt);
  });
}

function renderPosSelect(){
  const q = state.q;
  const sel = el("posSelect");
  sel.innerHTML = "";

  const labels = state.sortedIds.map((id) => byId(q,id).label);

  // positions are "0..sortedLen" meaning insert before index
  const sortedLen = state.sortedIds.length;

  for(let pos=0; pos<=sortedLen; pos++){
    const opt = document.createElement("option");
    opt.value = String(pos);

    if(sortedLen === 0){
      opt.textContent = "as the first item";
    } else if(pos === 0){
      opt.textContent = `before "${labels[0]}"`;
    } else if(pos === sortedLen){
      opt.textContent = `after "${labels[labels.length-1]}"`;
    } else {
      opt.textContent = `between "${labels[pos-1]}" and "${labels[pos]}"`;
    }
    sel.appendChild(opt);
  }
}

function willBeCorrectPlacement(chosenId, insertPos){
  const q = state.q;
  const correct = computeCorrectOrder(q);

  // Candidate new sorted list
  const newSorted = [...state.sortedIds];
  newSorted.splice(insertPos, 0, chosenId);

  // Rule: the relative order of placed items must match the true order.
  const indicesInCorrect = newSorted.map(id => correct.indexOf(id));

  for(let i=1; i<indicesInCorrect.length; i++){
    if(indicesInCorrect[i] < indicesInCorrect[i-1]) return false;
  }
  return true;
}

function animateInsert(newCard){
  // Simple entry animation + mild layout shift smoothing
  newCard.classList.add("enter");
  setTimeout(() => newCard.classList.remove("enter"), 250);
}

function placeAnswer(){
  if(state.roundOver) return;

  const chosenId = el("pickSelect").value;
  if(!chosenId){
    setStatus("Pick an answer first.", "bad");
    return;
  }
  const pos = parseInt(el("posSelect").value, 10);

  if(!Number.isFinite(pos)){
    setStatus("Pick a position.", "bad");
    return;
  }

  const ok = willBeCorrectPlacement(chosenId, pos);

  if(!ok){
    const loser = state.currentTeam;
    const winner = loser === "A" ? "B" : "A";
    endRound({
      reason: "wrong",
      message: `${teamName(loser)} placed an item in the wrong position.`,
      pointTo: winner,
      wrongPick: chosenId,
      wrongPos: pos
    });
    return;
  }

  // Correct: apply insertion
  const q = state.q;
  state.sortedIds.splice(pos, 0, chosenId);
  state.remainingIds = state.remainingIds.filter(id => id !== chosenId);

  // Render sorted with a targeted animation
  const sortedEl = el("sorted");
  const item = byId(q, chosenId);
  const card = makeSortedCard(item);

  // Insert DOM node at correct position
  if(pos >= sortedEl.children.length){
    sortedEl.appendChild(card);
  } else {
    sortedEl.insertBefore(card, sortedEl.children[pos]);
  }
  animateInsert(card);

  renderPool();
  renderPickSelect();
  renderPosSelect();

  setStatus("Correct ✅", "good");

  // End condition: when only 1 remaining answer is left
  if(state.remainingIds.length === 1){
    endRound({
      reason: "perfect",
      message: "All possible answers were correctly placed. One answer remained unused.",
      pointTo: null
    });
    return;
  }

  // Next turn
  nextTeam();
  startTimer();
}

function endRound({reason, message, pointTo, wrongPick=null, wrongPos=null}){
  state.roundOver = true;
  stopTimer();

  if(pointTo){
    state.scores[pointTo] += 1;
  }
  updateScoreboard();

  // Build resolution content
  const q = state.q;
  const correctOrder = computeCorrectOrder(q);

  const placedSet = new Set(state.sortedIds);
  const remainingSet = new Set(state.remainingIds);

  // Determine leftover in a "perfect" ending: the remaining one
  const leftoverId = state.remainingIds.length ? state.remainingIds[0] : null;

  let pillText = "";
  if(reason === "timeout"){
    pillText = `Point to ${teamName(pointTo)}`;
  } else if(reason === "wrong"){
    pillText = `Point to ${teamName(pointTo)}`;
  } else if(reason === "perfect"){
    pillText = `No points this round`;
  } else {
    pillText = pointTo ? `Point to ${teamName(pointTo)}` : `Round resolved`;
  }

  el("modalTitle").textContent = "Round over";
  el("modalPill").textContent = pillText;

  const body = document.createElement("div");
  const p = document.createElement("p");
  p.textContent = message;
  body.appendChild(p);

  if(wrongPick){
    const item = byId(q, wrongPick);
    const detail = document.createElement("p");
    detail.innerHTML = `<span style="color: var(--bad); font-weight:800;">Wrong:</span> ${item.label} (${formatValue(item)})`;
    body.appendChild(detail);
  }

  // Show correct order table
  const h = document.createElement("h3");
  h.textContent = "Correct order (full set)";
  body.appendChild(h);

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  thead.innerHTML = `<tr><th>#</th><th>Item</th><th>${q.criterion}</th><th>Status</th></tr>`;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  correctOrder.forEach((id, idx) => {
    const item = byId(q,id);
    const tr = document.createElement("tr");

    let status = "";
    if(state.sortedIds.includes(id)){
      status = "Placed";
    } else if(leftoverId === id){
      status = "Left over";
    } else if(remainingSet.has(id)){
      status = "Unplaced";
    } else {
      status = "—";
    }

    tr.innerHTML = `<td>${idx+1}</td><td>${item.label}</td><td>${formatValue(item)}</td><td>${status}</td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  body.appendChild(table);

  // Replace modal body
  const modalBody = el("modalBody");
  modalBody.innerHTML = "";
  modalBody.appendChild(body);

  el("modal").classList.remove("hidden");

  // Check game win
  const winner = (state.scores.A >= settings.targetWins) ? "A" :
                 (state.scores.B >= settings.targetWins) ? "B" : null;

  if(winner){
    const winBanner = document.createElement("p");
    winBanner.style.marginTop = "12px";
    winBanner.style.fontWeight = "900";
    winBanner.style.fontSize = "18px";
    winBanner.textContent = `🏆 ${teamName(winner)} wins the game!`;
    modalBody.appendChild(winBanner);

    el("nextRoundBtn").textContent = "New game";
    el("nextRoundBtn").onclick = () => restartGame();
  } else {
    el("nextRoundBtn").textContent = "Next round";
    el("nextRoundBtn").onclick = () => startNextRound();
  }
}

function startRound(q){
  state.q = q;
  state.roundOver = false;

  // Initialize sorted with start answer
  state.sortedIds = [q.start_id];

  // Remaining = all except start
  state.remainingIds = q.items.map(x => x.id).filter(id => id !== q.start_id);

  // Randomize remaining pool order for variety (doesn't affect correctness)
  state.remainingIds = shuffle(state.remainingIds);

  // Start team alternates each round to keep fair
  state.currentTeam = (state.roundIndex % 2 === 0) ? "A" : "B";

  updateScoreboard();
  setStatus("");
  renderQuestion();
  startTimer();
}

function startNextRound(){
  el("modal").classList.add("hidden");

  state.roundIndex += 1;
  if(state.roundIndex >= QUESTIONS.length){
    // Loop questions if you run out
    state.roundIndex = 0;
  }
  const q = QUESTIONS[state.roundIndex];
  startRound(q);
}

function restartGame(){
  stopTimer();
  state = {
    roundIndex: 0,
    scores: { A: 0, B: 0 },
    currentTeam: "A",
    q: null,
    sortedIds: [],
    remainingIds: [],
    roundOver: false,
    timerHandle: null,
    secondsLeft: settings.turnSeconds,
  };

  el("modal").classList.add("hidden");
  el("gameArea").classList.add("hidden");
  el("setupCard").classList.remove("hidden");
  el("subtitle").textContent = "TV-friendly sorting game";
  updateScoreboard();
}

function shuffle(arr){
  const a = [...arr];
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

async function loadQuestions(){
  const res = await fetch("/api/questions");
  const data = await res.json();
  QUESTIONS = data.questions || [];
  if(!QUESTIONS.length){
    throw new Error("No questions received.");
  }
}

function hookUI(){
  el("startGameBtn").onclick = () => {
    settings.teamA = el("teamAInput").value.trim() || "Team A";
    settings.teamB = el("teamBInput").value.trim() || "Team B";
    settings.targetWins = parseInt(el("targetWinsSelect").value, 10) || 5;
    settings.turnSeconds = parseInt(el("turnSecondsSelect").value, 10) || 60;

    el("setupCard").classList.add("hidden");
    el("gameArea").classList.remove("hidden");
    el("subtitle").textContent = "Use the dropdowns + Place button. 1 minute per turn.";

    updateScoreboard();
    const q = QUESTIONS[state.roundIndex];
    startRound(q);
  };

  el("demoRoundBtn").onclick = () => {
    settings.teamA = el("teamAInput").value.trim() || "Team A";
    settings.teamB = el("teamBInput").value.trim() || "Team B";
    settings.targetWins = parseInt(el("targetWinsSelect").value, 10) || 5;
    settings.turnSeconds = parseInt(el("turnSecondsSelect").value, 10) || 60;

    el("setupCard").classList.add("hidden");
    el("gameArea").classList.remove("hidden");
    updateScoreboard();
    startRound(QUESTIONS[0]);
  };

  el("placeBtn").onclick = placeAnswer;

  // Keyboard shortcuts (nice for “host at TV”)
  window.addEventListener("keydown", (e) => {
    if(el("modal").classList.contains("hidden") === false){
      if(e.key === "Enter") el("nextRoundBtn").click();
      return;
    }
    if(e.key === "Enter") placeAnswer();
    if(e.key.toLowerCase() === "x") {
      // quick force-end
      endRound({reason:"forced", message:"Round ended by host.", pointTo:null});
    }
  });

  el("endRoundBtn").onclick = () => {
    endRound({reason:"forced", message:"Round ended by host.", pointTo:null});
  };

  el("restartBtn").onclick = restartGame;
}

(async function init(){
  try{
    await loadQuestions();
    hookUI();
    updateScoreboard();
  }catch(err){
    console.error(err);
    alert("Failed to start: " + err.message);
  }
})();
