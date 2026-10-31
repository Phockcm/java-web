package vn.doan.assetmanager.config;

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
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.security.crypto.password.PasswordEncoder;
import vn.doan.assetmanager.entity.AppUser;
import vn.doan.assetmanager.entity.enums.AssetStatus;
import vn.doan.assetmanager.entity.enums.AssetType;
import vn.doan.assetmanager.entity.AssignmentRecord;
import vn.doan.assetmanager.entity.ComputerAsset;
import vn.doan.assetmanager.entity.MaintenanceRecord;
import vn.doan.assetmanager.entity.enums.UserRole;
import vn.doan.assetmanager.repository.AppUserRepository;
import vn.doan.assetmanager.repository.AssetRepository;
import vn.doan.assetmanager.repository.AssignmentRepository;
import vn.doan.assetmanager.repository.MaintenanceRepository;

@Configuration
public class DataInitializer {
    private static final String LEGACY_DEMO_PASSWORD_HASH =
            "$2a$10$wK1Gv8e0z3h4iZJ.H1XnNuH68t495KzV9k0.x3tC6jYd5dJ7f9Fte";

    @Bean
    CommandLineRunner initData(
            AppUserRepository users,
            JdbcTemplate jdbcTemplate,
            AssetRepository assetRepository,
            AssignmentRepository assignmentRepository,
            MaintenanceRepository maintenanceRepository,
            CustomerRepository customerRepository,
            ProductReviewRepository reviewRepository,
            ProductBrandRepository productBrandRepository,
            DataSource dataSource,
            PasswordEncoder passwordEncoder,
            @Value("classpath:db/migration/V4__seed_brand_inventory.sql") Resource brandInventorySeed,
            @Value("${security.admin.username:admin}") String username,
            @Value("${security.admin.password:123}") String password) {
        return args -> {
            Boolean mysqlDatabase = jdbcTemplate.execute((ConnectionCallback<Boolean>) connection ->
                    "MySQL".equalsIgnoreCase(connection.getMetaData().getDatabaseProductName()));
            if (Boolean.TRUE.equals(mysqlDatabase)) {
                jdbcTemplate.update("UPDATE app_users SET user_role = 'STAFF' WHERE user_role = 'CASHIER'");
            }

            AppUser admin = users.findByUsername(username).orElse(null);
            if (admin == null) {
                users.save(new AppUser(username, "Quản trị viên", passwordEncoder.encode(password), UserRole.ADMIN));
            } else if (LEGACY_DEMO_PASSWORD_HASH.equals(admin.getPasswordHash())) {
                admin.updatePasswordHash(passwordEncoder.encode(password));
                users.save(admin);
            }

            // [BÁO CÁO - SECURITY / TÀI KHOẢN MẪU]: Tài khoản mẫu nhân viên: staff / 123 (Role: STAFF)
            ensureDemoAccount(users, passwordEncoder, "staff", "Nhân viên", UserRole.STAFF);
            // Dọn dẹp các tài khoản cashier demo cũ
            users.findByUsername("cashier").ifPresent(users::delete);
            users.findByUsername("cashier1").ifPresent(users::delete);
            users.findByUsername("cashier2").ifPresent(users::delete);
            ensureDemoAccount(users, passwordEncoder, "fixer", "Kỹ thuật viên", UserRole.FIXER);

            // Seed the base examples for databases that do not run Flyway (the H2 profile).
            if (assetRepository.count() == 0) {
                ComputerAsset pc1 = new ComputerAsset(
                        "PC-2026-001", "SN-DEMO-001", AssetType.DESKTOP, "Dell", "OptiPlex 7010",
                        "Intel Core i5-13500", 16, "512 GB SSD",
                        LocalDate.of(2025, 8, 18), LocalDate.of(2028, 8, 18),
                        new BigDecimal("18500000.00"), "Phòng Kỹ thuật", "Máy làm việc nhóm kỹ thuật");
                pc1.assign("Nguyễn Minh An", "Phòng Kỹ thuật");
                assetRepository.save(pc1);

                assignmentRepository.save(new AssignmentRecord(pc1, "Nguyễn Minh An", "Phòng Kỹ thuật", "Bàn giao máy tính chính thức"));

                ComputerAsset laptop1 = new ComputerAsset(
                        "LT-2026-002", "SN-DEMO-002", AssetType.LAPTOP, "Lenovo", "ThinkPad E14 Gen 6",
                        "Intel Core Ultra 5", 16, "512 GB SSD",
                        LocalDate.of(2026, 1, 12), LocalDate.of(2029, 1, 12),
                        new BigDecimal("22900000.00"), "Kho thiết bị", "Máy dự phòng cho nhân viên onsite");
                assetRepository.save(laptop1);

                ComputerAsset pc2 = new ComputerAsset(
                        "PC-2026-003", "SN-DEMO-003", AssetType.DESKTOP, "HP", "Pro Tower 400 G9",
                        "Intel Core i7-14700", 32, "1 TB SSD",
                        LocalDate.of(2025, 3, 4), LocalDate.of(2028, 3, 4),
                        new BigDecimal("27800000.00"), "Phòng Kế toán", "Đang kiểm tra quạt tản nhiệt");
                pc2.setStatus(AssetStatus.MAINTENANCE);
                assetRepository.save(pc2);

                maintenanceRepository.save(new MaintenanceRecord(pc2, "Quạt tản nhiệt phát tiếng ồn bất thường"));

                ComputerAsset monitor1 = new ComputerAsset(
                        "MN-2026-004", "SN-DEMO-004", AssetType.MONITOR, "LG", "UltraFine 27UP650",
                        null, null, null,
                        LocalDate.of(2025, 10, 22), LocalDate.of(2027, 10, 22),
                        new BigDecimal("8200000.00"), "Phòng Thiết kế", "Màn hình đồ họa 4K");
                monitor1.assign("Trần Hà My", "Phòng Thiết kế");
                assetRepository.save(monitor1);

                assignmentRepository.save(new AssignmentRecord(monitor1, "Trần Hà My", "Phòng Thiết kế", "Bàn giao màn hình 4K đồ họa"));
            }

            if (!assetRepository.existsByAssetCodeStartingWith("CAT-")) {
                new ResourceDatabasePopulator(brandInventorySeed).execute(dataSource);
            }
            var initializedAssets = assetRepository.findAll().stream()
                    .filter(asset -> !asset.isInTrash())
                    .toList();
            initializedAssets.forEach(asset -> {
                asset.applyIllustrativeSpecs();
                if (asset.getImageUrl() == null || asset.getImageUrl().isBlank()) {
                    asset.setImageUrl(imageUrlForManufacturer(asset.getManufacturer()));
                }
            });
            assetRepository.saveAll(initializedAssets);
            assetRepository.flush();

            initializedAssets.stream()
                    .map(ComputerAsset::getManufacturer)
                    .filter(name -> name != null && !name.isBlank())
                    .map(String::trim)
                    .distinct()
                    .forEach(name -> productBrandRepository.findByNameIgnoreCase(name)
                            .orElseGet(() -> productBrandRepository.save(new ProductBrand(name))));

            // Seed 15 khách hàng từ hạng Đồng đến Vàng
            if (customerRepository.count() == 0) {
                customerRepository.save(new Customer("Hoàng Minh Đức", "0912345678", "duc.hoang@gmail.com", "Cầu Giấy, Hà Nội", "GOLD", new BigDecimal("125000000"), 6, LocalDate.of(2025, 2, 10)));
                customerRepository.save(new Customer("Trần Thị Mai Anh", "0987654321", "maianh.tran@gmail.com", "Ba Đình, Hà Nội", "GOLD", new BigDecimal("98500000"), 5, LocalDate.of(2025, 3, 15)));
                customerRepository.save(new Customer("Lê Văn Hùng", "0903123456", "hung.le@techcorp.vn", "Quận 1, TP.HCM", "GOLD", new BigDecimal("85000000"), 4, LocalDate.of(2025, 4, 1)));
                customerRepository.save(new Customer("Phạm Thu Hà", "0938111222", "thuha.design@gmail.com", "Đống Đa, Hà Nội", "GOLD", new BigDecimal("76000000"), 4, LocalDate.of(2025, 5, 20)));
                customerRepository.save(new Customer("Nguyễn Tiến Đạt", "0979333444", "dat.nguyen@fpt.com", "Hải Châu, Đà Nẵng", "SILVER", new BigDecimal("45000000"), 3, LocalDate.of(2025, 6, 12)));
                customerRepository.save(new Customer("Đỗ Bích Ngọc", "0968555666", "ngoc.dobic@gmail.com", "Thanh Xuân, Hà Nội", "SILVER", new BigDecimal("38000000"), 2, LocalDate.of(2025, 7, 8)));
                customerRepository.save(new Customer("Vũ Hoàng Long", "0945777888", "long.vu@viettel.vn", "Bình Thạnh, TP.HCM", "SILVER", new BigDecimal("32500000"), 2, LocalDate.of(2025, 8, 25)));
                customerRepository.save(new Customer("Ngô Bảo Trâm", "0918999000", "tram.ngo@gmail.com", "Tây Hồ, Hà Nội", "SILVER", new BigDecimal("28000000"), 2, LocalDate.of(2025, 9, 14)));
                customerRepository.save(new Customer("Đặng Quang Huy", "0922334455", "huy.dang@gmail.com", "Ninh Kiều, Cần Thơ", "SILVER", new BigDecimal("24000000"), 2, LocalDate.of(2025, 10, 5)));
                customerRepository.save(new Customer("Bùi Tuấn Anh", "0933445566", "anh.bui@gmail.com", "Nam Từ Liêm, Hà Nội", "BRONZE", new BigDecimal("18500000"), 1, LocalDate.of(2025, 11, 18)));
                customerRepository.save(new Customer("Nguyễn Khánh Linh", "0944556677", "linh.nk@gmail.com", "Quận 7, TP.HCM", "BRONZE", new BigDecimal("14000000"), 1, LocalDate.of(2025, 12, 1)));
                customerRepository.save(new Customer("Trịnh Quốc Việt", "0955667788", "viet.tq@gmail.com", "Ngô Quyền, Hải Phòng", "BRONZE", new BigDecimal("11200000"), 1, LocalDate.of(2026, 1, 10)));
                customerRepository.save(new Customer("Đinh Hương Giang", "0966778899", "giang.dinh@outlook.com", "Long Biên, Hà Nội", "BRONZE", new BigDecimal("8500000"), 1, LocalDate.of(2026, 2, 14)));
                customerRepository.save(new Customer("Mai Văn Phúc", "0977889900", "phuc.mai@gmail.com", "Thủ Đức, TP.HCM", "BRONZE", new BigDecimal("5200000"), 1, LocalDate.of(2026, 3, 2)));
                customerRepository.save(new Customer("Phan Thanh Thảo", "0988990011", "thao.phan@gmail.com", "Hoàng Mai, Hà Nội", "BRONZE", new BigDecimal("2800000"), 1, LocalDate.of(2026, 3, 20)));
            }

            // Seed các đánh giá và bình luận mẫu
            if (reviewRepository.count() == 0) {
                reviewRepository.save(new ProductReview("Hoàng Minh Đức", "MacBook Pro 14-inch M3 Pro", 5, "Máy rất mượt, màn hình đẹp tuyệt đối, nhân viên tư vấn nhiệt tình, đóng gói cẩn thận!", java.time.LocalDateTime.now().minusDays(1), "Cảm ơn anh Đức đã luôn tin tưởng và ủng hộ cửa hàng ạ!"));
                reviewRepository.save(new ProductReview("Trần Thị Mai Anh", "Dell XPS 13 9340", 5, "Thiết kế sang trọng, pin dùng được cả ngày làm việc văn phòng. Rất hài lòng với chính sách bảo hành.", java.time.LocalDateTime.now().minusDays(3), "Shop xin cảm ơn chị Mai Anh, chúc chị có trải nghiệm tuyệt vời cùng máy mới!"));
                reviewRepository.save(new ProductReview("Lê Văn Hùng", "ThinkPad X1 Carbon Gen 12", 5, "Bàn phím gõ êm nhất trong các dòng laptop từng dùng, máy siêu nhẹ tiện di chuyển công tác.", java.time.LocalDateTime.now().minusDays(5), "Cảm ơn anh Hùng rất nhiều ạ!"));
                reviewRepository.save(new ProductReview("Khách vãng lai (Tuấn)", "ASUS ROG Zephyrus G14", 4, "Hiệu năng chơi game tốt, tản nhiệt hơi ấm khi chơi game nặng nhưng chấp nhận được. Giao hàng nhanh.", java.time.LocalDateTime.now().minusDays(7), "Dạ cảm ơn bạn, dòng máy mỏng nhẹ cấu hình cao khi chạy full load quạt sẽ tăng tốc tối đa để tản nhiệt ạ."));
                reviewRepository.save(new ProductReview("Phạm Thu Hà", "HP Envy x360 14", 5, "Màn hình cảm ứng xoay gập tiện lợi vẽ phác thảo. Cửa hàng hỗ trợ cài đặt phần mềm tận tình.", java.time.LocalDateTime.now().minusDays(10), "Cảm ơn chị Hà đã ủng hộ shop ạ!"));
                reviewRepository.save(new ProductReview("Đỗ Bích Ngọc", "Acer Swift Go 14", 4, "Màn OLED sắc nét, giá hợp lý trong phân khúc sinh viên và văn phòng.", java.time.LocalDateTime.now().minusDays(12), null));
                reviewRepository.save(new ProductReview("Khách vãng lai (Minh)", "MSI Stealth 16 AI Studio", 5, "Máy build rất cứng cáp, chip AI xử lý đồ họa render 3D rất nhanh!", java.time.LocalDateTime.now().minusDays(15), "Shop chúc bạn hoàn thành xuất sắc các dự án thiết kế!"));
            }
        };
    }

    private static String imageUrlForManufacturer(String manufacturer) {
        if (manufacturer == null) return "/acer.png";
        return switch (manufacturer.trim().toLowerCase(java.util.Locale.ROOT)) {
            case "acer" -> "/acer.png";
            case "apple" -> "/apple.jpg";
            case "asus" -> "/asus.jpg";
            case "dell" -> "/dell.png";
            case "hp" -> "/hp.jpg";
            case "lenovo" -> "/lenovo.jpg";
            case "lg" -> "/lg-monitor.svg";
            case "msi" -> "/msi.webp";
            case "samsung" -> "/samsung.jpg";
            default -> "/acer.png";
        };
    }

    private static void ensureDemoAccount(
            AppUserRepository users,
            PasswordEncoder passwordEncoder,
            String username,
            String displayName,
            UserRole role) {
        AppUser user = users.findByUsername(username).orElse(null);
        if (user == null) {
            users.save(new AppUser(username, displayName, passwordEncoder.encode("123"), role));
        } else if (LEGACY_DEMO_PASSWORD_HASH.equals(user.getPasswordHash())
                || user.getRole() != role
                || isLegacyDemoDisplayName(username, user.getDisplayName())) {
            String passwordHash = LEGACY_DEMO_PASSWORD_HASH.equals(user.getPasswordHash())
                    ? passwordEncoder.encode("123") : null;
            String nextDisplayName = isLegacyDemoDisplayName(username, user.getDisplayName())
                    ? displayName : user.getDisplayName();
            user.updateAccount(nextDisplayName, role, user.isEnabled(), passwordHash);
            users.save(user);
        }
    }

    private static boolean isLegacyDemoDisplayName(String username, String displayName) {
        return ("staff".equals(username) && "Nguyễn Thu Ngân".equals(displayName))
                || ("fixer".equals(username) && "Nguyễn Kỹ Thuật".equals(displayName));
    }
}
