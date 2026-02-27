import fs from "fs/promises";
import path from "path";
import { ParsedHand } from "./parser";

const DB_PATH = path.join(process.cwd(), "data", "hands.json");

export async function initDb() {
  try {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    try {
      await fs.access(DB_PATH);
    } catch {
      await fs.writeFile(DB_PATH, JSON.stringify([]));
    }
  } catch (e) {
    console.error("Failed to init db", e);
  }
}

export async function saveHand(hand: ParsedHand) {
  await initDb();
  const data = await fs.readFile(DB_PATH, "utf-8");
  const hands: ParsedHand[] = JSON.parse(data);
  const existingIndex = hands.findIndex((h) => h.id === hand.id);
  if (existingIndex >= 0) {
    hands[existingIndex] = hand;
  } else {
    hands.push(hand);
  }
  await fs.writeFile(DB_PATH, JSON.stringify(hands, null, 2));
}

export async function saveHands(newHands: ParsedHand[]) {
  await initDb();
  const data = await fs.readFile(DB_PATH, "utf-8");
  const hands: ParsedHand[] = JSON.parse(data);
  
  const handMap = new Map(hands.map((h) => [h.id, h]));
  for (const h of newHands) {
    handMap.set(h.id, h);
  }
  
  await fs.writeFile(DB_PATH, JSON.stringify(Array.from(handMap.values()), null, 2));
}

export async function getHands(): Promise<ParsedHand[]> {
  await initDb();
  const data = await fs.readFile(DB_PATH, "utf-8");
  return JSON.parse(data);
}

export async function getHand(id: string): Promise<ParsedHand | undefined> {
  const hands = await getHands();
  return hands.find((h) => h.id === id);
}
