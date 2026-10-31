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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.doan.assetmanager.exception.ConflictException;
import vn.doan.assetmanager.entity.ProductBrand;
import vn.doan.assetmanager.entity.TrashRecord;
import vn.doan.assetmanager.repository.AppUserRepository;
import vn.doan.assetmanager.repository.AssetRepository;
import vn.doan.assetmanager.repository.AssignmentRepository;
import vn.doan.assetmanager.repository.CustomerRepository;
import vn.doan.assetmanager.repository.MaintenanceRepository;
import vn.doan.assetmanager.repository.ProductBrandRepository;
import vn.doan.assetmanager.repository.SaleOrderRepository;
import vn.doan.assetmanager.repository.TrashRecordRepository;

@ExtendWith(MockitoExtension.class)
class TrashServiceTest {

    @Mock private AssetRepository assets;
    @Mock private AssignmentRepository assignments;
    @Mock private MaintenanceRepository maintenance;
    @Mock private CustomerRepository customers;
    @Mock private AppUserRepository users;
    @Mock private SaleOrderRepository orders;
    @Mock private TrashRecordRepository trash;
    @Mock private ProductBrandRepository brands;

    @InjectMocks private TrashService service;

    @Test
    void cannotMoveBrandToTrashWhileAssetsStillUseIt() {
        ProductBrand brand = new ProductBrand("Dell");
        when(brands.findById(4L)).thenReturn(Optional.of(brand));
        when(assets.existsByManufacturerIgnoreCase("Dell")).thenReturn(true);

        assertThrows(ConflictException.class, () -> service.moveToTrash("BRAND", 4L, "admin"));

        assertFalse(brand.isInTrash());
        verify(trash, never()).save(any(TrashRecord.class));
    }

    @Test
    void cannotDeleteBrandPermanentlyWhileAssetsStillUseIt() {
        ProductBrand brand = new ProductBrand("Dell");
        TrashRecord record = new TrashRecord("BRAND", 4L, "Dell", "Hãng sản phẩm",
                LocalDateTime.now(), "admin", null);
        when(trash.findById(9L)).thenReturn(Optional.of(record));
        when(brands.findById(4L)).thenReturn(Optional.of(brand));
        when(assets.existsByManufacturerIgnoreCase("Dell")).thenReturn(true);

        assertThrows(ConflictException.class, () -> service.deletePermanently(9L));

        verify(brands, never()).delete(brand);
        verify(trash, never()).delete(record);
    }
}