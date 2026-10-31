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

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

public record CreateSaleOrderRequest(
        Long customerId,
        boolean guest,
        @Size(max = 120)
        String guestName,
        @Pattern(regexp = "^$|0[0-9]{9}") @Size(max = 10)
        String guestPhone,
        @NotBlank String paymentMethod,
        @DecimalMin("0.0") BigDecimal cashReceived,
        @Pattern(regexp = "^(STANDARD|GOLD)?$") String warrantyPlan,
        @Size(max = 50) String voucherCode,
        @NotEmpty List<@Valid Item> items) {

    public record Item(
            @NotNull Long assetId,
            @Min(1) @Max(1) int quantity) {
    }
}
