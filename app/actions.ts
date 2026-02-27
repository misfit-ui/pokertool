"use server";

import { parseHandHistory, ParsedHand } from "@/lib/parser";
import { saveHand, saveHands, getHands, getHand } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function importHandAction(raw: string) {
  try {
    const parsed = parseHandHistory(raw);
    if (!parsed) {
      return {
        error: "Failed to parse hand history. Please check the format.",
      };
    }
    await saveHand(parsed);
    revalidatePath("/");
    return { success: true, id: parsed.id };
  } catch (error) {
    console.error(error);
    return { error: "An unexpected error occurred during parsing." };
  }
}

export async function fetchHandsAction() {
  return await getHands();
}

export async function saveHandsAction(hands: ParsedHand[]) {
  try {
    await saveHands(hands);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: 'Failed to save hands.' };
  }
}

export async function fetchHandsListAction() {
  const hands = await getHands();
  return hands.map(h => ({
    id: h.id,
    game: h.game,
    blinds: h.blinds,
    date: h.date,
    table: h.table
  }));
}

export async function fetchHandAction(id: string) {
  return await getHand(id);
}
