package vn.doan.assetmanager.controller;

import vn.doan.assetmanager.entity.*;
import vn.doan.assetmanager.entity.enums.*;
import vn.doan.assetmanager.repository.*;
import vn.doan.assetmanager.exception.*;
import vn.doan.assetmanager.dto.response.*;
import vn.doan.assetmanager.entity.*;
import vn.doan.assetmanager.repository.*;
import vn.doan.assetmanager.service.*;
import vn.doan.assetmanager.dto.request.*;
import vn.doan.assetmanager.dto.response.*;
import vn.doan.assetmanager.entity.*;
import vn.doan.assetmanager.repository.*;
import vn.doan.assetmanager.service.*;
import vn.doan.assetmanager.dto.request.*;
import vn.doan.assetmanager.dto.response.*;
import vn.doan.assetmanager.security.*;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import vn.doan.assetmanager.dto.request.CreateSaleOrderRequest;
import vn.doan.assetmanager.exception.ConflictException;
import vn.doan.assetmanager.exception.NotFoundException;
import vn.doan.assetmanager.entity.AppUser;
import vn.doan.assetmanager.entity.enums.AssetStatus;
import vn.doan.assetmanager.entity.Customer;
import vn.doan.assetmanager.entity.SaleOrder;
import vn.doan.assetmanager.repository.AppUserRepository;
import vn.doan.assetmanager.repository.AssetRepository;
import vn.doan.assetmanager.repository.CustomerRepository;
import vn.doan.assetmanager.repository.SaleOrderRepository;
import vn.doan.assetmanager.repository.VoucherRepository;
import vn.doan.assetmanager.entity.Voucher;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/orders")
@PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
public class SaleOrderController {

    private final SaleOrderRepository orderRepository;
    private final CustomerRepository customerRepository;
    private final AssetRepository assetRepository;
    private final AppUserRepository userRepository;
    private final VoucherRepository voucherRepository;
    private final ObjectMapper objectMapper;

    public SaleOrderController(SaleOrderRepository orderRepository, CustomerRepository customerRepository,
                               AssetRepository assetRepository, AppUserRepository userRepository,
                               VoucherRepository voucherRepository, ObjectMapper objectMapper) {
        this.orderRepository = orderRepository;
        this.customerRepository = customerRepository;
        this.assetRepository = assetRepository;
        this.userRepository = userRepository;
        this.voucherRepository = voucherRepository;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<SaleOrder> getAll() {
        return orderRepository.findAllByInTrashFalseOrderByCreatedAtDesc();
    }

    @PostMapping("/{id}/complete-request")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public SaleOrder completeWebsiteRequest(@PathVariable Long id) {
        SaleOrder order = findPendingWebsiteOrder(id);
        List<Map<String, Object>> items;
        try {
            items = objectMapper.readValue(order.getItemsJson(),
                    objectMapper.getTypeFactory().constructCollectionType(List.class, Map.class));
        } catch (JsonProcessingException exception) {
            throw new ConflictException("Không đọc được danh sách sản phẩm của yêu cầu");
        }
        for (Map<String, Object> item : items) {
            Object rawAssetId = item.get("assetId");
            if (!(rawAssetId instanceof Number assetIdValue)) {
                throw new ConflictException("Yêu cầu chứa mã sản phẩm không hợp lệ");
            }
            var asset = assetRepository.findByIdForUpdate(assetIdValue.longValue())
                    .orElseThrow(() -> new ConflictException("Một sản phẩm đã không còn sẵn sàng"));
            if (asset.getStatus() != AssetStatus.AVAILABLE) {
                throw new ConflictException("Sản phẩm " + asset.getAssetCode() + " đã không còn sẵn sàng");
            }
            asset.setStatus(AssetStatus.SOLD);
        }
        order.setOrderStatus("COMPLETED");
        order.setCashierName("Website · Admin xác nhận");
        if (order.getCustomerId() != null) {
            customerRepository.findByIdAndInTrashFalse(order.getCustomerId())
                    .ifPresent(customer -> updateCustomerStats(customer, order.getTotalAmount()));
        }
        return order;
    }

    @PostMapping("/{id}/cancel-request")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public SaleOrder cancelWebsiteRequest(@PathVariable Long id) {
        SaleOrder order = findPendingWebsiteOrder(id);
        order.setOrderStatus("CANCELLED");
        return order;
    }

    private SaleOrder findPendingWebsiteOrder(Long id) {
        SaleOrder order = orderRepository.findActiveByIdForUpdate(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy yêu cầu mua hàng"));
        if (!"PENDING".equals(order.getOrderStatus()) || !"PENDING".equals(order.getPaymentMethod())) {
            throw new ConflictException("Yêu cầu này đã được xử lý");
        }
        return order;
    }

    @PostMapping
    @Transactional
    public ResponseEntity<SaleOrder> createOrder(@Valid @RequestBody CreateSaleOrderRequest request)
            throws JsonProcessingException {
        if (!Set.of("CASH", "BANK_TRANSFER", "CARD").contains(request.paymentMethod())) {
            throw new ConflictException("Phương thức thanh toán không hợp lệ");
        }
        String warrantyPlan = normalizeWarrantyPlan(request.warrantyPlan());

        if (request.guest() == (request.customerId() != null)) {
            throw new ConflictException("Vui lòng chọn khách thành viên hoặc khách vãng lai");
        }

        Customer customer = null;
        if (!request.guest()) {
            Long customerId = request.customerId();
            if (customerId == null) {
                throw new ConflictException("Vui lòng chọn khách hàng thành viên hoặc khách vãng lai");
            }
            customer = customerRepository.findByIdAndInTrashFalse(customerId)
                    .orElseThrow(() -> new NotFoundException("Không tìm thấy khách hàng"));
        }
        Set<Long> assetIds = new HashSet<>();
        List<Map<String, Object>> receiptItems = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal warrantyTotal = BigDecimal.ZERO;
        for (CreateSaleOrderRequest.Item item : request.items()) {
            if (!assetIds.add(item.assetId())) {
                throw new ConflictException("Không thể thêm cùng một máy vào đơn hàng nhiều lần");
            }
            var asset = assetRepository.findByIdForUpdate(item.assetId())
                    .orElseThrow(() -> new NotFoundException("Không tìm thấy máy trong kho"));
            if (asset.getStatus() != AssetStatus.AVAILABLE) {
                throw new ConflictException("Sản phẩm " + asset.getAssetCode() + " không còn sẵn sàng bán");
            }
            BigDecimal unitPrice = asset.getPurchaseCost();
            if (unitPrice == null || unitPrice.signum() < 0) {
                throw new ConflictException("Sản phẩm " + asset.getAssetCode() + " chưa có giá bán hợp lệ");
            }
                BigDecimal warrantyPrice = warrantyPrice(warrantyPlan);
                BigDecimal itemTotal = unitPrice.add(warrantyPrice);
                subtotal = subtotal.add(unitPrice);
                warrantyTotal = warrantyTotal.add(warrantyPrice);
            receiptItems.add(Map.of(
                    "assetId", asset.getId(),
                    "modelName", asset.getModelName(),
                    "assetCode", asset.getAssetCode(),
                    "quantity", 1,
                    "unitPrice", unitPrice,
                    "warrantyPlan", warrantyPlan,
                    "warrantyPrice", warrantyPrice,
                    "total", itemTotal));
            asset.setStatus(AssetStatus.SOLD);
        }

        BigDecimal discountRate = customer == null ? BigDecimal.ZERO : switch (customer.getMembershipTier()) {
            case "GOLD" -> new BigDecimal("0.10");
            case "SILVER" -> new BigDecimal("0.05");
            case "BRONZE" -> new BigDecimal("0.02");
            default -> BigDecimal.ZERO;
        };
        BigDecimal discountAmount = subtotal.multiply(discountRate).setScale(0, java.math.RoundingMode.HALF_UP);
        if (request.voucherCode() != null && !request.voucherCode().isBlank()) {
            Voucher voucher = voucherRepository.findByCodeIgnoreCase(request.voucherCode().trim())
                    .orElseThrow(() -> new NotFoundException("Mã voucher không tồn tại"));
            LocalDate today = LocalDate.now();
            if (!voucher.isActive() || today.isBefore(voucher.getValidFrom()) || today.isAfter(voucher.getValidUntil()))
                throw new ConflictException("Voucher không còn hiệu lực");
            if (voucher.getUsedCount() >= voucher.getUsageLimit())
                throw new ConflictException("Voucher đã hết lượt sử dụng");
            BigDecimal discountBase = subtotal.subtract(discountAmount).add(warrantyTotal);
            if (discountBase.compareTo(voucher.getMinimumOrder()) < 0)
                throw new ConflictException("Đơn hàng chưa đạt giá trị tối thiểu của voucher");
            BigDecimal voucherDiscount = "PERCENT".equals(voucher.getType())
                    ? discountBase.multiply(voucher.getValue()).divide(BigDecimal.valueOf(100))
                    : voucher.getValue();
            voucherDiscount = voucherDiscount.min(discountBase).setScale(0, java.math.RoundingMode.DOWN);
            discountAmount = discountAmount.add(voucherDiscount);
            voucher.incrementUsedCount();
            voucherRepository.save(voucher);
        }
        BigDecimal totalAmount = subtotal.add(warrantyTotal).subtract(discountAmount);
        if ("CASH".equals(request.paymentMethod())
                && (request.cashReceived() == null || request.cashReceived().compareTo(totalAmount) < 0)) {
            throw new ConflictException("Số tiền khách đưa chưa đủ để thanh toán hóa đơn");
        }
        String staffUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        AppUser cashier = userRepository.findByUsername(staffUsername)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tài khoản nhân viên"));
        String customerName = customer != null ? customer.getFullName()
                : request.guestName() == null || request.guestName().isBlank() ? "Khách vãng lai" : request.guestName().trim();
        String customerPhone = customer != null ? customer.getPhone()
                : request.guestPhone() == null || request.guestPhone().isBlank() ? null : request.guestPhone().trim();
        SaleOrder order = new SaleOrder(
                "HD-" + UUID.randomUUID().toString().toUpperCase(),
                customerName,
                customerPhone,
                request.guest(),
                cashier.getDisplayName(),
                subtotal,
                discountAmount,
                totalAmount,
                request.paymentMethod(),
                objectMapper.writeValueAsString(receiptItems));
        if (customer != null) {
            order.setCustomer(customer);
        }
        SaleOrder saved = orderRepository.save(order);

        if (customer != null) {
            updateCustomerStats(customer, totalAmount);
        }
        return ResponseEntity.ok(saved);
    }

    private void updateCustomerStats(Customer customer, BigDecimal totalAmount) {
        BigDecimal nextSpent = (customer.getTotalSpent() == null ? BigDecimal.ZERO : customer.getTotalSpent())
                .add(totalAmount);
        customer.setTotalSpent(nextSpent);
        customer.setOrdersCount((customer.getOrdersCount() == null ? 0 : customer.getOrdersCount()) + 1);
        if (nextSpent.compareTo(new BigDecimal("70000000")) >= 0) {
            customer.setMembershipTier("GOLD");
        } else if (nextSpent.compareTo(new BigDecimal("20000000")) >= 0) {
            customer.setMembershipTier("SILVER");
        } else {
            customer.setMembershipTier("BRONZE");
        }
        customerRepository.save(customer);
    }

    private String normalizeWarrantyPlan(String warrantyPlan) {
        String normalized = warrantyPlan == null || warrantyPlan.isBlank() ? "STANDARD" : warrantyPlan;
        if (!Set.of("STANDARD", "GOLD").contains(normalized)) {
            throw new ConflictException("Gói bảo hành không hợp lệ");
        }
        return normalized;
    }

    private BigDecimal warrantyPrice(String warrantyPlan) {
        return "GOLD".equals(warrantyPlan) ? new BigDecimal("200000") : BigDecimal.ZERO;
    }
}
