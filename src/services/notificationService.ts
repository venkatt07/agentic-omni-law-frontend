import { apiClient } from "./apiClient";

export interface NotificationItemApi {
  id: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export const notificationService = {
  list() {
    return apiClient.get<NotificationItemApi[]>("/notifications");
  },
  unreadCount() {
    return apiClient.get<{ unread_count: number }>("/notifications/unread-count");
  },
  markAllRead() {
    return apiClient.patch<{ ok: boolean }>("/notifications/read-all");
  },
  markRead(id: string) {
    return apiClient.patch<{ id: string; read_at: string | null }>(`/notifications/${encodeURIComponent(id)}/read`);
  },
};
