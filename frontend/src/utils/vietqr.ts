const VIETQR_GUID = 'A000000727'
const TRANSFER_TO_ACCOUNT = 'QRIBFTTA'

function tlv(tag: string, value: string) {
  const length = new TextEncoder().encode(value).length
  if (length > 99) throw new Error(`Giá trị QR ${tag} vượt quá độ dài cho phép`)
  return `${tag}${String(length).padStart(2, '0')}${value}`
}

function crc16Ccitt(value: string) {
  let crc = 0xffff
  for (const byte of new TextEncoder().encode(value)) {
    crc ^= byte << 8
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

export interface VietQrPaymentDetails {
  bankBin: string
  accountNumber: string
  accountName: string
  amount: number
  transferReference: string
}

export function createVietQrPayload({
  bankBin,
  accountNumber,
  accountName,
  amount,
  transferReference,
}: VietQrPaymentDetails) {
  const normalizedBin = bankBin.trim()
  const normalizedAccount = accountNumber.trim()
  const normalizedName = accountName.trim()
  const normalizedReference = transferReference.trim()

  if (!/^\d{6}$/.test(normalizedBin)) throw new Error('Mã BIN ngân hàng VietQR phải gồm 6 chữ số')
  if (!/^[A-Za-z0-9-]{4,30}$/.test(normalizedAccount)) throw new Error('Số tài khoản VietQR không hợp lệ')
  if (!normalizedName || new TextEncoder().encode(normalizedName).length > 25) {
    throw new Error('Tên chủ tài khoản VietQR phải có từ 1 đến 25 byte')
  }
  if (!Number.isSafeInteger(amount) || amount <= 0 || String(amount).length > 13) {
    throw new Error('Số tiền chuyển khoản không hợp lệ')
  }
  if (!normalizedReference || new TextEncoder().encode(normalizedReference).length > 25) {
    throw new Error('Nội dung chuyển khoản phải có từ 1 đến 25 byte')
  }

  const bankAccountData = [
    tlv('00', normalizedBin),
    tlv('01', normalizedAccount),
    tlv('02', TRANSFER_TO_ACCOUNT),
  ].join('')
  const merchantAccount = [
    tlv('00', VIETQR_GUID),
    tlv('01', bankAccountData),
  ].join('')
  const additionalData = tlv('08', normalizedReference)
  const payload = [
    tlv('00', '01'),
    tlv('01', '12'),
    tlv('38', merchantAccount),
    tlv('53', '704'),
    tlv('54', String(amount)),
    tlv('58', 'VN'),
    tlv('59', normalizedName),
    tlv('62', additionalData),
    '6304',
  ].join('')

  return `${payload}${crc16Ccitt(payload)}`
}
