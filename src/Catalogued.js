import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { odds, smallOdds } from "./Scores";
import { FiRefreshCw } from 'react-icons/fi';   // or any refresh/reload icon you like

/* ---------------- UTILS ---------------- */
const sanitizeTeam = (value) => value.toLowerCase().replace(/[^a-z]/g, "");

/* ---------------- API ---------------- */
const API_BASE = "https://campusbuy-backend-nkmx.onrender.com/betking";

const Homepage = () => {
  /* ---------------- INPUTS ---------------- */
  const [inputA, setInputA] = useState("");
  const [inputB, setInputB] = useState("");

  /* ---------------- FIXTURE & FLAGS ---------------- */
  const [fixture, setFixture] = useState(null);
  const [isSmallTeamMatch, setIsSmallTeamMatch] = useState(false);
  const [smallTeamImpact, setSmallTeamImpact] = useState(false);

  /* ---------------- BASE & MAIN DEFICIT ---------------- */
  const [baseStake, setBaseStake] = useState(10000);
  const [deficit, setDeficit] = useState(0);
  const baseRef = useRef(10000);

  /* ---------------- MAIN STAKES (normal matches only) ---------------- */
  const [amounts, setAmounts] = useState({
    winnerAmount: 0,
    homeAmount: 0,
    drawAmount: 0,
    awayAmount: 0,
  });
  const [orderedStakes, setOrderedStakes] = useState([]);

  /* ---------------- BAD GAMES DEFICIT & SHADOW ---------------- */
  const [badGamesDeficit, setBadGamesDeficit] = useState(0);
  const [badGameShadow, setBadGameShadow] = useState(0);

  /* ---------------- TOTAL SMALL DEFICITS — calculated only on next game ---------------- */
  const [totalSmallDeficits, setTotalSmallDeficits] = useState(0);

  /* ---------------- 10 INDIVIDUAL SPECIAL DEFICITS ---------------- */
  const [specialDeficits, setSpecialDeficits] = useState({
    oneX: 0, twoX: 0, x2: 0, zeroGoals: 0, sixGoals: 0,
    ht12: 0, ht21: 0, ht30: 0, ft40: 0, ft41: 0,
  });

  /* ---------------- PENDING STAKES ---------------- */
  const [pendingSpecialStakes, setPendingSpecialStakes] = useState({
    oneX: 0, twoX: 0, x2: 0, zeroGoals: 0, sixGoals: 0,
    ht12: 0, ht21: 0, ht30: 0, ft40: 0, ft41: 0,
  });

  const specialKeys = [
    "oneX", "twoX", "x2", "zeroGoals", "sixGoals",
    "ht12", "ht21", "ht30", "ft40", "ft41"
  ];

  const specialLabels = {
    oneX: "1X", twoX: "2X", x2: "X2",
    zeroGoals: "0 GOALS", sixGoals: "6 GOALS",
    ht12: "HT 1-2", ht21: "HT 2-1", ht30: "HT 3-0",
    ft40: "FT 4-0", ft41: "FT 4-1",
  };

  useEffect(() => {
    baseRef.current = baseStake;
  }, [baseStake]);

  /* ---------------- LOAD / SAVE ---------------- */
  const fetchAll = async () => {
    try {
      const res = await axios.get(API_BASE);
      const data = res.data || {};
      setBaseStake(data.base ?? 10000);
      setBadGamesDeficit(data.badGamesDeficit ?? 0);
      setBadGameShadow(data.badGameShadow ?? 0);

      setSpecialDeficits({
        oneX: data.oneXDeficit ?? 0,
        twoX: data.twoXDeficit ?? 0,
        x2: data.x2Deficit ?? 0,
        zeroGoals: data.zeroGoalsDeficit ?? 0,
        sixGoals: data.sixGoalsDeficit ?? 0,
        ht12: data.ht12Deficit ?? 0,
        ht21: data.ht21Deficit ?? 0,
        ht30: data.ht30Deficit ?? 0,
        ft40: data.ft40Deficit ?? 0,
        ft41: data.ft41Deficit ?? 0,
      });

    } catch (err) {
      console.error("❌ Load failed:", err.message);
    }
  };

  const saveAll = async () => {
    try {
      const payload = {
        base: Math.max(10000, baseRef.current),
        badGamesDeficit,
        badGameShadow,
        oneXDeficit: specialDeficits.oneX,
        twoXDeficit: specialDeficits.twoX,
        x2Deficit: specialDeficits.x2,
        zeroGoalsDeficit: specialDeficits.zeroGoals,
        sixGoalsDeficit: specialDeficits.sixGoals,
        ht12Deficit: specialDeficits.ht12,
        ht21Deficit: specialDeficits.ht21,
        ht30Deficit: specialDeficits.ht30,
        ft40Deficit: specialDeficits.ft40,
        ft41Deficit: specialDeficits.ft41,
      };
      await axios.put(API_BASE, payload);
      console.log("✅ Saved:", payload);
    } catch (err) {
      console.error("❌ Save failed:", err.message);
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(saveAll, 300000);
    return () => clearInterval(interval);
  }, []);

  /* ---------------- GO FOR INPUT ---------------- */
  const handleLoadGame = (e) => {
    e.preventDefault();

    const home = sanitizeTeam(inputA) || "che";
    const away = sanitizeTeam(inputB) || "che";

    let found = smallOdds.find((o) => o.home === home && o.away === away);
    const isSmall = !!found;

    if (!isSmall) {
      found = odds.find((o) => o.home === home && o.away === away);
    }

    if (!found) {
      alert(`No odds for ${home} vs ${away}`);
      return;
    }

    const newBase = baseStake + deficit;
    setBaseStake(newBase);
    setDeficit(0);

    setIsSmallTeamMatch(isSmall);
    setFixture(found);

    let winnerAmount = Math.round(newBase / (found.winner - 1));
    winnerAmount = Math.max(winnerAmount, 10);

    if (isSmall) {
      setBadGamesDeficit((prev) => {
        const newBad = prev + winnerAmount;
        setBadGameShadow(newBad);
        const loadedTotal =
          specialDeficits.oneX +
          specialDeficits.twoX +
          specialDeficits.x2 +
          specialDeficits.sixGoals +
          specialDeficits.zeroGoals +
          specialDeficits.ht12 +
          specialDeficits.ht21 +
          specialDeficits.ht30 +
          specialDeficits.ft40 +
          specialDeficits.ft41;
        setTotalSmallDeficits(loadedTotal);
        return newBad;   // ← fixed: return only the new value for badGamesDeficit
      });
    }

    let homeAmount = 0;
    let drawAmount = 0;
    let awayAmount = 0;
    let ladder = [];

    if (!isSmall) {
      const oddsMap = { H: found.win, D: found.draw, A: found.lose };
      let runningTotal = winnerAmount;

      for (const step of found.code || "") {
        const odd = oddsMap[step];
        if (!odd) continue;
        let stake = Math.round(runningTotal / (odd - 1));
        stake = Math.max(stake, 10);
        ladder.push({ step, stake });
        if (step === "H") homeAmount = stake;
        if (step === "D") drawAmount = stake;
        if (step === "A") awayAmount = stake;
        runningTotal += stake;
      }
    }

    setOrderedStakes(ladder);
    setAmounts({ winnerAmount, homeAmount, drawAmount, awayAmount });

    const calcStake = (target, odd) => {
      if (odd <= 1.01) return 0;
      let stake = Math.round(target / (odd - 1));
      return Math.max(stake, 10);
    };

    const newPending = {};
    specialKeys.forEach((key) => {
      const odd = found[key] || 0;
      const target = badGamesDeficit + (specialDeficits[key] || 0);
      newPending[key] = calcStake(target, odd);
    });

    setPendingSpecialStakes(newPending);
  };

  /* ---------------- JACKPOT (6-0) ---------------- */
  const handleJackpot = () => {
    if (!fixture) return;
    setDeficit(0);
    saveAll();
  };

  /* ---------------- MAIN RESULT (H/D/A) ---------------- */
  const handleMainResult = (step) => {
    if (!fixture || isSmallTeamMatch) return;

    const index = orderedStakes.findIndex((s) => s.step === step);
    if (index === -1) return;

    const newDeficit = orderedStakes.slice(index + 1).reduce((sum, s) => sum + s.stake, 0);
    setDeficit(newDeficit);
    saveAll();
  };

  /* ---------------- SPECIAL WIN — only zero individual + clear bad ---------------- */
const handleSpecialWinA = (type) => {
  if (!fixture || !isSmallTeamMatch || pendingSpecialStakes[type] === 0) return;

  const recovered = pendingSpecialStakes[type];

  // First win path: clear the main bad deficit
  setBadGamesDeficit(0);
  setSmallTeamImpact(true);

  // Clear this special's individual deficit
  setSpecialDeficits((prev) => ({ ...prev, [type]: 0 }));

  // Clear pending
  setPendingSpecialStakes((prev) => ({ ...prev, [type]: 0 }));

  // Reduce total by what this win recovered
  setTotalSmallDeficits((prev) => Math.max(0, prev - recovered));
};

const handleSpecialWinB = (type) => {
  if (!fixture || !isSmallTeamMatch || pendingSpecialStakes[type] === 0) return;

  // Capture the REAL values BEFORE any setState calls (state is async)
  const individualHistory = specialDeficits[type];   // ← this is your "assets deficit history" (the 20 in your example)
  const currentShadow = badGameShadow;               // ← your shadow (the 45)

  // Clear this special's individual deficit
  setSpecialDeficits((prev) => ({ ...prev, [type]: 0 }));

  // Clear pending
  setPendingSpecialStakes((prev) => ({ ...prev, [type]: 0 }));

  // Subtract BOTH the individual history + the shadow from totalSmallDeficits
  setTotalSmallDeficits((prev) => {
    const deducted = individualHistory + currentShadow;
    const newTotal = prev - deducted;
    // console.log(`B win → deducted ${deducted} (history ${individualHistory} + shadow ${currentShadow}) → new total: ${newTotal}`);
    return Math.max(0, newTotal);
  });
// Clear shadow only once — on the first subsequent win (or always)
  // Option A: clear it completely
  setBadGameShadow(0);
};  
/* ---------------- GO TO NEXT GAME — CALCULATE TOTAL HERE ---------------- */
  const handleNextGame = async () => {
  if (fixture) {
    const finalBase = baseStake + deficit;
    setBaseStake(finalBase);
    setDeficit(0);
  }

  // Special handling when badGamesDeficit is already cleared (≤ 0)
  if (smallTeamImpact) {
    // Reset ALL individual special deficits to 0
    setSpecialDeficits({
      oneX: 0, twoX: 0, x2: 0, zeroGoals: 0, sixGoals: 0,
      ht12: 0, ht21: 0, ht30: 0, ft40: 0, ft41: 0,
    });

    // Your requested logic
    if(baseStake > 10100){
    setBadGamesDeficit(totalSmallDeficits + 100);
    setBadGameShadow(0);
    // Subtract 100 from base stake
    setBaseStake((prev) => prev - 100);
    }else{
      const residue = baseStake - 10000
      setBadGamesDeficit(totalSmallDeficits + residue);
      setBadGameShadow(0);
    // Subtract 100 from base stake
    setBaseStake((prev) => prev - residue);
    }
  } else {
    // Normal case: add any remaining pending stakes to individual deficits
    if (isSmallTeamMatch) {
      let addedTotal = 0;

      specialKeys.forEach((key) => {
        if (pendingSpecialStakes[key] > 0) {
          const added = pendingSpecialStakes[key];
          setSpecialDeficits((prev) => ({ ...prev, [key]: prev[key] + added }));
          addedTotal += added;
        }
      });

      // Recalculate totalSmallDeficits
      setTotalSmallDeficits((prevTotal) => {
        const newTotal = prevTotal + addedTotal;
        console.log("Next game — total recalculated:", newTotal);
        return newTotal;
      });
    }
  }

  // Always clean up pending stakes, fixture, UI, etc.
  setPendingSpecialStakes({
    oneX: 0, twoX: 0, x2: 0, zeroGoals: 0, sixGoals: 0,
    ht12: 0, ht21: 0, ht30: 0, ft40: 0, ft41: 0,
  });

  setFixture(null);
  setOrderedStakes([]);
  setAmounts({ winnerAmount: 0, homeAmount: 0, drawAmount: 0, awayAmount: 0 });
  setIsSmallTeamMatch(false);
  setInputA("");
  setInputB("");

  await saveAll();
};
  const teamA = sanitizeTeam(inputA) || "HOME";
  const teamB = sanitizeTeam(inputB) || "AWAY";

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 via-black to-red-900 text-white px-4 py-10">
      <div className="text-center mb-10">
       <div className="flex items-center justify-center gap-6 flex-wrap">
    <h1 className="text-4xl md:text-5xl font-extrabold text-red-500 tracking-tight">
      Virtual EPL Strategy
    </h1>

    <button
      onClick={fetchAll}
      className={`
        flex items-center gap-2 px-5 py-3 
        bg-gradient-to-r from-red-700 to-red-900 
        hover:from-red-600 hover:to-red-800 
        text-white font-semibold text-lg 
        rounded-2xl shadow-lg 
        transition-all duration-300 
        transform hover:scale-105 active:scale-95
        border border-red-500/30
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      {/* Icon + Text */}
      <FiRefreshCw className="w-5 h-5" /> {/* remove if no icon */}
      Reload Data
    </button>
  </div>
        <p className="text-red-400 mt-2">
          {fixture
            ? isSmallTeamMatch
              ? "SMALL TEAM MATCH — 6-0 + 10 SPECIALS"
              : "NORMAL MATCH"
            : "Ready"}
        </p>
      </div>

      <div className="max-w-6xl mx-auto bg-white text-gray-900 rounded-3xl shadow-2xl p-8">

        {/* OUTCOME BUTTONS */}
        <div className="mb-8">
          {isSmallTeamMatch ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <button
                onClick={handleJackpot}
                disabled={!fixture}
                className="py-6 rounded-2xl bg-yellow-400 text-black font-extrabold hover:bg-yellow-300 transition"
              >
                6–0<br />({amounts.winnerAmount || "–"})
              </button>

              {specialKeys.map((key) => (
                <button
                  key={key}
                  onClick={() => !smallTeamImpact ? handleSpecialWinA(key) : handleSpecialWinB(key)}
                  disabled={!fixture || pendingSpecialStakes[key] === 0}
                  className="py-6 rounded-2xl bg-blue-600 text-white font-extrabold hover:bg-blue-500 transition"
                >
                  {specialLabels[key]}<br />({pendingSpecialStakes[key] || "–"})
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={handleJackpot}
                disabled={!fixture}
                className="py-6 rounded-2xl bg-yellow-400 text-black font-extrabold hover:bg-yellow-300 transition"
              >
                6–0<br />({amounts.winnerAmount || "–"})
              </button>

              <button
                onClick={() => handleMainResult("H")}
                disabled={!fixture}
                className="py-6 rounded-2xl bg-green-600 text-white font-extrabold hover:bg-green-500 transition"
              >
                {teamA}<br />({amounts.homeAmount || "–"})
              </button>

              <button
                onClick={() => handleMainResult("D")}
                disabled={!fixture}
                className="py-6 rounded-2xl bg-gray-500 text-white font-extrabold hover:bg-gray-400 transition"
              >
                DRAW<br />({amounts.drawAmount || "–"})
              </button>

              <button
                onClick={() => handleMainResult("A")}
                disabled={!fixture}
                className="py-6 rounded-2xl bg-red-600 text-white font-extrabold hover:bg-red-500 transition"
              >
                {teamB}<br />({amounts.awayAmount || "–"})
              </button>
            </div>
          )}
        </div>

        {/* INPUTS + GO BUTTONS */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <input
              value={inputA}
              onChange={(e) => setInputA(e.target.value)}
              placeholder="home"
              className="w-32 px-6 py-3 border-2 border-red-600 rounded-2xl text-center text-lg"
            />
            <span className="font-black text-3xl text-red-500">VS</span>
            <input
              value={inputB}
              onChange={(e) => setInputB(e.target.value)}
              placeholder="away"
              className="w-32 px-6 py-3 border-2 border-red-600 rounded-2xl text-center text-lg"
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleLoadGame}
              className="px-10 py-4 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xl rounded-2xl transition shadow-lg"
            >
              GO FOR INPUT
            </button>
            <button
              onClick={handleNextGame}
              className="px-10 py-4 bg-green-600 hover:bg-green-700 text-white font-extrabold text-xl rounded-2xl transition shadow-lg"
            >
              GO TO NEXT GAME
            </button>
          </div>
        </div>

        {/* STATES DISPLAY */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 text-center font-mono text-sm bg-black/10 p-6 rounded-2xl">
          <div>Base: <strong className="text-green-600">{baseStake}</strong></div>
          <div>Main Deficit: <strong className="text-red-600">{deficit}</strong></div>
          <div>Bad Games: <strong className="text-yellow-600">{badGamesDeficit}</strong></div>
          <div>Bad Shadow: <strong className="text-orange-600">{badGameShadow}</strong></div>
          <div>Total Small Deficits: <strong className="text-purple-600">{totalSmallDeficits}</strong></div>
          <div>1X Def: <strong>{specialDeficits.oneX}</strong></div>
          <div>2X Def: <strong>{specialDeficits.twoX}</strong></div>
          <div>X2 Def: <strong>{specialDeficits.x2}</strong></div>
          <div>0 Goals Def: <strong>{specialDeficits.zeroGoals}</strong></div>
          <div>6 Goals Def: <strong>{specialDeficits.sixGoals}</strong></div>
          <div>HT 1-2 Def: <strong>{specialDeficits.ht12}</strong></div>
          <div>HT 2-1 Def: <strong>{specialDeficits.ht21}</strong></div>
          <div>HT 3-0 Def: <strong>{specialDeficits.ht30}</strong></div>
          <div>FT 4-0 Def: <strong>{specialDeficits.ft40}</strong></div>
          <div>FT 4-1 Def: <strong>{specialDeficits.ft41}</strong></div>
        </div>
      </div>
    </div>
  );
};

export default Homepage;