export const BOOKING_STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" | "outline" }> = {
  requested: { label: "Requested", variant: "warning" },
  confirmed: { label: "Confirmed", variant: "default" },
  checked_in: { label: "Checked in", variant: "secondary" },
  in_progress: { label: "In progress", variant: "secondary" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  no_show: { label: "No-show", variant: "destructive" },
};

export const SOURCE_LABEL: Record<string, string> = { online: "Online", phone: "Phone", walk_in: "Walk-in" };
