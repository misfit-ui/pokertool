import { cn } from "@/lib/utils";

export function PlayingCard({
  card,
  className,
}: {
  card: string;
  className?: string;
}) {
  if (!card || card.length !== 2)
    return (
      <div
        className={cn(
          "w-10 h-14 rounded bg-zinc-800 border border-zinc-700",
          className,
        )}
      />
    );

  const rank = card[0];
  const suit = card[1];

  const isRed = suit === "h" || suit === "d";

  const suitSymbol: Record<string, string> = {
    s: "♠",
    h: "♥",
    d: "♦",
    c: "♣",
  };

  return (
    <div
      className={cn(
        "w-10 h-14 rounded bg-white shadow-sm flex flex-col items-center justify-center text-lg font-bold select-none",
        isRed ? "text-red-600" : "text-black",
        className,
      )}
    >
      <div className="leading-none">{rank}</div>
      <div className="leading-none text-xl">{suitSymbol[suit] || suit}</div>
    </div>
  );
}
