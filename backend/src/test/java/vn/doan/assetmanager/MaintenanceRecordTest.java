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
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class MaintenanceRecordTest {

    @Test
    void closingTicketStoresResolutionAndTimestamp() {
        ComputerAsset asset = new ComputerAsset("PC-03", null, AssetType.DESKTOP, "Lenovo", "ThinkCentre",
                null, null, null, null, null, BigDecimal.ZERO, "Kho", null);
        MaintenanceRecord record = new MaintenanceRecord(asset, "Thay quạt tản nhiệt");

        record.close("Đã thay quạt mới");

        assertEquals(MaintenanceStatus.CLOSED, record.getStatus());
        assertEquals("Đã thay quạt mới", record.getResolutionNote());
        assertNotNull(record.getClosedAt());
    }
}