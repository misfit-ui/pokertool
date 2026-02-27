"use client";

import { useState, useEffect } from "react";
import { importHandAction, fetchHandsListAction, saveHandsAction } from "./actions";
import { parseHandHistories } from "@/lib/parser";
import Link from "next/link";
import { Loader2, Play, Plus, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

type HandSummary = {
  id: string;
  game: string;
  blinds: string;
  date: string;
  table: string;
};

export default function HomePage() {
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hands, setHands] = useState<HandSummary[]>([]);
  const [fetching, setFetching] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [displayCount, setDisplayCount] = useState(100);

  useEffect(() => {
    loadHands();
  }, []);

  const loadHands = async () => {
    setFetching(true);
    try {
      const data = await fetchHandsListAction();
      setHands(data.reverse());
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  };

  const handleImportText = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    setError("");
    
    const parsedHands = parseHandHistories(rawText);
    if (parsedHands.length === 0) {
      setError("No valid hands found.");
      setLoading(false);
      return;
    }

    await uploadInChunks(parsedHands);
  };

  const processFile = async (file: File) => {
    setLoading(true);
    setError("");
    setUploadProgress(0);
    try {
      const text = await file.text();
      const parsedHands = parseHandHistories(text);
      if (parsedHands.length === 0) {
        setError("No valid hands found in file.");
        setLoading(false);
        return;
      }
      await uploadInChunks(parsedHands);
    } catch (err) {
      setError("Error processing file.");
      setLoading(false);
      setUploadProgress(null);
    }
  };

  const uploadInChunks = async (parsedHands: any[]) => {
    const chunkSize = 200;
    for (let i = 0; i < parsedHands.length; i += chunkSize) {
      const chunk = parsedHands.slice(i, i + chunkSize);
      const result = await saveHandsAction(chunk);
      if (result.error) {
        setError(result.error);
        break;
      }
      setUploadProgress(Math.round(((i + chunk.length) / parsedHands.length) * 100));
    }
    
    setRawText("");
    setUploadProgress(null);
    setLoading(false);
    await loadHands();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
    e.target.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
  };

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">Poker Replayer</h1>
        <p className="text-zinc-400">Import your CoinPoker hand histories to replay them.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Plus className="w-5 h-5" /> Import Hands
          </h2>
          
          <div 
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
              isDragging ? "border-indigo-500 bg-indigo-500/10" : "border-zinc-700 hover:border-indigo-500 hover:bg-zinc-900/50"
            )}
            onClick={() => document.getElementById("file-upload")?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={handleDrop}
          >
            <input 
              id="file-upload" 
              type="file" 
              accept=".txt" 
              className="hidden" 
              onChange={handleFileUpload}
            />
            <Upload className={cn("w-8 h-8 mx-auto mb-2 transition-colors", isDragging ? "text-indigo-400" : "text-zinc-500")} />
            <p className="text-zinc-300 font-medium">Click to upload hand history file</p>
            <p className="text-zinc-500 text-sm mt-1">or drag and drop .txt files</p>
          </div>

          <div className="flex items-center gap-4 text-zinc-500">
            <div className="flex-1 h-px bg-zinc-800"></div>
            <span className="text-xs uppercase tracking-wider">or paste text</span>
            <div className="flex-1 h-px bg-zinc-800"></div>
          </div>

          <textarea
            className="w-full h-48 bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm font-mono text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            placeholder="Paste your CoinPoker hand history here..."
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={handleImportText}
            disabled={loading || (!rawText.trim() && uploadProgress === null)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {uploadProgress !== null ? `Importing... ${Math.min(uploadProgress, 100)}%` : "Import Hands"}
          </button>
        </section>

        <section className="space-y-4 flex flex-col h-[calc(100vh-12rem)]">
          <h2 className="text-xl font-semibold text-white flex items-center justify-between">
            <span>Imported Hands</span>
            <span className="text-sm font-normal text-zinc-500">{hands.length} total</span>
          </h2>
          
          {fetching ? (
            <div className="flex items-center justify-center flex-1 border border-zinc-800 rounded-xl bg-zinc-900/50">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
            </div>
          ) : hands.length === 0 ? (
            <div className="flex items-center justify-center flex-1 border border-zinc-800 rounded-xl bg-zinc-900/50 text-zinc-500">
              No hands imported yet.
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {hands.slice(0, displayCount).map((hand) => (
                <div key={hand.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between hover:border-zinc-700 transition-colors">
                  <div>
                    <div className="font-medium text-white">Hand #{hand.id}</div>
                    <div className="text-xs text-zinc-400 mt-1">{hand.game} • {hand.blinds}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{hand.date}</div>
                  </div>
                  <Link
                    href={`/replay/${hand.id}`}
                    className="p-3 bg-zinc-800 hover:bg-indigo-600 text-white rounded-full transition-colors"
                  >
                    <Play className="w-4 h-4" />
                  </Link>
                </div>
              ))}
              {hands.length > displayCount && (
                <button 
                  onClick={() => setDisplayCount(d => d + 100)}
                  className="w-full py-3 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors border border-dashed border-zinc-800"
                >
                  Load More
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
