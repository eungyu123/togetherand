import { SetMetadata } from '@nestjs/common';

export const SKIP_CACHE_KEY = 'skip-cache';

export const SkipCache = () => SetMetadata(SKIP_CACHE_KEY, true);
