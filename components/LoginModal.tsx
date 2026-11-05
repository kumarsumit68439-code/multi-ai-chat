"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginModal() {
  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithDiscord,
    signInWithGithub,
    signInWithLinkedIn,
    signInWithNotion,
  } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await signInWithEmail(email, password);
        if (error) setError(error);
      } else {
        const { error } = await signUpWithEmail(email, password);
        if (error) {
          setError(error);
        } else {
          setMessage(
            "Account created. Please check your email for a confirmation link (if enabled)."
          );
        }
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto">
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[var(--primary)]/20 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--primary)]">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold">Multi AI Chat</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Sign in to continue to free AI models
          </p>
        </div>

        <div className="px-6 pb-4 space-y-2.5">
          <button
            onClick={() => signInWithGoogle()}
            className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl bg-white text-black font-medium text-sm hover:bg-gray-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <button
            onClick={() => signInWithDiscord()}
            className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl bg-[#5865F2] text-white font-medium text-sm hover:bg-[#4752C4] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.078.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.078-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.548-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            Continue with Discord
          </button>

          <button
            onClick={() => signInWithGithub()}
            className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl bg-[#24292f] text-white font-medium text-sm hover:bg-[#1b1f23] transition-colors border border-white/10"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Continue with GitHub
          </button>

          <button
            onClick={() => signInWithLinkedIn()}
            className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl bg-[#0A66C2] text-white font-medium text-sm hover:bg-[#004182] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            Continue with LinkedIn
          </button>

          <button
            onClick={() => signInWithNotion()}
            className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl bg-white text-black font-medium text-sm hover:bg-gray-100 transition-colors border border-gray-200"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4.459 4.208c.746.606 1.047.703 2.434.747.435.015.87.03 1.304.03h9.606c.434 0 .87-.015 1.304-.03 1.387-.044 1.688-.141 2.434-.747.746-.606.97-1.47.97-2.434V1.774C22.511.809 21.701 0 20.736 0H3.264C2.299 0 1.489.809 1.489 1.774v.999c0 .964.224 1.828.97 2.434zM1.489 6.507v14.72c0 1.54 1.249 2.773 2.773 2.773h15.476c1.524 0 2.773-1.233 2.773-2.773V6.507H1.489zm4.71 11.94c0 .434-.37.804-.804.804H3.98c-.435 0-.804-.37-.804-.804v-7.5c0-.435.37-.805.804-.805h1.415c.435 0 .805.37.805.805v7.5zm6.015 0c0 .434-.37.804-.804.804H9.995c-.435 0-.805-.37-.805-.804v-7.5c0-.435.37-.805.805-.805h1.415c.434 0 .804.37.804.805v7.5zm6.015 0c0 .434-.37.804-.804.804h-1.415c-.435 0-.805-.37-.805-.804v-7.5c0-.435.37-.805.805-.805h1.415c.434 0 .804.37.804.805v7.5z" />
            </svg>
            Continue with Notion
          </button>
        </div>

        <div className="px-6 flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-[var(--border)]" />
          <span className="text-xs text-[var(--muted)]">or</span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>

        <form onSubmit={handleEmailAuth} className="px-6 pb-6 space-y-4">
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1.5">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/30 border border-[var(--border)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[var(--muted)] mb-1.5">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-black/30 border border-[var(--border)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-white"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>
          )}
          {message && (
            <p className="text-sm text-green-400 bg-green-500/10 px-3 py-2 rounded-lg">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {mode === "login" ? "Sign In" : "Create Account"}
          </button>

          <p className="text-center text-sm text-[var(--muted)]">
            {mode === "login" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("signup"); setError(null); setMessage(null); }}
                  className="text-[var(--primary)] hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("login"); setError(null); setMessage(null); }}
                  className="text-[var(--primary)] hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
