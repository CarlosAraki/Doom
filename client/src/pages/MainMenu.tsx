import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import Leaderboard from "@/components/Leaderboard";

export default function MainMenu() {
  const [, setLocation] = useLocation();
  const { logout, user } = useAuth();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [username, setUsername] = useState("");
  const [menuState, setMenuState] = useState("main"); // "main", "modes", "difficulty", "settings"

  const mainMenuItems = [
    { label: "NEW GAME", action: () => { setMenuState("modes"); setSelectedIndex(0); } },
    { label: "SETTINGS", action: () => { setMenuState("settings"); setSelectedIndex(0); } },
    { label: "LOGOUT", action: () => { logout(); setLocation("/"); } }
  ];

  const modeItems = [
    { label: "SINGLE PLAYER", action: () => { localStorage.setItem("selectedGameMode", "singleplayer"); setMenuState("difficulty"); setSelectedIndex(0); } },
    { label: "MULTIPLAYER", action: () => { localStorage.setItem("selectedGameMode", "multiplayer"); setMenuState("difficulty"); setSelectedIndex(0); } },
    { label: "BACK", action: () => { setMenuState("main"); setSelectedIndex(0); } }
  ];

  const difficultyItems = [
    { label: "EASY", action: () => startGame("easy") },
    { label: "NORMAL", action: () => startGame("normal") },
    { label: "HARD", action: () => startGame("hard") },
    { label: "NIGHTMARE", action: () => startGame("nightmare") },
    { label: "BACK", action: () => { setMenuState("modes"); setSelectedIndex(0); } }
  ];

  const startGame = (diff: string) => {
    localStorage.setItem("selectedDifficulty", diff);
    setLocation("/game");
  };

  const getActiveMenu = () => {
    switch(menuState) {
      case "modes": return modeItems;
      case "difficulty": return difficultyItems;
      case "settings": return [
        { label: "SENSITIVITY: " + (localStorage.getItem("mouseSensitivity") || "0.002"), action: () => {} },
        { label: "BACK", action: () => { setMenuState("main"); setSelectedIndex(0); } }
      ];
      default: return mainMenuItems;
    }
  };

  const currentItems = getActiveMenu();

  useEffect(() => {
    if (user?.email) {
      const name = user.email.split('@')[0];
      setUsername(name);
      localStorage.setItem("username", name);
    }
  }, [user]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        setSelectedIndex((prev) => (prev - 1 + currentItems.length) % currentItems.length);
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        setSelectedIndex((prev) => (prev + 1) % currentItems.length);
      } else if (e.key === "Enter") {
        currentItems[selectedIndex].action();
      } else if (e.key === "Escape") {
        setMenuState("main");
        setSelectedIndex(0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, menuItems]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
      {/* Scanline effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, rgba(255,0,0,0.03) 0px, rgba(255,0,0,0.03) 1px, transparent 1px, transparent 2px)",
            animation: "flicker 0.15s infinite"
          }}
        />
      </div>

      {/* CRT border */}
      <div className="absolute inset-0 border-4 border-red-900/50 pointer-events-none" />

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4">
        {/* Title */}
        <h1 className="text-6xl font-bold text-red-600 mb-2 text-center" style={{ fontFamily: "monospace", textShadow: "0 0 20px rgba(220, 20, 60, 0.8)" }}>
          DOOM
        </h1>
        <p className="text-red-500 text-lg mb-8 text-center" style={{ fontFamily: "monospace" }}>
          Welcome, {username}
        </p>

        {/* Leaderboard */}
        <div className="mb-12">
          <Leaderboard />
        </div>

        {/* Menu */}
        <div className="space-y-4 flex flex-col items-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4" style={{ fontFamily: "monospace" }}>
            {menuState === "modes" ? "SELECT MODE" : menuState === "difficulty" ? "SELECT DIFFICULTY" : menuState === "settings" ? "SETTINGS" : "MAIN MENU"}
          </h2>
          {currentItems.map((item, index) => (
            <button
              key={index}
              onClick={item.action}
              className={`w-80 py-4 text-2xl font-bold transition-all ${
                selectedIndex === index
                  ? "bg-red-600 text-black shadow-lg shadow-red-600/50 scale-105"
                  : "bg-black border-2 border-red-600 text-red-600 hover:border-red-400"
              }`}
              style={{ fontFamily: "monospace" }}
            >
              {selectedIndex === index ? "> " : "  "}{item.label}
            </button>
          ))}
        </div>

        {/* Instructions */}
        <div className="mt-12 text-red-900 text-xs" style={{ fontFamily: "monospace" }}>
          <p>USE ARROW KEYS OR WASD TO NAVIGATE</p>
          <p>PRESS ENTER TO SELECT</p>
        </div>
      </div>

      <style>{`
        @keyframes flicker {
          0% { opacity: 0.97; }
          50% { opacity: 1; }
          100% { opacity: 0.97; }
        }
      `}</style>
    </div>
  );
}
