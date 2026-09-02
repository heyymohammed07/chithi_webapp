"use client";

import React, { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { CountdownBanner } from "@/components/inbox/CountdownBanner";
import { InboxToolbar } from "@/components/inbox/InboxToolbar";
import { EnvelopeCard } from "@/components/envelope/EnvelopeCard";
import { EnvelopeOpenAnimation } from "@/components/envelope/EnvelopeOpenAnimation";
import { LetterReader } from "@/components/envelope/LetterReader";
import { LockedLetterGate } from "@/components/envelope/LockedLetterGate";
import { PostcardCanvas } from "@/components/postcard/PostcardCanvas";
import { useDownloadPostcard } from "@/components/postcard/useDownloadPostcard";
import { ReportDialog } from "@/components/system/ReportDialog";
import { Modal } from "@/components/ui/Modal";
import { MailboxKeyCard } from "@/components/inbox/MailboxKeyCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { LetterRecord, LetterSummary } from "@/lib/types";
import { useAccessToken } from "@/hooks/useAccessToken";
import { useToast } from "@/hooks/useToast";
import { useLocale } from "@/hooks/useLocale";
import { ShieldAlert, Copy, Bell } from "lucide-react";
import { useLetterNotifications } from "@/hooks/useLetterNotifications";

export default function InboxPage(props: {
  params: Promise<{ username: string }>;
}) {
  const resolvedParams = use(props.params);
  const username = resolvedParams.username;
  const usernameLower = username.toLowerCase();

  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const { token, saveToken, isLoaded: isTokenLoaded } = useAccessToken(username);
  const { permission, isSupported, isGranted, requestPermission } = useLetterNotifications(username);

  const [mailboxMeta, setMailboxMeta] = useState<{
    expiresAt: number;
    acceptsBottles: boolean;
  } | null>(null);

  const [letters, setLetters] = useState<LetterSummary[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [isFaded, setIsFaded] = useState(false);

  // Active filter: 'all' | 'unread'
  const filterParam = searchParams.get("filter");
  const [activeFilter, setActiveFilter] = useState<"all" | "unread">(
    filterParam === "unread" ? "unread" : "all"
  );

  useEffect(() => {
    if (filterParam === "unread" || filterParam === "all") {
      setActiveFilter(filterParam);
    }
  }, [filterParam]);

  // Active letter reader state
  const [activeLetter, setActiveLetter] = useState<LetterRecord | null>(null);
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [isAnimatingOpen, setIsAnimatingOpen] = useState(false);
  const [openingLetterId, setOpeningLetterId] = useState<string | null>(null);

  // Locked gate modal state
  const [lockedGateData, setLockedGateData] = useState<{
    letterId: string;
    lockKind: "capsule" | "riddle";
    unlockAt?: number;
    question?: string;
    attemptsLeft?: number;
  } | null>(null);

  // Key card modal state
  const [isKeyCardOpen, setIsKeyCardOpen] = useState(false);

  // Report dialog state
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);

  // Postcard export canvas ref
  const postcardCanvasRef = useRef<HTMLDivElement>(null);
  const { download: downloadPostcard } = useDownloadPostcard(postcardCanvasRef);
  const [postcardLetter, setPostcardLetter] = useState<LetterRecord | null>(null);

  // 1. URL key exchange and token stripping (§8.2)
  useEffect(() => {
    const keyParam = searchParams.get("key");
    if (keyParam) {
      saveToken(keyParam);
      // Strip key from URL to prevent Referer leaks per §8.2
      router.replace(`/inbox/${username}`);
    }
  }, [searchParams, username, saveToken, router]);

  // 2. Load inbox data
  const loadInbox = useCallback(async () => {
    if (!isTokenLoaded) return;

    try {
      // 1. Fetch public metadata first
      const metaRes = await fetch(`/api/mailbox/${encodeURIComponent(usernameLower)}`);
      const metaJson = await metaRes.json();

      if (!metaJson.ok) {
        if (metaRes.status === 410) {
          setIsFaded(true);
          setIsLoading(false);
          return;
        }
        setIsUnauthorized(true);
        setIsLoading(false);
        return;
      }

      setMailboxMeta(metaJson.data);

      // 2. Fetch letters list with authentication
      const listRes = await fetch(
        `/api/letters/list?username=${encodeURIComponent(usernameLower)}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      const listJson = await listRes.json();

      if (!listJson.ok) {
        if (listRes.status === 401 || listRes.status === 403) {
          setIsUnauthorized(true);
        }
        setIsLoading(false);
        return;
      }

      const letterList: LetterSummary[] = listJson.data.letters || [];
      setLetters(letterList);
      setUnreadCount(letterList.filter((l) => !l.isOpened).length);
      setIsUnauthorized(false);
    } catch {
      setIsUnauthorized(true);
    } finally {
      setIsLoading(false);
    }
  }, [isTokenLoaded, usernameLower, token]);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  // 3. Open letter flow (§11.4)
  const handleOpenLetter = async (letterId: string) => {
    setOpeningLetterId(letterId);

    try {
      const res = await fetch(
        `/api/letters/${letterId}?username=${encodeURIComponent(usernameLower)}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      const json = await res.json();

      if (json.ok) {
        const fullLetter: LetterRecord = json.data;

        // Start 3D envelope animation
        setIsAnimatingOpen(true);
        setActiveLetter(fullLetter);

        // Update local list unread status
        setLetters((prev) =>
          prev.map((l) => (l.id === letterId ? { ...l, isOpened: true } : l))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } else {
        if (res.status === 410) {
          showToast(t("errors.letterBurned"), "warn");
          setLetters((prev) => prev.filter((l) => l.id !== letterId));
        } else if (res.status === 423) {
          // Locked: show LockedLetterGate
          const errorDetails = json.error?.details;
          const unlockAt = errorDetails?.unlockAt?.[0]
            ? Number(errorDetails.unlockAt[0])
            : undefined;
          const question = errorDetails?.question?.[0];
          const attemptsLeft = errorDetails?.attemptsLeft?.[0]
            ? Number(errorDetails.attemptsLeft[0])
            : 5;

          setLockedGateData({
            letterId,
            lockKind: unlockAt ? "capsule" : "riddle",
            unlockAt,
            question,
            attemptsLeft,
          });
        } else {
          showToast(t(json.error?.message || "errors.generic"), "error");
        }
      }
    } catch {
      showToast(t("errors.generic"), "error");
    } finally {
      setOpeningLetterId(null);
    }
  };

  const handleUnlockedRiddle = (body: string) => {
    if (!lockedGateData) return;
    const foundSummary = letters.find((l) => l.id === lockedGateData.letterId);
    if (foundSummary) {
      setActiveLetter({
        id: foundSummary.id,
        recipient: usernameLower,
        body,
        paper: foundSummary.paper,
        stamp: foundSummary.stamp,
        hints: [],
        source: foundSummary.source,
        createdAt: foundSummary.createdAt,
        lock: { kind: "none" },
        burnAfterReading: foundSummary.burnAfterReading,
        openedAt: Date.now(),
        burnAt: foundSummary.burnAt,
        reaction: foundSummary.reaction,
        published: foundSummary.published,
        version: 1,
      });
      setLockedGateData(null);
      setIsReaderOpen(true);
      setLetters((prev) =>
        prev.map((l) => (l.id === foundSummary.id ? { ...l, isOpened: true } : l))
      );
    }
  };

  const handleDeleteLetter = async (letterId: string) => {
    await fetch(`/api/letters/${letterId}?username=${encodeURIComponent(usernameLower)}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    setLetters((prev) => prev.filter((l) => l.id !== letterId));
  };

  const handlePublishLetter = async (letterId: string) => {
    const res = await fetch(`/api/letters/${letterId}/publish?username=${encodeURIComponent(usernameLower)}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const json = await res.json();
    if (!json.ok) {
      throw new Error(json.error?.message || "errors.generic");
    }
    setLetters((prev) =>
      prev.map((l) => (l.id === letterId ? { ...l, published: true } : l))
    );
  };

  const handleReactToLetter = async (
    letterId: string,
    reaction: "heart" | "heartCrack"
  ) => {
    await fetch(`/api/letters/${letterId}/react?username=${encodeURIComponent(usernameLower)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ reaction }),
    });

    setLetters((prev) =>
      prev.map((l) => (l.id === letterId ? { ...l, reaction } : l))
    );
    if (activeLetter && activeLetter.id === letterId) {
      setActiveLetter({ ...activeLetter, reaction });
    }
  };

  if (isLoading) {
    return (
      <PageShell>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <Spinner size={32} />
          <p className="text-xs font-serif italic text-ash">
            Opening your mailbox...
          </p>
        </div>
      </PageShell>
    );
  }

  // Faded state (§16)
  if (isFaded) {
    return (
      <PageShell>
        <div className="max-w-md mx-auto py-12">
          <div className="border border-[#F0E2D2] dark:border-[#351D4D] rounded-3xl bg-[#FFFDF9] dark:bg-[#170A24] p-8 text-center space-y-5 shadow-xl transition-colors">
            <div className="w-12 h-1 bg-[#E88B60] mx-auto rounded-full" />
            <h1 className="text-2xl font-serif font-bold text-[#2C1E16] dark:text-[#FFF8F0]">
              {t("inbox.fadedTitle")}
            </h1>
            <p className="text-sm text-[#7C7069] dark:text-[#A8988B] leading-relaxed">
              {t("inbox.fadedDesc")}
            </p>
            <div className="pt-2">
              <Link href="/">
                <button
                  type="button"
                  className="bg-[#FFE5B4] hover:bg-[#FCD34D] text-[#382A22] font-semibold border border-[#F0D59E] shadow-sm px-6 py-2.5 rounded-full inline-flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
                >
                  {t("inbox.createOwn")}
                </button>
              </Link>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  // Unauthorized state (§16)
  if (isUnauthorized) {
    return (
      <PageShell>
        <div className="max-w-md mx-auto py-16 text-center space-y-5 border border-[#F0E2D2] dark:border-[#351D4D] rounded-3xl bg-[#FFF8F0] dark:bg-[#170A24] p-8 shadow-xl transition-colors">
          <div className="w-12 h-12 rounded-2xl border border-[#FDE68A] dark:border-[#52336B] flex items-center justify-center text-[#E88B60] bg-[#FEF08A] dark:bg-[#2B1B38] mx-auto">
            <ShieldAlert size={24} strokeWidth={1.5} />
          </div>
          <h1 className="text-xl font-serif font-bold text-[#382A22] dark:text-[#FFF8F0]">
            {t("inbox.unauthorizedTitle")}
          </h1>
          <p className="text-sm text-[#857367] dark:text-[#A592A4] leading-relaxed">
            {t("inbox.unauthorizedDesc")}
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/recover" className="w-full sm:w-auto">
              <Button variant="primary" className="w-full rounded-full bg-[#FFE5B4] hover:bg-[#FCD34D] text-[#382A22] font-semibold border border-[#F0D59E]">
                {t("inbox.usePasscode")}
              </Button>
            </Link>
            <Link href="/" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full rounded-full border-[#F0E2D2] dark:border-[#351D4D]">
                Home
              </Button>
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  const publicLink = typeof window !== "undefined"
    ? `${window.location.origin}/${username}`
    : `/${username}`;

  return (
    <PageShell>
      <div className="space-y-6 pb-36 sm:pb-44">
        {/* Sticky Countdown Banner (§11.5) */}
        {mailboxMeta && (
          <CountdownBanner
            expiresAt={mailboxMeta.expiresAt}
            onExpired={() => setIsFaded(true)}
          />
        )}

        {/* Incoming Letter Notification Opt-in Banner (§4.1) */}
        {isSupported && !isGranted && permission !== "denied" && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#FFE5B4]/50 dark:bg-[#170A24] border border-[#F0D59E] dark:border-[#351D4D] shadow-sm">
            <div className="flex items-center gap-2.5 text-xs text-[#382A22] dark:text-[#FFF8F0]">
              <Bell size={16} className="text-[#E88B60] shrink-0" />
              <span>
                {locale === "bn"
                  ? "🔔 নতুন চিঠির নোটিফিকেশন চালু করুন"
                  : "🔔 Enable browser alerts for new incoming letters"}
              </span>
            </div>
            <button
              type="button"
              onClick={requestPermission}
              className="px-3.5 py-1.5 rounded-full bg-[#FFE5B4] hover:bg-[#FCD34D] text-[#382A22] text-xs font-semibold border border-[#F0D59E] shadow-sm transition-transform active:scale-95 cursor-pointer shrink-0"
            >
              {locale === "bn" ? "অনুমতি দিন" : "Enable Alerts"}
            </button>
          </div>
        )}

        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#F0E2D2] dark:border-[#351D4D] pb-4">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#382A22] dark:text-[#FFF8F0]">
            <span className="text-[#E88B60]">@{username}</span>
            {t("inbox.title")}
          </h1>
          <p className="text-xs text-[#857367] dark:text-[#A592A4] font-serif italic">
            Confidential & Ephemeral
          </p>
        </div>

        {/* Toolbar with Active Filter Tabs */}
        <InboxToolbar
          username={username}
          unreadCount={unreadCount}
          totalCount={letters.length}
          acceptsBottles={mailboxMeta?.acceptsBottles ?? true}
          onOpenKeys={() => setIsKeyCardOpen(true)}
          activeFilter={activeFilter}
          onFilterChange={(f) => {
            setActiveFilter(f);
            router.replace(`/inbox/${username}?filter=${f}`, { scroll: false });
          }}
        />

        {/* Envelope List or Empty State */}
        {letters.length === 0 ? (
          <div className="py-12">
            <EmptyState
              title={t("inbox.empty.title")}
              description={t("inbox.empty.desc")}
              action={
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(publicLink);
                    showToast(t("keyCard.copied"), "success");
                  }}
                  className="bg-[#FFE5B4] hover:bg-[#FCD34D] text-[#382A22] font-semibold border border-[#F0D59E] shadow-sm px-6 py-2.5 rounded-full inline-flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
                >
                  <Copy size={16} strokeWidth={1.5} />
                  <span>{t("inbox.empty.copyCta")}</span>
                </button>
              }
            />
          </div>
        ) : (
          (() => {
            const displayedLetters = letters.filter((l) => {
              if (activeFilter === "unread") return !l.isOpened;
              return true;
            });

            if (displayedLetters.length === 0) {
              return (
                <div className="py-12 text-center space-y-2">
                  <p className="text-sm font-serif italic text-[#857367] dark:text-[#A592A4]">
                    {activeFilter === "unread"
                      ? locale === "bn"
                        ? "কোনো অপঠিত চিঠি নেই।"
                        : "No unread letters at the moment."
                      : locale === "bn"
                      ? "কোনো চিঠি পাওয়া যায়নি।"
                      : "No letters found."}
                  </p>
                  {activeFilter === "unread" && (
                    <button
                      type="button"
                      onClick={() => setActiveFilter("all")}
                      className="text-xs font-mono text-[#E88B60] hover:underline cursor-pointer"
                    >
                      {locale === "bn" ? "সকল চিঠি দেখুন" : "View all letters"}
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {displayedLetters.map((ltr) => (
                  <EnvelopeCard
                    key={ltr.id}
                    letter={ltr}
                    onClick={() => handleOpenLetter(ltr.id)}
                    isOpening={openingLetterId === ltr.id}
                  />
                ))}
              </div>
            );
          })()
        )}
      </div>

      {/* 3D Envelope Opening Animation (§11.4) */}
      <EnvelopeOpenAnimation
        isOpening={isAnimatingOpen}
        onAnimationComplete={() => {
          setIsAnimatingOpen(false);
          setIsReaderOpen(true);
        }}
      />

      {/* Full Letter Reader Modal */}
      <LetterReader
        letter={activeLetter}
        isOpen={isReaderOpen}
        onClose={() => {
          setIsReaderOpen(false);
          setActiveLetter(null);
        }}
        username={username}
        onDelete={handleDeleteLetter}
        onPublish={handlePublishLetter}
        onReact={handleReactToLetter}
        onDownloadPostcard={(ltr) => {
          setPostcardLetter(ltr);
          setTimeout(() => downloadPostcard(ltr), 50);
        }}
        onReport={(id) => setReportTargetId(id)}
      />

      {/* Locked Letter Gate Modal (Capsule or Riddle) */}
      <Modal
        isOpen={Boolean(lockedGateData)}
        onClose={() => setLockedGateData(null)}
      >
        {lockedGateData && (
          <LockedLetterGate
            letterId={lockedGateData.letterId}
            lockKind={lockedGateData.lockKind}
            unlockAt={lockedGateData.unlockAt}
            riddleQuestion={lockedGateData.question}
            attemptsRemaining={lockedGateData.attemptsLeft}
            username={username}
            onUnlocked={handleUnlockedRiddle}
          />
        )}
      </Modal>

      {/* Keys & Passcode Modal */}
      <Modal
        isOpen={isKeyCardOpen}
        onClose={() => setIsKeyCardOpen(false)}
        maxWidth="max-w-xl"
      >
        <MailboxKeyCard
          username={username}
          publicUrl={publicLink}
        />
      </Modal>

      {/* Report Modal */}
      <ReportDialog
        isOpen={Boolean(reportTargetId)}
        onClose={() => setReportTargetId(null)}
        targetType="letter"
        targetId={reportTargetId}
      />

      {/* Off-screen Postcard Canvas for 1080x1920 exports (§14) */}
      <PostcardCanvas letter={postcardLetter} canvasRef={postcardCanvasRef} />
    </PageShell>
  );
}
