import { describe, expect, it } from 'vitest'
import { isInAppBrowser, isIOS } from './install'

describe('instalação', () => {
  it('reconhece browsers dentro de redes sociais', () => {
    expect(isInAppBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0')).toBe(true)
    expect(isInAppBrowser('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36 trill_350 BytedanceWebview/d8a21c6')).toBe(true)
    expect(isInAppBrowser('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0]')).toBe(true)
    expect(isInAppBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1')).toBe(false)
    expect(isInAppBrowser('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36')).toBe(false)
  })
  it('reconhece iPhone e iPad (incluindo iPad que se apresenta como Mac)', () => {
    expect(isIOS('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 'iPhone', 5)).toBe(true)
    expect(isIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 5)).toBe(true)
    expect(isIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 0)).toBe(false)
  })
})
