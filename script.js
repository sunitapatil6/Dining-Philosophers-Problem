/**
 * Dining Philosophers Problem - Core Interactive Scripts
 * Pure vanilla JavaScript - no external dependencies or server needed.
 */

document.addEventListener('DOMContentLoaded', () => {
  // ----------------------------------------------------
  // 1. Navigation & Smooth Scrolling
  // ----------------------------------------------------
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  const allNavAnchors = document.querySelectorAll('.nav-link');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });

    allNavAnchors.forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
      });
    });
  }

  // Active link highlight on scroll
  const sections = document.querySelectorAll('section[id]');
  window.addEventListener('scroll', () => {
    const scrollY = window.pageYOffset;
    sections.forEach(current => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - 120;
      const sectionId = current.getAttribute('id');
      const navAnchor = document.querySelector(`.nav-link[href*="${sectionId}"]`);
      if (navAnchor) {
        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
          navAnchor.classList.add('active');
        } else {
          navAnchor.classList.remove('active');
        }
      }
    });
  });

  // ----------------------------------------------------
  // 2. Interactive Simulation Engine
  // ----------------------------------------------------
  const NUM_PHILOSOPHERS = 5;
  const STATE_THINKING = 'THINKING';
  const STATE_HUNGRY = 'HUNGRY';
  const STATE_WAITING = 'WAITING';
  const STATE_EATING = 'EATING';

  // Chopstick states: null = AVAILABLE, or philosopher index [0..4] = IN USE
  let chopsticks = [null, null, null, null, null];
  
  // Philosophers states
  let philosophers = [
    { id: 0, state: STATE_THINKING, eatTimeRemaining: 0, thinkTimeRemaining: 3 },
    { id: 1, state: STATE_THINKING, eatTimeRemaining: 0, thinkTimeRemaining: 5 },
    { id: 2, state: STATE_THINKING, eatTimeRemaining: 0, thinkTimeRemaining: 2 },
    { id: 3, state: STATE_THINKING, eatTimeRemaining: 0, thinkTimeRemaining: 4 },
    { id: 4, state: STATE_THINKING, eatTimeRemaining: 0, thinkTimeRemaining: 6 }
  ];

  let simTimer = null;
  let isRunning = false;
  let isDeadlockMode = false;
  let simSpeedMs = 1500;

  // DOM Elements
  const btnStartSim = document.getElementById('btnStartSim');
  const btnPauseSim = document.getElementById('btnPauseSim');
  const btnResetSim = document.getElementById('btnResetSim');
  const btnNextStep = document.getElementById('btnNextStep');
  const btnDeadlock = document.getElementById('btnDeadlock');
  const speedSelect = document.getElementById('speedSelect');
  const statusLogList = document.getElementById('statusLogList');
  const btnClearLogs = document.getElementById('btnClearLogs');
  const deadlockAlert = document.getElementById('deadlockAlert');

  // SVG Node Elements
  const philCircles = [];
  const philStateLabels = [];
  const chopstickLines = [];
  const chopstickLabels = [];

  for (let i = 0; i < NUM_PHILOSOPHERS; i++) {
    philCircles.push(document.getElementById(`sim-phil-${i}`));
    philStateLabels.push(document.getElementById(`sim-phil-state-${i}`));
    chopstickLines.push(document.getElementById(`sim-chop-${i}`));
    chopstickLabels.push(document.getElementById(`sim-chop-label-${i}`));
  }

  function addLogMessage(msg, type = 'normal') {
    if (!statusLogList) return;
    const li = document.createElement('li');
    li.className = `status-log-item ${type}`;
    const timeStr = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    li.textContent = `[${timeStr}] ${msg}`;
    statusLogList.insertBefore(li, statusLogList.firstChild);

    // Limit log size to 30 entries
    while (statusLogList.children.length > 30) {
      statusLogList.removeChild(statusLogList.lastChild);
    }
  }

  if (btnClearLogs) {
    btnClearLogs.addEventListener('click', () => {
      if (statusLogList) statusLogList.innerHTML = '';
    });
  }

  // Render Visual State in SVG
  function updateVisuals() {
    // 1. Update Philosophers
    philosophers.forEach((p, i) => {
      const circle = philCircles[i];
      const label = philStateLabels[i];
      if (!circle || !label) return;

      label.textContent = p.state;

      // Reset classes & attributes
      circle.classList.remove('pulse-eat');
      
      switch (p.state) {
        case STATE_THINKING:
          circle.setAttribute('fill', '#eff6ff');
          circle.setAttribute('stroke', '#3b82f6');
          label.setAttribute('fill', '#1d4ed8');
          break;
        case STATE_HUNGRY:
          circle.setAttribute('fill', '#fffbeb');
          circle.setAttribute('stroke', '#f59e0b');
          label.setAttribute('fill', '#b45309');
          break;
        case STATE_WAITING:
          circle.setAttribute('fill', '#fef2f2');
          circle.setAttribute('stroke', '#ef4444');
          label.setAttribute('fill', '#b91c1c');
          break;
        case STATE_EATING:
          circle.setAttribute('fill', '#ecfdf5');
          circle.setAttribute('stroke', '#10b981');
          label.setAttribute('fill', '#047857');
          circle.classList.add('pulse-eat');
          break;
      }
    });

    // 2. Update Chopsticks
    chopsticks.forEach((owner, i) => {
      const line = chopstickLines[i];
      const text = chopstickLabels[i];
      if (!line || !text) return;

      if (owner === null) {
        line.setAttribute('stroke', '#94a3b8');
        line.setAttribute('stroke-width', '4');
        line.setAttribute('stroke-dasharray', 'none');
        text.textContent = `C${i}: Avail`;
        text.setAttribute('fill', '#64748b');
      } else {
        line.setAttribute('stroke', '#d97706');
        line.setAttribute('stroke-width', '7');
        text.textContent = `C${i}: (P${owner})`;
        text.setAttribute('fill', '#b45309');
      }
    });
  }

  // Simulation Single Step Logic
  function executeSimulationStep() {
    if (isDeadlockMode) return;

    // Shuffle iteration order slightly to prevent rigid priority bias
    const indices = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5);

    for (let i of indices) {
      const p = philosophers[i];
      const leftChop = i;
      const rightChop = (i + 1) % NUM_PHILOSOPHERS;

      if (p.state === STATE_THINKING) {
        p.thinkTimeRemaining--;
        if (p.thinkTimeRemaining <= 0) {
          p.state = STATE_HUNGRY;
          addLogMessage(`P${i} is hungry`, 'hungry');
        }
      } 
      else if (p.state === STATE_HUNGRY || p.state === STATE_WAITING) {
        // Try to pick up BOTH chopsticks
        if (chopsticks[leftChop] === null && chopsticks[rightChop] === null) {
          chopsticks[leftChop] = i;
          chopsticks[rightChop] = i;
          p.state = STATE_EATING;
          p.eatTimeRemaining = Math.floor(Math.random() * 3) + 2; // 2-4 ticks
          addLogMessage(`P${i} picked up C${leftChop} and C${rightChop} → EATING`, 'eating');
        } else {
          if (p.state !== STATE_WAITING) {
            p.state = STATE_WAITING;
            const waitingFor = [];
            if (chopsticks[leftChop] !== null) waitingFor.push(`C${leftChop}`);
            if (chopsticks[rightChop] !== null) waitingFor.push(`C${rightChop}`);
            addLogMessage(`P${i} is WAITING for chopstick(s) ${waitingFor.join(', ')}`);
          }
        }
      } 
      else if (p.state === STATE_EATING) {
        p.eatTimeRemaining--;
        if (p.eatTimeRemaining <= 0) {
          // Finished eating: put down both chopsticks
          chopsticks[leftChop] = null;
          chopsticks[rightChop] = null;
          p.state = STATE_THINKING;
          p.thinkTimeRemaining = Math.floor(Math.random() * 4) + 2; // 2-5 ticks
          addLogMessage(`P${i} finished eating, released C${leftChop} and C${rightChop} → THINKING`);
        }
      }
    }

    updateVisuals();
  }

  function startSimulation() {
    if (isRunning) return;
    if (isDeadlockMode) resetSimulation();
    isRunning = true;
    btnStartSim.disabled = true;
    btnPauseSim.disabled = false;
    btnDeadlock.disabled = false;
    addLogMessage('Simulation started.');
    simTimer = setInterval(executeSimulationStep, simSpeedMs);
  }

  function pauseSimulation() {
    if (!isRunning) return;
    isRunning = false;
    clearInterval(simTimer);
    simTimer = null;
    btnStartSim.disabled = false;
    btnPauseSim.disabled = true;
    addLogMessage('Simulation paused.');
  }

  function resetSimulation() {
    pauseSimulation();
    isDeadlockMode = false;
    chopsticks = [null, null, null, null, null];
    philosophers = [
      { id: 0, state: STATE_THINKING, eatTimeRemaining: 0, thinkTimeRemaining: 3 },
      { id: 1, state: STATE_THINKING, eatTimeRemaining: 0, thinkTimeRemaining: 4 },
      { id: 2, state: STATE_THINKING, eatTimeRemaining: 0, thinkTimeRemaining: 2 },
      { id: 3, state: STATE_THINKING, eatTimeRemaining: 0, thinkTimeRemaining: 5 },
      { id: 4, state: STATE_THINKING, eatTimeRemaining: 0, thinkTimeRemaining: 3 }
    ];
    if (deadlockAlert) deadlockAlert.classList.remove('visible');
    updateVisuals();
    addLogMessage('Simulation reset to initial state.');
  }

  function demonstrateDeadlock() {
    pauseSimulation();
    isDeadlockMode = true;

    // Every philosopher i picks up left chopstick i and is waiting for right chopstick (i+1)%5
    for (let i = 0; i < NUM_PHILOSOPHERS; i++) {
      philosophers[i].state = STATE_WAITING;
      chopsticks[i] = i; // P[i] holds C[i]
    }

    updateVisuals();

    if (deadlockAlert) {
      deadlockAlert.classList.add('visible');
    }

    addLogMessage('⚠️ DEADLOCK OCCURRED! All 5 philosophers picked up their left chopstick.', 'deadlock');
    addLogMessage('P0 holds C0, waiting for C1 (held by P1)', 'deadlock');
    addLogMessage('P1 holds C1, waiting for C2 (held by P2)', 'deadlock');
    addLogMessage('P2 holds C2, waiting for C3 (held by P3)', 'deadlock');
    addLogMessage('P3 holds C3, waiting for C4 (held by P4)', 'deadlock');
    addLogMessage('P4 holds C4, waiting for C0 (held by P0)', 'deadlock');
    addLogMessage('❌ Circular wait detected: No philosopher can proceed!', 'deadlock');

    btnStartSim.disabled = false;
    btnPauseSim.disabled = true;
  }

  // Allow student to click on any philosopher to toggle state
  philosophers.forEach((p, i) => {
    const node = document.getElementById(`sim-phil-group-${i}`);
    if (node) {
      node.addEventListener('click', () => {
        if (isDeadlockMode) return;
        if (p.state === STATE_THINKING) {
          p.state = STATE_HUNGRY;
          addLogMessage(`[Manual] Toggled P${i} to HUNGRY`, 'hungry');
        } else if (p.state === STATE_HUNGRY || p.state === STATE_WAITING) {
          p.state = STATE_THINKING;
          addLogMessage(`[Manual] Toggled P${i} to THINKING`);
        }
        updateVisuals();
      });
    }
  });

  // Simulation Event Listeners
  if (btnStartSim) btnStartSim.addEventListener('click', startSimulation);
  if (btnPauseSim) btnPauseSim.addEventListener('click', pauseSimulation);
  if (btnResetSim) btnResetSim.addEventListener('click', resetSimulation);
  if (btnNextStep) btnNextStep.addEventListener('click', () => {
    pauseSimulation();
    executeSimulationStep();
  });
  if (btnDeadlock) btnDeadlock.addEventListener('click', demonstrateDeadlock);

  if (speedSelect) {
    speedSelect.addEventListener('change', (e) => {
      simSpeedMs = parseInt(e.target.value, 10);
      if (isRunning) {
        clearInterval(simTimer);
        simTimer = setInterval(executeSimulationStep, simSpeedMs);
      }
    });
  }

  // Initial draw
  updateVisuals();

  // ----------------------------------------------------
  // 3. Step-by-Step Example Walkthrough (Section 12)
  // ----------------------------------------------------
  const exampleSteps = [
    {
      title: "Step 1: Initial State",
      desc: "All five philosophers are in the THINKING state. All five chopsticks (C0, C1, C2, C3, C4) are on the table and AVAILABLE.",
      p0: "THINKING",
      p1: "THINKING",
      p2: "THINKING",
      p3: "THINKING",
      p4: "THINKING",
      chopsticks: "All Available"
    },
    {
      title: "Step 2: P0 becomes HUNGRY",
      desc: "Philosopher P0 finishes thinking and transitions to HUNGRY. P0 needs chopstick C0 (left) and chopstick C1 (right) to eat.",
      p0: "HUNGRY",
      p1: "THINKING",
      p2: "THINKING",
      p3: "THINKING",
      p4: "THINKING",
      chopsticks: "All Available"
    },
    {
      title: "Step 3: P0 picks up C0 and C1",
      desc: "Both C0 and C1 are currently available. P0 executes PICKUP(C0, C1). C0 and C1 become IN USE.",
      p0: "ACQUIRING",
      p1: "THINKING",
      p2: "THINKING",
      p3: "THINKING",
      p4: "THINKING",
      chopsticks: "C0 (P0), C1 (P0)"
    },
    {
      title: "Step 4: P0 starts EATING",
      desc: "With both chopsticks acquired, P0 is now in the EATING state. Neighbors P4 and P1 cannot eat right now because C0 and C1 are occupied.",
      p0: "EATING",
      p1: "THINKING",
      p2: "THINKING",
      p3: "THINKING",
      p4: "THINKING",
      chopsticks: "C0 (P0), C1 (P0)"
    },
    {
      title: "Step 5: P0 finishes eating",
      desc: "P0 finishes its meal and prepares to release the resources.",
      p0: "FINISHING",
      p1: "THINKING",
      p2: "THINKING",
      p3: "THINKING",
      p4: "THINKING",
      chopsticks: "C0 (P0), C1 (P0)"
    },
    {
      title: "Step 6: P0 puts down C0 and C1",
      desc: "P0 executes PUTDOWN(C0, C1). Both chopsticks are placed back on the table and become AVAILABLE for neighbors.",
      p0: "RELEASING",
      p1: "THINKING",
      p2: "THINKING",
      p3: "THINKING",
      p4: "THINKING",
      chopsticks: "All Available"
    },
    {
      title: "Step 7: P0 starts THINKING",
      desc: "P0 transitions back to THINKING. The process synchronization cycle completes successfully.",
      p0: "THINKING",
      p1: "THINKING",
      p2: "THINKING",
      p3: "THINKING",
      p4: "THINKING",
      chopsticks: "All Available"
    }
  ];

  let currentStepIdx = 0;
  const stepIndicator = document.getElementById('stepIndicator');
  const stepHeading = document.getElementById('stepHeading');
  const stepDesc = document.getElementById('stepDesc');
  const stepStateDisplay = document.getElementById('stepStateDisplay');
  const btnPrevStep = document.getElementById('btnPrevStep');
  const btnNextExampleStep = document.getElementById('btnNextExampleStep');

  function renderExampleStep() {
    const s = exampleSteps[currentStepIdx];
    if (stepIndicator) stepIndicator.textContent = `Step ${currentStepIdx + 1} of ${exampleSteps.length}`;
    if (stepHeading) stepHeading.textContent = s.title;
    if (stepDesc) stepDesc.textContent = s.desc;

    if (btnPrevStep) btnPrevStep.disabled = currentStepIdx === 0;
    if (btnNextExampleStep) btnNextExampleStep.disabled = currentStepIdx === exampleSteps.length - 1;

    if (stepStateDisplay) {
      stepStateDisplay.innerHTML = `
        <div class="step-phil-chip" style="background:${getChipBg(s.p0)}; color:${getChipColor(s.p0)}">P0: ${s.p0}</div>
        <div class="step-phil-chip" style="background:#eff6ff; color:#1d4ed8">P1: ${s.p1}</div>
        <div class="step-phil-chip" style="background:#eff6ff; color:#1d4ed8">P2: ${s.p2}</div>
        <div class="step-phil-chip" style="background:#eff6ff; color:#1d4ed8">P3: ${s.p3}</div>
        <div class="step-phil-chip" style="background:#eff6ff; color:#1d4ed8">P4: ${s.p4}</div>
        <div class="step-phil-chip" style="background:#f1f5f9; color:#475569; border: 1px solid #cbd5e1">Chopsticks: ${s.chopsticks}</div>
      `;
    }
  }

  function getChipBg(state) {
    if (state === 'EATING') return '#ecfdf5';
    if (state === 'HUNGRY' || state === 'ACQUIRING') return '#fffbeb';
    if (state === 'FINISHING' || state === 'RELEASING') return '#f3e8ff';
    return '#eff6ff';
  }

  function getChipColor(state) {
    if (state === 'EATING') return '#047857';
    if (state === 'HUNGRY' || state === 'ACQUIRING') return '#b45309';
    if (state === 'FINISHING' || state === 'RELEASING') return '#7e22ce';
    return '#1d4ed8';
  }

  if (btnPrevStep) {
    btnPrevStep.addEventListener('click', () => {
      if (currentStepIdx > 0) {
        currentStepIdx--;
        renderExampleStep();
      }
    });
  }

  if (btnNextExampleStep) {
    btnNextExampleStep.addEventListener('click', () => {
      if (currentStepIdx < exampleSteps.length - 1) {
        currentStepIdx++;
        renderExampleStep();
      }
    });
  }

  renderExampleStep();

  // ----------------------------------------------------
  // 4. Interactive Quiz Engine (Section 14)
  // ----------------------------------------------------
  const quizAnswers = {
    q1: 'C',
    q2: 'C',
    q3: 'B',
    q4: 'B',
    q5: 'B'
  };

  const userQuizState = {
    q1: null,
    q2: null,
    q3: null,
    q4: null,
    q5: null
  };

  const quizOptionBtns = document.querySelectorAll('.quiz-option-btn');
  const quizScoreSpan = document.getElementById('quizScoreSpan');
  const btnResetQuiz = document.getElementById('btnResetQuiz');

  quizOptionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const qId = btn.getAttribute('data-q');
      const selectedOption = btn.getAttribute('data-option');
      const correctOption = quizAnswers[qId];

      if (userQuizState[qId] !== null) return; // Already answered

      userQuizState[qId] = selectedOption;

      // Highlight options
      const siblings = document.querySelectorAll(`.quiz-option-btn[data-q="${qId}"]`);
      siblings.forEach(sib => {
        sib.disabled = true;
        const sibOption = sib.getAttribute('data-option');
        if (sibOption === correctOption) {
          sib.classList.add('correct');
        } else if (sibOption === selectedOption && selectedOption !== correctOption) {
          sib.classList.add('incorrect');
        }
      });

      // Feedback message
      const feedbackEl = document.getElementById(`feedback-${qId}`);
      if (feedbackEl) {
        if (selectedOption === correctOption) {
          feedbackEl.textContent = '✓ Correct!';
          feedbackEl.className = 'quiz-feedback show-correct';
        } else {
          feedbackEl.textContent = `✗ Incorrect! The correct answer is ${correctOption}.`;
          feedbackEl.className = 'quiz-feedback show-incorrect';
        }
      }

      updateQuizScore();
    });
  });

  function updateQuizScore() {
    let score = 0;
    let answeredCount = 0;
    for (const [qId, ans] of Object.entries(userQuizState)) {
      if (ans !== null) {
        answeredCount++;
        if (ans === quizAnswers[qId]) score++;
      }
    }
    if (quizScoreSpan) {
      quizScoreSpan.textContent = `Score: ${score} / 5 (Answered ${answeredCount}/5)`;
    }
  }

  if (btnResetQuiz) {
    btnResetQuiz.addEventListener('click', () => {
      for (const qId in userQuizState) {
        userQuizState[qId] = null;
        const feedbackEl = document.getElementById(`feedback-${qId}`);
        if (feedbackEl) {
          feedbackEl.textContent = '';
          feedbackEl.className = 'quiz-feedback';
        }
      }
      quizOptionBtns.forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('correct', 'incorrect');
      });
      if (quizScoreSpan) quizScoreSpan.textContent = 'Score: 0 / 5';
    });
  }
});
