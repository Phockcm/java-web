package vn.doan.assetmanager.dto.request;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

public record VoucherRequest(
        @NotBlank @Size(max = 50) String code,
        @NotBlank @Pattern(regexp = "PERCENT|FIXED") String type,
        @NotNull @DecimalMin("0.01") BigDecimal value,
        BigDecimal minimumOrder,
        @NotNull @Min(1) Integer usageLimit,
        @NotNull LocalDate validFrom,
        @NotNull LocalDate validUntil,
        boolean active
) {}
