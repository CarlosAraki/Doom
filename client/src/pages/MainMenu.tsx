import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

export default function MainMenu() {
  const [, setLocation] = useLocation();
  const { logout, user } = useAuth();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [username, setUsername] = useState("");

  const menuItems = [
    { label: "NEW GAME", action: () => setLocation("/game") },
    { label: "SETTINGS", action: () => setLocation("/settings") },
    { label: "LOGOUT", action: () => { logout(); setLocation("/"); } }
  ];

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
        setSelectedIndex((prev) => (prev - 1 + menuItems.length) % menuItems.length);
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        setSelectedIndex((prev) => (prev + 1) % menuItems.length);
      } else if (e.key === "Enter") {
        menuItems[selectedIndex].action();
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

      <div className="relative z-10 text-center">
        {/* Title */}
        <h1 className="text-6xl font-bold text-red-600 mb-4" style={{ fontFamily: "monospace", textShadow: "0 0 20px rgba(220, 20, 60, 0.8)" }}>
          DOOM
        </h1>
        <p className="text-red-500 text-lg mb-12" style={{ fontFamily: "monospace" }}>
          Welcome, {username}
        </p>

        {/* Menu */}
        <div className="space-y-4">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={item.action}
              className={`block w-64 py-4 text-2xl font-bold transition-all ${
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
        <div className="mt-16 text-red-900 text-xs" style={{ fontFamily: "monospace" }}>
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
