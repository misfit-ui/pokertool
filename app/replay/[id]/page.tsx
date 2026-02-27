"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getHandClient } from "@/lib/db-client";
import { ParsedHand } from "@/lib/parser";
import ReplayClient from "./ReplayClient";
import { Loader2 } from "lucide-react";

export default function ReplayPage() {
  const params = useParams();
  const id = params.id as string;
  const [hand, setHand] = useState<ParsedHand | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHand() {
      if (!id) return;
      try {
        const data = await getHandClient(id);
        if (data) {
          setHand(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadHand();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!hand) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        Hand not found.
      </div>
    );
  }

  return <ReplayClient hand={hand} />;
}
