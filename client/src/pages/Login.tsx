import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock } from "lucide-react";

/**
 * Design Philosophy: Glassmorphism with Dynamic Gradient Background
 * - Frosted glass effect on login form with backdrop blur
 * - Dark gradient background (blue to purple to pink)
 * - Smooth animations and transitions
 * - Premium, modern aesthetic with depth and transparency
 */

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate login process
    setTimeout(() => {
      setIsLoading(false);
      alert(`Login com: ${email}`);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated gradient background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: "linear-gradient(-45deg, #1f2937, #374151, #4b5563, #1f2937)",
          backgroundSize: "400% 400%",
          animation: "gradient 15s ease infinite",
        }}
      />

      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-gray-600 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse z-0" />
      <div className="absolute -bottom-8 right-10 w-72 h-72 bg-gray-700 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse z-0" />
      <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-gray-500 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse z-0" />

      {/* Main container */}
      <div className="relative z-10 w-full max-w-md">
        {/* Glassmorphism card */}
        <div
          className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl fade-in-up"
          style={{
            boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
          }}
        >
          {/* Header with icon */}
          <div className="flex flex-col items-center mb-8">
            <div className="mb-4 p-4 bg-gradient-to-br from-gray-500 to-gray-700 rounded-2xl shadow-lg">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1
              className="text-3xl font-bold text-white text-center"
              style={{ fontFamily: "Playfair Display, serif" }}
            >
              Bem-vindo
            </h1>
            <p className="text-gray-300 text-center mt-2 text-sm">
              Acesse sua conta de forma segura
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-200 font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/15 focus:border-white/30 transition-all duration-200"
              />
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-200 font-medium">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/15 focus:border-white/30 transition-all duration-200 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember me and forgot password */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-white/20 bg-white/10 accent-blue-500 cursor-pointer"
                />
                <span className="text-gray-300 group-hover:text-gray-200 transition-colors">
                  Lembrar-me
                </span>
              </label>
              <a
                href="#"
                className="text-blue-300 hover:text-blue-200 transition-colors font-medium"
              >
                Esqueceu a senha?
              </a>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold py-2.5 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Entrando...</span>
                </span>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white/5 text-gray-400">Ou</span>
            </div>
          </div>

          {/* Social login buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="border-white/20 bg-white/5 text-gray-200 hover:bg-white/10 transition-all"
            >
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-white/20 bg-white/5 text-gray-200 hover:bg-white/10 transition-all"
            >
              GitHub
            </Button>
          </div>

          {/* Sign up link */}
          <p className="text-center text-gray-300 text-sm mt-6">
            Não tem uma conta?{" "}
            <a
              href="#"
              className="text-blue-300 hover:text-blue-200 font-semibold transition-colors"
            >
              Cadastre-se
            </a>
          </p>
        </div>

        {/* Illustration - shown on larger screens */}
        <div className="hidden lg:flex justify-center mt-8 opacity-80">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663185495106/CSegGTqXw5sLXf3QBNQyjF/login-illustration-RRmLs7EkU47uqxRKeQPrG4.webp"
            alt="Secure login illustration"
            className="w-64 h-64 object-contain drop-shadow-2xl"
          />
        </div>
      </div>

      {/* CSS for gradient animation */}
      <style>{`
        @keyframes gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </div>
  );
}
