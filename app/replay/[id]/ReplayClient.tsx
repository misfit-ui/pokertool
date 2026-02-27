"use client";

import { useState, useEffect, useMemo } from "react";
import { ParsedHand } from "@/lib/parser";
import { PokerTable } from "@/components/PokerTable";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

export default function ReplayClient({ hand }: { hand: ParsedHand }) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [actionIndex, setActionIndex] = useState(-1); // -1 means start of phase
  const [isPlaying, setIsPlaying] = useState(false);

  // Flatten all actions into a single timeline for easier navigation
  const timeline = useMemo(() => {
    const steps: { pIdx: number; aIdx: number }[] = [];
    hand.phases.forEach((phase, pIdx) => {
      steps.push({ pIdx, aIdx: -1 }); // Start of phase
      phase.actions.forEach((_, aIdx) => {
        steps.push({ pIdx, aIdx });
      });
    });
    return steps;
  }, [hand]);

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
    }, 1000); // 1 second per action
    return () => clearInterval(timer);
  }, [isPlaying, currentStepIndex, timeline]);

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

        s.activePlayer = action.player;

        switch (action.type) {
          case "post_ante":
            player.chips -= action.amount || 0;
            s.pot += action.amount || 0;
            s.lastAction = `${action.player} posts ante ${action.amount}`;
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
            s.lastAction = `${action.player} ${action.type}s ${amount}`;
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
            s.lastAction = `Uncalled bet returned to ${action.player}`;
            break;
          case "collect":
            Object.values(s.players).forEach((pl: any) => {
              s.pot += pl.bet;
              pl.bet = 0;
            });
            player.chips += action.amount || 0;
            s.pot -= action.amount || 0;
            s.lastAction = `${action.player} collects ${action.amount}`;
            break;
          case "show":
            player.cards = action.cards || [];
            s.lastAction = `${action.player} shows ${action.cards?.join(" ")}`;
            break;
        }
      });
    }

    return s;
  }, [hand, phaseIndex, actionIndex]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Hand #{hand.id}</h1>
            <div className="text-sm text-zinc-400">
              {hand.game} • {hand.blinds}
            </div>
          </div>
        </div>
        <div className="text-sm text-zinc-500">{hand.date}</div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-950 overflow-hidden relative">
        <PokerTable hand={hand} state={state} />

        {/* Action Log Overlay */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/80 px-6 py-3 rounded-full text-white font-mono text-sm shadow-2xl border border-zinc-800 z-50 min-w-[300px] text-center">
          {state.lastAction || "Waiting for action..."}
        </div>
      </main>

      <footer className="p-6 border-t border-zinc-800 bg-zinc-900 flex flex-col items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => goToStep(0)}
            className="p-2 text-zinc-400 hover:text-white transition-colors"
            title="Restart"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={prevStep}
            disabled={currentStepIndex === 0}
            className="p-2 text-zinc-400 hover:text-white disabled:opacity-50 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-1" />
            )}
          </button>
          <button
            onClick={nextStep}
            disabled={currentStepIndex === timeline.length - 1}
            className="p-2 text-zinc-400 hover:text-white disabled:opacity-50 transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        <div className="w-full max-w-2xl flex items-center gap-4 text-xs text-zinc-500 font-mono">
          <span>Start</span>
          <input
            type="range"
            min={0}
            max={timeline.length - 1}
            value={currentStepIndex}
            onChange={(e) => goToStep(parseInt(e.target.value))}
            className="flex-1 accent-indigo-500"
          />
          <span>End</span>
        </div>
      </footer>
    </div>
  );
}
