import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(10),
  orderBy: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const dateRangeSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
}).refine(data => data.endDate >= data.startDate, {
  message: "End date must be after start date",
});

export const filterSchema = z.object({
  userId: z.string().optional(),
  productId: z.string().optional(),
  agentId: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  level: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

export const metricsSchema = z.object({
  totalRequests: z.number().int().min(0),
  averageResponseTime: z.number().min(0),
  errorRate: z.number().min(0).max(1),
  successRate: z.number().min(0).max(1),
  activeUsers: z.number().int().min(0),
  requestsPerMinute: z.number().min(0),
  averageTokensUsed: z.number().int().min(0),
  costPerRequest: z.number().min(0),
  totalCost: z.number().min(0),
});

export const notificationSchema = z.object({
  userId: z.string(),
  type: z.enum(['info', 'success', 'warning', 'error']),
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(1000),
  severity: z.enum(['low', 'medium', 'high']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const reviewSchema = z.object({
  productId: z.string(),
  userId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1).max(1000).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
export type FilterInput = z.infer<typeof filterSchema>;
export type MetricsInput = z.infer<typeof metricsSchema>;
export type NotificationInput = z.infer<typeof notificationSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>; 