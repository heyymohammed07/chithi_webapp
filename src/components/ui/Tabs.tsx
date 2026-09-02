import React from "react";

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
}

export interface TabsProps<T extends string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  ariaLabel?: string;
}

export function Tabs<T extends string>({
  tabs,
  activeTab,
  onChange,
  ariaLabel = "Navigation Tabs",
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex items-center gap-6 border-b border-[#EBE3D5] dark:border-[#351D4D] overflow-x-auto select-none"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 py-3 px-1 text-sm font-medium transition-colors relative min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D9534F] focus-visible:outline-offset-2 ${
              isActive ? "text-[#2D2522] dark:text-[#FFF8F0] font-semibold" : "text-[#7C7069] dark:text-[#A592A4] hover:text-[#2D2522] dark:hover:text-[#FFF8F0]"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#D9534F] rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
