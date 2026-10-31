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


import java.math.BigDecimal;
import java.time.LocalDate;

public record AssetResponse(
        Long id,
        String assetCode,
        String serialNumber,
        AssetType type,
        String manufacturer,
        String modelName,
        String processor,
        Integer memoryGb,
        String storage,
        java.math.BigDecimal screenSizeInch,
        Integer refreshRateHz,
        String usbPorts,
        Boolean hasHeadphoneJack,
        Boolean hasDedicatedGraphics,
        LocalDate purchaseDate,
        LocalDate warrantyUntil,
        BigDecimal purchaseCost,
        String location,
        String assigneeName,
        AssetStatus status,
        String notes) {

    public static AssetResponse from(ComputerAsset asset) {
        return new AssetResponse(asset.getId(), asset.getAssetCode(), asset.getSerialNumber(), asset.getType(),
                asset.getManufacturer(), asset.getModelName(), asset.getProcessor(), asset.getMemoryGb(),
                asset.getStorage(), asset.getScreenSizeInch(), asset.getRefreshRateHz(), asset.getUsbPorts(),
                asset.getHasHeadphoneJack(), asset.getHasDedicatedGraphics(), asset.getPurchaseDate(),
                asset.getWarrantyUntil(), asset.getPurchaseCost(),
                asset.getLocation(), asset.getAssigneeName(), asset.getStatus(), asset.getNotes());
    }
}
