package vn.doan.assetmanager.dto.response;

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

import java.time.Instant;
import vn.doan.assetmanager.entity.CustomerRepairRequest;
import vn.doan.assetmanager.entity.enums.MaintenanceStatus;

public record CustomerRepairRequestResponse(
        Long id,
        String customerName,
        String customerUsername,
        String customerPhone,
        String customerEmail,
        String deviceType,
        String manufacturer,
        String modelName,
        String serialNumber,
        String issue,
        String imageData,
        Instant openedAt,
        Instant closedAt,
        String resolutionNote,
        MaintenanceStatus status) {

    public static CustomerRepairRequestResponse from(CustomerRepairRequest request) {
        var account = request.getCustomerAccount();
        return new CustomerRepairRequestResponse(request.getId(), account.getDisplayName(), account.getUsername(),
                account.getPhone(), account.getEmail(), request.getDeviceType(), request.getManufacturer(),
                request.getModelName(), request.getSerialNumber(), request.getIssue(), request.getImageData(), request.getOpenedAt(),
                request.getClosedAt(), request.getResolutionNote(), request.getStatus());
    }
}
