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
export function getKoreanTimeFormatted(time: Date, level?: string): string {
  const timeDate = new Date(time);
  const year = timeDate.getFullYear();
  const month = String(timeDate.getMonth() + 1).padStart(2, '0');
  const day = String(timeDate.getDate()).padStart(2, '0');
  const hours = String(timeDate.getHours()).padStart(2, '0');
  const minutes = String(timeDate.getMinutes()).padStart(2, '0');
  const seconds = String(timeDate.getSeconds()).padStart(2, '0');

  switch (level) {
    case 'year':
      return `${year}`;
    case 'month':
      return `${year}-${month}`;
    case 'day':
      return `${year}-${month}-${day}`;
    case 'hour':
      return `${year}-${month}-${day} ${hours}`;
    case 'minute':
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    case 'second':
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    default:
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
}

/**
 * 전화 경과 시간을 MM:SS 형식으로 반환 (한국 시간 기준)
 */
export function getCallDurationFormatted(startTime: Date): string {
  const now = getKoreanTime();
  const duration = Math.floor((now.getTime() - startTime.getTime()) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
