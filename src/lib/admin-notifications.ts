import { apiRequest } from "@/lib/api";

export type AdminNotificationType =
  | "taxi_booking"
  | "stay_booking"
  | "enquiry"
  | "agency_signup"
  | "refund_request";

export type AdminNotification = {
  id: string;
  type: AdminNotificationType;
  title: string;
  body: string;
  href: string;
  entityId: string | null;
  read: boolean;
  createdAt: string;
};

export type AdminNotificationList = {
  unreadCount: number;
  items: AdminNotification[];
};

export async function listAdminNotifications(limit = 30): Promise<AdminNotificationList> {
  return apiRequest<AdminNotificationList>(`/admin/notifications?limit=${limit}`, { auth: true });
}

export async function markAdminNotificationRead(id: string) {
  return apiRequest<{ id: string; read: boolean }>(`/admin/notifications/${id}/read`, {
    method: "PATCH",
    auth: true,
  });
}

export async function markAllAdminNotificationsRead() {
  return apiRequest<{ updated: number }>("/admin/notifications/read-all", {
    method: "POST",
    auth: true,
  });
}
