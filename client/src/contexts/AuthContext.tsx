import React, { createContext, useContext, useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

interface AuthContextType {
  isAuthenticated: boolean;
  user: { email: string } | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Queries e mutations do tRPC
  const meQuery = trpc.auth.me.useQuery();
  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();
  const logoutMutation = trpc.auth.logout.useMutation();

  // Verificar autenticação ao carregar
  useEffect(() => {
    if (meQuery.data) {
      setIsAuthenticated(true);
      setUser({ email: meQuery.data?.email || "user" });
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
    setIsLoading(false);
  }, [meQuery.data]);

  const login = async (email: string, password: string) => {
    if (!email || !password) {
      throw new Error("Email e senha são obrigatórios");
    }

    try {
      const result = await loginMutation.mutateAsync({ email, password });
      setIsAuthenticated(true);
      setUser({ email: result.email });
    } catch (error) {
      throw error;
    }
  };

  const register = async (email: string, password: string) => {
    if (!email || !password) {
      throw new Error("Email e senha são obrigatórios");
    }

    try {
      const result = await registerMutation.mutateAsync({ email, password });
      setIsAuthenticated(true);
      setUser({ email: result.email });
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
}
