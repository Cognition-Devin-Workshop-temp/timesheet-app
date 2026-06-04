(function () {
  'use strict';

  const WINNING_COMBOS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  let board = Array(9).fill(null);
  let currentPlayer = 'X';
  let gameActive = true;
  let scores = { X: 0, O: 0, draw: 0 };

  const cells = document.querySelectorAll('.cell');
  const statusEl = document.getElementById('status');
  const restartBtn = document.getElementById('restart-btn');
  const xScoreEl = document.getElementById('x-score');
  const oScoreEl = document.getElementById('o-score');
  const drawScoreEl = document.getElementById('draw-score');

  function handleCellClick(e) {
    const index = parseInt(e.target.dataset.index, 10);

    if (board[index] !== null || !gameActive) {
      return;
    }

    board[index] = currentPlayer;
    e.target.textContent = currentPlayer;
    e.target.classList.add('taken', currentPlayer.toLowerCase());

    const winCombo = checkWin();
    if (winCombo) {
      gameActive = false;
      statusEl.textContent = 'Player ' + currentPlayer + ' wins!';
      scores[currentPlayer]++;
      updateScores();
      highlightWinningCells(winCombo);
      return;
    }

    if (board.every(function (cell) { return cell !== null; })) {
      gameActive = false;
      statusEl.textContent = "It's a draw!";
      scores.draw++;
      updateScores();
      return;
    }

    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    statusEl.textContent = "Player " + currentPlayer + "'s turn";
  }

  function checkWin() {
    for (var i = 0; i < WINNING_COMBOS.length; i++) {
      var combo = WINNING_COMBOS[i];
      var a = combo[0];
      var b = combo[1];
      var c = combo[2];
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return combo;
      }
    }
    return null;
  }

  function highlightWinningCells(combo) {
    combo.forEach(function (index) {
      cells[index].classList.add('winner');
    });
  }

  function updateScores() {
    xScoreEl.textContent = scores.X;
    oScoreEl.textContent = scores.O;
    drawScoreEl.textContent = scores.draw;
  }

  function restartGame() {
    board = Array(9).fill(null);
    currentPlayer = 'X';
    gameActive = true;
    statusEl.textContent = "Player X's turn";

    cells.forEach(function (cell) {
      cell.textContent = '';
      cell.classList.remove('taken', 'x', 'o', 'winner');
    });
  }

  cells.forEach(function (cell) {
    cell.addEventListener('click', handleCellClick);
  });

  restartBtn.addEventListener('click', restartGame);
})();
