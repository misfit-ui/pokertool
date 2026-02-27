import { ParsedHand } from "@/lib/parser";
import { PlayingCard } from "./PlayingCard";
import { cn } from "@/lib/utils";
import { Coins, User } from "lucide-react";

type ReplayState = {
  players: {
    [name: string]: {
      chips: number;
      bet: number;
      folded: boolean;
      cards: string[];
      seat: number;
    };
  };
  pot: number;
  board: string[];
  lastAction: string;
  activePlayer: string | null;
};

export function PokerTable({
  hand,
  state,
  formatMoney,
}: {
  hand: ParsedHand;
  state: ReplayState;
  formatMoney: (amount: number) => string;
}) {
  // 9 positions around an oval table
  const seatPositions = [
    { top: "85%", left: "50%", transform: "translate(-50%, -50%)", betPos: "-top-10 left-1/2 -translate-x-1/2" }, // Seat 1 (bottom center)
    { top: "75%", left: "15%", transform: "translate(-50%, -50%)", betPos: "-top-8 left-full ml-2" }, // Seat 2 (bottom left)
    { top: "40%", left: "5%", transform: "translate(-50%, -50%)", betPos: "top-1/2 left-full ml-4 -translate-y-1/2" }, // Seat 3 (mid left)
    { top: "10%", left: "25%", transform: "translate(-50%, -50%)", betPos: "-bottom-8 left-full ml-2" }, // Seat 4 (top left)
    { top: "5%", left: "50%", transform: "translate(-50%, -50%)", betPos: "-bottom-10 left-1/2 -translate-x-1/2" }, // Seat 5 (top center)
    { top: "10%", left: "75%", transform: "translate(-50%, -50%)", betPos: "-bottom-8 right-full mr-2" }, // Seat 6 (top right)
    { top: "40%", left: "95%", transform: "translate(-50%, -50%)", betPos: "top-1/2 right-full mr-4 -translate-y-1/2" }, // Seat 7 (mid right)
    { top: "75%", left: "85%", transform: "translate(-50%, -50%)", betPos: "-top-8 right-full mr-2" }, // Seat 8 (bottom right)
    { top: "90%", left: "75%", transform: "translate(-50%, -50%)", betPos: "-top-10 left-1/2 -translate-x-1/2" }, // Seat 9 (extra)
  ];

  return (
    <div className="relative w-full max-w-5xl aspect-[2.2/1] mx-auto mt-8 mb-16">
      {/* Table Graphic */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-800 to-emerald-900 rounded-[120px] border-[16px] border-zinc-900 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center justify-center ring-4 ring-zinc-800/50 inset-ring">
        {/* Inner line */}
        <div className="absolute inset-6 border-2 border-emerald-600/30 rounded-[100px] pointer-events-none" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay rounded-[100px] pointer-events-none" />

        {/* Board & Pot */}
        <div className="flex flex-col items-center gap-6 z-10">
          {state.pot > 0 && (
            <div className="bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full text-emerald-400 font-mono text-sm font-bold flex items-center gap-2 border border-emerald-900/50 shadow-lg">
              <Coins className="w-4 h-4" />
              Pot: {formatMoney(state.pot)}
            </div>
          )}
          <div className="flex gap-2 h-20 items-center justify-center min-w-[240px] bg-black/20 p-3 rounded-2xl border border-black/20">
            {state.board.length === 0 ? (
              <div className="text-emerald-700/50 font-medium text-sm uppercase tracking-widest">Preflop</div>
            ) : (
              state.board.map((card, i) => (
                <PlayingCard key={i} card={card} className="w-14 h-20 text-xl shadow-xl animate-in fade-in zoom-in duration-300" />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Players */}
      {hand.players.map((player) => {
        const pState = state.players[player.name];
        if (!pState) return null;

        const pos = seatPositions[(player.seat - 1) % seatPositions.length];
        const isActive = state.activePlayer === player.name;
        const isButton = hand.buttonSeat === player.seat;

        return (
          <div
            key={player.name}
            className="absolute z-20 flex flex-col items-center gap-2"
            style={{ top: pos.top, left: pos.left, transform: pos.transform }}
          >
            {/* Player Info Box */}
            <div
              className={cn(
                "bg-zinc-900/95 backdrop-blur-md border-2 rounded-xl p-2.5 min-w-[140px] shadow-2xl transition-all duration-300 relative",
                isActive ? "border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)] scale-105" : "border-zinc-700/80",
                pState.folded && "opacity-40 scale-95 grayscale-[50%]",
              )}
            >
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <div className="text-xs font-bold text-zinc-100 truncate flex-1 flex items-center gap-1.5">
                  <User className="w-3 h-3 text-zinc-400" />
                  {player.name}
                </div>
              </div>
              <div className="bg-black/50 rounded p-1.5 text-xs text-emerald-400 font-mono text-center flex items-center justify-center gap-1.5 border border-zinc-800">
                <Coins className="w-3 h-3 opacity-70" />
                {formatMoney(pState.chips)}
              </div>
            </div>

            {/* Cards */}
            {!pState.folded && pState.cards.length > 0 && (
              <div className="flex gap-1 -mt-6 z-30 transition-transform hover:-translate-y-2">
                {pState.cards.map((card, i) => (
                  <PlayingCard
                    key={i}
                    card={card}
                    className="w-9 h-14 text-sm shadow-xl border-zinc-300"
                  />
                ))}
              </div>
            )}
            {!pState.folded && pState.cards.length === 0 && (
              <div className="flex gap-1 -mt-6 z-30">
                <div className="w-9 h-14 rounded bg-gradient-to-br from-zinc-700 to-zinc-800 border-2 border-zinc-600 shadow-xl" />
                <div className="w-9 h-14 rounded bg-gradient-to-br from-zinc-700 to-zinc-800 border-2 border-zinc-600 shadow-xl" />
              </div>
            )}

            {/* Bet */}
            {pState.bet > 0 && (
              <div className={cn("absolute bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs text-white font-mono whitespace-nowrap border border-zinc-700 shadow-lg flex items-center gap-1.5 z-40 animate-in fade-in slide-in-from-bottom-2", pos.betPos)}>
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                {formatMoney(pState.bet)}
              </div>
            )}

            {/* Dealer Button */}
            {isButton && (
              <div className="absolute -right-3 -top-3 w-7 h-7 bg-white rounded-full border-4 border-zinc-200 text-black text-[10px] font-black flex items-center justify-center shadow-lg z-50">
                D
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
