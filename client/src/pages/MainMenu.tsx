import { useState, useEffect } from "react";
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
        { label: "SENSITIVITY: " + (localStorage.getItem("mouseSensitivity") || "0.002"), action: () => { setLocation("/settings"); } },
        { label: "BACK", action: () => { setMenuState("main"); setSelectedIndex(0); } }
      ];
      default: return mainMenuItems;
    }
  };

  const currentItems = getActiveMenu();

  useEffect(() => {
    if (user?.email) {
      const name = user.email.split('@')[0];
      setUsername(name.toUpperCase());
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
  }, [currentItems, selectedIndex]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-red-600 relative overflow-hidden">
      {/* Scanline Effect - Adaptado do original */}
      <div className="absolute inset-0 pointer-events-none z-50">
        <div className="absolute inset-0" style={{
          backgroundImage: "repeating-linear-gradient(0deg, rgba(255,0,0,0.05) 0px, rgba(255,0,0,0.05) 1px, transparent 1px, transparent 2px)",
          backgroundSize: "100% 3px",
          animation: "flicker 0.1s infinite"
        }} />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-4xl px-4">
        {/* Title - Estilo Doom */}
        <h1 className="text-8xl font-black mb-2 tracking-tighter italic" style={{ 
          fontFamily: "monospace",
          textShadow: "5px 5px 0px #4a0000, 10px 10px 0px rgba(255,0,0,0.2)",
          WebkitTextStroke: "2px #ff0000"
        }}>
          DOOM
        </h1>
        <p className="text-red-900 font-mono mb-12 tracking-widest text-sm">UAC TERMINAL v1.6.66</p>

        <div className="w-full flex flex-col md:flex-row gap-8 items-start justify-center">
          {/* Leaderboard Section */}
          <div className="w-full md:w-1/2 border-2 border-red-900 bg-red-950/10 p-4 backdrop-blur-sm">
             <Leaderboard />
          </div>

          {/* Menu Section */}
          <div className="w-full md:w-1/2 flex flex-col items-center space-y-4">
            <h2 className="text-2xl font-bold text-red-500 mb-6 border-b-2 border-red-900 w-full text-center pb-2" style={{ fontFamily: "monospace" }}>
              {menuState === "modes" ? "SELECT MISSION MODE" : 
               menuState === "difficulty" ? "SELECT SKILL LEVEL" : 
               menuState === "settings" ? "SYSTEM CONFIG" : 
               "MAIN OPERATIONS"}
            </h2>

            <div className="flex flex-col space-y-3 w-full max-w-xs">
              {currentItems.map((item, index) => (
                <button
                  key={index}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`relative group py-4 px-6 text-2xl font-black transition-all border-2 ${
                    selectedIndex === index
                      ? "bg-red-600 text-black border-white scale-105 shadow-[0_0_20px_rgba(255,0,0,0.6)]"
                      : "bg-black border-red-900 text-red-600 hover:border-red-500"
                  }`}
                  style={{ fontFamily: "monospace" }}
                >
                  <span className={`absolute left-2 transition-opacity ${selectedIndex === index ? "opacity-100" : "opacity-0"}`}>
                    ▶
                  </span>
                  {item.label}
                  <span className={`absolute right-2 transition-opacity ${selectedIndex === index ? "opacity-100" : "opacity-0"}`}>
                    ◀
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-8 p-4 border border-red-900/30 w-full text-center">
              <p className="text-red-900 text-xs font-mono">
                LOGGED AS: <span className="text-red-600">{username || "UNKNOWN_ENTITY"}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer Instructions */}
        <div className="mt-12 flex gap-8 text-red-900 text-[10px] font-mono tracking-tighter opacity-50">
          <p>[W/S] NAVIGATE</p>
          <p>[ENTER] SELECT</p>
          <p>[ESC] BACK</p>
        </div>
      </div>

      <style>{`
        @keyframes flicker {
          0% { opacity: 0.85; }
          50% { opacity: 1; }
          100% { opacity: 0.9; }
        }
        button {
          clip-path: polygon(5% 0, 100% 0, 95% 100%, 0% 100%);
        }
      `}</style>
    </div>
  );
}
