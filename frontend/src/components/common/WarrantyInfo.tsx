import { CircleHelp, Clock3, Repeat2, ShieldCheck } from 'lucide-react'
import type { WarrantyPlan } from '../../lib/types'

interface WarrantyInfoProps {
  plan: WarrantyPlan
  scope: 'store' | 'pos'
}

export function WarrantyInfo({ plan, scope }: WarrantyInfoProps) {
  const isGold = plan === 'GOLD'
  const tooltipId = `${scope}-warranty-${plan.toLowerCase()}-details`

  return (
    <span className="warranty-info">
      <button
        className="warranty-info-trigger"
        type="button"
        aria-label={`Quyền lợi ${isGold ? 'bảo hành vàng' : 'bảo hành thường'}`}
        aria-describedby={tooltipId}
        onClick={event => event.preventDefault()}
      >
        <CircleHelp size={16} />
      </button>
      <span className="warranty-info-popover" id={tooltipId} role="tooltip">
        <strong><ShieldCheck size={15} /> {isGold ? 'Bảo hành vàng' : 'Bảo hành thường'}</strong>
        {isGold ? (
          <>
            <small>Gói bảo hành 200.000đ/máy</small>
            <span><Clock3 size={14} /><span><b>3 tháng</b> cho lỗi do nhà phát triển</span></span>
            <span><Clock3 size={14} /><span><b>9 tháng tiếp theo</b> cho lỗi phụ kiện hoặc phần mềm</span></span>
            <span className="warranty-total-duration">Tổng thời hạn bảo hành vàng: <b>12 tháng</b></span>
            <span><Repeat2 size={14} /><span>Hỗ trợ đổi máy nếu phải sửa quá 3 lần</span></span>
          </>
        ) : (
          <>
            <small>Đã gồm trong giá sản phẩm</small>
            <span><Clock3 size={14} /><span><b>2 tháng</b> bảo hành lỗi từ nhà phát hành</span></span>
          </>
        )}
      </span>
    </span>
  )
}