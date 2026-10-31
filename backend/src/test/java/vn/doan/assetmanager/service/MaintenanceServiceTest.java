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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.doan.assetmanager.dto.request.MaintenanceCloseRequest;
import vn.doan.assetmanager.dto.request.MaintenanceRequest;
import vn.doan.assetmanager.exception.ConflictException;
import vn.doan.assetmanager.entity.enums.AssetStatus;
import vn.doan.assetmanager.entity.enums.AssetType;
import vn.doan.assetmanager.entity.ComputerAsset;
import vn.doan.assetmanager.entity.MaintenanceRecord;
import vn.doan.assetmanager.repository.MaintenanceRepository;

@ExtendWith(MockitoExtension.class)
class MaintenanceServiceTest {

    @Mock
    private AssetService assetService;

    @Mock
    private MaintenanceRepository maintenance;

    @InjectMocks
    private MaintenanceService maintenanceService;

    @Test
    void cannotOpenMaintenanceForSoldAsset() {
        ComputerAsset asset = asset();
        asset.setStatus(AssetStatus.SOLD);
        when(assetService.findAsset(7L)).thenReturn(asset);

        assertThrows(ConflictException.class,
                () -> maintenanceService.open(7L, new MaintenanceRequest("Không khởi động")));

        verifyNoInteractions(maintenance);
        assertEquals(AssetStatus.SOLD, asset.getStatus());
    }

    @Test
    void closingMaintenanceDoesNotRestoreSoldAssetToInventory() {
        ComputerAsset asset = asset();
        asset.setStatus(AssetStatus.SOLD);
        MaintenanceRecord record = new MaintenanceRecord(asset, "Không khởi động");
        when(maintenance.findById(3L)).thenReturn(Optional.of(record));

        maintenanceService.close(3L, new MaintenanceCloseRequest("Đã kiểm tra"));

        assertEquals(AssetStatus.SOLD, asset.getStatus());
        verify(maintenance).findById(3L);
    }

    private ComputerAsset asset() {
        return new ComputerAsset("PC-TEST", null, AssetType.DESKTOP, "Dell", "OptiPlex",
                null, null, null, null, null, BigDecimal.ZERO, "Kho", null);
    }
}
