import Link from "next/link";

export default function NotFound() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-[var(--background)] text-white px-4">
      <div className="w-16 h-16 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center mb-4 text-3xl">
        🤖
      </div>
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <p className="text-[var(--muted)] mb-6 text-center">
        This page doesn&apos;t exist. Maybe the AI hallucinated it.
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-sm font-medium transition-colors"
      >
        Back to Chat
      </Link>
    </div>
  );
}
