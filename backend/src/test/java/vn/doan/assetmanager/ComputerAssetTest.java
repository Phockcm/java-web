package vn.doan.assetmanager;

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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import vn.doan.assetmanager.dto.response.StoreProductResponse;

class ComputerAssetTest {

    @Test
    void assignmentAndReturnMoveAssetThroughExpectedStates() {
        ComputerAsset asset = new ComputerAsset("PC-01", null, AssetType.DESKTOP, "Dell", "OptiPlex",
                null, null, null, null, null, BigDecimal.ZERO, "Kho", null);

        asset.assign("Nguyễn Minh An", "Phòng Kỹ thuật");

        assertEquals(AssetStatus.ASSIGNED, asset.getStatus());
        assertEquals("Nguyễn Minh An", asset.getAssigneeName());
        assertEquals("Phòng Kỹ thuật", asset.getLocation());

        asset.returnToInventory();

        assertEquals(AssetStatus.AVAILABLE, asset.getStatus());
        assertNull(asset.getAssigneeName());
    }

    @Test
    void retirementClearsCurrentAssignee() {
        ComputerAsset asset = new ComputerAsset("PC-02", null, AssetType.DESKTOP, "HP", "Pro",
                null, null, null, null, null, null, "Phòng IT", null);
        asset.assign("Trần Hà My", "Phòng IT");

        asset.setStatus(AssetStatus.RETIRED);

        assertEquals(AssetStatus.RETIRED, asset.getStatus());
        assertNull(asset.getAssigneeName());
    }

    @Test
    void storeProductResponseIncludesImageUrlStoredOnAsset() {
        ComputerAsset asset = new ComputerAsset("STORE-01", null, AssetType.LAPTOP, "HP", "Victus",
                null, 16, "512 GB SSD", null, null, new BigDecimal("1000"), "Kho", null);
        asset.setImageUrl("/hp-victus.jpg");

        StoreProductResponse response = StoreProductResponse.from(asset);

        assertEquals("/hp-victus.jpg", response.imageUrl());
    }
}