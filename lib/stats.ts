import { ParsedHand } from './parser';

export type PlayerStats = {
  name: string;
  hands: number;
  vpip: number;
  pfr: number;
  threeBet: number;
  netWon: number;
  bbWon: number;
};

export function calculateHeroStats(hands: ParsedHand[], heroName: string): PlayerStats {
  let totalHands = 0;
  let vpipCount = 0;
  let pfrCount = 0;
  let threeBetOppCount = 0;
  let threeBetCount = 0;
  let netWon = 0;
  let bbWon = 0;

  for (const hand of hands) {
    const isHeroInHand = hand.players.some(p => p.name === heroName);
    if (!isHeroInHand) continue;

    totalHands++;

    const preflop = hand.phases.find(p => p.name === 'preflop');
    if (preflop) {
      let heroVpip = false;
      let heroPfr = false;
      
      let currentBetLevel = 1; // 1 = BB, 2 = 2-bet (first raise), 3 = 3-bet, etc.
      let heroFaced3BetOpp = false;
      let heroDid3Bet = false;

      for (const action of preflop.actions) {
        if (action.player === heroName) {
          if (currentBetLevel === 2 && !heroDid3Bet) {
            heroFaced3BetOpp = true;
          }
          if (action.type === 'raise') {
            heroVpip = true;
            heroPfr = true;
            if (currentBetLevel === 2) {
              heroDid3Bet = true;
            }
            currentBetLevel++;
          } else if (action.type === 'call') {
            heroVpip = true;
          }
        } else {
          if (action.type === 'raise') {
            currentBetLevel++;
          }
        }
      }

      if (heroVpip) vpipCount++;
      if (heroPfr) pfrCount++;
      if (heroFaced3BetOpp) threeBetOppCount++;
      if (heroDid3Bet) threeBetCount++;
    }

    let heroInvested = 0;
    let heroCollected = 0;

    for (const phase of hand.phases) {
      let investedInPhase = 0;
      for (const action of phase.actions) {
        if (action.player === heroName) {
          if (['post_ante', 'post_sb', 'post_bb', 'bet', 'call'].includes(action.type)) {
            investedInPhase += (action.amount || 0);
          } else if (action.type === 'raise') {
            investedInPhase = (action.amount || 0);
          } else if (action.type === 'return') {
            investedInPhase -= (action.amount || 0);
          } else if (action.type === 'collect') {
            heroCollected += (action.amount || 0);
          }
        }
      }
      heroInvested += investedInPhase;
    }

    const handNet = heroCollected - heroInvested;
    netWon += handNet;

    const bbMatch = hand.blinds.match(/[\d.,]+\/([^\d]*)([\d.,]+)/);
    let bbSize = 1;
    if (bbMatch) {
      bbSize = parseFloat(bbMatch[2].replace(/,/g, ''));
    } else {
       const bbAction = preflop?.actions.find(a => a.type === 'post_bb');
       if (bbAction && bbAction.amount) bbSize = bbAction.amount;
    }
    
    if (bbSize > 0) {
      bbWon += (handNet / bbSize);
    }
  }

  return {
    name: heroName,
    hands: totalHands,
    vpip: totalHands > 0 ? (vpipCount / totalHands) * 100 : 0,
    pfr: totalHands > 0 ? (pfrCount / totalHands) * 100 : 0,
    threeBet: threeBetOppCount > 0 ? (threeBetCount / threeBetOppCount) * 100 : 0,
    netWon,
    bbWon
  };
}

export function getAvailableHeroes(hands: ParsedHand[]): string[] {
  const counts: Record<string, number> = {};
  for (const hand of hands) {
    for (const player of hand.players) {
      counts[player.name] = (counts[player.name] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);
}

export function getHeroHandDetails(hand: ParsedHand, heroName: string) {
  let holeCards: string[] = [];
  for (const phase of hand.phases) {
    for (const action of phase.actions) {
      if ((action.type === 'dealt' || action.type === 'show') && action.player === heroName && action.cards) {
        holeCards = action.cards;
      }
    }
  }
  
  let heroInvested = 0;
  let heroCollected = 0;
  for (const phase of hand.phases) {
    let investedInPhase = 0;
    for (const action of phase.actions) {
      if (action.player === heroName) {
        if (['post_ante', 'post_sb', 'post_bb', 'bet', 'call'].includes(action.type)) {
          investedInPhase += (action.amount || 0);
        } else if (action.type === 'raise') {
          investedInPhase = (action.amount || 0);
        } else if (action.type === 'return') {
          investedInPhase -= (action.amount || 0);
        } else if (action.type === 'collect') {
          heroCollected += (action.amount || 0);
        }
      }
    }
    heroInvested += investedInPhase;
  }
  
  let board: string[] = [];
  for (const phase of hand.phases) {
    if (phase.board && phase.board.length > 0) {
      board = phase.board;
    }
  }

  return {
    holeCards,
    net: heroCollected - heroInvested,
    board
  };
}
