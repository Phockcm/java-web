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

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import vn.doan.assetmanager.dto.request.CreateCustomerRepairRequest;
import vn.doan.assetmanager.dto.response.CustomerRepairRequestResponse;
import vn.doan.assetmanager.service.CustomerRepairRequestService;

@RestController
@RequestMapping("/api/store/repair-requests")
public class CustomerRepairRequestController {

    private final CustomerRepairRequestService repairRequests;

    public CustomerRepairRequestController(CustomerRepairRequestService repairRequests) {
        this.repairRequests = repairRequests;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('CUSTOMER', 'ADMIN', 'STAFF', 'FIXER')")
    public CustomerRepairRequestResponse submit(Authentication authentication,
            @Valid @RequestBody CreateCustomerRepairRequest request) {
        boolean isCustomer = authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_CUSTOMER"));
        if (isCustomer) {
            return repairRequests.submit(authentication.getName(), request);
        }
        return repairRequests.submitForStaff(request);
    }

    @GetMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public java.util.List<CustomerRepairRequestResponse> history(Authentication authentication) {
        return repairRequests.history(authentication.getName());
    }
}
