export const getUserKey = (userId: string | undefined, deviceId: string | undefined) => {
  if (userId && userId !== 'anonymous') return { userKey: userId, anonymous: false };
  if (deviceId) return { userKey: deviceId, anonymous: true };
  throw new Error('userId 또는 deviceId가 필요합니다.');
};
