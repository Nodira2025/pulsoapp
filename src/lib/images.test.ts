import { describe, expect, it } from 'vitest'
import { fitImage } from './images'
describe('image resizing without cropping', () => {
  it('preserves a wide logo', () =>
    expect(fitImage(2400, 600, 1200)).toEqual({ width: 1200, height: 300 }))
  it('preserves a portrait photo', () =>
    expect(fitImage(3000, 4000, 768)).toEqual({ width: 576, height: 768 }))
  it('does not upscale a small image', () =>
    expect(fitImage(100, 50, 768)).toEqual({ width: 100, height: 50 }))
  it('rejects invalid dimensions', () => expect(() => fitImage(0, 600, 768)).toThrow())
})
