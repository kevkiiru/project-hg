export function pagination(page = 1, pageSize = 20) {
  const p = Math.max(1, Number(page) || 1);
  const ps = Math.min(100, Math.max(1, Number(pageSize) || 20));
  return { page: p, pageSize: ps, limit: ps, offset: (p - 1) * ps };
}

export function paginated<T>(rows: T[], total: number, page: number, pageSize: number) {
  return { data: rows, page, pageSize, total };
}
