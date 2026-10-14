/**
 * Sudoku Master — Real-time professional client
 * Flask + AJAX backend
 */

(function () {
  'use strict';

  // ---------- State ----------
  let puzzle = null;          // original given cells
  let solution = null;        // full solution
  let board = null;           // current player board (numbers)
  let notes = null;           // 9x9 array of Sets for pencil marks
  let selected = { row: 0, col: 0 };
  let difficulty = 'easy';
  let timerInterval = null;
  let seconds = 0;
  let hintsUsed = 0;
  let mistakes = 0;
  let isNotesMode = false;
  let isSolved = false;
  let isLoading = false;

  // ---------- DOM ----------
  const boardEl = document.getElementById('sudoku-board');
  const loadingOverlay = document.getElementById('loading-overlay');
  const winOverlay = document.getElementById('win-overlay');
  const timerEl = document.getElementById('timer');
  const hintsEl = document.getElementById('hints-used');
  const mistakesEl = document.getElementById('mistakes');
  const filledEl = document.getElementById('filled');
  const statusMsg = document.getElementById('status-msg');
  const diffBadge = document.getElementById('diff-badge');
  const notesToggle = document.getElementById('notes-mode');
  const numpadEl = document.getElementById('numpad');
  const winTimeEl = document.getElementById('win-time');

  // ---------- Helpers ----------
  function showToast(message, type = 'info') {
    const colors = {
      success: 'text-bg-success',
      danger: 'text-bg-danger',
      warning: 'text-bg-warning',
      info: 'text-bg-primary'
    };
    const container = document.getElementById('toast-container');
    const id = 'toast-' + Date.now();
    const html = `
      <div id="${id}" class="toast align-items-center ${colors[type] || colors.info} border-0" role="alert">
        <div class="d-flex">
          <div class="toast-body fw-medium">${message}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      </div>`;
    container.insertAdjacentHTML('beforeend', html);
    const toastEl = document.getElementById(id);
    const toast = new bootstrap.Toast(toastEl, { delay: 2800 });
    toast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
  }

  function formatTime(s) {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  function startTimer() {
    stopTimer();
    seconds = 0;
    timerEl.textContent = '00:00';
    timerInterval = setInterval(() => {
      seconds++;
      timerEl.textContent = formatTime(seconds);
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function updateStats() {
    hintsEl.textContent = hintsUsed;
    mistakesEl.textContent = mistakes;
    let filled = 0;
    if (board) {
      for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++)
          if (board[r][c] !== 0) filled++;
    }
    filledEl.textContent = `${filled} / 81`;
  }

  function setStatus(msg) {
    statusMsg.textContent = msg;
  }

  // ---------- Board rendering ----------
  function createBoardUI() {
    boardEl.innerHTML = '';
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.addEventListener('click', () => selectCell(r, c));
        boardEl.appendChild(cell);
      }
    }
  }

  function renderBoard() {
    if (!board) return;
    const cells = boardEl.querySelectorAll('.cell');
    cells.forEach(cell => {
      const r = +cell.dataset.row;
      const c = +cell.dataset.col;
      const val = board[r][c];
      const isGiven = puzzle[r][c] !== 0;

      cell.className = 'cell';
      if (isGiven) cell.classList.add('given');
      else if (val !== 0) cell.classList.add('user');

      // Notes display
      if (val === 0 && notes[r][c].size > 0) {
        cell.innerHTML = `<div class="notes-grid" style="display:grid;grid-template-columns:repeat(3,1fr);width:100%;height:100%;font-size:0.55em;line-height:1;color:#94a3b8;padding:2px;">
          ${[1,2,3,4,5,6,7,8,9].map(n => `<span style="display:flex;align-items:center;justify-content:center;">${notes[r][c].has(n) ? n : ''}</span>`).join('')}
        </div>`;
      } else {
        cell.textContent = val === 0 ? '' : val;
      }

      // Selection & highlights
      if (r === selected.row && c === selected.col) {
        cell.classList.add('selected');
      } else if (val !== 0 && val === board[selected.row][selected.col] && board[selected.row][selected.col] !== 0) {
        cell.classList.add('highlight-same');
      } else if (r === selected.row || c === selected.col ||
                 (Math.floor(r / 3) === Math.floor(selected.row / 3) && Math.floor(c / 3) === Math.floor(selected.col / 3))) {
        cell.classList.add('highlight-related');
      }
    });
    updateStats();
  }

  function selectCell(row, col) {
    if (isSolved) return;
    selected = { row, col };
    renderBoard();
  }

  function placeNumber(num) {
    if (isSolved || isLoading) return;
    const { row, col } = selected;
    if (puzzle[row][col] !== 0) return; // given cell

    if (isNotesMode) {
      if (board[row][col] !== 0) return;
      if (notes[row][col].has(num)) notes[row][col].delete(num);
      else notes[row][col].add(num);
      renderBoard();
      return;
    }

    // Clear notes when placing a real number
    notes[row][col].clear();
    board[row][col] = num;

    // Live validation against solution
    if (num !== 0 && solution && num !== solution[row][col]) {
      mistakes++;
      const cell = boardEl.querySelector(`[data-row="${row}"][data-col="${col}"]`);
      if (cell) {
        cell.classList.add('error');
        setTimeout(() => cell.classList.remove('error'), 400);
      }
      showToast('Incorrect number', 'danger');
    }

    renderBoard();
    checkWin();
  }

  function eraseCell() {
    if (isSolved) return;
    const { row, col } = selected;
    if (puzzle[row][col] !== 0) return;
    board[row][col] = 0;
    notes[row][col].clear();
    renderBoard();
  }

  function checkWin() {
    if (!board || !solution) return;
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (board[r][c] !== solution[r][c]) return;

    // Won!
    isSolved = true;
    stopTimer();
    winTimeEl.textContent = formatTime(seconds);
    winOverlay.classList.remove('hidden');
    setStatus('Puzzle completed!');
    showToast('Congratulations! Puzzle solved 🎉', 'success');
  }

  // ---------- API calls (AJAX) ----------
  async function generatePuzzle(diff = difficulty) {
    if (isLoading) return;
    isLoading = true;
    loadingOverlay.classList.remove('hidden');
    winOverlay.classList.add('hidden');
    setStatus('Generating puzzle…');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ difficulty: diff })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Generation failed');

      puzzle = data.puzzle.map(row => [...row]);
      solution = data.solution.map(row => [...row]);
      board = data.puzzle.map(row => [...row]);
      notes = Array.from({ length: 9 }, () =>
        Array.from({ length: 9 }, () => new Set())
      );
      difficulty = data.difficulty;
      isSolved = false;
      hintsUsed = 0;
      mistakes = 0;
      selected = { row: 0, col: 0 };

      diffBadge.textContent = difficulty.toUpperCase();
      const badgeColors = {
        easy: 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40',
        medium: 'bg-blue-600/30 text-blue-300 border-blue-500/40',
        hard: 'bg-amber-600/30 text-amber-300 border-amber-500/40',
        expert: 'bg-rose-600/30 text-rose-300 border-rose-500/40'
      };
      diffBadge.className = `px-3 py-1 rounded-full text-xs font-semibold border ${badgeColors[difficulty] || badgeColors.medium}`;

      renderBoard();
      startTimer();
      setStatus('Puzzle ready — good luck!');
      showToast(`${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} puzzle generated`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate puzzle. Try again.', 'danger');
      setStatus('Generation failed');
    } finally {
      isLoading = false;
      loadingOverlay.classList.add('hidden');
    }
  }

  async function checkProgress() {
    if (!board || !solution || isSolved) return;
    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board, solution })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // Highlight errors
      const cells = boardEl.querySelectorAll('.cell');
      cells.forEach(c => c.classList.remove('error'));
      data.errors.forEach(({ row, col }) => {
        const cell = boardEl.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (cell) cell.classList.add('error');
      });

      if (data.complete) {
        checkWin();
      } else if (data.errors.length === 0) {
        showToast('Looking good so far! Keep going.', 'success');
        setStatus('No errors found');
      } else {
        showToast(`${data.errors.length} incorrect cell(s) highlighted`, 'warning');
        setStatus(`${data.errors.length} mistake(s) found`);
        // Clear error highlights after a moment
        setTimeout(() => {
          cells.forEach(c => c.classList.remove('error'));
        }, 1800);
      }
    } catch (err) {
      showToast('Check failed', 'danger');
    }
  }

  async function getHint() {
    if (!board || !solution || isSolved) return;
    try {
      const res = await fetch('/api/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board, solution })
      });
      const data = await res.json();
      if (!data.success) {
        showToast(data.error || 'No hint available', 'warning');
        return;
      }

      const { row, col, value } = data;
      board[row][col] = value;
      notes[row][col].clear();
      hintsUsed++;
      selected = { row, col };

      const cell = boardEl.querySelector(`[data-row="${row}"][data-col="${col}"]`);
      if (cell) {
        cell.classList.add('hint');
        setTimeout(() => cell.classList.remove('hint'), 700);
      }

      renderBoard();
      showToast(`Hint: ${value} placed`, 'info');
      setStatus('Hint used');
      checkWin();
    } catch (err) {
      showToast('Hint request failed', 'danger');
    }
  }

  async function revealSolution() {
    if (!solution || isSolved) return;
    if (!confirm('Reveal the full solution? This will end the current game.')) return;

    board = solution.map(row => [...row]);
    isSolved = true;
    stopTimer();
    renderBoard();
    setStatus('Solution revealed');
    showToast('Solution revealed', 'warning');
  }

  function resetBoard() {
    if (!puzzle) return;
    if (!confirm('Reset the board to the original puzzle?')) return;
    board = puzzle.map(row => [...row]);
    notes = Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => new Set())
    );
    isSolved = false;
    hintsUsed = 0;
    mistakes = 0;
    winOverlay.classList.add('hidden');
    startTimer();
    renderBoard();
    setStatus('Board reset');
    showToast('Board reset to start', 'info');
  }

  // ---------- Numpad ----------
  function buildNumpad() {
    numpadEl.innerHTML = '';
    for (let n = 1; n <= 9; n++) {
      const btn = document.createElement('button');
      btn.className = 'numpad-btn btn btn-outline-light border-slate-600 text-slate-200 hover:bg-blue-600 hover:border-blue-500';
      btn.textContent = n;
      btn.addEventListener('click', () => placeNumber(n));
      numpadEl.appendChild(btn);
    }
  }

  // ---------- Event listeners ----------
  document.getElementById('btn-new').addEventListener('click', () => generatePuzzle(difficulty));
  document.getElementById('btn-check').addEventListener('click', checkProgress);
  document.getElementById('btn-hint').addEventListener('click', getHint);
  document.getElementById('btn-solve').addEventListener('click', revealSolution);
  document.getElementById('btn-reset').addEventListener('click', resetBoard);
  document.getElementById('btn-erase').addEventListener('click', eraseCell);
  document.getElementById('btn-play-again').addEventListener('click', () => generatePuzzle(difficulty));

  // Difficulty buttons
  document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      difficulty = btn.dataset.diff;
    });
  });

  // Notes mode
  notesToggle.addEventListener('change', () => {
    isNotesMode = notesToggle.checked;
    setStatus(isNotesMode ? 'Notes mode ON' : 'Notes mode OFF');
  });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (isLoading || isSolved) return;
    const key = e.key;

    if (key >= '1' && key <= '9') {
      placeNumber(parseInt(key, 10));
      e.preventDefault();
    } else if (key === 'Backspace' || key === 'Delete' || key === '0') {
      eraseCell();
      e.preventDefault();
    } else if (key === 'ArrowUp') {
      selectCell(Math.max(0, selected.row - 1), selected.col);
      e.preventDefault();
    } else if (key === 'ArrowDown') {
      selectCell(Math.min(8, selected.row + 1), selected.col);
      e.preventDefault();
    } else if (key === 'ArrowLeft') {
      selectCell(selected.row, Math.max(0, selected.col - 1));
      e.preventDefault();
    } else if (key === 'ArrowRight') {
      selectCell(selected.row, Math.min(8, selected.col + 1));
      e.preventDefault();
    } else if (key.toLowerCase() === 'n') {
      isNotesMode = !isNotesMode;
      notesToggle.checked = isNotesMode;
      setStatus(isNotesMode ? 'Notes mode ON' : 'Notes mode OFF');
      e.preventDefault();
    } else if (key.toLowerCase() === 'h') {
      getHint();
      e.preventDefault();
    } else if (key.toLowerCase() === 'c') {
      checkProgress();
      e.preventDefault();
    }
  });

  // ---------- Init ----------
  createBoardUI();
  buildNumpad();
  // Start with an easy puzzle on load
  generatePuzzle('easy');
})();
