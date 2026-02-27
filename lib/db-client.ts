import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ParsedHand } from './parser';

interface PokerDB extends DBSchema {
  hands: {
    key: string;
    value: ParsedHand;
    indexes: { 'by-date': string };
  };
}

const DB_NAME = 'PokerReplayerDB';
const STORE_NAME = 'hands';

async function initDB(): Promise<IDBPDatabase<PokerDB>> {
  return openDB<PokerDB>(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('by-date', 'date');
      }
    },
  });
}

export async function saveHandsClient(hands: ParsedHand[]) {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  for (const hand of hands) {
    tx.store.put(hand);
  }
  await tx.done;
}

export async function getHandsListClient() {
  const db = await initDB();
  const hands = await db.getAll(STORE_NAME);
  return hands.map(h => ({
    id: h.id,
    game: h.game,
    blinds: h.blinds,
    date: h.date,
    table: h.table
  }));
}

export async function getHandClient(id: string): Promise<ParsedHand | undefined> {
  const db = await initDB();
  return db.get(STORE_NAME, id);
}
