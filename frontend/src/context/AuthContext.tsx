"use client";
import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { ApiError, clearStoredStaffToken, fetchSession, getStoredStaffToken, loginWithCredentials, setStoredStaffToken, SessionUser, type TenantChoice } from "@/lib/auth-api";

export type UserRole = "owner" | "employee" | "superadmin";

export type AuthUser = SessionUser;

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (email: string, password: string, tenantId?: string, remember?: boolean) => Promise<{ success: boolean; role?: UserRole; error?: string; requiresTenantSelection?: boolean; accounts?: TenantChoice[] }>;
  acceptToken: (token: string) => Promise<UserRole>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const hydrateSession = async () => {
      const storedToken = getStoredStaffToken();

      if (!storedToken) {
        setReady(true);
        return;
      }

      try {
        const session = await fetchSession(storedToken);
        setUser(session.user);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearStoredStaffToken();
        } else {
          setSessionError("No se pudo verificar tu sesión. Comprobá la conexión y volvé a intentar.");
        }
      } finally {
        setReady(true);
      }
    };

    void hydrateSession();
  }, [retry]);

  const login = async (
    email: string,
    password: string,
    tenantId?: string,
    remember = true,
  ): Promise<{ success: boolean; role?: UserRole; error?: string; requiresTenantSelection?: boolean; accounts?: TenantChoice[] }> => {
    try {
      const session = await loginWithCredentials(email, password, tenantId);
      if ("requiresTenantSelection" in session && session.requiresTenantSelection) {
        return {
          success: false,
          requiresTenantSelection: true,
          accounts: session.accounts,
        };
      }
      if ("user" in session && "token" in session) {
        setStoredStaffToken(session.token, remember);
        setUser(session.user);
        return { success: true, role: session.user.role };
      }
      return { success: false, error: "El servidor no devolvió una sesión válida." };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "No se pudo iniciar sesion.",
      };
    }
  };

  const acceptToken = useCallback(async (token: string) => {
    const session = await fetchSession(token);
    setStoredStaffToken(token);
    setUser(session.user);
    return session.user.role;
  }, []);

  const logout = () => {
    setUser(null);
    clearStoredStaffToken();
  };

  if (!ready || sessionError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground" role="status">
        <div className="max-w-md text-center">
          <p>{sessionError || "Verificando sesión…"}</p>
          {sessionError && <button className="mt-4 rounded-xl bg-[#FFE707] px-4 py-2 font-semibold text-[#190B47]" onClick={() => { setSessionError(""); setReady(false); setRetry((value) => value + 1); }}>Reintentar</button>}
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isReady: ready,
        login,
        acceptToken,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
