export default function Loading() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-[var(--background)]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
        <p className="text-sm text-[var(--muted)]">Loading...</p>
      </div>
    </div>
  );
}
