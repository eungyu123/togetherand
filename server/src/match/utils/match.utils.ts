export const getQueueKey = (gameType?: string) => {
  return `match_queue:${gameType ?? 'any_option'}`;
};

export const gameTypes = ['any_option', 'leagueoflegends', 'tft', 'overwatch', 'valorant'];
