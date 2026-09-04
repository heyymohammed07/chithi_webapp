import { Spinner } from "@/components/ui/Spinner";

export default function Loading() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-center">
      <Spinner size={28} />
      <p className="text-xs font-serif italic text-ink-muted">
        Brewing tea, gathering paper...
      </p>
    </div>
  );
}
