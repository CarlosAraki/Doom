import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Settings() {
  const [, setLocation] = useLocation();
  const [sensitivity, setSensitivity] = useState(0.002);

  useEffect(() => {
    const savedSensitivity = localStorage.getItem("mouseSensitivity");
    if (savedSensitivity) {
      setSensitivity(parseFloat(savedSensitivity));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("mouseSensitivity", sensitivity.toString());
    toast.success("Configurações salvas com sucesso!");
    setLocation("/menu");
  };

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

      <div className="relative z-10 w-full max-w-md border-4 border-red-600 bg-black p-8 shadow-2xl" style={{ boxShadow: "0 0 20px rgba(220, 20, 60, 0.5)" }}>
        <h1 className="text-4xl font-bold text-red-600 mb-8 text-center" style={{ fontFamily: "monospace", textShadow: "0 0 10px rgba(220, 20, 60, 0.8)" }}>
          SETTINGS
        </h1>

        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-red-500 font-bold" style={{ fontFamily: "monospace" }}>
                &gt; MOUSE SENSITIVITY
              </Label>
              <span className="text-red-400 font-mono">{sensitivity.toFixed(4)}</span>
            </div>
            <Slider
              value={[sensitivity]}
              onValueChange={(vals) => setSensitivity(vals[0])}
              min={0.0001}
              max={0.01}
              step={0.0001}
              className="py-4"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              onClick={() => setLocation("/menu")}
              variant="outline"
              className="flex-1 bg-black border-2 border-red-600 text-red-600 hover:bg-red-900/20 font-bold"
              style={{ fontFamily: "monospace" }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              BACK
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-red-600 hover:bg-red-700 text-black font-bold"
              style={{ fontFamily: "monospace" }}
            >
              <Save className="w-4 h-4 mr-2" />
              SAVE
            </Button>
          </div>
        </div>

        <div className="mt-12 text-center text-red-900 text-xs font-mono">
          <p>UAC SYSTEM CONFIGURATION</p>
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
