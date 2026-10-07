"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

export type Locale = "es" | "en" | "pt";

const STORAGE_KEY = "81cc_locale";

const MESSAGES = {
  es: {
    common: {
      language: "Idioma",
      spanish: "Español",
      english: "Inglés",
      portuguese: "Portugués",
      loading: "Cargando...",
    },
    shell: {
      dashboard: "Dashboard",
      shifts: "Turnos",
      orders: "Órdenes",
      directory: "Directorio",
      finance: "Finanzas",
      team: "Equipo",
      account: "Cuenta",
      sessions: "Sesiones",
      activeWorkshop: "Taller activo",
      connectedWorkspace: "Espacio operativo conectado",
      accountReady: "Cuenta lista",
      shellSummary: "Turnos, órdenes, clientes y caja en una sola consola.",
      ownerAdmin: "Dueño / Admin",
      employee: "Empleado",
      superAdmin: "Super Admin",
      logout: "Cerrar sesión",
    },
    dashboard: {
      operationLabel: "Operación diaria",
      welcome: "Bienvenido",
      headerDescription: "Controla el estado del taller, los turnos y las órdenes activas desde una única vista clara.",
      recentMovements: "próximos turnos para seguimiento.",
      noShiftsToday: "No hay próximos turnos pendientes.",
      reviewMessageStart: "Tu solicitud de plan",
      reviewMessageEnd: "está en revisión por 81cc.",
      accountStatus: "Ver estado de cuenta",
      shiftsToday: "Turnos de hoy",
      vehiclesInShop: "Vehículos en taller",
      activeOrders: "Órdenes activas",
      agenda: "Agenda",
      inProcess: "En proceso",
      tracking: "Seguimiento",
      upcomingShifts: "Próximos turnos",
      latestMovements: "Próximos turnos pendientes de ingreso",
      viewShifts: "Ver turnos",
      noShiftsLoaded: "Todavía no hay turnos cargados.",
      quickActions: "Acciones rápidas",
      quickActionsHint: "Tareas frecuentes para la operación diaria.",
      registerEntry: "Registrar ingreso",
      registerEntryHint: "Alta de cliente, vehículo y turno",
      manageOrders: "Gestionar órdenes",
      manageOrdersHint: "Actualizar estado y diagnóstico",
      customerPortal: "Portal clientes",
      customerPortalHint: "Ver experiencia del cliente final",
      accountOverview: "Estado de cuenta",
      accountOverviewHint: "Plan contratado, vigencia y capacidad",
    },
    login: {
      heroTitle: "Gestión de taller simplificada",
      heroDescription: "81cc centraliza turnos, inventario, clientes y órdenes para que sigas el trabajo del taller.",
      value1: "Turnos y clientes organizados",
      value2: "Control de inventario en tiempo real",
      value3: "Seguimiento de órdenes y costos",
      dashboardPreview: "Ejemplo ilustrativo · datos de demostración",
      shiftsOfDay: "Turnos de hoy",
      activeWorkOrders: "OT activas",
      billed: "Presupuestado",
      testimonial: "\"Pasé de Excel a 81cc y recuperé 5 horas por semana\" - Carlos M., Taller San Martín",
      encryptedData: "Acceso con cuenta de taller",
      welcomeTitle: "Bienvenido a 81cc",
      welcomeSubtitle: "Plataforma integral para talleres mecánicos",
      email: "Correo electrónico",
      password: "Contraseña",
      forgotPassword: "¿Olvidaste tu contraseña?",
      rememberMe: "Recordarme",
      signIn: "Iniciar sesión",
      signingIn: "Iniciando sesión...",
      continueWithGoogle: "Continuar con Google",
      redirectingGoogle: "Redirigiendo a Google...",
      noAccount: "¿No tenés cuenta?",
      createAccount: "Crear cuenta",
      viewPortal: "Ver portal de clientes",
      hide: "Ocultar",
      show: "Ver",
      or: "o",
      multiWorkshopTitle: "Este usuario trabaja en varios talleres.",
      multiWorkshopHint: "Selecciona dónde quieres iniciar esta sesión.",
      validEmailRequired: "El correo electrónico es obligatorio.",
      invalidEmail: "El email no es válido.",
      passwordRequired: "La contraseña es obligatoria.",
      passwordLength: "La contraseña debe tener al menos 6 caracteres.",
      invalidData: "Revisá los datos ingresados para continuar.",
      loginFailed: "No se pudo iniciar sesión.",
      loginFailedSelectedShop: "No se pudo iniciar sesión en el taller seleccionado.",
      loginSuccess: "Acceso correcto. Redirigiendo...",
      sessionStarted: "Sesión iniciada. Redirigiendo...",
      passwordPlaceholder: "Ingresa tu contraseña",
    },
  },
  en: {
    common: {
      language: "Language",
      spanish: "Spanish",
      english: "English",
      portuguese: "Portuguese",
      loading: "Loading...",
    },
    shell: {
      dashboard: "Dashboard",
      shifts: "Shifts",
      orders: "Orders",
      directory: "Directory",
      finance: "Finance",
      team: "Team",
      account: "Account",
      sessions: "Sessions",
      activeWorkshop: "Active workshop",
      connectedWorkspace: "Connected workspace",
      accountReady: "Account ready",
      shellSummary: "Shifts, work orders, clients and cash flow in one console.",
      ownerAdmin: "Owner / Admin",
      employee: "Employee",
      superAdmin: "Super Admin",
      logout: "Log out",
    },
    dashboard: {
      operationLabel: "Daily operations",
      welcome: "Welcome",
      headerDescription: "Track workshop status, shifts, and active work orders from one clear view.",
      recentMovements: "upcoming appointments to follow up.",
      noShiftsToday: "No upcoming pending appointments.",
      reviewMessageStart: "Your plan request",
      reviewMessageEnd: "is under review by 81cc.",
      accountStatus: "View account status",
      shiftsToday: "Today's shifts",
      vehiclesInShop: "Vehicles in workshop",
      activeOrders: "Active orders",
      agenda: "Agenda",
      inProcess: "In progress",
      tracking: "Tracking",
      upcomingShifts: "Upcoming shifts",
      latestMovements: "Upcoming appointments awaiting intake",
      viewShifts: "View shifts",
      noShiftsLoaded: "No shifts loaded yet.",
      quickActions: "Quick actions",
      quickActionsHint: "Frequent tasks for daily operations.",
      registerEntry: "Register intake",
      registerEntryHint: "Create client, vehicle and shift",
      manageOrders: "Manage orders",
      manageOrdersHint: "Update status and diagnostics",
      customerPortal: "Customer portal",
      customerPortalHint: "View customer experience",
      accountOverview: "Account overview",
      accountOverviewHint: "Plan, validity and capacity",
    },
    login: {
      heroTitle: "Workshop management made simple",
      heroDescription: "81cc centralizes appointments, inventory, clients and work orders to track your workshop.",
      value1: "Shifts and customers organized",
      value2: "Real-time inventory control",
      value3: "Work order and cost tracking",
      dashboardPreview: "Illustrative example · demo data",
      shiftsOfDay: "Today's shifts",
      activeWorkOrders: "Active WOs",
      billed: "Quoted",
      testimonial: "\"I moved from Excel to 81cc and recovered 5 hours per week\" - Carlos M., Taller San Martín",
      encryptedData: "Workshop account access",
      welcomeTitle: "Welcome to 81cc",
      welcomeSubtitle: "Integrated platform for auto repair shops",
      email: "Email",
      password: "Password",
      forgotPassword: "Forgot your password?",
      rememberMe: "Remember me",
      signIn: "Sign in",
      signingIn: "Signing in...",
      continueWithGoogle: "Continue with Google",
      redirectingGoogle: "Redirecting to Google...",
      noAccount: "Don’t have an account?",
      createAccount: "Create account",
      viewPortal: "View customer portal",
      hide: "Hide",
      show: "Show",
      or: "or",
      multiWorkshopTitle: "This user works in multiple workshops.",
      multiWorkshopHint: "Select where you want to start this session.",
      validEmailRequired: "Email is required.",
      invalidEmail: "Email is not valid.",
      passwordRequired: "Password is required.",
      passwordLength: "Password must be at least 6 characters.",
      invalidData: "Check the entered data to continue.",
      loginFailed: "Could not sign in.",
      loginFailedSelectedShop: "Could not sign in to the selected workshop.",
      loginSuccess: "Access granted. Redirecting...",
      sessionStarted: "Session started. Redirecting...",
      passwordPlaceholder: "Enter your password",
    },
  },
  pt: {
    common: {
      language: "Idioma",
      spanish: "Espanhol",
      english: "Inglês",
      portuguese: "Português",
      loading: "Carregando...",
    },
    shell: {
      dashboard: "Painel",
      shifts: "Turnos",
      orders: "Ordens",
      directory: "Diretório",
      finance: "Finanças",
      team: "Equipe",
      account: "Conta",
      sessions: "Sessões",
      activeWorkshop: "Oficina ativa",
      connectedWorkspace: "Espaço conectado",
      accountReady: "Conta pronta",
      shellSummary: "Turnos, ordens, clientes e caixa em um único console.",
      ownerAdmin: "Dono / Admin",
      employee: "Funcionário",
      superAdmin: "Super Admin",
      logout: "Encerrar sessão",
    },
    dashboard: {
      operationLabel: "Operação diária",
      welcome: "Bem-vindo",
      headerDescription: "Controle o estado da oficina, os turnos e as ordens ativas em uma única visão clara.",
      recentMovements: "próximos agendamentos para acompanhar.",
      noShiftsToday: "Não há próximos agendamentos pendentes.",
      reviewMessageStart: "Sua solicitação de plano",
      reviewMessageEnd: "está em revisão pela 81cc.",
      accountStatus: "Ver estado da conta",
      shiftsToday: "Turnos de hoje",
      vehiclesInShop: "Veículos na oficina",
      activeOrders: "Ordens ativas",
      agenda: "Agenda",
      inProcess: "Em processo",
      tracking: "Acompanhamento",
      upcomingShifts: "Próximos turnos",
      latestMovements: "Próximos agendamentos aguardando entrada",
      viewShifts: "Ver turnos",
      noShiftsLoaded: "Ainda não há turnos carregados.",
      quickActions: "Ações rápidas",
      quickActionsHint: "Tarefas frequentes para a operação diária.",
      registerEntry: "Registrar entrada",
      registerEntryHint: "Cadastro de cliente, veículo e turno",
      manageOrders: "Gerenciar ordens",
      manageOrdersHint: "Atualizar status e diagnóstico",
      customerPortal: "Portal de clientes",
      customerPortalHint: "Ver experiência do cliente final",
      accountOverview: "Estado da conta",
      accountOverviewHint: "Plano contratado, vigência e capacidade",
    },
    login: {
      heroTitle: "Gestão da oficina simplificada",
      heroDescription: "A 81cc centraliza agendamentos, inventário, clientes e ordens para acompanhar a oficina.",
      value1: "Turnos e clientes organizados",
      value2: "Controle de inventário em tempo real",
      value3: "Acompanhamento de ordens e custos",
      dashboardPreview: "Exemplo ilustrativo · dados de demonstração",
      shiftsOfDay: "Turnos do dia",
      activeWorkOrders: "OS ativas",
      billed: "Orçado",
      testimonial: "\"Saí do Excel para a 81cc e recuperei 5 horas por semana\" - Carlos M., Taller San Martín",
      encryptedData: "Acesso com conta da oficina",
      welcomeTitle: "Bem-vindo à 81cc",
      welcomeSubtitle: "Plataforma integral para oficinas mecânicas",
      email: "E-mail",
      password: "Senha",
      forgotPassword: "Esqueceu sua senha?",
      rememberMe: "Lembrar-me",
      signIn: "Entrar",
      signingIn: "Entrando...",
      continueWithGoogle: "Continuar com Google",
      redirectingGoogle: "Redirecionando para o Google...",
      noAccount: "Não tem conta?",
      createAccount: "Criar conta",
      viewPortal: "Ver portal de clientes",
      hide: "Ocultar",
      show: "Ver",
      or: "ou",
      multiWorkshopTitle: "Este usuário trabalha em várias oficinas.",
      multiWorkshopHint: "Selecione onde deseja iniciar esta sessão.",
      validEmailRequired: "O e-mail é obrigatório.",
      invalidEmail: "O e-mail não é válido.",
      passwordRequired: "A senha é obrigatória.",
      passwordLength: "A senha deve ter pelo menos 6 caracteres.",
      invalidData: "Revise os dados informados para continuar.",
      loginFailed: "Não foi possível entrar.",
      loginFailedSelectedShop: "Não foi possível entrar na oficina selecionada.",
      loginSuccess: "Acesso correto. Redirecionando...",
      sessionStarted: "Sessão iniciada. Redirecionando...",
      passwordPlaceholder: "Digite sua senha",
    },
  },
} as const;

type MessageScope = keyof (typeof MESSAGES)["es"];
type MessageKey<S extends MessageScope> = keyof (typeof MESSAGES)["es"][S];

type I18nContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: <S extends MessageScope>(scope: S, key: MessageKey<S>) => string;
};

const I18nContext = createContext<I18nContextType | null>(null);

function normalizeLocale(rawLocale: string | null | undefined): Locale {
  if (!rawLocale) return "es";
  const value = rawLocale.toLowerCase();
  if (value.startsWith("en")) return "en";
  if (value.startsWith("pt")) return "pt";
  return "es";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return "es";
    const storedLocale = localStorage.getItem(STORAGE_KEY);
    const browserLocale = navigator.language;
    return normalizeLocale(storedLocale ?? browserLocale);
  });

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    localStorage.setItem(STORAGE_KEY, nextLocale);
  };

  const value = useMemo<I18nContextType>(
    () => ({
      locale,
      setLocale,
      t: (scope, key) =>
        ((MESSAGES[locale][scope] as Record<string, string>)[key as string] ??
          (MESSAGES.es[scope] as Record<string, string>)[key as string] ??
          String(key)) as string,
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside <I18nProvider>");
  }
  return context;
}
