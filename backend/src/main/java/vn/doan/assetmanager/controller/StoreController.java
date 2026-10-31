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

import java.math.BigDecimal;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import vn.doan.assetmanager.dto.request.CreateStoreOrderRequest;
import vn.doan.assetmanager.dto.response.StoreProductResponse;
import vn.doan.assetmanager.exception.ConflictException;
import vn.doan.assetmanager.exception.NotFoundException;
import vn.doan.assetmanager.entity.enums.AssetStatus;
import vn.doan.assetmanager.entity.Customer;
import vn.doan.assetmanager.entity.SaleOrder;
import vn.doan.assetmanager.repository.AssetRepository;
import vn.doan.assetmanager.repository.CustomerRepository;
import vn.doan.assetmanager.repository.CustomerAccountRepository;
import vn.doan.assetmanager.repository.SaleOrderRepository;

@RestController
@RequestMapping("/api/store")
public class StoreController {

    private final AssetRepository assets;
    private final SaleOrderRepository orders;
    private final CustomerRepository customers;
    private final CustomerAccountRepository customerAccounts;
    private final ObjectMapper objectMapper;

    public StoreController(AssetRepository assets, SaleOrderRepository orders,
            CustomerRepository customers, CustomerAccountRepository customerAccounts, ObjectMapper objectMapper) {
        this.assets = assets;
        this.orders = orders;
        this.customers = customers;
        this.customerAccounts = customerAccounts;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/products")
    public List<StoreProductResponse> products() {
        return assets.findByStatusAndInTrashFalse(AssetStatus.AVAILABLE).stream()
                .filter(asset -> asset.getPurchaseCost() != null && asset.getPurchaseCost().signum() > 0)
                .map(StoreProductResponse::from)
                .toList();
    }

    @PostMapping("/products/{assetId}/view")
    @Transactional
    public int recordProductView(@PathVariable Long assetId) {
        if (assets.incrementStoreViewCount(assetId, AssetStatus.AVAILABLE) == 0) {
            throw new NotFoundException("Sản phẩm không còn sẵn sàng");
        }
        return assets.findById(assetId)
                .orElseThrow(() -> new NotFoundException("Sản phẩm không còn sẵn sàng"))
                .getStoreViewCount();
    }

    @GetMapping("/receipts/{orderCode}")
    public SaleOrder receipt(@PathVariable String orderCode) {
        return orders.findByOrderCodeAndInTrashFalse(orderCode)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy hóa đơn"));
    }

        @GetMapping("/orders")
        @PreAuthorize("hasRole('CUSTOMER')")
        public List<SaleOrder> customerOrders() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        var account = customerAccounts.findByUsername(username)
            .filter(candidate -> candidate.isEnabled())
            .orElseThrow(() -> new NotFoundException("Không tìm thấy tài khoản khách hàng"));
        return account.getCustomerId() == null
            ? List.of()
            : orders.findAllByCustomer_IdAndInTrashFalseOrderByCreatedAtDesc(account.getCustomerId());
        }

    @PostMapping("/requests")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('CUSTOMER', 'ADMIN')")
    @Transactional
    public ResponseEntity<SaleOrder> createRequest(@Valid @RequestBody CreateStoreOrderRequest request)
            throws JsonProcessingException {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();
        boolean adminOrder = authentication.getAuthorities().stream()
            .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
        String warrantyPlan = normalizeWarrantyPlan(request.warrantyPlan());
        var account = adminOrder ? null : customerAccounts.findByUsername(username)
            .filter(candidate -> candidate.isEnabled())
            .orElseThrow(() -> new ConflictException("Vui lòng đăng nhập tài khoản khách hàng"));
        if (!adminOrder && (account.getPhone() == null || account.getPhone().isBlank())) {
            throw new ConflictException("Vui lòng bổ sung số điện thoại trong trang tài khoản trước khi đặt hàng");
        }
        String customerName = adminOrder ? "Quản trị viên" : account.getDisplayName().trim();
        String customerPhone = adminOrder ? null : account.getPhone().trim();
        if (new HashSet<>(request.assetIds()).size() != request.assetIds().size()) {
            throw new ConflictException("Không thể gửi cùng một sản phẩm nhiều lần");
        }
        List<Map<String, Object>> orderItems = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        for (Long assetId : request.assetIds()) {
            var asset = assets.findByIdForUpdate(assetId)
                    .orElseThrow(() -> new ConflictException("Một sản phẩm đã không còn sẵn sàng"));
            if (asset.getStatus() != AssetStatus.AVAILABLE || asset.getPurchaseCost() == null
                    || asset.getPurchaseCost().signum() <= 0) {
                throw new ConflictException("Một sản phẩm đã không còn sẵn sàng");
            }
            BigDecimal price = asset.getPurchaseCost();
            BigDecimal warrantyPrice = warrantyPrice(warrantyPlan);
            BigDecimal itemTotal = price.add(warrantyPrice);
            subtotal = subtotal.add(itemTotal);
            orderItems.add(Map.of(
                    "assetId", asset.getId(),
                    "modelName", asset.getModelName(),
                    "assetCode", asset.getAssetCode(),
                    "quantity", 1,
                    "unitPrice", price,
                    "warrantyPlan", warrantyPlan,
                    "warrantyPrice", warrantyPrice,
                    "total", itemTotal));
        }
        SaleOrder order = new SaleOrder(
                "WEB-" + UUID.randomUUID().toString().toUpperCase(),
                customerName,
                customerPhone,
                false,
                adminOrder ? "Website · " + username : "Khách gửi từ website",
                subtotal,
                BigDecimal.ZERO,
                subtotal,
                "PENDING",
                objectMapper.writeValueAsString(orderItems));
        order.setOrderStatus("PENDING");
        Customer customer = adminOrder || account.getCustomerId() == null
                ? null
                : customers.findById(account.getCustomerId())
                        .orElseThrow(() -> new ConflictException("Không tìm thấy hồ sơ khách hàng đã liên kết"));
        if (!adminOrder && customer != null && customer.isInTrash()) {
            throw new ConflictException("Hồ sơ khách hàng đang ở trong thùng rác; Admin cần khôi phục hồ sơ trước");
        }
        if (!adminOrder && customer == null) {
            customer = customers.findByPhone(customerPhone).orElse(null);
            if (customer != null && customer.isInTrash()) {
                throw new ConflictException("Số điện thoại đang thuộc hồ sơ khách hàng trong thùng rác; Admin cần khôi phục hồ sơ trước");
            }
            if (customer != null) {
                var linkedAccount = customerAccounts.findByCustomer_Id(customer.getId()).orElse(null);
                if (linkedAccount != null && !linkedAccount.getId().equals(account.getId())) {
                    throw new ConflictException("Hồ sơ khách hàng đã liên kết với tài khoản khác");
                }
                customer.setFullName(customerName);
                customer.setEmail(account.getEmail());
            } else {
                customer = customers.save(new Customer(
                        customerName,
                        customerPhone,
                        account.getEmail(),
                        null,
                        "BRONZE",
                        BigDecimal.ZERO,
                        0,
                        LocalDate.now()));
            }
            account.linkCustomer(customer);
        }
        if (customer != null) order.setCustomer(customer);
        return ResponseEntity.status(HttpStatus.CREATED).body(orders.save(order));
    }

    private String normalizeWarrantyPlan(String warrantyPlan) {
        String normalized = warrantyPlan == null || warrantyPlan.isBlank() ? "STANDARD" : warrantyPlan;
        if (!List.of("STANDARD", "GOLD").contains(normalized)) {
            throw new ConflictException("Gói bảo hành không hợp lệ");
        }
        return normalized;
    }

    private BigDecimal warrantyPrice(String warrantyPlan) {
        return "GOLD".equals(warrantyPlan) ? new BigDecimal("200000") : BigDecimal.ZERO;
    }
}
