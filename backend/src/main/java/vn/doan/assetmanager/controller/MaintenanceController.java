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

import vn.doan.assetmanager.dto.response.CustomerRepairRequestResponse;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping
public class MaintenanceController {

    private final MaintenanceService maintenanceService;
    private final CustomerRepairRequestService customerRepairRequests;

    public MaintenanceController(MaintenanceService maintenanceService,
            CustomerRepairRequestService customerRepairRequests) {
        this.maintenanceService = maintenanceService;
        this.customerRepairRequests = customerRepairRequests;
    }

    /** ADMIN + FIXER + STAFF: xem danh sách phiếu bảo trì đang mở */
    @GetMapping("/api/maintenance")
    @PreAuthorize("hasAnyRole('ADMIN', 'FIXER', 'STAFF')")
    public List<MaintenanceResponse> openItems() {
        return maintenanceService.openItems();
    }

    @GetMapping("/api/maintenance/customer-requests")
    @PreAuthorize("hasAnyRole('ADMIN', 'FIXER')")
    public List<CustomerRepairRequestResponse> openCustomerRequests() {
        return customerRepairRequests.openRequests();
    }

    @PatchMapping("/api/maintenance/customer-requests/{requestId}/close")
    @PreAuthorize("hasAnyRole('ADMIN', 'FIXER')")
    public CustomerRepairRequestResponse closeCustomerRequest(@PathVariable long requestId,
            @Valid @RequestBody MaintenanceCloseRequest request) {
        return customerRepairRequests.close(requestId, request);
    }

    /** ADMIN + FIXER + STAFF: xem lịch sử bảo trì của 1 thiết bị */
    @GetMapping("/api/assets/{assetId}/maintenance")
    @PreAuthorize("hasAnyRole('ADMIN', 'FIXER', 'STAFF')")
    public List<MaintenanceResponse> history(@PathVariable Long assetId) {
        return maintenanceService.history(assetId);
    }

    /** ADMIN + FIXER + STAFF: gửi yêu cầu bảo trì mới */
    @PostMapping("/api/assets/{assetId}/maintenance")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN', 'FIXER', 'STAFF')")
    public MaintenanceResponse open(@PathVariable Long assetId, @Valid @RequestBody MaintenanceRequest request) {
        return maintenanceService.open(assetId, request);
    }

    /** Chỉ ADMIN + FIXER mới được đóng/hoàn tất phiếu bảo trì */
    @PatchMapping("/api/maintenance/{maintenanceId}/close")
    @PreAuthorize("hasAnyRole('ADMIN', 'FIXER')")
    public MaintenanceResponse close(@PathVariable Long maintenanceId,
            @Valid @RequestBody MaintenanceCloseRequest request) {
        return maintenanceService.close(maintenanceId, request);
    }
}
