import { describe, expect, it } from 'vitest'
import { createVietQrPayload } from './vietqr'

function readTlv(payload: string, start = 0) {
  const bytes = new TextEncoder().encode(payload)
  const decoder = new TextDecoder()
  const tag = decoder.decode(bytes.slice(start, start + 2))
  const length = Number(decoder.decode(bytes.slice(start + 2, start + 4)))
  const valueStart = start + 4
  return {
    tag,
    length,
    value: decoder.decode(bytes.slice(valueStart, valueStart + length)),
    next: valueStart + length,
  }
}

function checksum(payload: string) {
  let crc = 0xffff
  for (const byte of new TextEncoder().encode(payload)) {
    crc ^= byte << 8
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

describe('createVietQrPayload', () => {
  it('creates a dynamic VietQR transfer payload with amount, recipient and valid CRC', () => {
    const payload = createVietQrPayload({
      bankBin: '970422',
      accountNumber: '1234567890',
      accountName: 'TEST ACCOUNT',
      amount: 1250000,
      transferReference: 'POS123456789',
    })

    expect(payload).toContain('010212')
    expect(payload).toContain('3854')
    expect(payload).toContain('A000000727')
    expect(payload).toContain('970422')
    expect(payload).toContain('1234567890')
    expect(payload).toContain('QRIBFTTA')
    expect(payload).toContain('54071250000')
    expect(payload).toContain('5802VN')
    expect(payload).toContain('TEST ACCOUNT')
    expect(payload).toContain('POS123456789')
    expect(payload.slice(-8, -4)).toBe('6304')
    expect(payload.slice(-4)).toBe(checksum(payload.slice(0, -4)))
  })

  it('rejects invalid bank details and non-positive amounts', () => {
    const details = {
      bankBin: 'bank',
      accountNumber: '1234567890',
      accountName: 'TEST ACCOUNT',
      amount: 10,
      transferReference: 'POS123',
    }

    expect(() => createVietQrPayload(details)).toThrow(/BIN ngân hàng/)
    expect(() => createVietQrPayload({ ...details, bankBin: '970422', amount: 0 })).toThrow(/Số tiền/)
  })

  it('uses UTF-8 byte lengths for Vietnamese account names', () => {
    const payload = createVietQrPayload({
      bankBin: '970422',
      accountNumber: '1234567890',
      accountName: 'NGUYỄN AN',
      amount: 50000,
      transferReference: 'POS123',
    })
    let offset = 0
    let accountName: ReturnType<typeof readTlv> | undefined
    while (offset < payload.length - 8) {
      const field = readTlv(payload, offset)
      if (field.tag === '59') {
        accountName = field
        break
      }
      offset = field.next
    }

    expect(accountName?.value).toBe('NGUYỄN AN')
    expect(accountName?.length).toBe(new TextEncoder().encode('NGUYỄN AN').length)
  })
})
