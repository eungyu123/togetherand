/**
 * 현재 시간을 한국 시간으로 반환
 */
export function getKoreanTime(): Date {
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());
  const dateTimeParts: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      dateTimeParts[part.type] = part.value;
    }
  }

  return new Date(
    `${dateTimeParts.year}-${dateTimeParts.month}-${dateTimeParts.day}T${dateTimeParts.hour}:${dateTimeParts.minute}:${dateTimeParts.second}+09:00`
  );
}

/**
 * 현재 한국 시간을 포맷팅하여 반환
 */
export function getKoreanTimeFormatted(): string {
  const now = getKoreanTime();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
