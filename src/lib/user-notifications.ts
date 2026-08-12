import { apiRequest } from "@/lib/api";

export type UserNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string;
  entityId: string | null;
  read: boolean;
  createdAt: string;
};

export type UserNotificationList = {
  unreadCount: number;
  items: UserNotification[];
};

export async function listUserNotifications(limit = 30): Promise<UserNotificationList> {
  return apiRequest<UserNotificationList>(`/users/me/notifications?limit=${limit}`, {
    userAuth: true,
  });
}

export async function markUserNotificationRead(id: string) {
  return apiRequest<{ id: string; read: boolean }>(`/users/me/notifications/${id}/read`, {
    method: "PATCH",
    userAuth: true,
  });
}

export async function markAllUserNotificationsRead() {
  return apiRequest<{ updated: number }>("/users/me/notifications/read-all", {
    method: "POST",
    userAuth: true,
  });
}
