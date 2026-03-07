import { prisma } from "../../shared/db.js";

export function getNotificationsByUserId(userId: number) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export function getUnreadCount(userId: number) {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}

export function createNotification(data: {
  userId: number;
  type: "MENTION";
  message: string;
  link?: string;
}) {
  return prisma.notification.create({ data });
}

export function markAsRead(notificationId: number, userId: number) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true },
  });
}

export function markAllAsRead(userId: number) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}
