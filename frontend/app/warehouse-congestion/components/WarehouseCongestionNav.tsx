"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, PlusCircle, History, BarChart3, Truck } from "lucide-react";

const LINKS = [
  { href: "/warehouse-congestion/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/warehouse-congestion/new", label: "Create Record", icon: PlusCircle },
  { href: "/warehouse-congestion/history", label: "History", icon: History },
  { href: "/warehouse-congestion/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/warehouse-congestion/driver", label: "Driver View", icon: Truck },
];

export default function WarehouseCongestionNav() {
  const pathname = usePathname();

  return (
    <div style={{
      display: "flex", gap: "0.375rem", flexWrap: "wrap",
      padding: "0.75rem", background: "var(--surface)",
      border: "1px solid var(--border)", borderRadius: "var(--radius-lg)",
      marginBottom: "1.5rem",
    }}>
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link key={href} href={href} style={{
            display: "flex", alignItems: "center", gap: "0.375rem",
            padding: "0.45rem 0.875rem", borderRadius: "var(--radius-pill)",
            fontSize: "0.8125rem", fontWeight: active ? 600 : 500,
            color: active ? "var(--accent)" : "var(--muted)",
            background: active ? "var(--accent-bg)" : "transparent",
            border: `1.5px solid ${active ? "var(--accent-border)" : "transparent"}`,
            textDecoration: "none", transition: "all 0.15s",
          }}>
            <Icon size={14} /> {label}
          </Link>
        );
      })}
    </div>
  );
}

export const CONGESTION_LEVEL_COLORS: Record<string, { bg: string; color: string }> = {
  Low: { bg: "#ECFDF5", color: "#059669" },
  Moderate: { bg: "#FFFBEB", color: "#D97706" },
  High: { bg: "#FFF7ED", color: "#EA580C" },
  Critical: { bg: "#FEF2F2", color: "#DC2626" },
  Unknown: { bg: "#F3F4F6", color: "#6B7280" },
};

export const EMPTY_FORM: Record<string, string> = {
  warehouseId: "", warehouseName: "", location: "", dockCount: "", warehouseCapacity: "",
  arrivalTime: "", dayOfWeek: "", month: "",
  trucksScheduledNextHour: "", trucksScheduledNext2Hours: "",
  trucksCurrentlyInside: "", trucksWaitingOutside: "",
  avgUnloadTime: "", avgLoadTime: "",
  weather: "", holiday: "", trafficDelay: "", festivalEventNearby: "",
  activeWorkers: "", equipmentAvailability: "", forkliftAvailability: "",
  dockUtilization: "", notes: "",
};

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
