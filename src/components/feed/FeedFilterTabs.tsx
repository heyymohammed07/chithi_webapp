"use client";

import React from "react";
import { TrendingUp, Clock } from "lucide-react";
import { Tabs } from "../ui/Tabs";
import { useLocale } from "@/hooks/useLocale";

export interface FeedFilterTabsProps {
  activeTab: "trending" | "latest";
  onChange: (tab: "trending" | "latest") => void;
}

export function FeedFilterTabs({ activeTab, onChange }: FeedFilterTabsProps) {
  const { t } = useLocale();

  return (
    <Tabs<"trending" | "latest">
      activeTab={activeTab}
      onChange={onChange}
      tabs={[
        {
          id: "trending",
          label: t("feed.trending"),
          icon: <TrendingUp size={16} strokeWidth={1.25} />,
        },
        {
          id: "latest",
          label: t("feed.latest"),
          icon: <Clock size={16} strokeWidth={1.25} />,
        },
      ]}
    />
  );
}
