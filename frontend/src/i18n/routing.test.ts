import { describe, expect, it } from 'vitest';
import { routing } from './routing';

describe('internationalized routing', () => {
  it('uses Simplified Chinese as the site-wide default language', () => {
    expect(routing.defaultLocale).toBe('zh-CN');
  });
});
