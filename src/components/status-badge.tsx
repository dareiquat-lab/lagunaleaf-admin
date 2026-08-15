import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  type: "order_status" | "payment_status";
  value: string;
}

export function StatusBadge({ type, value }: StatusBadgeProps) {
  if (type === "order_status") {
    switch (value) {
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="warning">Pending</Badge>;
    }
  }

  if (type === "payment_status") {
    switch (value) {
      case "paid":
        return <Badge variant="success">Paid</Badge>;
      case "partial":
        return <Badge variant="warning">Partial</Badge>;
      default:
        return <Badge variant="outline">Unpaid</Badge>;
    }
  }

  return <Badge>{value}</Badge>;
}
