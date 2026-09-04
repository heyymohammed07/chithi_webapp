import { Spinner } from "@/components/ui/Spinner";

export default function InboxLoading() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-center">
      <Spinner size={28} />
      <p className="text-xs font-serif italic text-ink-muted">
        Unlocking mailbox, reading letters...
      </p>
    </div>
  );
}
