package vn.doan.assetmanager.service;

import vn.doan.assetmanager.dto.request.AssetRequest;
import vn.doan.assetmanager.dto.response.AssetResponse;
import vn.doan.assetmanager.entity.AssignmentRecord;
import vn.doan.assetmanager.entity.ComputerAsset;
import vn.doan.assetmanager.entity.enums.AssetStatus;
import vn.doan.assetmanager.exception.ConflictException;
import vn.doan.assetmanager.exception.NotFoundException;
import vn.doan.assetmanager.repository.AssetRepository;
import vn.doan.assetmanager.repository.AssignmentRepository;
import vn.doan.assetmanager.specification.AssetSpecifications;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AssetService {

    private final AssetRepository assets;
    private final AssignmentRepository assignments;

    public AssetService(AssetRepository assets, AssignmentRepository assignments) {
        this.assets = assets;
        this.assignments = assignments;
    }

    @Transactional(readOnly = true)
    public Page<AssetResponse> list(String search, AssetStatus status, String manufacturer, Pageable pageable) {
        return assets.findAll(AssetSpecifications.forListing(search, status, manufacturer), pageable)
                .map(AssetResponse::from);
    }

    @Transactional(readOnly = true)
    public AssetResponse get(Long id) {
        return AssetResponse.from(findAsset(id));
    }

    @Transactional
    public AssetResponse create(AssetRequest request) {
        ComputerAsset asset = new ComputerAsset(request.assetCode(), request.serialNumber(),
                request.type(), request.manufacturer(), request.modelName(), request.processor(),
                request.memoryGb(), request.storage(), request.purchaseDate(), request.warrantyUntil(),
                request.purchaseCost(), request.location(), request.notes());
        applySpecs(asset, request);
        return AssetResponse.from(assets.save(asset));
    }

    @Transactional
    public AssetResponse update(Long id, AssetRequest request) {
        ComputerAsset asset = findAsset(id);
        asset.update(request.assetCode(), request.serialNumber(), request.type(), request.manufacturer(),
                request.modelName(), request.processor(), request.memoryGb(), request.storage(),
                request.purchaseDate(), request.warrantyUntil(), request.purchaseCost(), request.location(),
                request.notes());
        applySpecs(asset, request);
        return AssetResponse.from(asset);
    }

    private void applySpecs(ComputerAsset asset, AssetRequest request) {
        asset.setScreenSizeInch(request.screenSizeInch());
        asset.setRefreshRateHz(request.refreshRateHz());
        asset.setUsbPorts(request.usbPorts());
        asset.setHasHeadphoneJack(request.hasHeadphoneJack());
        asset.setHasDedicatedGraphics(request.hasDedicatedGraphics());
        asset.applyIllustrativeSpecs();
    }

    @Transactional
    public void retire(Long id) {
        ComputerAsset asset = findAsset(id);
        if (asset.getStatus() == AssetStatus.MAINTENANCE) {
            throw new ConflictException("Không thể thanh lý tài sản đang bảo trì");
        }
        if (asset.getStatus() == AssetStatus.ASSIGNED) {
            assignments.findFirstByAsset_IdAndReturnedAtIsNullOrderByAssignedAtDesc(id)
                    .ifPresent(AssignmentRecord::close);
        }
        asset.setStatus(AssetStatus.RETIRED);
    }

    ComputerAsset findAsset(Long id) {
        return assets.findById(id).filter(asset -> !asset.isInTrash())
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tài sản"));
    }
}
