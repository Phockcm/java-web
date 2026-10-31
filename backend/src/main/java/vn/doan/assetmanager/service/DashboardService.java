package vn.doan.assetmanager.service;

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

import vn.doan.assetmanager.security.JwtService;

import java.math.BigDecimal;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.doan.assetmanager.entity.enums.MaintenanceStatus;
import vn.doan.assetmanager.repository.CustomerRepairRequestRepository;
import vn.doan.assetmanager.repository.MaintenanceRepository;

@Service
public class DashboardService {

    private final AssetRepository assets;
    private final MaintenanceRepository maintenance;
    private final CustomerRepairRequestRepository repairRequests;
    private final SaleOrderRepository saleOrders;
    private final CustomerRepository customers;
    private final ProductReviewRepository reviews;

    public DashboardService(AssetRepository assets, MaintenanceRepository maintenance,
            CustomerRepairRequestRepository repairRequests, SaleOrderRepository saleOrders,
            CustomerRepository customers, ProductReviewRepository reviews) {
        this.assets = assets;
        this.maintenance = maintenance;
        this.repairRequests = repairRequests;
        this.saleOrders = saleOrders;
        this.customers = customers;
        this.reviews = reviews;
    }

    @Transactional(readOnly = true)
    public DashboardResponse summary() {
        long available = assets.countByStatusAndInTrashFalse(AssetStatus.AVAILABLE);
        long assigned = assets.countByStatusAndInTrashFalse(AssetStatus.ASSIGNED);
        long maintenanceAssets = assets.countByStatusAndInTrashFalse(AssetStatus.MAINTENANCE);
        long retired = assets.countByStatusAndInTrashFalse(AssetStatus.RETIRED);
        long maintenanceRequests = maintenance.countByStatusAndAsset_InTrashFalse(MaintenanceStatus.OPEN)
            + repairRequests.countByStatus(MaintenanceStatus.OPEN);

        var activeOrders = saleOrders.findAllByInTrashFalseOrderByCreatedAtDesc();
        long totalOrders = activeOrders.size();
        long completedOrders = activeOrders.stream().filter(order -> "COMPLETED".equals(order.getOrderStatus())).count();
        long pendingOrders = activeOrders.stream().filter(order -> "PENDING".equals(order.getOrderStatus())).count();
        BigDecimal totalRevenue = activeOrders.stream()
            .filter(order -> "COMPLETED".equals(order.getOrderStatus()))
            .map(SaleOrder::getTotalAmount)
            .filter(java.util.Objects::nonNull)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new DashboardResponse(available + assigned + maintenanceAssets + retired,
            available, assigned, maintenanceAssets, retired, maintenanceRequests,
            totalOrders, completedOrders, pendingOrders, totalRevenue,
            customers.findAllByInTrashFalse().size(), reviews.count());
    }
}
