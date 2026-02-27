import { ParsedHand } from "@/lib/parser";
import { PlayingCard } from "./PlayingCard";
import { cn } from "@/lib/utils";
import { Coins } from "lucide-react";

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
}: {
  hand: ParsedHand;
  state: ReplayState;
}) {
  // 9 positions around an oval table
  const seatPositions = [
    { top: "85%", left: "50%", transform: "translate(-50%, -50%)" }, // Seat 1 (bottom center)
    { top: "75%", left: "15%", transform: "translate(-50%, -50%)" }, // Seat 2 (bottom left)
    { top: "40%", left: "5%", transform: "translate(-50%, -50%)" }, // Seat 3 (mid left)
    { top: "10%", left: "25%", transform: "translate(-50%, -50%)" }, // Seat 4 (top left)
    { top: "5%", left: "50%", transform: "translate(-50%, -50%)" }, // Seat 5 (top center)
    { top: "10%", left: "75%", transform: "translate(-50%, -50%)" }, // Seat 6 (top right)
    { top: "40%", left: "95%", transform: "translate(-50%, -50%)" }, // Seat 7 (mid right)
    { top: "75%", left: "85%", transform: "translate(-50%, -50%)" }, // Seat 8 (bottom right)
    { top: "90%", left: "75%", transform: "translate(-50%, -50%)" }, // Seat 9 (extra)
  ];

  return (
    <div className="relative w-full max-w-4xl aspect-[2/1] mx-auto mt-12 mb-24">
      {/* Table Graphic */}
      <div className="absolute inset-0 bg-emerald-800 rounded-[100px] border-[12px] border-zinc-800 shadow-2xl flex items-center justify-center">
        {/* Inner line */}
        <div className="absolute inset-4 border-2 border-emerald-700 rounded-[80px] opacity-50 pointer-events-none" />

        {/* Board & Pot */}
        <div className="flex flex-col items-center gap-4 z-10">
          {state.pot > 0 && (
            <div className="bg-black/50 px-4 py-1.5 rounded-full text-emerald-400 font-mono text-sm font-bold flex items-center gap-2">
              <Coins className="w-4 h-4" />
              {state.pot.toFixed(2)}
            </div>
          )}
          <div className="flex gap-2 h-16 items-center">
            {state.board.map((card, i) => (
              <PlayingCard key={i} card={card} className="w-12 h-16 text-xl" />
            ))}
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
            style={pos}
          >
            {/* Player Info Box */}
            <div
              className={cn(
                "bg-zinc-900 border-2 rounded-xl p-2 min-w-[120px] shadow-xl transition-colors",
                isActive ? "border-indigo-500" : "border-zinc-700",
                pState.folded && "opacity-50",
              )}
            >
              <div className="text-xs font-bold text-white truncate text-center mb-1">
                {player.name}
              </div>
              <div className="text-xs text-emerald-400 font-mono text-center flex items-center justify-center gap-1">
                <Coins className="w-3 h-3" />
                {pState.chips.toFixed(2)}
              </div>
            </div>

            {/* Cards */}
            {!pState.folded && pState.cards.length > 0 && (
              <div className="flex gap-1 -mt-4 z-30">
                {pState.cards.map((card, i) => (
                  <PlayingCard
                    key={i}
                    card={card}
                    className="w-8 h-12 text-sm shadow-md"
                  />
                ))}
              </div>
            )}
            {!pState.folded && pState.cards.length === 0 && (
              <div className="flex gap-1 -mt-4 z-30">
                <div className="w-8 h-12 rounded bg-zinc-800 border border-zinc-600 shadow-md" />
                <div className="w-8 h-12 rounded bg-zinc-800 border border-zinc-600 shadow-md" />
              </div>
            )}

            {/* Bet */}
            {pState.bet > 0 && (
              <div className="absolute -top-8 bg-black/60 px-2 py-1 rounded text-xs text-white font-mono whitespace-nowrap">
                {pState.bet.toFixed(2)}
              </div>
            )}

            {/* Dealer Button */}
            {isButton && (
              <div className="absolute -right-4 top-0 w-6 h-6 bg-white rounded-full border-2 border-zinc-300 text-black text-[10px] font-bold flex items-center justify-center shadow-md">
                D
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
