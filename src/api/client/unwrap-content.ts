export function unwrapContent<T>(data: T): T {
  const wrapped = data as { content?: T };

  return wrapped?.content ?? data;
}
