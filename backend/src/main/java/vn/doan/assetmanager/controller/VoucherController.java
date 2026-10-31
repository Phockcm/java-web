package vn.doan.assetmanager.controller;

import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.doan.assetmanager.dto.request.VoucherRequest;
import vn.doan.assetmanager.entity.Voucher;
import vn.doan.assetmanager.exception.ConflictException;
import vn.doan.assetmanager.exception.NotFoundException;
import vn.doan.assetmanager.repository.VoucherRepository;

@RestController
@RequestMapping("/api/vouchers")
@PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
public class VoucherController {
    private final VoucherRepository repository;

    public VoucherController(VoucherRepository repository) { this.repository = repository; }

    @GetMapping
    public List<Voucher> all() { return repository.findAllByOrderByIdDesc(); }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Voucher create(@Valid @RequestBody VoucherRequest request) {
        validate(request);
        if (repository.existsByCodeIgnoreCase(request.code())) throw new ConflictException("Mã voucher đã tồn tại");
        Voucher voucher = new Voucher();
        apply(voucher, request);
        voucher.setUsedCount(0);
        return repository.save(voucher);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Voucher update(@PathVariable Long id, @Valid @RequestBody VoucherRequest request) {
        validate(request);
        Voucher voucher = repository.findById(id).orElseThrow(() -> new NotFoundException("Không tìm thấy voucher"));
        repository.findByCodeIgnoreCase(request.code()).ifPresent(existing -> {
            if (!existing.getId().equals(id)) throw new ConflictException("Mã voucher đã tồn tại");
        });
        apply(voucher, request);
        return repository.save(voucher);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable Long id) {
        Voucher voucher = repository.findById(id).orElseThrow(() -> new NotFoundException("Không tìm thấy voucher"));
        repository.delete(voucher);
    }

    @PostMapping("/validate")
    public Map<String, Object> validateCode(@RequestBody Map<String, Object> body) {
        String code = String.valueOf(body.getOrDefault("code", "")).trim();
        BigDecimal subtotal = new BigDecimal(String.valueOf(body.getOrDefault("subtotal", "0")));
        Voucher voucher = repository.findByCodeIgnoreCase(code)
                .orElseThrow(() -> new NotFoundException("Mã voucher không tồn tại"));
        LocalDate today = LocalDate.now();
        if (!voucher.isActive()) throw new ConflictException("Voucher hiện không hoạt động");
        if (today.isBefore(voucher.getValidFrom()) || today.isAfter(voucher.getValidUntil())) throw new ConflictException("Voucher đã hết hạn hoặc chưa đến thời gian áp dụng");
        if (voucher.getUsedCount() >= voucher.getUsageLimit()) throw new ConflictException("Voucher đã hết lượt sử dụng");
        if (subtotal.compareTo(voucher.getMinimumOrder()) < 0) throw new ConflictException("Đơn hàng chưa đạt giá trị tối thiểu");
        BigDecimal discount = "PERCENT".equals(voucher.getType())
                ? subtotal.multiply(voucher.getValue()).divide(BigDecimal.valueOf(100))
                : voucher.getValue();
        discount = discount.min(subtotal).setScale(0, java.math.RoundingMode.DOWN);
        return Map.of("id", voucher.getId(), "code", voucher.getCode(), "type", voucher.getType(),
                "value", voucher.getValue(), "discountAmount", discount);
    }

    private void apply(Voucher voucher, VoucherRequest request) {
        voucher.setCode(request.code());
        voucher.setType(request.type());
        voucher.setValue(request.value());
        voucher.setMinimumOrder(request.minimumOrder() == null ? BigDecimal.ZERO : request.minimumOrder());
        voucher.setUsageLimit(request.usageLimit());
        voucher.setValidFrom(request.validFrom());
        voucher.setValidUntil(request.validUntil());
        voucher.setActive(request.active());
    }

    private void validate(VoucherRequest request) {
        if (request.validUntil().isBefore(request.validFrom())) throw new ConflictException("Ngày kết thúc phải sau ngày bắt đầu");
        if ("PERCENT".equals(request.type()) && request.value().compareTo(BigDecimal.valueOf(100)) > 0)
            throw new ConflictException("Voucher phần trăm không được vượt quá 100%");
    }
}
