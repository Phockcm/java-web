package vn.doan.assetmanager.entity;

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

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "computer_assets", uniqueConstraints = {
        @UniqueConstraint(name = "uk_asset_code", columnNames = "asset_code")
})
public class ComputerAsset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "asset_code", nullable = false, length = 40)
    private String assetCode;

    @Column(name = "serial_number", length = 100)
    private String serialNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AssetType type;

    @Column(nullable = false, length = 100)
    private String manufacturer;

    @Column(name = "model_name", nullable = false, length = 120)
    private String modelName;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(length = 300)
    private String processor;

    @Column(name = "memory_gb")
    private Integer memoryGb;

    @Column(length = 120)
    private String storage;

    @Column(name = "screen_size_inch", precision = 4, scale = 1)
    private BigDecimal screenSizeInch;

    @Column(name = "refresh_rate_hz")
    private Integer refreshRateHz;

    @Column(name = "usb_ports", length = 300)
    private String usbPorts;

    @Column(name = "has_headphone_jack")
    private Boolean hasHeadphoneJack;

    @Column(name = "has_dedicated_graphics")
    private Boolean hasDedicatedGraphics;

    @Column(name = "purchase_date")
    private LocalDate purchaseDate;

    @Column(name = "warranty_until")
    private LocalDate warrantyUntil;

    @Column(name = "purchase_cost", precision = 14, scale = 2)
    private BigDecimal purchaseCost;

    @Column(nullable = false, length = 120)
    private String location;

    @Column(name = "assignee_name", length = 120)
    private String assigneeName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AssetStatus status = AssetStatus.AVAILABLE;

    @Column(length = 1000)
    private String notes;

    @Column(name = "in_trash", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private boolean inTrash;

    @Column(name = "store_view_count", nullable = false, columnDefinition = "INT DEFAULT 0")
    private int storeViewCount;

    protected ComputerAsset() {
    }

    public ComputerAsset(String assetCode, String serialNumber, AssetType type, String manufacturer,
            String modelName, String processor, Integer memoryGb, String storage, LocalDate purchaseDate,
            LocalDate warrantyUntil, BigDecimal purchaseCost, String location, String notes) {
        this.assetCode = assetCode;
        this.serialNumber = serialNumber;
        this.type = type;
        this.manufacturer = manufacturer;
        this.modelName = modelName;
        this.processor = processor;
        this.memoryGb = memoryGb;
        this.storage = storage;
        this.purchaseDate = purchaseDate;
        this.warrantyUntil = warrantyUntil;
        this.purchaseCost = purchaseCost;
        this.location = location;
        this.notes = notes;
    }

    public void update(String assetCode, String serialNumber, AssetType type, String manufacturer,
            String modelName, String processor, Integer memoryGb, String storage, LocalDate purchaseDate,
            LocalDate warrantyUntil, BigDecimal purchaseCost, String location, String notes) {
        this.assetCode = assetCode;
        this.serialNumber = serialNumber;
        this.type = type;
        this.manufacturer = manufacturer;
        this.modelName = modelName;
        this.processor = processor;
        this.memoryGb = memoryGb;
        this.storage = storage;
        this.purchaseDate = purchaseDate;
        this.warrantyUntil = warrantyUntil;
        this.purchaseCost = purchaseCost;
        this.location = location;
        this.notes = notes;
    }

    public Long getId() { return id; }
    public String getAssetCode() { return assetCode; }
    public String getSerialNumber() { return serialNumber; }
    public AssetType getType() { return type; }
    public String getManufacturer() { return manufacturer; }
    public String getModelName() { return modelName; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public String getProcessor() { return processor; }
    public Integer getMemoryGb() { return memoryGb; }
    public String getStorage() { return storage; }
    public BigDecimal getScreenSizeInch() { return screenSizeInch; }
    public void setScreenSizeInch(BigDecimal screenSizeInch) { this.screenSizeInch = screenSizeInch; }
    public Integer getRefreshRateHz() { return refreshRateHz; }
    public void setRefreshRateHz(Integer refreshRateHz) { this.refreshRateHz = refreshRateHz; }
    public String getUsbPorts() { return usbPorts; }
    public void setUsbPorts(String usbPorts) { this.usbPorts = usbPorts; }
    public Boolean getHasHeadphoneJack() { return hasHeadphoneJack; }
    public void setHasHeadphoneJack(Boolean hasHeadphoneJack) { this.hasHeadphoneJack = hasHeadphoneJack; }
    public Boolean getHasDedicatedGraphics() { return hasDedicatedGraphics; }
    public void setHasDedicatedGraphics(Boolean hasDedicatedGraphics) { this.hasDedicatedGraphics = hasDedicatedGraphics; }
    public LocalDate getPurchaseDate() { return purchaseDate; }
    public LocalDate getWarrantyUntil() { return warrantyUntil; }
    public BigDecimal getPurchaseCost() { return purchaseCost; }
    public String getLocation() { return location; }
    public String getAssigneeName() { return assigneeName; }
    public AssetStatus getStatus() { return status; }
    public String getNotes() { return notes; }
    public boolean isInTrash() { return inTrash; }
    public void setInTrash(boolean inTrash) { this.inTrash = inTrash; }
    public int getStoreViewCount() { return storeViewCount; }

    public void assign(String assigneeName, String location) {
        this.assigneeName = assigneeName;
        this.location = location;
        this.status = AssetStatus.ASSIGNED;
    }

    public void returnToInventory() {
        this.assigneeName = null;
        this.status = AssetStatus.AVAILABLE;
    }

    public void setStatus(AssetStatus status) {
        this.status = status;
        if (status == AssetStatus.RETIRED) {
            this.assigneeName = null;
        }
    }

    public void applyIllustrativeSpecs() {
        boolean laptop = type == AssetType.LAPTOP;
        boolean desktop = type == AssetType.DESKTOP;
        boolean monitor = type == AssetType.MONITOR;
        String model = modelName == null ? "" : modelName.toLowerCase(java.util.Locale.ROOT);
        if (screenSizeInch == null && (laptop || monitor)) {
            screenSizeInch = monitor ? new BigDecimal("27.0")
                    : model.contains("16") ? new BigDecimal("16.0")
                    : model.contains("15") ? new BigDecimal("15.6")
                    : model.contains("13") ? new BigDecimal("13.3")
                    : new BigDecimal("14.0");
        }
        if (refreshRateHz == null && (laptop || monitor)) {
            refreshRateHz = laptop && model.matches(".*(gaming|rog|tuf|legion|nitro|predator|alienware|omen|victus).*")
                    ? 144 : 60;
        }
        if (usbPorts == null && (laptop || desktop || monitor)) {
            usbPorts = laptop ? "2 × USB-A, 2 × USB-C"
                    : desktop ? "4 × USB-A, 2 × USB-C"
                    : "2 × USB-A, 1 × USB-C";
        }
        if (hasHeadphoneJack == null && (laptop || desktop || monitor)) {
            hasHeadphoneJack = !monitor;
        }
        if (hasDedicatedGraphics == null && (laptop || desktop)) {
            hasDedicatedGraphics = model.matches(
                    ".*(gaming|rog|tuf|legion|nitro|predator|alienware|omen|victus|precision|thinkstation|zbook|proart|geforce|quadro|rtx).*");
        }
    }
}
