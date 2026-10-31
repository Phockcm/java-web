package vn.doan.assetmanager.specification;

import vn.doan.assetmanager.entity.ComputerAsset;
import vn.doan.assetmanager.entity.enums.AssetStatus;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class AssetSpecifications {

    private AssetSpecifications() {
    }

    public static Specification<ComputerAsset> forListing(
            String search, AssetStatus status, String manufacturer) {
        Specification<ComputerAsset> specification =
                (root, query, builder) -> builder.isFalse(root.get("inTrash"));

        if (search != null && !search.isBlank()) {
            String term = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
            specification = specification.and((root, query, builder) -> builder.or(
                    builder.like(builder.lower(root.get("assetCode")), term),
                    builder.like(builder.lower(root.get("serialNumber")), term),
                    builder.like(builder.lower(root.get("manufacturer")), term),
                    builder.like(builder.lower(root.get("modelName")), term),
                    builder.like(builder.lower(root.get("assigneeName")), term),
                    builder.like(builder.lower(root.get("location")), term)));
        }

        if (status != null) {
            specification = specification.and(
                    (root, query, builder) -> builder.equal(root.get("status"), status));
        }

        if (manufacturer != null && !manufacturer.isBlank()) {
            String normalizedManufacturer = manufacturer.trim().toLowerCase(Locale.ROOT);
            specification = specification.and((root, query, builder) ->
                    builder.equal(builder.lower(root.get("manufacturer")), normalizedManufacturer));
        }

        return specification;
    }
}
