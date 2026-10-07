"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, UserRole } from "@/context/AuthContext";
import { API_BASE_URL } from "@/lib/auth-api";
import type { TenantChoice } from "@/lib/auth-api";
import { useI18n } from "@/context/I18nContext";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, acceptToken } = useAuth();
  const { t } = useI18n();
  const googleErrorParam = searchParams.get("googleError");

  const [pageReady, setPageReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [tenantChoices, setTenantChoices] = useState<TenantChoice[]>([]);
  const [touched, setTouched] = useState({ email: false, password: false });

  const valueProps = [t("login", "value1"), t("login", "value2"), t("login", "value3")];

  useEffect(() => {
    const timer = setTimeout(() => setPageReady(true), 220);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const googleToken = searchParams.get("googleToken");
    if (!googleToken) return;
    void acceptToken(googleToken).then((role) => {
      router.replace(role === "superadmin" ? "/superadmin" : "/");
    }).catch(() => {
      router.replace("/login");
      setErrorMessage("No se pudo verificar el acceso con Google. Volvé a intentar.");
    });
  }, [acceptToken, router, searchParams]);

  const emailError = useMemo(() => {
    if (!touched.email) return "";
    if (!email.trim()) return t("login", "validEmailRequired");
    if (!EMAIL_REGEX.test(email.trim())) return t("login", "invalidEmail");
    return "";
  }, [email, touched.email, t]);

  const passwordError = useMemo(() => {
    if (!touched.password) return "";
    if (!password.trim()) return t("login", "passwordRequired");
    return "";
  }, [password, touched.password, t]);

  const isFormValid =
    EMAIL_REGEX.test(email.trim()) &&
    password.length > 0 &&
    !emailError &&
    !passwordError;

  const redirectByRole = (role: UserRole) => {
    router.push(role === "superadmin" ? "/superadmin" : "/");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched({ email: true, password: true });
    setErrorMessage("");
    setSuccessMessage("");
    setTenantChoices([]);

    if (!isFormValid) {
      setErrorMessage(t("login", "invalidData"));
      return;
    }

    setLoading(true);
    const result = await login(email.trim(), password, undefined, rememberMe);
    setLoading(false);

    if (result.requiresTenantSelection) {
      setTenantChoices(result.accounts ?? []);
      return;
    }

    if (result.success) {
      setSuccessMessage(t("login", "loginSuccess"));
      setTimeout(() => {
        redirectByRole(result.role ?? "owner");
      }, 260);
      return;
    }

    setErrorMessage(result.error ?? t("login", "loginFailed"));
  };

  const handleTenantSelection = async (tenantId: string) => {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    const result = await login(email.trim(), password, tenantId, rememberMe);
    setLoading(false);

    if (result.success) {
      setSuccessMessage(t("login", "sessionStarted"));
      setTimeout(() => redirectByRole(result.role ?? "owner"), 260);
      return;
    }

    setErrorMessage(result.error ?? t("login", "loginFailedSelectedShop"));
  };

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    window.location.href = `${API_BASE_URL}/auth/google/start`;
  };

  if (!pageReady) {
    return (
      <main className="min-h-screen bg-[#190B47] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-5">
          <section className="animate-pulse rounded-2xl border border-white/10 bg-[#2400A2] p-6 lg:col-span-3">
            <div className="h-6 w-2/3 rounded bg-white/30" />
            <div className="mt-4 h-4 w-3/4 rounded bg-white/20" />
            <div className="mt-7 space-y-3">
              <div className="h-10 rounded bg-white/15" />
              <div className="h-10 rounded bg-white/15" />
              <div className="h-10 rounded bg-white/15" />
            </div>
          </section>
          <section className="animate-pulse rounded-2xl border border-white/10 bg-[#2400A2] p-6 lg:col-span-2">
            <div className="h-6 w-1/2 rounded bg-white/30" />
            <div className="mt-5 h-11 rounded bg-white/20" />
            <div className="mt-3 h-11 rounded bg-white/20" />
            <div className="mt-6 h-11 rounded bg-white/25" />
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#190B47] px-4 py-6 text-[#FFFFFF] sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-5">
        <section className="login-fade-in relative order-2 overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(140deg,#190B47_0%,#2400A2_78%,#190B47_100%)] p-6 text-white shadow-[0_24px_70px_rgba(3,1,18,0.35)] lg:order-2 lg:col-span-3 lg:p-8">
          <div className="pointer-events-none absolute -right-16 top-10 h-56 w-56 rounded-full bg-[#FFE707]/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 left-8 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

          <h1 className="max-w-xl text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
            {t("login", "heroTitle")}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
            {t("login", "heroDescription")}
          </p>

          <ul className="mt-6 space-y-3">
            {valueProps.map((item) => (
              <li key={item} className="flex items-start gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3">
                <CheckIcon />
                <span className="text-sm font-medium text-white sm:text-base">{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-7 rounded-xl border border-white/15 bg-[#190B47]/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8A8A80]">{t("login", "dashboardPreview")}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-white/15 bg-white/10 p-3">
                <p className="text-xs text-white/75">{t("login", "shiftsOfDay")}</p>
                <p className="mt-1 text-xl font-semibold">18</p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/10 p-3">
                <p className="text-xs text-white/75">{t("login", "activeWorkOrders")}</p>
                <p className="mt-1 text-xl font-semibold">11</p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/10 p-3">
                <p className="text-xs text-white/75">{t("login", "billed")}</p>
                <p className="mt-1 text-xl font-semibold">$2.4M</p>
              </div>
            </div>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white">
            <span className="inline-block h-2 w-2 rounded-full bg-[#FFE707]" aria-hidden="true" />
            {t("login", "encryptedData")}
          </div>
        </section>

        <section className="login-fade-in order-1 rounded-2xl border border-white/15 bg-[#2400A2] p-6 shadow-[0_18px_55px_rgba(3,1,18,0.35)] lg:order-1 lg:col-span-2 lg:p-8">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="inline-flex items-center text-2xl font-bold tracking-tight text-white">
              <span className="logo-pulse">81</span>
              <span className="text-[#FFE707]">cc</span>
            </Link>
            <LocaleSwitcher />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-white">{t("login", "welcomeTitle")}</h2>
          <p className="mt-2 text-sm text-[#8A8A80]">{t("login", "welcomeSubtitle")}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-white">
                {t("login", "email")}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                aria-label={t("login", "email")}
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? "email-error" : undefined}
                value={email}
                onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setErrorMessage("");
                }}
                placeholder="tu@taller.com"
                className={`h-11 w-full rounded-lg border bg-[#190B47]/65 px-3 text-sm text-white outline-none transition focus:ring-2 focus:ring-[#FFE707]/30 ${
                  emailError ? "border-red-300 focus:border-red-300" : "border-[#8A8A80]/45 focus:border-[#FFE707]"
                }`}
              />
              {emailError ? (
                <p id="email-error" className="mt-1 text-xs font-medium text-red-200">
                  {emailError}
                </p>
              ) : null}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-white">
                  {t("login", "password")}
                </label>
                <Link href="/forgot-password" className="text-xs font-medium text-[#8A8A80] hover:text-white">
                  {t("login", "forgotPassword")}
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  aria-label={t("login", "password")}
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby={passwordError ? "password-error" : undefined}
                  value={password}
                  onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setErrorMessage("");
                  }}
                  placeholder={t("login", "passwordPlaceholder")}
                  className={`h-11 w-full rounded-lg border bg-[#190B47]/65 px-3 pr-16 text-sm text-white outline-none transition focus:ring-2 focus:ring-[#FFE707]/30 ${
                    passwordError ? "border-red-300 focus:border-red-300" : "border-[#8A8A80]/45 focus:border-[#FFE707]"
                  }`}
                />
                <button
                  type="button"
                  aria-label={showPassword ? t("login", "hide") : t("login", "show")}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8A8A80] transition hover:text-white"
                >
                  {showPassword ? t("login", "hide") : t("login", "show")}
                </button>
              </div>
              {passwordError ? (
                <p id="password-error" className="mt-1 text-xs font-medium text-red-200">
                  {passwordError}
                </p>
              ) : null}
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-white">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="h-4 w-4 rounded border-[#8A8A80]/60 bg-transparent text-[#FFE707] focus:ring-[#FFE707]"
              />
              {t("login", "rememberMe")}
            </label>

            {errorMessage || googleErrorParam ? (
              <div className="rounded-lg border border-red-300/35 bg-red-950/35 px-3 py-2 text-sm text-red-100">
                {errorMessage || googleErrorParam}
              </div>
            ) : null}
            {successMessage ? (
              <div className="rounded-lg border border-emerald-300/35 bg-emerald-950/35 px-3 py-2 text-sm text-emerald-100">
                {successMessage}
              </div>
            ) : null}

            {tenantChoices.length ? (
              <div className="rounded-lg border border-[#8A8A80]/40 bg-[#190B47]/60 p-3">
                <p className="text-sm font-semibold text-white">{t("login", "multiWorkshopTitle")}</p>
                <p className="mt-1 text-xs text-[#8A8A80]">{t("login", "multiWorkshopHint")}</p>
                <div className="mt-2 space-y-2">
                  {tenantChoices.map((account) => (
                    <button
                      key={account.tenantId}
                      type="button"
                      onClick={() => void handleTenantSelection(account.tenantId)}
                      className="w-full rounded-lg border border-[#8A8A80]/40 bg-[#2400A2] px-3 py-2 text-left text-sm font-medium text-white transition hover:border-[#FFE707]/65 hover:bg-[#190B47]"
                    >
                      {account.tenantName}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <button
              id="login-btn"
              type="submit"
              disabled={loading}
              className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#FFE707] px-4 text-sm font-semibold text-[#190B47] transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#FFE707]/50 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#190B47]/30 border-t-[#190B47]" />
                  {t("login", "signingIn")}
                </>
              ) : (
                t("login", "signIn")
              )}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-[#8A8A80]/35" />
            <span className="text-xs font-medium uppercase tracking-wide text-[#8A8A80]">{t("login", "or")}</span>
            <span className="h-px flex-1 bg-[#8A8A80]/35" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#8A8A80]/45 bg-[#190B47]/55 px-4 text-sm font-semibold text-white transition hover:border-[#FFE707]/60 hover:bg-[#190B47] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {googleLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {t("login", "redirectingGoogle")}
              </>
            ) : (
              t("login", "continueWithGoogle")
            )}
          </button>

          <div className="mt-5 space-y-2 text-sm">
            <p className="text-[#8A8A80]">
              {t("login", "noAccount")}{" "}
              <Link href="/registro" className="font-semibold text-[#FFE707] hover:text-white">
                {t("login", "createAccount")}
              </Link>
            </p>
            <Link href="/portal" className="inline-block font-medium text-[#8A8A80] hover:text-white">
              {t("login", "viewPortal")}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="mt-0.5 h-5 w-5 shrink-0 text-[#FFE707]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
