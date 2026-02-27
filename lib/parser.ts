export type Player = {
  seat: number;
  name: string;
  chips: number;
};

export type Action = {
  type:
    | "post_ante"
    | "post_sb"
    | "post_bb"
    | "fold"
    | "call"
    | "raise"
    | "check"
    | "bet"
    | "return"
    | "collect"
    | "show";
  player: string;
  amount?: number;
  cards?: string[];
};

export type HandPhase = {
  name: "preflop" | "flop" | "turn" | "river" | "summary";
  board: string[];
  actions: Action[];
};

export type ParsedHand = {
  id: string;
  game: string;
  blinds: string;
  date: string;
  table: string;
  maxSeats: number;
  buttonSeat: number;
  players: Player[];
  phases: HandPhase[];
  raw: string;
};

export function parseHandHistory(raw: string): ParsedHand | null {
  const lines = raw
    .trim()
    .split("\n")
    .map((l) => l.trim());
  if (lines.length === 0) return null;

  const handInfoMatch = lines[0].match(
    /Hand #(\d+):\s+(.+?)\s+\((.+?)\)\s+-\s+(.+)/,
  );
  if (!handInfoMatch) return null;

  const id = handInfoMatch[1];
  const game = handInfoMatch[2];
  const blinds = handInfoMatch[3];
  const date = handInfoMatch[4];

  const tableInfoMatch = lines[1].match(
    /Table '(.+?)'\s+(\d+)-max\s+Seat #(\d+)\s+is the button/,
  );
  const table = tableInfoMatch ? tableInfoMatch[1] : "";
  const maxSeats = tableInfoMatch ? parseInt(tableInfoMatch[2]) : 0;
  const buttonSeat = tableInfoMatch ? parseInt(tableInfoMatch[3]) : 0;

  const players: Player[] = [];
  let i = 2;
  while (i < lines.length && lines[i].startsWith("Seat ")) {
    const match = lines[i].match(
      /Seat (\d+):\s+(.+?)\s+\([^\d]*([\d.,]+)\s+in chips\)/,
    );
    if (match) {
      players.push({
        seat: parseInt(match[1]),
        name: match[2],
        chips: parseFloat(match[3].replace(/,/g, "")),
      });
    }
    i++;
  }

  const phases: HandPhase[] = [];
  let currentPhase: HandPhase = { name: "preflop", board: [], actions: [] };
  phases.push(currentPhase);

  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("*** HOLE CARDS ***")) {
      continue;
    } else if (line.startsWith("*** FLOP ***")) {
      const boardMatch = line.match(/\[(.*?)\]/);
      currentPhase = {
        name: "flop",
        board: boardMatch ? boardMatch[1].split(" ") : [],
        actions: [],
      };
      phases.push(currentPhase);
    } else if (line.startsWith("*** TURN ***")) {
      const boardMatch = line.match(/\[(.*?)\]/);
      currentPhase = {
        name: "turn",
        board: boardMatch ? boardMatch[1].split(" ") : [],
        actions: [],
      };
      phases.push(currentPhase);
    } else if (line.startsWith("*** RIVER ***")) {
      const boardMatch = line.match(/\[(.*?)\]/);
      currentPhase = {
        name: "river",
        board: boardMatch ? boardMatch[1].split(" ") : [],
        actions: [],
      };
      phases.push(currentPhase);
    } else if (line.startsWith("*** SUMMARY ***")) {
      currentPhase = { name: "summary", board: [], actions: [] };
      phases.push(currentPhase);
      break;
    } else {
      let action: Action | null = null;
      if (line.includes("posts the ante")) {
        const match = line.match(/(.+?):\s+posts the ante\s+[^\d]*([\d.,]+)/);
        if (match)
          action = {
            type: "post_ante",
            player: match[1],
            amount: parseFloat(match[2].replace(/,/g, "")),
          };
      } else if (line.includes("posts small blind")) {
        const match = line.match(
          /(.+?):\s+posts small blind\s+[^\d]*([\d.,]+)/,
        );
        if (match)
          action = {
            type: "post_sb",
            player: match[1],
            amount: parseFloat(match[2].replace(/,/g, "")),
          };
      } else if (line.includes("posts big blind")) {
        const match = line.match(/(.+?):\s+posts big blind\s+[^\d]*([\d.,]+)/);
        if (match)
          action = {
            type: "post_bb",
            player: match[1],
            amount: parseFloat(match[2].replace(/,/g, "")),
          };
      } else if (line.includes(": folds")) {
        const match = line.match(/(.+?):\s+folds/);
        if (match) action = { type: "fold", player: match[1] };
      } else if (line.includes(": calls")) {
        const match = line.match(/(.+?):\s+calls\s+[^\d]*([\d.,]+)/);
        if (match)
          action = {
            type: "call",
            player: match[1],
            amount: parseFloat(match[2].replace(/,/g, "")),
          };
      } else if (line.includes(": raises")) {
        const match = line.match(
          /(.+?):\s+raises\s+[^\d]*([\d.,]+)\s+to\s+[^\d]*([\d.,]+)/,
        );
        if (match)
          action = {
            type: "raise",
            player: match[1],
            amount: parseFloat(match[3].replace(/,/g, "")),
          };
      } else if (line.includes(": checks")) {
        const match = line.match(/(.+?):\s+checks/);
        if (match) action = { type: "check", player: match[1] };
      } else if (line.includes(": bets")) {
        const match = line.match(/(.+?):\s+bets\s+[^\d]*([\d.,]+)/);
        if (match)
          action = {
            type: "bet",
            player: match[1],
            amount: parseFloat(match[2].replace(/,/g, "")),
          };
      } else if (line.startsWith("Uncalled bet")) {
        const match = line.match(
          /Uncalled bet\s+\([^\d]*([\d.,]+)\)\s+returned to\s+(.+)/,
        );
        if (match)
          action = {
            type: "return",
            player: match[2],
            amount: parseFloat(match[1].replace(/,/g, "")),
          };
      } else if (line.includes("collected")) {
        const match = line.match(
          /(.+?)\s+collected\s+[^\d]*([\d.,]+)\s+from pot/,
        );
        if (match)
          action = {
            type: "collect",
            player: match[1],
            amount: parseFloat(match[2].replace(/,/g, "")),
          };
      } else if (line.includes(": shows")) {
        const match = line.match(/(.+?):\s+shows\s+\[(.*?)\]/);
        if (match)
          action = {
            type: "show",
            player: match[1],
            cards: match[2].split(" "),
          };
      }

      if (action) {
        currentPhase.actions.push(action);
      }
    }
  }

  return {
    id,
    game,
    blinds,
    date,
    table,
    maxSeats,
    buttonSeat,
    players,
    phases,
    raw,
  };
}

export function parseHandHistories(raw: string): ParsedHand[] {
  const handTexts = raw.split(/(?=CoinPoker Hand #\d+:)/);
  const hands: ParsedHand[] = [];
  for (const text of handTexts) {
    if (!text.trim()) continue;
    const parsed = parseHandHistory(text);
    if (parsed) hands.push(parsed);
  }
  return hands;
}
