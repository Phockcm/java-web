package vn.doan.assetmanager.dto.request;

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

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateCustomerRepairRequest(
        @NotBlank @Size(max = 40) String deviceType,
        @NotBlank @Size(max = 100) String manufacturer,
        @NotBlank @Size(max = 120) String modelName,
        @Size(max = 100) String serialNumber,
        @NotBlank @Size(max = 1000) String issue,
        @Size(max = 3000000) String imageData,
        @Size(max = 20) String customerPhone) {
}
