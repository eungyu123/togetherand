// 아바타 생성 유틸리티

interface AvatarOptions {
  size?: number;
  fontSize?: number;
  backgroundColor?: string;
  textColor?: string;
}

const defaultColors = [
  '#FF6B6B', // 빨강
  '#4ECDC4', // 청록
  '#45B7D1', // 파랑
  '#96CEB4', // 초록
  '#FFEAA7', // 노랑
  '#DDA0DD', // 연보라
  '#98D8C8', // 민트
  '#F7DC6F', // 골드
  '#BB8FCE', // 라벤더
  '#85C1E9', // 하늘색
];

export const generateAvatar = (name: string, options: AvatarOptions = {}): string => {
  const { size = 200, fontSize = 80, backgroundColor, textColor = '#FFFFFF' } = options;

  // Canvas 생성
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  // 배경색 결정 (이름 기반 또는 지정된 색상)
  const bgColor = backgroundColor || defaultColors[name.charCodeAt(0) % defaultColors.length];

  // 배경 그리기
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);

  // 텍스트 설정
  ctx.fillStyle = textColor;
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 초성 추출 (한글/영문 모두 지원)
  const initial = getInitial(name);

  // 텍스트 그리기
  ctx.fillText(initial, size / 2, size / 2);

  // Base64로 변환
  return canvas.toDataURL('image/png');
};

const getInitial = (name: string): string => {
  if (!name) return '?';

  const firstChar = name.charAt(0);
  return firstChar;
};

// Base64를 Blob으로 변환
export const dataURLtoBlob = (dataURL: string): Blob => {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new Blob([u8arr], { type: mime });
};

// Blob을 URL로 변환하는 함수
export const createImageUrl = (blob: Blob) => {
  const url = URL.createObjectURL(blob);
  return url;
};

// 아바타 URL을 파일로 다운로드
export const downloadAvatar = (dataURL: string, filename: string) => {
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
