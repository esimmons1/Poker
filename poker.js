const suits = ["S", "H", "D", "C"];
const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const rankOrder = { A:14, K:13, Q:12, J:11, 10:10, 9:9, 8:8, 7:7, 6:6, 5:5, 4:4, 3:3, 2:2 };

function createDeck() {
  const deck = [];
  suits.forEach(suit => {
    ranks.forEach(rank => {
      deck.push({ rank, suit, code: `${rank}${suit}` });
    });
  });
  return deck;
}

function shuffle(deck) {
  return [...deck].sort(() => Math.random() - 0.5);
}

function getCardImageUrl(card) {
  return `https://deckofcardsapi.com/static/img/${card.code}.png`;
}

function evaluateHand(hand) {
  const sorted = [...hand].sort((a,b) => rankOrder[b.rank]-rankOrder[a.rank]);
  const counts = {};
  const suits = {};
  sorted.forEach(c => {
    counts[c.rank] = (counts[c.rank]||0)+1;
    suits[c.suit] = (suits[c.suit]||0)+1;
  });

  const isFlush = Object.values(suits).some(v=>v>=5);
  const uniqueRanks = [...new Set(sorted.map(c=>rankOrder[c.rank]))];
  let isStraight = false;
  for (let i=0; i<=uniqueRanks.length-5; i++) {
    if (uniqueRanks[i]-uniqueRanks[i+4]===4) isStraight = true;
  }
  if (!isStraight && uniqueRanks.includes(14) && uniqueRanks.slice(-4).toString()==="5,4,3,2") isStraight=true;

  if (isStraight && isFlush) return "Straight Flush";
  const vals = Object.values(counts).sort((a,b)=>b-a);
  if (vals[0]===4) return "Four of a Kind";
  if (vals[0]===3 && vals[1]===2) return "Full House";
  if (isFlush) return "Flush";
  if (isStraight) return "Straight";
  if (vals[0]===3) return "Three of a Kind";
  if (vals[0]===2 && vals[1]===2) return "Two Pair";
  if (vals[0]===2) return "Pair";
  return "High Card";
}

function PokerGame() {
  const [deck, setDeck] = React.useState(shuffle(createDeck()));
  const [playerHand, setPlayerHand] = React.useState([]);
  const [aiHands, setAiHands] = React.useState([[], []]);
  const [community, setCommunity] = React.useState([]);
  const [winner, setWinner] = React.useState("");
  const [showdownDone, setShowdownDone] = React.useState(false);

  const [playerChips, setPlayerChips] = React.useState(1000);
  const [aiChips, setAiChips] = React.useState([1000, 1000]);
  const [currentBet, setCurrentBet] = React.useState(0);
  const [playerBet, setPlayerBet] = React.useState(0);
  const [aiBets, setAiBets] = React.useState([0, 0]);
  const [pot, setPot] = React.useState(0);

  function dealInitialHands() {
    const newDeck = shuffle(createDeck());
    const player = [newDeck.pop(), newDeck.pop()];
    const ai1 = [newDeck.pop(), newDeck.pop()];
    const ai2 = [newDeck.pop(), newDeck.pop()];
    setDeck(newDeck);
    setPlayerHand(player);
    setAiHands([ai1, ai2]);
    setCommunity([]);
    setWinner("");
    setShowdownDone(false);
    setCurrentBet(0);
    setPlayerBet(0);
    setAiBets([0, 0]);
    setPot(0);
  }

  function dealFlop() {
    if (deck.length < 3) return;
    setCommunity([deck[deck.length-1], deck[deck.length-2], deck[deck.length-3]]);
    setDeck(deck.slice(0, deck.length-3));
  }

  function dealTurn() {
    if (deck.length < 1) return;
    setCommunity([...community, deck[deck.length-1]]);
    setDeck(deck.slice(0, deck.length-1));
  }

  function dealRiver() {
    if (deck.length < 1) return;
    setCommunity([...community, deck[deck.length-1]]);
    setDeck(deck.slice(0, deck.length-1));
  }

  function showdown() {
    const playerBest = evaluateHand([...playerHand, ...community]);
    const aiBest = aiHands.map(ai => evaluateHand([...ai, ...community]));

    const results = [
      { name: "You", hand: playerBest },
      { name: "AI 1", hand: aiBest[0] },
      { name: "AI 2", hand: aiBest[1] },
    ];

    const handRanks = [
      "High Card","Pair","Two Pair","Three of a Kind",
      "Straight","Flush","Full House","Four of a Kind","Straight Flush"
    ];

    results.sort((a,b) => handRanks.indexOf(b.hand) - handRanks.indexOf(a.hand));
    setWinner(`${results[0].name} wins with ${results[0].hand}`);
    setShowdownDone(true);

    // Pay pot to winner
    if (results[0].name === "You") {
      setPlayerChips(playerChips + pot);
    } else if (results[0].name === "AI 1") {
      setAiChips([aiChips[0] + pot, aiChips[1]]);
    } else {
      setAiChips([aiChips[0], aiChips[1] + pot]);
    }
    setPot(0);
  }

  function calcWinProbability() {
    if (!community.length) return "N/A";
    const ranks = [
      "High Card","Pair","Two Pair","Three of a Kind",
      "Straight","Flush","Full House","Four of a Kind","Straight Flush"
    ];
    const playerRank = ranks.indexOf(evaluateHand([...playerHand, ...community]));
    let betterAIs = 0;
    aiHands.forEach(ai => {
      const aiRank = ranks.indexOf(evaluateHand([...ai, ...community]));
      if (aiRank > playerRank) betterAIs++;
    });
    const prob = ((2 - betterAIs) / 2) * 100;
    return prob.toFixed(0) + "%";
  }

  function playerBetAmount(amount) {
    if (amount > playerChips) return;
    setPlayerBet(amount);
    setPlayerChips(playerChips - amount);

    // AI calls bet
    const newAiBets = aiBets.map((bet, i) => {
      const aiCall = Math.min(amount, aiChips[i]);
      aiChips[i] -= aiCall;
      return bet + aiCall;
    });

    setAiBets(newAiBets);
    setAiChips([...aiChips]);
    setPot(pot + amount + newAiBets.reduce((a,b) => a+b,0));
    setCurrentBet(amount);
  }

  return (
    <div>
      <h2>Your Hand</h2>
      {playerHand.map((c,i) => (
        <span key={i} className="card"><img src={getCardImageUrl(c)} /></span>
      ))}

      <h2>Community Cards</h2>
      {community.map((c,i) => (
        <span key={i} className="card"><img src={getCardImageUrl(c)} /></span>
      ))}

      <h2>AI Players</h2>
      {aiHands.map((hand, idx) => (
        <div key={idx}>
          AI {idx+1}: {
            showdownDone
              ? hand.map((c,i) => <span key={i} className="card"><img src={getCardImageUrl(c)} /></span>)
              : hand.map((c,i) => <span key={i} className="card"><img src="https://deckofcardsapi.com/static/img/back.png" /></span>)
          }
        </div>
      ))}

      <h3>Pot: ${pot}</h3>
      <h3>Your chips: ${playerChips}</h3>
      <h3>AI chips: AI 1: ${aiChips[0]}, AI 2: ${aiChips[1]}</h3>

      <div>
        <button onClick={dealInitialHands}>New Round</button>
        <button onClick={dealFlop}>Flop</button>
        <button onClick={dealTurn}>Turn</button>
        <button onClick={dealRiver}>River</button>
        <button onClick={showdown}>Showdown</button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <h3>Place Bet</h3>
        {[10, 50, 100].map(amt => (
          <button key={amt} onClick={() => playerBetAmount(amt)} disabled={playerChips < amt}>
            Bet ${amt}
          </button>
        ))}
      </div>

      <h3>Winning Probability: {calcWinProbability()}</h3>

      {winner && <h3>{winner}</h3>}
    </div>
  );
}

ReactDOM.render(<PokerGame />, document.getElementById('root'));
