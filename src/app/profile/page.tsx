"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { ProfileHeaderCard } from "@/components/profile/ProfileHeaderCard";
import { ProfileStatsGrid } from "@/components/profile/ProfileStatsGrid";
import { PasscodeInfoModal } from "@/components/profile/PasscodeInfoModal";
import { CopyField } from "@/components/ui/CopyField";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useLocale } from "@/hooks/useLocale";
import { useAccessToken } from "@/hooks/useAccessToken";
import {
  Mail,
  KeyRound,
  LogOut,
  ArrowLeft,
  RefreshCw,
  Clock,
  Sparkles,
  Inbox,
  AlertCircle,
  Bell,
} from "lucide-react";
import { useLetterNotifications } from "@/hooks/useLetterNotifications";

interface ProfileData {
  username: string;
  gender: string;
  expiresAt: number;
  unreadCount: number;
  totalEnvelopeCount: number;
  acceptsBottles: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const { t, locale } = useLocale();

  const [activeUsername, setActiveUsername] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  // Modals state
  const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState(false);
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);

  const { token, clearToken } = useAccessToken(activeUsername || undefined);
  const { permission, isSupported, isGranted, requestPermission } =
    useLetterNotifications(profileData?.username || activeUsername);

  // 1. Locate active session on client mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("chithi:token:")) {
          const u = key.replace("chithi:token:", "").trim();
          if (u) {
            setActiveUsername(u);
            return;
          }
        }
      }

      const match = document.cookie.match(/chithi_s_([a-zA-Z0-9_-]+)=/);
      if (match && match[1]) {
        setActiveUsername(match[1]);
        return;
      }

      setActiveUsername(null);
      setLoading(false);
    } catch {
      setActiveUsername(null);
      setLoading(false);
    }
  }, []);

  // 2. Fetch authoritative profile data from server
  const fetchProfile = useCallback(async () => {
    if (!activeUsername) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorStatus(null);

    try {
      const storedToken =
        token ||
        (typeof window !== "undefined"
          ? localStorage.getItem(`chithi:token:${activeUsername.toLowerCase()}`)
          : null);

      const headers: Record<string, string> = {};
      if (storedToken) {
        headers["Authorization"] = `Bearer ${storedToken}`;
      }

      const res = await fetch(
        `/api/mailbox/profile?username=${encodeURIComponent(
          activeUsername.toLowerCase()
        )}`,
        { headers }
      );

      if (res.status === 410) {
        // Mailbox clock expired
        setErrorStatus(410);
        setLoading(false);
        return;
      }

      if (res.status === 401 || res.status === 403) {
        // Invalid or unauthorized token
        clearToken();
        setErrorStatus(res.status);
        setLoading(false);
        return;
      }

      const json = await res.json();
      if (json.ok && json.data) {
        setProfileData(json.data);
      } else {
        setErrorStatus(res.status || 500);
      }
    } catch {
      setErrorStatus(500);
    } finally {
      setLoading(false);
    }
  }, [activeUsername, token, clearToken]);

  useEffect(() => {
    if (activeUsername) {
      fetchProfile();
    }
  }, [activeUsername, fetchProfile]);

  // Handle safe session disconnect
  const handleDisconnect = () => {
    if (activeUsername) {
      clearToken();
      if (typeof document !== "undefined") {
        document.cookie = `chithi_s_${activeUsername.toLowerCase()}=; path=/; max-age=0; SameSite=Lax`;
      }
    }
    setIsDisconnectModalOpen(false);
    router.push("/");
  };

  // Base URL for public link
  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/${profileData?.username || activeUsername || ""}`
      : `/${profileData?.username || activeUsername || ""}`;

  return (
    <PageShell className="max-w-4xl">
      <div className="space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-serif text-[#7C7069] hover:text-[#2D2522] transition-colors py-1.5 px-3 rounded-full hover:bg-[#FFFDF9] border border-transparent hover:border-[#EBE3D5]"
          >
            <ArrowLeft size={14} />
            <span>{t("profile.homeAction")}</span>
          </Link>

          <span className="text-[11px] font-mono tracking-widest uppercase text-[#6D4E12] bg-[#FEF3C7] border border-[#FDE68A] px-3.5 py-1 rounded-full">
            {t("profile.tag")}
          </span>
        </div>

        {/* STATE 1: Loading Skeleton */}
        {loading && (
          <div className="p-8 rounded-3xl bg-[#FFFDF9] border border-[#EBE3D5] shadow-[0_12px_32px_-8px_rgba(78,59,44,0.06)] space-y-6 animate-pulse">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-[#FAF7F2]" />
              <div className="space-y-2 flex-1">
                <div className="h-6 w-40 bg-[#FAF7F2] rounded-full" />
                <div className="h-4 w-28 bg-[#FAF7F2] rounded-full" />
              </div>
            </div>
            <div className="h-12 w-full bg-[#FAF7F2] rounded-2xl" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-28 bg-[#FAF7F2] rounded-2xl" />
              <div className="h-28 bg-[#FAF7F2] rounded-2xl" />
              <div className="h-28 bg-[#FAF7F2] rounded-2xl" />
            </div>
          </div>
        )}

        {/* STATE 2: Unauthorized / No Active Session */}
        {!loading && !profileData && (errorStatus === 401 || errorStatus === 403 || !activeUsername) && (
          <div className="p-8 sm:p-12 rounded-3xl bg-[#FFFDF9] dark:bg-[#170A24] border border-[#EBE3D5] dark:border-[#351D4D] shadow-[0_12px_32px_-8px_rgba(78,59,44,0.06)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] text-center space-y-5 max-w-lg mx-auto relative overflow-hidden transition-colors">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-28 h-6 washi-tape-buttercup rounded-sm" />

            <div className="w-16 h-16 rounded-2xl bg-[#FEF3C7] dark:bg-[#2B1B38] border border-[#FDE68A] dark:border-[#52336B] flex items-center justify-center text-[#D9534F] mx-auto shadow-sm">
              <Inbox size={28} strokeWidth={1.5} />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl font-serif font-bold text-[#2D2522] dark:text-[#FFF8F0]">
                {t("profile.unauthorizedTitle")}
              </h2>
              <p className="text-xs sm:text-sm text-[#7C7069] dark:text-[#A592A4] leading-relaxed max-w-sm mx-auto">
                {t("profile.unauthorizedDesc")}
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/recover" className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full rounded-full gap-2 font-medium shadow-sm"
                >
                  <KeyRound size={16} />
                  <span>{t("profile.loginAction")}</span>
                </Button>
              </Link>
              <Link href="/" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="md"
                  className="w-full rounded-full border-[#EBE3D5] dark:border-[#351D4D] hover:bg-[#FAF7F2] dark:hover:bg-[#1E0F2E] text-[#2D2522] dark:text-[#FFF8F0]"
                >
                  {t("profile.homeAction")}
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* STATE 3: Expired / Gone (Status 410) */}
        {!loading && errorStatus === 410 && (
          <div className="p-8 sm:p-12 rounded-3xl bg-[#FFFDF9] dark:bg-[#170A24] border border-[#EBE3D5] dark:border-[#351D4D] shadow-[0_12px_32px_-8px_rgba(78,59,44,0.06)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] text-center space-y-5 max-w-lg mx-auto relative overflow-hidden transition-colors">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-28 h-6 washi-tape-wax rounded-sm" />

            <div className="w-16 h-16 rounded-2xl bg-[#FAF7F2] dark:bg-[#1E0F2E] border border-[#EBE3D5] dark:border-[#351D4D] flex items-center justify-center text-[#7C7069] dark:text-[#A592A4] mx-auto shadow-sm">
              <Clock size={28} strokeWidth={1.5} />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl font-serif font-bold text-[#2D2522] dark:text-[#FFF8F0]">
                {t("profile.statusExpired")}
              </h2>
              <p className="text-xs sm:text-sm text-[#7C7069] dark:text-[#A592A4] leading-relaxed max-w-sm mx-auto">
                {t("profile.expiredMessage")}
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/" className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full rounded-full gap-2 font-medium shadow-sm"
                >
                  <Sparkles size={16} />
                  <span>{t("profile.createAnother")}</span>
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* STATE 4: Network / API Error */}
        {!loading && errorStatus && errorStatus !== 410 && (
          <div className="p-8 rounded-3xl bg-[#FFFDF9] dark:bg-[#170A24] border border-[#EBE3D5] dark:border-[#351D4D] shadow-[0_12px_32px_-8px_rgba(78,59,44,0.06)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] text-center space-y-4 max-w-md mx-auto transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5] flex items-center justify-center text-[#D9534F] mx-auto">
              <AlertCircle size={22} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-serif font-bold text-[#2D2522] dark:text-[#FFF8F0]">
                {t("errors.generic")}
              </h3>
              <p className="text-xs text-[#7C7069] dark:text-[#A592A4]">
                {t("errors.internal")}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchProfile}
              className="rounded-full gap-1.5 mx-auto border-[#EBE3D5] dark:border-[#351D4D] text-[#2D2522] dark:text-[#FFF8F0]"
            >
              <RefreshCw size={14} />
              <span>{t("profile.retry")}</span>
            </Button>
          </div>
        )}

        {/* STATE 5: Active Authenticated Profile */}
        {!loading && profileData && !errorStatus && (
          <div className="space-y-6">
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

            {/* 1. Header Card (Monogram, Username, Gender, Live Countdown) */}
            <ProfileHeaderCard
              username={profileData.username}
              gender={profileData.gender}
              expiresAt={profileData.expiresAt}
            />

            {/* 2. Authoritative Mailbox Statistics Row (Pastel Scrapbook Tiles) */}
            <ProfileStatsGrid
              username={profileData.username}
              unreadCount={profileData.unreadCount}
              totalEnvelopeCount={profileData.totalEnvelopeCount}
              acceptsBottles={profileData.acceptsBottles}
            />

            {/* 3. Public Mailbox URL Card (One-Tap Copy) */}
            <div className="relative p-6 sm:p-7 rounded-3xl bg-[#FFFDF9] dark:bg-[#170A24] border border-[#F0E2D2] dark:border-[#351D4D] shadow-xl space-y-3 overflow-hidden transition-colors">
              <div className="absolute -top-2 left-10 w-24 h-5 washi-tape-buttercup rounded-sm pointer-events-none" />

              <div className="space-y-1">
                <h3 className="text-base font-serif font-bold text-[#2C1E16] dark:text-[#FFF8F0]">
                  {t("profile.publicUrl.title")}
                </h3>
                <p className="text-xs text-[#7C7069] dark:text-[#A8988B] leading-relaxed">
                  {t("profile.publicUrl.helper")}
                </p>
              </div>

              <CopyField value={publicUrl} />
            </div>

            {/* 4. Action Controls Section (Open Inbox, Passcode, Disconnect) */}
            <div className="p-6 sm:p-7 rounded-3xl bg-[#FFFDF9] dark:bg-[#170A24] border border-[#F0E2D2] dark:border-[#351D4D] shadow-xl space-y-4 transition-colors">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Primary Action: Open Secret Inbox */}
                <Link
                  href={`/inbox/${profileData.username}`}
                  className="flex-1"
                >
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full rounded-full gap-2 font-semibold shadow-sm bg-[#FFE5B4] hover:bg-[#FCD34D] text-[#382A22] border border-[#F0D59E]"
                  >
                    <Mail size={18} strokeWidth={1.5} />
                    <span>{t("profile.actions.openInbox")}</span>
                  </Button>
                </Link>

                {/* Secondary Action 1: 6-Digit Passcode Info Modal */}
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => setIsPasscodeModalOpen(true)}
                  className="rounded-full border-[#F0E2D2] dark:border-[#351D4D] hover:bg-[#FAF7F2] dark:hover:bg-[#1E0F2E] text-[#2C1E16] dark:text-[#FFF8F0] gap-2 text-xs sm:text-sm font-medium"
                >
                  <KeyRound size={16} className="text-[#E88B60]" />
                  <span>{t("profile.actions.passcodeInfo")}</span>
                </Button>

                {/* Secondary Action 2: Disconnect / Switch Mailbox */}
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={() => setIsDisconnectModalOpen(true)}
                  className="rounded-full bg-[#FAF7F2] dark:bg-[#1E0F2E] hover:bg-[#EBE3D5] dark:hover:bg-[#2B143D] text-[#D9534F] border border-[#F0E2D2] dark:border-[#351D4D] gap-2 text-xs sm:text-sm font-medium"
                >
                  <LogOut size={16} strokeWidth={1.5} />
                  <span>{t("profile.actions.disconnect")}</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Passcode Security Information Modal */}
      <PasscodeInfoModal
        isOpen={isPasscodeModalOpen}
        onClose={() => setIsPasscodeModalOpen(false)}
      />

      {/* Disconnect Confirmation Modal */}
      <Modal
        isOpen={isDisconnectModalOpen}
        onClose={() => setIsDisconnectModalOpen(false)}
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-left p-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5] flex items-center justify-center text-[#D9534F] shadow-sm">
              <LogOut size={20} />
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold text-[#2D2522]">
                {t("profile.actions.disconnectConfirm")}
              </h3>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[#7C7069] leading-relaxed">
            {t("profile.actions.disconnectDesc")}
          </p>

          <div className="pt-2 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsDisconnectModalOpen(false)}
              className="rounded-full border-[#EBE3D5] text-[#7C7069]"
            >
              {t("profile.actions.cancelBtn")}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleDisconnect}
              className="rounded-full bg-[#D9534F] hover:bg-[#C2433F] text-white"
            >
              {t("profile.actions.confirmBtn")}
            </Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
