"use client";

import { useState, useEffect, useMemo } from "react";
import { saveHandsClient, getAllHandsClient } from "@/lib/db-client";
import { parseHandHistories, ParsedHand } from "@/lib/parser";
import { calculateHeroStats, getAvailableHeroes, getHeroHandDetails } from "@/lib/stats";
import Link from "next/link";
import { Loader2, Play, Plus, Upload, User, TrendingUp, Activity, Crosshair } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlayingCard } from "@/components/PlayingCard";

export default function HomePage() {
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hands, setHands] = useState<ParsedHand[]>([]);
  const [fetching, setFetching] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [displayCount, setDisplayCount] = useState(100);
  const [selectedHero, setSelectedHero] = useState<string>("");

  useEffect(() => {
    loadHands();
  }, []);

  const loadHands = async () => {
    setFetching(true);
    try {
      const data = await getAllHandsClient();
      setHands(data.reverse());
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  };

  const availableHeroes = useMemo(() => getAvailableHeroes(hands), [hands]);

  useEffect(() => {
    if (!selectedHero && availableHeroes.length > 0) {
      setSelectedHero(availableHeroes[0]);
    }
  }, [availableHeroes, selectedHero]);

  const heroStats = useMemo(() => {
    if (!selectedHero || hands.length === 0) return null;
    return calculateHeroStats(hands, selectedHero);
  }, [hands, selectedHero]);

  const heroHands = useMemo(() => {
    if (!selectedHero) return [];
    return hands.filter(h => h.players.some(p => p.name === selectedHero));
  }, [hands, selectedHero]);

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
      try {
        await saveHandsClient(chunk);
      } catch (err) {
        setError("Failed to save hands locally.");
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
    <main className="max-w-7xl mx-auto p-6 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">Poker Replayer</h1>
        <p className="text-zinc-400">Import your CoinPoker hand histories to analyze and replay them.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Import */}
        <section className="lg:col-span-4 space-y-4">
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

        {/* Right Column: Dashboard & Hands */}
        <section className="lg:col-span-8 space-y-6 flex flex-col h-[calc(100vh-12rem)]">
          
          {/* Hero Dashboard */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <User className="w-5 h-5" /> Hero Dashboard
              </h2>
              {availableHeroes.length > 0 && (
                <select 
                  value={selectedHero}
                  onChange={(e) => setSelectedHero(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {availableHeroes.slice(0, 50).map(hero => (
                    <option key={hero} value={hero}>{hero}</option>
                  ))}
                </select>
              )}
            </div>

            {heroStats ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800/50">
                  <div className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">Hands</div>
                  <div className="text-2xl font-bold text-white">{heroStats.hands}</div>
                </div>
                <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800/50">
                  <div className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1 flex items-center gap-1"><Activity className="w-3 h-3"/> VPIP</div>
                  <div className="text-2xl font-bold text-white">{heroStats.vpip.toFixed(1)}%</div>
                </div>
                <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800/50">
                  <div className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1 flex items-center gap-1"><Crosshair className="w-3 h-3"/> PFR</div>
                  <div className="text-2xl font-bold text-white">{heroStats.pfr.toFixed(1)}%</div>
                </div>
                <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800/50">
                  <div className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">3-Bet</div>
                  <div className="text-2xl font-bold text-white">{heroStats.threeBet.toFixed(1)}%</div>
                </div>
                <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800/50">
                  <div className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3"/> Net Won</div>
                  <div className={cn("text-2xl font-bold", heroStats.netWon > 0 ? "text-emerald-400" : heroStats.netWon < 0 ? "text-red-400" : "text-white")}>
                    {heroStats.netWon > 0 ? "+" : ""}{heroStats.netWon.toFixed(2)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-zinc-500 text-sm text-center py-4">Import hands to see stats.</div>
            )}
          </div>

          {/* Compact Hand View */}
          <div className="flex-1 flex flex-col min-h-0">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center justify-between">
              <span>Recent Hands</span>
              <span className="text-sm font-normal text-zinc-500">{heroHands.length} total</span>
            </h3>
            
            {fetching ? (
              <div className="flex items-center justify-center flex-1 border border-zinc-800 rounded-xl bg-zinc-900/50">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
              </div>
            ) : heroHands.length === 0 ? (
              <div className="flex items-center justify-center flex-1 border border-zinc-800 rounded-xl bg-zinc-900/50 text-zinc-500">
                No hands found for selected hero.
              </div>
            ) : (
              <div className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {heroHands.slice(0, displayCount).map((hand) => {
                  const details = getHeroHandDetails(hand, selectedHero);
                  return (
                    <div key={hand.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between hover:border-zinc-700 transition-colors group">
                      
                      {/* Left: Info */}
                      <div className="w-1/4 min-w-[120px]">
                        <div className="font-medium text-white text-sm">#{hand.id}</div>
                        <div className="text-xs text-zinc-400 mt-0.5">{hand.blinds}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">{hand.date.split(' ')[0]}</div>
                      </div>

                      {/* Middle: Cards & Board */}
                      <div className="flex-1 flex items-center gap-6 justify-center">
                        {details.holeCards.length > 0 ? (
                          <div className="flex gap-1">
                            {details.holeCards.map((c, i) => <PlayingCard key={i} card={c} className="w-8 h-11 text-xs rounded-sm border-zinc-300" />)}
                          </div>
                        ) : (
                          <div className="flex gap-1 opacity-20">
                            <div className="w-8 h-11 rounded-sm bg-zinc-700 border border-zinc-600" />
                            <div className="w-8 h-11 rounded-sm bg-zinc-700 border border-zinc-600" />
                          </div>
                        )}

                        {details.board.length > 0 && (
                          <div className="flex gap-1 items-center">
                            <div className="w-px h-8 bg-zinc-800 mx-2" />
                            {details.board.map((c, i) => <PlayingCard key={i} card={c} className="w-8 h-11 text-xs rounded-sm border-zinc-300" />)}
                          </div>
                        )}
                      </div>

                      {/* Right: Result & Action */}
                      <div className="w-1/4 flex items-center justify-end gap-4 min-w-[120px]">
                        <div className={cn(
                          "font-mono font-bold text-sm",
                          details.net > 0 ? "text-emerald-400" : details.net < 0 ? "text-red-400" : "text-zinc-500"
                        )}>
                          {details.net > 0 ? "+" : ""}{details.net.toFixed(2)}
                        </div>
                        <Link
                          href={`/replay/${hand.id}`}
                          className="p-2.5 bg-zinc-800 group-hover:bg-indigo-600 text-white rounded-full transition-colors"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </Link>
                      </div>

                    </div>
                  );
                })}
                {heroHands.length > displayCount && (
                  <button 
                    onClick={() => setDisplayCount(d => d + 100)}
                    className="w-full py-3 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors border border-dashed border-zinc-800 mt-2"
                  >
                    Load More
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
