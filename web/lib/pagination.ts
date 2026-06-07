export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

export function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (
    value &&
    typeof value === 'object' &&
    'data' in value &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    return (value as { data: T[] }).data;
  }
  return [];
}

export function paginationMeta(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<PaginatedResponse<unknown>>;
  if (
    typeof candidate.total === 'number' &&
    typeof candidate.page === 'number' &&
    typeof candidate.totalPages === 'number'
  ) {
    return {
      total: candidate.total,
      page: candidate.page,
      totalPages: candidate.totalPages,
    };
  }
  return null;
}

export function paginationQuery(params?: PaginationParams): string {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.search?.trim()) query.set('search', params.search.trim());
  const value = query.toString();
  return value ? `?${value}` : '';
}
