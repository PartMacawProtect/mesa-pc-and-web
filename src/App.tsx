import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Screen, Language } from "./types";
import LoginView from "./components/LoginView";
import RegisterView from "./components/RegisterView";
import ForgotPasswordView from "./components/ForgotPasswordView";
import VerifyView from "./components/VerifyView";
import NewPasswordView from "./components/NewPasswordView";
import ChatView from "./components/ChatView";

const isElectron = typeof window !== "undefined" && !!(window as any).electronAPI;

function ElectronTitlebar() {
  const handleMinimize = () => {
    (window as any).electronAPI?.minimize();
  };

  const handleMaximize = () => {
    (window as any).electronAPI?.maximize();
  };

  const handleClose = () => {
    (window as any).electronAPI?.close();
  };

  return (
    <div 
      style={{ WebkitAppRegion: "drag" } as any}
      className="fixed top-0 left-0 right-0 h-10 bg-[#090d16] border-b border-slate-800/80 flex items-center justify-between px-4 z-50 select-none cursor-default electron-drag"
    >
      {/* Left branding logo */}
      <div className="flex items-center gap-2 pointer-events-none select-none">
        <div className="w-5 h-5 rounded-lg bg-indigo-500/90 flex items-center justify-center text-[10px] font-extrabold text-white shadow-sm">
          M
        </div>
        <span className="text-xs font-extrabold text-[#94a3b8] tracking-wider font-sans">
          MESA
        </span>
        <span className="text-[9px] font-semibold text-slate-500 bg-slate-800/50 px-1.5 py-0.5 rounded-full uppercase tracking-widest font-mono">
          client
        </span>
      </div>

      {/* Right clean controls */}
      <div 
        style={{ WebkitAppRegion: "no-drag" } as any}
        className="flex items-center h-full gap-1 electron-no-drag"
      >
        <button
          onClick={handleMinimize}
          className="w-8 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/75 rounded-md transition-all duration-150 cursor-pointer border-none bg-transparent active:scale-95"
          title="Minimize"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
          </svg>
        </button>
        <button
          onClick={handleMaximize}
          className="w-8 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/75 rounded-md transition-all duration-150 cursor-pointer border-none bg-transparent active:scale-95"
          title="Maximize"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <rect x="4" y="4" width="16" height="16" rx="1.5" />
          </svg>
        </button>
        <button
          onClick={handleClose}
          className="w-8 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-rose-500/90 rounded-md transition-all duration-150 cursor-pointer border-none bg-transparent active:scale-95"
          title="Close"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [userEmail, setUserEmail] = useState(() => {
    return localStorage.getItem("mesa_user_email") || "";
  });
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem("mesa_user_name") || "";
  });
  const [screen, setScreen] = useState<Screen>(() => {
    const savedScreen = localStorage.getItem("mesa_screen");
    if (savedScreen && Object.values(Screen).includes(savedScreen as Screen)) {
      if (localStorage.getItem("mesa_user_email") && localStorage.getItem("mesa_user_name")) {
        return Screen.CHAT;
      }
    }
    return Screen.LOGIN;
  });
  const [language, setLanguage] = useState<Language>("RU"); // Defaulting to Russian (RU) as specified
  const [otpEmail, setOtpEmail] = useState("");
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [smtpError, setSmtpError] = useState("");

  const handleNavigate = (targetScreen: Screen) => {
    setScreen(targetScreen);
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 4500);
  };

  // 1. Reset email verification triggers
  const handleResetRequested = (email: string, code?: string, errorMsg?: string) => {
    setOtpEmail(email);
    setSmtpError(errorMsg || "");
    setIsPasswordReset(true);
    setScreen(Screen.VERIFY_CODE);
  };

  // 2. Token Code matches verified for password reset screen
  const handleVerifyResetSuccess = () => {
    setScreen(Screen.NEW_PASSWORD);
  };

  // 3. Password completely reset
  const handleResetSuccess = () => {
    triggerToast(
      language === "EN" 
        ? "Password successfully restored. Log in with your credentials." 
        : "Пароль успешно восстановлен. Пожалуйста, авторизуйтесь."
    );
    setScreen(Screen.LOGIN);
  };

  // 4. Registration state saved and verify OTP triggers
  const handleRegisterSuccess = (email: string, username: string, code?: string, errorMsg?: string) => {
    setOtpEmail(email);
    setUserEmail(email);
    setUserName(username);
    setSmtpError(errorMsg || "");
    setIsPasswordReset(false);
    setScreen(Screen.VERIFY_EMAIL);
  };

  // 5. Registration OTP successfully verified
  const handleVerifyEmailSuccess = () => {
    triggerToast(
      language === "EN" 
        ? "Email successfully verified! Welcome to Mesa." 
        : "Email успешно подтвержден! Добро пожаловать в Mesa."
    );
    localStorage.setItem("mesa_user_email", userEmail);
    localStorage.setItem("mesa_user_name", userName);
    localStorage.setItem("mesa_screen", Screen.CHAT);
    setScreen(Screen.CHAT);
  };

  // 6. Direct standard login
  const handleLoginSuccess = (email: string, name: string) => {
    setUserEmail(email);
    setUserName(name);
    localStorage.setItem("mesa_user_email", email);
    localStorage.setItem("mesa_user_name", name);
    localStorage.setItem("mesa_screen", Screen.CHAT);
    setScreen(Screen.CHAT);
  };

  const handleLogout = () => {
    setUserEmail("");
    setUserName("");
    localStorage.removeItem("mesa_user_email");
    localStorage.removeItem("mesa_user_name");
    localStorage.removeItem("mesa_screen");
    setScreen(Screen.LOGIN);
  };

  return (
    <div className={`bg-background h-screen w-screen overflow-hidden font-sans antialiased select-none relative flex flex-col ${isElectron ? "pt-10" : ""}`}>
      {isElectron && <ElectronTitlebar />}
      
      {/* Toast Notification HUD */}
      {toastMessage && (
        <div className={`fixed ${isElectron ? "top-14" : "top-8"} left-1/2 -translate-x-1/2 bg-primary text-on-primary font-semibold text-sm px-6 py-4 rounded-full shadow-2xl z-50 border border-primary-fixed-dim/20`}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">info</span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Frame Transitions with exit state animations */}
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.02, y: -10 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="h-full w-full overflow-hidden flex-grow"
        >
          {screen === Screen.LOGIN && (
            <LoginView
              language={language}
              onLanguageChange={handleLanguageChange}
              onNavigate={handleNavigate}
              onLoginSuccess={handleLoginSuccess}
            />
          )}

          {screen === Screen.REGISTER && (
            <RegisterView
              language={language}
              onLanguageChange={handleLanguageChange}
              onNavigate={handleNavigate}
              onRegisterSuccess={handleRegisterSuccess}
            />
          )}

          {screen === Screen.FORGOT_PASSWORD && (
            <ForgotPasswordView
              language={language}
              onLanguageChange={handleLanguageChange}
              onNavigate={handleNavigate}
              onResetRequested={handleResetRequested}
            />
          )}

          {screen === Screen.VERIFY_CODE && (
            <VerifyView
              language={language}
              onLanguageChange={handleLanguageChange}
              email={otpEmail}
              isPasswordReset={true}
              onNavigate={handleNavigate}
              onVerifySuccess={handleVerifyResetSuccess}
              initialSmtpError={smtpError}
            />
          )}

          {screen === Screen.VERIFY_EMAIL && (
            <VerifyView
              language={language}
              onLanguageChange={handleLanguageChange}
              email={otpEmail}
              isPasswordReset={false}
              onNavigate={handleNavigate}
              onVerifySuccess={handleVerifyEmailSuccess}
              initialSmtpError={smtpError}
            />
          )}

          {screen === Screen.NEW_PASSWORD && (
            <NewPasswordView
              language={language}
              onLanguageChange={handleLanguageChange}
              onNavigate={handleNavigate}
              onResetSuccess={handleResetSuccess}
              email={otpEmail}
            />
          )}

          {screen === Screen.CHAT && (
            <ChatView
              language={language}
              onLanguageChange={handleLanguageChange}
              userEmail={userEmail}
              userName={userName}
              onLogout={handleLogout}
              setUserName={setUserName}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
