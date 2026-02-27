"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { ParsedHand } from "@/lib/parser";
import { PokerTable } from "@/components/PokerTable";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  ArrowLeft,
  Settings2,
  List,
  FastForward
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function ReplayClient({ hand }: { hand: ParsedHand }) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [actionIndex, setActionIndex] = useState(-1); // -1 means start of phase
  const [isPlaying, setIsPlaying] = useState(false);
  const [showBB, setShowBB] = useState(false);
  const [speed, setSpeed] = useState(1000);
  const [showSidebar, setShowSidebar] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);

  const bbSize = useMemo(() => {
    const match = hand.blinds.match(/[\d.,]+\/([^\d]*)([\d.,]+)/);
    if (match) return parseFloat(match[2].replace(/,/g, ''));
    return 1;
  }, [hand.blinds]);

  const formatMoney = (amount: number) => {
    if (showBB) return (amount / bbSize).toFixed(1) + ' BB';
    return amount.toFixed(2);
  };

  // Flatten all actions into a single timeline for easier navigation
  const timeline = useMemo(() => {
    const steps: { pIdx: number; aIdx: number; desc: string; type: string }[] = [];
    hand.phases.forEach((phase, pIdx) => {
      steps.push({ pIdx, aIdx: -1, desc: `--- ${phase.name.toUpperCase()} ---`, type: 'phase' });
      phase.actions.forEach((action, aIdx) => {
        let desc = "";
        if (action.type === 'dealt') desc = `Dealt to ${action.player}: [${action.cards?.join(' ')}]`;
        else if (action.type === 'fold') desc = `${action.player} folds`;
        else if (action.type === 'check') desc = `${action.player} checks`;
        else if (action.type === 'call') desc = `${action.player} calls ${formatMoney(action.amount || 0)}`;
        else if (action.type === 'bet') desc = `${action.player} bets ${formatMoney(action.amount || 0)}`;
        else if (action.type === 'raise') desc = `${action.player} raises to ${formatMoney(action.amount || 0)}`;
        else if (action.type === 'post_sb') desc = `${action.player} posts SB ${formatMoney(action.amount || 0)}`;
        else if (action.type === 'post_bb') desc = `${action.player} posts BB ${formatMoney(action.amount || 0)}`;
        else if (action.type === 'post_ante') desc = `${action.player} posts ante ${formatMoney(action.amount || 0)}`;
        else if (action.type === 'collect') desc = `${action.player} collects ${formatMoney(action.amount || 0)}`;
        else if (action.type === 'return') desc = `Uncalled bet returned to ${action.player}`;
        else if (action.type === 'show') desc = `${action.player} shows [${action.cards?.join(' ')}]`;
        
        steps.push({ pIdx, aIdx, desc, type: action.type });
      });
    });
    return steps;
  }, [hand, showBB, bbSize]);

  const currentStepIndex = timeline.findIndex(
    (s) => s.pIdx === phaseIndex && s.aIdx === actionIndex,
  );

  const goToStep = (index: number) => {
    if (index < 0 || index >= timeline.length) return;
    const step = timeline[index];
    setPhaseIndex(step.pIdx);
    setActionIndex(step.aIdx);
  };

  const nextStep = () => goToStep(currentStepIndex + 1);
  const prevStep = () => goToStep(currentStepIndex - 1);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      if (currentStepIndex < timeline.length - 1) {
        goToStep(currentStepIndex + 1);
      } else {
        setIsPlaying(false);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [isPlaying, currentStepIndex, timeline, speed]);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentStepIndex]);

  const state = useMemo(() => {
    const s = {
      players: {} as any,
      pot: 0,
      board: [] as string[],
      lastAction: "",
      activePlayer: null as string | null,
    };

    hand.players.forEach((p) => {
      s.players[p.name] = {
        chips: p.chips,
        bet: 0,
        folded: false,
        cards: [],
        seat: p.seat,
      };
    });

    for (let p = 0; p <= phaseIndex; p++) {
      const phase = hand.phases[p];
      if (!phase) continue;

      if (p > 0 && p <= phaseIndex) {
        Object.values(s.players).forEach((player: any) => {
          s.pot += player.bet;
          player.bet = 0;
        });
        s.board = [...phase.board];
      }

      const actionsToApply =
        p === phaseIndex
          ? phase.actions.slice(0, actionIndex + 1)
          : phase.actions;

      actionsToApply.forEach((action) => {
        const player = s.players[action.player];
        if (!player) return;

        if (['fold', 'check', 'call', 'bet', 'raise', 'post_sb', 'post_bb'].includes(action.type)) {
          s.activePlayer = action.player;
        }

        switch (action.type) {
          case "dealt":
            player.cards = action.cards || [];
            s.lastAction = `Dealt to ${action.player}`;
            break;
          case "post_ante":
            player.chips -= action.amount || 0;
            s.pot += action.amount || 0;
            s.lastAction = `${action.player} posts ante`;
            break;
          case "post_sb":
          case "post_bb":
          case "call":
          case "bet":
          case "raise": {
            const amount = action.amount || 0;
            let added = 0;
            if (action.type === "raise") {
              added = amount - player.bet;
              player.bet = amount;
            } else {
              added = amount;
              player.bet += amount;
            }
            player.chips -= added;
            s.lastAction = `${action.player} ${action.type}s`;
            break;
          }
          case "fold":
            player.folded = true;
            s.lastAction = `${action.player} folds`;
            break;
          case "check":
            s.lastAction = `${action.player} checks`;
            break;
          case "return":
            player.chips += action.amount || 0;
            player.bet -= action.amount || 0;
            s.lastAction = `Uncalled bet returned`;
            break;
          case "collect":
            Object.values(s.players).forEach((pl: any) => {
              s.pot += pl.bet;
              pl.bet = 0;
            });
            player.chips += action.amount || 0;
            s.pot -= action.amount || 0;
            s.lastAction = `${action.player} collects pot`;
            break;
          case "show":
            player.cards = action.cards || [];
            s.lastAction = `${action.player} shows`;
            break;
        }
      });
    }

    return s;
  }, [hand, phaseIndex, actionIndex]);

  const getActionColor = (type: string) => {
    if (['bet', 'raise'].includes(type)) return 'text-red-400';
    if (['call', 'check'].includes(type)) return 'text-emerald-400';
    if (type === 'fold') return 'text-zinc-500';
    if (type === 'phase') return 'text-indigo-400 font-bold mt-2';
    return 'text-zinc-300';
  };

  return (
    <div className="h-screen flex flex-col bg-zinc-950 overflow-hidden">
      <header className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-3">
              Hand #{hand.id}
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-medium border border-indigo-500/20">
                {hand.game}
              </span>
            </h1>
            <div className="text-sm text-zinc-400 mt-1 flex items-center gap-2">
              <span>{hand.blinds}</span>
              <span className="w-1 h-1 rounded-full bg-zinc-700" />
              <span>{hand.table}</span>
              <span className="w-1 h-1 rounded-full bg-zinc-700" />
              <span>{hand.date}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBB(!showBB)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
              showBB ? "bg-indigo-600 border-indigo-500 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
            )}
          >
            {showBB ? "BB" : "Currency"}
          </button>
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className={cn(
              "p-2.5 rounded-lg transition-colors border",
              showSidebar ? "bg-zinc-700 border-zinc-600 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
            )}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        {/* Table Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
          <PokerTable hand={hand} state={state} formatMoney={formatMoney} />
          
          {/* Action Overlay */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-6 py-2.5 rounded-full text-white font-mono text-sm shadow-2xl border border-zinc-700/50 z-50 min-w-[250px] text-center animate-in fade-in slide-in-from-top-4">
            {state.lastAction || "Waiting for action..."}
          </div>
        </div>

        {/* Sidebar Log */}
        {showSidebar && (
          <div className="w-80 border-l border-zinc-800 bg-zinc-900/50 flex flex-col animate-in slide-in-from-right-8">
            <div className="p-4 border-b border-zinc-800 font-semibold text-white flex items-center gap-2">
              <List className="w-4 h-4 text-zinc-400" />
              Hand History
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1.5 font-mono text-xs custom-scrollbar">
              {timeline.map((step, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "px-2 py-1.5 rounded transition-colors cursor-pointer",
                    idx === currentStepIndex ? "bg-indigo-500/20 border border-indigo-500/30" : "hover:bg-zinc-800/50",
                    getActionColor(step.type)
                  )}
                  onClick={() => goToStep(idx)}
                >
                  {step.desc}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        )}
      </main>

      <footer className="px-8 py-5 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-md flex flex-col items-center gap-5 z-10">
        <div className="flex items-center gap-6">
          <button
            onClick={() => goToStep(0)}
            className="p-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
            title="Restart"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={prevStep}
            disabled={currentStepIndex <= 0}
            className="p-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:scale-105 active:scale-95"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-1.5" />
            )}
          </button>
          <button
            onClick={nextStep}
            disabled={currentStepIndex === timeline.length - 1}
            className="p-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-7 h-7" />
          </button>
          
          <div className="flex items-center gap-2 ml-4 bg-zinc-950 rounded-full p-1 border border-zinc-800">
            {[1500, 1000, 500].map((s, i) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold transition-colors",
                  speed === s ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {i === 0 ? '1x' : i === 1 ? '1.5x' : '2x'}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full max-w-3xl flex items-center gap-4 text-xs text-zinc-500 font-mono">
          <span>Start</span>
          <input
            type="range"
            min={0}
            max={timeline.length - 1}
            value={currentStepIndex >= 0 ? currentStepIndex : 0}
            onChange={(e) => goToStep(parseInt(e.target.value))}
            className="flex-1 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
          />
          <span>End</span>
        </div>
      </footer>
    </div>
  );
}
