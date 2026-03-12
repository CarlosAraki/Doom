import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [, setLocation] = useLocation();
  const { login, register, isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/game");
    }
  }, [isAuthenticated, setLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login(email, password);
      toast.success(`Bem-vindo, ${email}!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await register(email, password);
      toast.success(`Conta criada com sucesso! Bem-vindo, ${email}!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao registrar");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = () => {
    try {
      window.location.href = getLoginUrl();
    } catch (error) {
      toast.error("Erro ao iniciar login com OAuth");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-red-600 font-bold text-2xl" style={{ fontFamily: "monospace" }}>
          LOADING...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black relative overflow-hidden">
      {/* Scanline effect background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, rgba(255,0,0,0.03) 0px, rgba(255,0,0,0.03) 1px, transparent 1px, transparent 2px)",
            animation: "flicker 0.15s infinite"
          }}
        />
      </div>

      {/* CRT border effect */}
      <div className="absolute inset-0 border-4 border-red-900/50 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="border-4 border-red-600 bg-black p-8 shadow-2xl" style={{ boxShadow: "0 0 20px rgba(220, 20, 60, 0.5)" }}>
          {/* Header */}
          <div className="text-center mb-8 border-b-2 border-red-600 pb-4">
            <h1 className="text-4xl font-bold text-red-600 mb-2" style={{ fontFamily: "monospace", textShadow: "0 0 10px rgba(220, 20, 60, 0.8)" }}>
              DOOM
            </h1>
            <p className="text-red-500 text-sm" style={{ fontFamily: "monospace" }}>
              {isRegistering ? "NEW ACCOUNT" : "LOGIN TERMINAL"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-red-500 font-bold" style={{ fontFamily: "monospace" }}>
                &gt; EMAIL
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="player@doom.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-black border-2 border-red-600 text-red-500 placeholder:text-red-900 focus:border-red-400 focus:shadow-lg focus:shadow-red-600/50"
                style={{ fontFamily: "monospace" }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-red-500 font-bold" style={{ fontFamily: "monospace" }}>
                &gt; PASSWORD
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-black border-2 border-red-600 text-red-500 placeholder:text-red-900 focus:border-red-400 focus:shadow-lg focus:shadow-red-600/50 pr-10"
                  style={{ fontFamily: "monospace" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-red-600 hover:text-red-400"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-red-600 hover:bg-red-700 text-black font-bold py-2 border-2 border-red-600 uppercase"
              style={{ fontFamily: "monospace" }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  <span>{isRegistering ? "CREATING..." : "CONNECTING..."}</span>
                </span>
              ) : (
                isRegistering ? "CREATE ACCOUNT" : "ENTER GAME"
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="border-t-2 border-red-600" />
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
              <span className="px-2 bg-black text-red-600 text-xs" style={{ fontFamily: "monospace" }}>OR</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              onClick={handleOAuthLogin}
              className="bg-black border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-black font-bold uppercase"
              style={{ fontFamily: "monospace" }}
            >
              Google
            </Button>
            <Button
              type="button"
              onClick={handleOAuthLogin}
              className="bg-black border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-black font-bold uppercase"
              style={{ fontFamily: "monospace" }}
            >
              GitHub
            </Button>
          </div>

          <p className="text-center text-red-600 text-sm mt-6" style={{ fontFamily: "monospace" }}>
            {isRegistering ? (
              <>
                HAVE ACCOUNT?{" "}
                <button
                  onClick={() => setIsRegistering(false)}
                  className="text-red-400 hover:text-red-300 font-bold underline"
                >
                  LOGIN
                </button>
              </>
            ) : (
              <>
                NO ACCOUNT?{" "}
                <button
                  onClick={() => setIsRegistering(true)}
                  className="text-red-400 hover:text-red-300 font-bold underline"
                >
                  REGISTER
                </button>
              </>
            )}
          </p>
        </div>

        {/* Footer text */}
        <div className="text-center mt-8 text-red-900 text-xs" style={{ fontFamily: "monospace" }}>
          <p>UAC SECURITY TERMINAL</p>
          <p>AUTHORIZED ACCESS ONLY</p>
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
