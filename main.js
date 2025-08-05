let funds = 500;
const betValues = [50, 100, 150];
let currentBet = null;


let deckCount = 8;

let dealerCardsState = []; // {value, file, revealed}
let playerCardsState = []; // {value, file, revealed}

function calcPoints(cards) {
  let sum = 0;
  let aces = 0;

  for (let card of cards) {
    if (!card.value) continue;
    if (card.value === 'ace') {
      aces++;
      sum += 1;
    } else if (['jack', 'queen', 'king'].includes(card.value)) {
      sum += 10;
    } else {
      sum += Number(card.value);
    }
  }
  let points = [sum];
  if (aces > 0) {
    for (let i = 1; i <= aces; i++) {
      let variant = sum + i * 10;
      if (variant <= 21) points.push(variant);
    }
  }

  points = [...new Set(points)].sort((a, b) => a - b);
  // Jeśli max = 21, pokazuj tylko 21!
  const max = points[points.length - 1];
  if (max === 21) return '21';
  if (points.length > 1) return points[0] + ' / ' + max;
  else return String(points[0]);
}

function updateDealerScore() {
  const el = document.getElementById('dealer-score');
  const ptsStr = calcPoints(dealerCardsState.filter(c => c.revealed));
  el.textContent = ptsStr;

  const ptsArr = ptsStr.split('/').map(x => +x.trim());
  const max = Math.max(...ptsArr);

  el.classList.remove('success', 'fail', 'draw');
  if (max === 21) el.classList.add('success');
  else if (max > 21) el.classList.add('fail');
}


function updatePlayerScore(active = false) {
  const el = document.getElementById('player-score');
  const ptsStr = calcPoints(playerCardsState);
  el.textContent = ptsStr;

  // Wyciągamy wszystkie możliwe wartości (dla asów)
  const ptsArr = ptsStr.split('/').map(x => +x.trim());
  const max = Math.max(...ptsArr);

  el.classList.remove('success', 'fail');
  if (max === 21) {
    el.classList.add('success');
  } else if (max > 21) {
    el.classList.add('fail');
  }

  if (active) {
    if (max === 21) {
      setPlayerActionsActive(false);
      setTimeout(() => {
        dealerTurn();
      }, 600);
    } else if (max > 21) {
      setPlayerActionsActive(false);
      showEndMessage(false);
    } else {
      setPlayerActionsActive(true);
    }
  }

}

function showEndMessage(win) {
  const overlay = document.getElementById('message-overlay');
  let txt, cls;
  if (win === true) { txt = 'WYGRANA!'; cls = 'win'; }
  else if (win === false) { txt = 'PRZEGRANA'; cls = 'lose'; }
  else { txt = 'REMIS'; cls = 'draw'; }

  overlay.innerHTML = `<div class="msg-text">${txt}</div>`;
  overlay.className = 'visible ' + cls;

  if (win === true && currentBet) {
    funds += currentBet * 2;
    updateFundsBox();
  } else if (win === null && currentBet) {
    funds += currentBet;
    updateFundsBox();
  }

  setTimeout(() => {
    overlay.classList.remove('visible');
    overlay.innerHTML = '';
    setTimeout(() => {
      showBetModal();
      setupBetButtons();
      clearDealerCards();
      clearPlayerCards();
      updateDealerScore();
      updatePlayerScore();
      setPlayerActionsActive(false);
      currentBet = null;
      updateBetBox();
      document.getElementById('dealer-score').classList.remove('draw');
      document.getElementById('player-score').classList.remove('draw');
    }, 1200);
  }, 1800);
}

function extractValue(filename) {
  let name = filename.split('_')[0];
  if (['jack','queen','king','ace'].includes(name)) return name;
  return Number(name);
}


function renderCardDeck() {
  const deckDiv = document.getElementById('card-deck');
  deckDiv.innerHTML = '';
  for (let i = 0; i < deckCount; i++) {
    const card = document.createElement('img');
    card.src = 'assets/cards/back_of_card.png';
    card.className = 'deck-card';
    card.style.zIndex = i;
    deckDiv.appendChild(card);
  }
}

function showBetModal() {
  setupBetButtons();
  const modal = document.getElementById('bet-modal');
  const fundsValue = document.getElementById('funds-value');
  fundsValue.textContent = funds;

  document.querySelectorAll('.bet-btn').forEach(btn => {
    const value = parseInt(btn.getAttribute('data-bet'));
    if (funds < value) {
      btn.disabled = true;
      btn.classList.add('disabled');
    } else {
      btn.disabled = false;
      btn.classList.remove('disabled');
    }
  });

  modal.style.display = 'flex';
  setTimeout(() => {
    modal.classList.add('visible');
  }, 30);
}

function setupBetButtons() {
  document.querySelectorAll('.bet-btn').forEach(btn => {
    btn.onclick = async () => {
      const bet = parseInt(btn.getAttribute('data-bet'));
      if (bet <= funds) {
        funds -= bet;
        currentBet = bet;
        updateBetBox();
        // Fade-out modal
        const modal = document.getElementById('bet-modal');
        modal.classList.remove('visible');
        setTimeout(() => {
          modal.style.display = 'none';
        }, 500);

        await startGame();
      }
    };
  });
}

function clearDealerCards() {
  document.getElementById('dealer-cards').innerHTML = '';
  dealerCardsState = [];
}

function clearPlayerCards() {
  document.getElementById('player-cards').innerHTML = '';
  playerCardsState = [];
}

function randomCard() {
  const faces = ['ace', 'jack', 'queen', 'king'];
  const value = Math.floor(Math.random() * (13 - 2 + 1)) + 2;
  console.log(value);
  
  return value >= 2 && value <= 10
    ? `${value}_of_clubs.png`
    : `${faces[value - 11]}_of_clubs.png`;
}

function createDealerCard({front, back = 'back_of_card.png', revealed = false}) {
  const card = document.createElement('div');
  card.className = 'dealer-card';
  card.innerHTML = `
    <img class="card-face card-front" src="assets/cards/${front}">
    <img class="card-face card-back" src="assets/cards/${back}">
  `;
  card.style.transform = `translateX(-50%) rotateY(${revealed ? 180 : 0}deg)`;
  return card;
}

function layoutDealerCards() {
  const dealerCards = Array.from(document.querySelectorAll('#dealer-cards .dealer-card'));
  if (dealerCards.length === 0) return;

  const container = dealerCards[0].parentElement;
  const widths = dealerCards.map(card => card.offsetWidth);
  const spacing = container.offsetWidth * 0.01; // 1vw in px

  const totalWidth =
    widths.reduce((acc, w) => acc + w, 0) +
    spacing * (dealerCards.length - 1);

  if (dealerCards.length === 1) return;

  let start = container.offsetWidth / 2 - totalWidth / 2;

  dealerCards.forEach((card, i) => {
    card.style.transition = 'left 0.5s, transform 0.5s';
    card.style.left = `${start}px`;
    card.style.top = `0`;
    card.style.transform = card.classList.contains('revealed')
      ? 'rotateY(180deg)'
      : 'rotateY(0deg)';
    card.style.zIndex = 10 + i;
    start += widths[i] + spacing;
  });
}

function layoutPlayerCards() {
  const playerCards = Array.from(document.querySelectorAll('#player-cards .player-card'));
  if (playerCards.length === 0) return;

  const container = playerCards[0].parentElement;
  const widths = playerCards.map(card => card.offsetWidth);
  const spacing = container.offsetWidth * 0.01; // 1vw in px

  const totalWidth =
    widths.reduce((acc, w) => acc + w, 0) +
    spacing * (playerCards.length - 1);

  if (playerCards.length === 1) return;

  let start = container.offsetWidth / 2 - totalWidth / 2;

  playerCards.forEach((card, i) => {
    card.style.transition = 'left 0.5s, transform 0.5s';
    card.style.left = `${start}px`;
    card.style.top = `0`;
    card.style.transform = card.classList.contains('revealed')
      ? 'rotateY(180deg)'
      : 'rotateY(0deg)';
    card.style.zIndex = 10 + i;
    start += widths[i] + spacing;
  });
}

async function animateDealerCard({reveal = true, delay = 0}) {
  const dealerCardsBox = document.getElementById('dealer-cards');
  const cardName = randomCard();

  const card = createDealerCard({front: cardName, revealed: false});
  card.style.zIndex = 1000;
  document.body.appendChild(card);

  const deck = document.getElementById('card-deck');
  const deckRect = deck.getBoundingClientRect();
  card.style.position = 'fixed';
  card.style.left = `${deckRect.left + deckRect.width/2 - card.offsetWidth/2}px`;
  card.style.top = `${deckRect.top + deckRect.height/2 - card.offsetHeight/2}px`;
  card.style.transform = 'rotateY(0deg)';
  card.style.transition = 'none';

  await new Promise(r => setTimeout(r, delay));

  const viewportWidth = window.innerWidth;
  const centerX = viewportWidth / 2 - card.offsetWidth / 2;
  const centerY = window.innerHeight / 2 - card.offsetHeight / 2;

  card.style.transition = 'left 0.45s cubic-bezier(.4,2,.6,1), top 0.45s cubic-bezier(.4,2,.6,1)';
  card.style.left = `${centerX}px`;
  card.style.top  = `${centerY}px`;

  await new Promise(r => setTimeout(r, 470));

  if (reveal) {
    card.style.transition = 'transform 0.5s cubic-bezier(.4,2,.6,1)';
    card.style.transform = 'rotateY(180deg)';
    await new Promise(r => setTimeout(r, 500));
  }

  const dealerCardsBoxRect = dealerCardsBox.getBoundingClientRect();
  const destLeft = dealerCardsBoxRect.left + dealerCardsBoxRect.width / 2 - card.offsetWidth / 2;
  const destTop = window.innerHeight * 0.05; // 5vh od góry okna

  card.style.transition = 'left 0.6s cubic-bezier(.4,2,.6,1), top 0.6s cubic-bezier(.4,2,.6,1)';
  card.style.left = `${destLeft}px`;
  card.style.top = `${destTop}px`;

  await new Promise(r => setTimeout(r, 610));

  const cardRect = card.getBoundingClientRect();
  const dealerCardsRect = dealerCardsBox.getBoundingClientRect();
  const leftInContainer = cardRect.left - dealerCardsRect.left;
  const topInContainer = cardRect.top - dealerCardsRect.top;

  card.style.transition = 'none';
  card.style.position = 'absolute';
  card.style.left = leftInContainer + 'px';
  card.style.top = topInContainer + 'px';
  card.style.transform = reveal ? 'rotateY(180deg)' : 'rotateY(0deg)';
  dealerCardsBox.appendChild(card);

  dealerCardsState.push({
    value: extractValue(cardName),
    file: cardName,
    revealed: !!reveal
  });
  card.classList.toggle('revealed', !!reveal);

  setTimeout(() => {
    layoutDealerCards();
    updateDealerScore();
  }, 30);


}


async function animatePlayerCard({reveal = true, delay = 0}) {
  const playerCardsBox = document.getElementById('player-cards');
  const cardName = randomCard();

  const card = createDealerCard({front: cardName, revealed: false});
  card.classList.add('player-card');
  card.style.zIndex = 1000;
  document.body.appendChild(card);

  const deck = document.getElementById('card-deck');
  const deckRect = deck.getBoundingClientRect();
  card.style.position = 'fixed';
  card.style.left = `${deckRect.left + deckRect.width/2 - card.offsetWidth/2}px`;
  card.style.top = `${deckRect.top + deckRect.height/2 - card.offsetHeight/2}px`;
  card.style.transform = 'rotateY(0deg)';
  card.style.transition = 'none';

  await new Promise(r => setTimeout(r, delay));

  const viewportWidth = window.innerWidth;
  const centerX = viewportWidth / 2 - card.offsetWidth / 2;
  const centerY = window.innerHeight / 2 - card.offsetHeight / 2;

  card.style.transition = 'left 0.45s cubic-bezier(.4,2,.6,1), top 0.45s cubic-bezier(.4,2,.6,1)';
  card.style.left = `${centerX}px`;
  card.style.top  = `${centerY}px`;

  await new Promise(r => setTimeout(r, 470));

  if (reveal) {
    card.style.transition = 'transform 0.5s cubic-bezier(.4,2,.6,1)';
    card.style.transform = 'rotateY(180deg)';
    await new Promise(r => setTimeout(r, 500));
  }

  const playerCardsBoxRect = playerCardsBox.getBoundingClientRect();
  const destLeft = playerCardsBoxRect.left + playerCardsBoxRect.width / 2 - card.offsetWidth / 2;
  const destTop = window.innerHeight - (playerCardsBoxRect.height + window.innerHeight * 0.05);

  card.style.transition = 'left 0.6s cubic-bezier(.4,2,.6,1), top 0.6s cubic-bezier(.4,2,.6,1)';
  card.style.left = `${destLeft}px`;
  card.style.top = `${playerCardsBoxRect.top}px`;

  await new Promise(r => setTimeout(r, 610));

  const cardRect = card.getBoundingClientRect();
  const playerCardsRect = playerCardsBox.getBoundingClientRect();
  const leftInContainer = cardRect.left - playerCardsRect.left;
  const topInContainer = cardRect.top - playerCardsRect.top;

  card.style.transition = 'none';
  card.style.position = 'absolute';
  card.style.left = leftInContainer + 'px';
  card.style.top = topInContainer + 'px';
  card.style.transform = reveal ? 'rotateY(180deg)' : 'rotateY(0deg)';
  playerCardsBox.appendChild(card);

  playerCardsState.push({
    value: extractValue(cardName),
    file: cardName,
    revealed: !!reveal
  });
  card.classList.toggle('revealed', !!reveal);

  setTimeout(() => {
    layoutPlayerCards();
    updatePlayerScore();
  }, 30);

}

function updateBetBox() {
  document.getElementById('bet-amount-box').textContent =
    currentBet ? currentBet : '0';
}

async function dealerFirstDeal() {
  clearDealerCards();
  await animateDealerCard({reveal: true, delay: 400});
  await animateDealerCard({reveal: false, delay: 400});
}

async function playerFirstDeal() {
  clearPlayerCards();
  await animatePlayerCard({reveal: true, delay: 400});
  await animatePlayerCard({reveal: true, delay: 400});
  updatePlayerScore(true);
}

async function startGame() {
  updateFundsBox();
  await dealerFirstDeal();
  await playerFirstDeal();
  setPlayerActionsActive(true);
}

function setPlayerActionsActive(active) {
  ['btn-pass','btn-hit','btn-double'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (active) {
      if (id === 'btn-double' && funds < currentBet) {
        btn.disabled = true;
        btn.classList.remove('enabled');
      } else {
        btn.disabled = false;
        btn.classList.add('enabled');
      }
    } else {
      btn.disabled = true;
      btn.classList.remove('enabled');
    }
  });
}


function updateFundsBox() {
  document.getElementById('funds-box').textContent = `Fundusze: ${funds}`;
}

async function revealDealerSecondCard() {
  const idx = dealerCardsState.findIndex(c => !c.revealed);
  if (idx === -1) return;

  const dealerCardsBox = document.getElementById('dealer-cards');
  const cardDiv = dealerCardsBox.children[idx];
  cardDiv.classList.add('flipping');
  cardDiv.style.transition = 'transform 0.5s';
  cardDiv.style.transform = 'translateX(-50%) rotateY(180deg)';
  await new Promise(r => setTimeout(r, 500));

  dealerCardsState[idx].revealed = true;
  cardDiv.classList.remove('flipping');
  cardDiv.classList.add('revealed');
  layoutDealerCards();
  updateDealerScore();
  return idx;
}

async function dealerTurn() {
  setPlayerActionsActive(false);

  await revealDealerSecondCard();
  await new Promise(r => setTimeout(r, 350));

  let playerPoints = Math.max(...calcPoints(playerCardsState).split('/').map(x=>+x.trim()));
  let dealerPoints = Math.max(...calcPoints(dealerCardsState).split('/').map(x=>+x.trim()));

  if (dealerPoints > 21) {
    updateDealerScore();
    showEndMessage(true);
    return;
  }
  if (dealerPoints > playerPoints) {
    updateDealerScore();
    showEndMessage(false);
    return;
  }
  
  if (
    dealerPoints === playerPoints &&
    playerPoints >= 18 && playerPoints <= 21
  ) {
    document.getElementById('dealer-score').classList.remove('success', 'fail');
    document.getElementById('dealer-score').classList.add('draw');
    document.getElementById('player-score').classList.remove('success', 'fail');
    document.getElementById('player-score').classList.add('draw');
    showEndMessage(null);
    return;
  }

  while ((dealerPoints < playerPoints && dealerPoints < 22) || (dealerPoints == playerPoints) && dealerPoints < 18) {
    await new Promise(r => setTimeout(r, 700));
    await animateDealerCard({reveal: true, delay: 0});
    dealerPoints = Math.max(...calcPoints(dealerCardsState).split('/').map(x=>+x.trim()));
    updateDealerScore();

    if (dealerPoints > 21) {
      showEndMessage(true);
      return;
    }
    if (dealerPoints > playerPoints) {
      showEndMessage(false);
      return;
    }
    if (
      dealerPoints === playerPoints &&
      playerPoints >= 18 && playerPoints <= 21
    ) {
      document.getElementById('dealer-score').classList.remove('success', 'fail');
      document.getElementById('dealer-score').classList.add('draw');
      document.getElementById('player-score').classList.remove('success', 'fail');
      document.getElementById('player-score').classList.add('draw');
      showEndMessage('draw');
      return;
    }
  }
}



document.getElementById('btn-hit').addEventListener('click', async () => {
  if (document.getElementById('btn-hit').disabled) return;
  setPlayerActionsActive(false);

  await animatePlayerCard({reveal: true, delay: 150});

  updatePlayerScore(true);
});

document.getElementById('btn-pass').addEventListener('click', async () => {
  if (document.getElementById('btn-pass').disabled) return;
  setPlayerActionsActive(false);
  await dealerTurn();
});

document.getElementById('btn-double').addEventListener('click', async () => {
  if (document.getElementById('btn-double').disabled) return;
  if (funds < currentBet) return;

  funds -= currentBet;
  currentBet *= 2;
  updateFundsBox();
  updateBetBox();

  setPlayerActionsActive(false);

  await animatePlayerCard({reveal: true, delay: 150});
  updatePlayerScore(false);

  const ptsStr = calcPoints(playerCardsState);
  const ptsArr = ptsStr.split('/').map(x => +x.trim());
  const max = Math.max(...ptsArr);

  if (max > 21) {
    showEndMessage(false);
    return;
  }
  if (max === 21) {
    setTimeout(() => {
      dealerTurn();
    }, 600);
    return;
  }
  
  setTimeout(() => {
    dealerTurn();
  }, 700);
});

document.addEventListener('DOMContentLoaded', () => {
  updateFundsBox();
  setPlayerActionsActive(false);

  renderCardDeck();

  setTimeout(() => {
    showBetModal();
  }, 1200);
});



