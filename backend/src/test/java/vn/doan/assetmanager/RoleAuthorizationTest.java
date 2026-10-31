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

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import vn.doan.assetmanager.entity.Customer;
import vn.doan.assetmanager.repository.CustomerRepository;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("h2")
class RoleAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    @Qualifier("initData")
    private CommandLineRunner dataInitializer;

    @Test
    void reportsTheConfiguredDatabaseWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/api/system/database"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.database").value("H2"))
                .andExpect(jsonPath("$.apiContractVersion").value("5"));
    }

    @Test
    void storefrontCatalogIsPublicAndIncludesIllustrativeSpecifications() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/store/products"))
                .andExpect(status().isOk())
                .andReturn();
        var products = objectMapper.readTree(result.getResponse().getContentAsString());
        var laptop = java.util.stream.StreamSupport.stream(products.spliterator(), false)
                .filter(product -> "LAPTOP".equals(product.path("type").asText()))
                .findFirst().orElse(null);
        assertTrue(laptop != null);
        assertTrue(laptop.path("price").isNumber());
        assertTrue(laptop.path("screenSizeInch").isNumber());
        assertTrue(laptop.path("refreshRateHz").isNumber());
        assertTrue(laptop.path("usbPorts").isTextual());
        assertTrue(laptop.path("hasHeadphoneJack").isBoolean());
        assertTrue(laptop.path("hasDedicatedGraphics").isBoolean());
        assertTrue(laptop.path("viewCount").isNumber());
        assertTrue(laptop.path("status").isTextual());
        assertTrue(java.util.stream.StreamSupport.stream(products.spliterator(), false)
                .allMatch(product -> "AVAILABLE".equals(product.path("status").asText())));
    }

    @Test
    @DirtiesContext(methodMode = DirtiesContext.MethodMode.BEFORE_METHOD)
    void keepsEverySeededDemoStoreProductAvailableAfterStartup() {
        int availableDemoProducts = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM computer_assets
                WHERE status = 'AVAILABLE' AND in_trash = FALSE AND purchase_cost > 0
                  AND (asset_code LIKE 'CAT-%' OR asset_code = 'LT-2026-002')
                """, Integer.class);

        assertTrue(availableDemoProducts > 12);
    }

    @Test
    void anonymousProductClicksAreCountedAndReturnedInCatalog() throws Exception {
        var initialProducts = objectMapper.readTree(mockMvc.perform(get("/api/store/products"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        long assetId = initialProducts.get(0).get("id").asLong();
        int initialCount = initialProducts.get(0).get("viewCount").asInt();

        mockMvc.perform(post("/api/store/products/" + assetId + "/view"))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content()
                        .string(Integer.toString(initialCount + 1)));
        mockMvc.perform(post("/api/store/products/" + assetId + "/view"))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content()
                        .string(Integer.toString(initialCount + 2)));

        var updatedProducts = objectMapper.readTree(mockMvc.perform(get("/api/store/products"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        var updatedProduct = java.util.stream.StreamSupport.stream(updatedProducts.spliterator(), false)
                .filter(product -> product.path("id").asLong() == assetId)
                .findFirst().orElseThrow();
        assertTrue(updatedProduct.path("viewCount").asInt() == initialCount + 2);
    }

    @Test
    void customersCanSendRepairRequestsAndOnlyMaintenanceStaffCanProcessThem() throws Exception {
        String suffix = Long.toString(System.nanoTime());
        String username = "repaircustomer" + suffix.substring(suffix.length() - 6);
        String phone = "09" + suffix.substring(suffix.length() - 8);
        String fixerToken = login("fixer");
        String staffToken = login("staff");

        MvcResult registration = mockMvc.perform(post("/api/store/auth/register")
                        .contentType("application/json")
                        .content("""
                                {"username":"%s","displayName":"Khách sửa máy","password":"customer123"}
                                """.formatted(username)))
                .andExpect(status().isCreated())
                .andReturn();
        String customerAuth = bearer(objectMapper.readTree(registration.getResponse().getContentAsString())
                .get("token").asText());

        try {
            mockMvc.perform(post("/api/store/repair-requests")
                            .contentType("application/json")
                            .content("""
                                    {"deviceType":"Laptop","manufacturer":"Dell","modelName":"Inspiron 15","issue":"Máy không khởi động"}
                                    """))
                    .andExpect(status().isUnauthorized());

            mockMvc.perform(post("/api/store/repair-requests")
                            .header("Authorization", customerAuth)
                            .contentType("application/json")
                            .content("""
                                    {"deviceType":"Laptop","manufacturer":"Dell","modelName":"Inspiron 15","issue":"Máy không khởi động"}
                                    """))
                    .andExpect(status().isConflict());

            mockMvc.perform(put("/api/store/account")
                            .header("Authorization", customerAuth)
                            .contentType("application/json")
                            .content("""
                                    {"displayName":"Khách sửa máy","email":"","phone":"%s"}
                                    """.formatted(phone)))
                    .andExpect(status().isOk());

            MvcResult submission = mockMvc.perform(post("/api/store/repair-requests")
                            .header("Authorization", customerAuth)
                            .contentType("application/json")
                            .content("""
                                    {"deviceType":"Laptop","manufacturer":"Dell","modelName":"Inspiron 15","serialNumber":"SN-TEST","issue":"Máy không khởi động","imageData":"data:image/png;base64,AAAA"}
                                    """))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.customerUsername").value(username))
                    .andExpect(jsonPath("$.customerPhone").value(phone))
                    .andExpect(jsonPath("$.status").value("OPEN"))
                    .andExpect(jsonPath("$.imageData").value("data:image/png;base64,AAAA"))
                    .andReturn();
            long requestId = objectMapper.readTree(submission.getResponse().getContentAsString()).get("id").asLong();

            mockMvc.perform(get("/api/store/repair-requests").header("Authorization", customerAuth))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].id").value(requestId))
                    .andExpect(jsonPath("$[0].imageData").value("data:image/png;base64,AAAA"));

            mockMvc.perform(get("/api/maintenance/customer-requests"))
                    .andExpect(status().isUnauthorized());
            mockMvc.perform(get("/api/maintenance/customer-requests")
                            .header("Authorization", bearer(staffToken)))
                    .andExpect(status().isForbidden());
            mockMvc.perform(get("/api/maintenance/customer-requests")
                            .header("Authorization", customerAuth))
                    .andExpect(status().isForbidden());
            mockMvc.perform(get("/api/maintenance/customer-requests")
                            .header("Authorization", bearer(fixerToken)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].id").value(requestId));

            mockMvc.perform(patch("/api/maintenance/customer-requests/" + requestId + "/close")
                            .header("Authorization", bearer(fixerToken))
                            .contentType("application/json")
                            .content("{\"resolutionNote\":\"Đã thay bộ nguồn\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("CLOSED"))
                    .andExpect(jsonPath("$.resolutionNote").value("Đã thay bộ nguồn"));
        } finally {
            jdbcTemplate.update("DELETE FROM customer_repair_requests WHERE customer_account_id = "
                    + "(SELECT id FROM customer_accounts WHERE username = ?)", username);
            jdbcTemplate.update("DELETE FROM customer_accounts WHERE username = ?", username);
        }
    }

    @Test
    void customersMustRegisterAndSignInBeforeSendingRequests() throws Exception {
        MvcResult catalogResult = mockMvc.perform(get("/api/store/products"))
                .andExpect(status().isOk())
                .andReturn();
        var products = objectMapper.readTree(catalogResult.getResponse().getContentAsString());
        var availableProducts = java.util.stream.StreamSupport.stream(products.spliterator(), false)
                .filter(product -> "AVAILABLE".equals(product.path("status").asText()))
                .toList();
        long completedAssetId = availableProducts.get(0).get("id").asLong();
        long cancelledAssetId = availableProducts.get(1).get("id").asLong();
        String phoneSuffix = Long.toString(System.nanoTime());
        String completedPhone = "09" + phoneSuffix.substring(phoneSuffix.length() - 8);
        String username = "webcustomer" + phoneSuffix.substring(phoneSuffix.length() - 5);
        String staffToken = login("staff");
        String adminToken = login("admin");

        try {
            mockMvc.perform(post("/api/store/requests")
                            .contentType("application/json")
                            .content("{\"assetIds\":[" + completedAssetId + "]}"))
                    .andExpect(status().isUnauthorized());

            mockMvc.perform(post("/api/store/auth/register")
                            .contentType("application/json")
                            .content("{\"username\":\"" + username + "\",\"displayName\":\"Khách kiểm thử\",\"password\":\"12345\"}"))
                    .andExpect(status().isBadRequest());

            MvcResult registration = mockMvc.perform(post("/api/store/auth/register")
                            .contentType("application/json")
                            .content("""
                                    {"username":"%s","displayName":"Khách kiểm thử","password":"customer123"}
                                    """.formatted(username)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.role").value("CUSTOMER"))
                    .andReturn();
            String customerToken = objectMapper.readTree(registration.getResponse().getContentAsString())
                    .get("token").asText();
            String customerAuth = bearer(customerToken);

            mockMvc.perform(put("/api/store/account")
                            .header("Authorization", customerAuth)
                            .contentType("application/json")
                            .content("{\"displayName\":\"Khách kiểm thử\",\"email\":\"khach@example.com\",\"phone\":\"12345\"}"))
                    .andExpect(status().isBadRequest());

            mockMvc.perform(put("/api/store/account")
                            .header("Authorization", customerAuth)
                            .contentType("application/json")
                            .content("""
                                    {"displayName":"Khách kiểm thử","email":"","phone":"%s"}
                                    """.formatted(completedPhone)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.phone").value(completedPhone));

            MvcResult pendingResult = mockMvc.perform(post("/api/store/requests")
                            .header("Authorization", customerAuth)
                            .contentType("application/json")
                            .content("{\"assetIds\":[" + completedAssetId + "]}"))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.orderStatus").value("PENDING"))
                    .andExpect(jsonPath("$.paymentMethod").value("PENDING"))
                    .andExpect(jsonPath("$.customerName").value("Khách kiểm thử"))
                    .andReturn();
            var pendingOrder = objectMapper.readTree(pendingResult.getResponse().getContentAsString());
            long pendingOrderId = pendingOrder.get("id").asLong();
            long customerId = pendingOrder.get("customerId").asLong();
            mockMvc.perform(get("/api/store/orders"))
                    .andExpect(status().isUnauthorized());
            mockMvc.perform(get("/api/store/orders").header("Authorization", customerAuth))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].id").value(pendingOrderId));
            assertTrue(customerId > 0);
            assertTrue(jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM customers WHERE id = ? AND phone = ? AND in_trash = FALSE",
                    Integer.class, customerId, completedPhone) == 1);

            mockMvc.perform(post("/api/orders/" + pendingOrderId + "/complete-request")
                            .header("Authorization", bearer(staffToken)))
                    .andExpect(status().isForbidden());
            mockMvc.perform(post("/api/orders/" + pendingOrderId + "/complete-request")
                            .header("Authorization", bearer(adminToken)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.orderStatus").value("COMPLETED"));
            assertTrue("SOLD".equals(jdbcTemplate.queryForObject(
                    "SELECT status FROM computer_assets WHERE id = ?", String.class, completedAssetId)));
            assertTrue(jdbcTemplate.queryForObject(
                    "SELECT orders_count FROM customers WHERE id = ?", Integer.class, customerId) == 1);

            MvcResult secondResult = mockMvc.perform(post("/api/store/requests")
                            .header("Authorization", customerAuth)
                            .contentType("application/json")
                            .content("{\"assetIds\":[" + cancelledAssetId + "]}"))
                    .andExpect(status().isCreated())
                    .andReturn();
            long cancelledOrderId = objectMapper.readTree(secondResult.getResponse().getContentAsString())
                    .get("id").asLong();
            mockMvc.perform(post("/api/orders/" + cancelledOrderId + "/cancel-request")
                            .header("Authorization", bearer(adminToken)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.orderStatus").value("CANCELLED"));
            assertTrue("AVAILABLE".equals(jdbcTemplate.queryForObject(
                    "SELECT status FROM computer_assets WHERE id = ?", String.class, cancelledAssetId)));
        } finally {
            jdbcTemplate.update("DELETE FROM sale_orders WHERE customer_phone = ?", completedPhone);
            jdbcTemplate.update("DELETE FROM customer_accounts WHERE username = ?", username);
            jdbcTemplate.update("DELETE FROM customers WHERE phone = ?", completedPhone);
            jdbcTemplate.update("UPDATE computer_assets SET status = 'AVAILABLE' WHERE id IN (?, ?)",
                    completedAssetId, cancelledAssetId);
        }
    }

    @Test
    void adminCanPlaceStoreOrderWithWarrantyAndScanItsInvoice() throws Exception {
        String adminToken = login("admin");
        long assetId = jdbcTemplate.queryForObject(
                "SELECT id FROM computer_assets WHERE status = 'AVAILABLE' AND purchase_cost > 0 ORDER BY id LIMIT 1",
                Long.class);
        java.math.BigDecimal price = jdbcTemplate.queryForObject(
                "SELECT purchase_cost FROM computer_assets WHERE id = ?", java.math.BigDecimal.class, assetId);
        String orderCode = null;

        try {
            MvcResult result = mockMvc.perform(post("/api/store/requests")
                            .header("Authorization", bearer(adminToken))
                            .contentType("application/json")
                            .content("{\"assetIds\":[" + assetId + "],\"warrantyPlan\":\"GOLD\"}"))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.paymentMethod").value("PENDING"))
                    .andExpect(jsonPath("$.orderStatus").value("PENDING"))
                    .andReturn();
            var order = objectMapper.readTree(result.getResponse().getContentAsString());
            orderCode = order.path("orderCode").asText();
            assertEquals(0, order.path("totalAmount").decimalValue().compareTo(price.add(new java.math.BigDecimal("200000"))));

            mockMvc.perform(get("/api/store/receipts/" + orderCode))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.orderCode").value(orderCode));
            mockMvc.perform(get("/api/store/orders").header("Authorization", bearer(adminToken)))
                    .andExpect(status().isForbidden());
        } finally {
            if (orderCode != null) jdbcTemplate.update("DELETE FROM sale_orders WHERE order_code = ?", orderCode);
        }
    }

    @Test
    void customerRegistrationCannotGrantStaffAccessAndAdminCanManageCustomerAccounts() throws Exception {
        String adminToken = login("admin");
        String staffToken = login("staff");
        String username = "separatecustomer" + Long.toString(System.nanoTime()).substring(8);
        try {
            MvcResult registration = mockMvc.perform(post("/api/store/auth/register")
                            .contentType("application/json")
                            .content("""
                                    {"username":"%s","displayName":"Tài khoản cửa hàng","password":"customer123"}
                                    """.formatted(username)))
                    .andExpect(status().isCreated())
                    .andReturn();
            String customerToken = objectMapper.readTree(registration.getResponse().getContentAsString())
                    .get("token").asText();
            mockMvc.perform(get("/api/assets").header("Authorization", bearer(customerToken)))
                    .andExpect(status().isForbidden());
            mockMvc.perform(get("/api/store/accounts").header("Authorization", bearer(staffToken)))
                    .andExpect(status().isForbidden());
            mockMvc.perform(get("/api/store/accounts").header("Authorization", bearer(adminToken)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[?(@.username == '%s')]".formatted(username)).exists());
            long accountId = jdbcTemplate.queryForObject(
                    "SELECT id FROM customer_accounts WHERE username = ?", Long.class, username);
            mockMvc.perform(put("/api/store/accounts/" + accountId)
                            .header("Authorization", bearer(adminToken))
                            .contentType("application/json")
                            .content("""
                                    {"displayName":"Tài khoản đã khóa","email":"","phone":"","enabled":false,"password":"resetpass123"}
                                    """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.enabled").value(false))
                    .andExpect(jsonPath("$.displayName").value("Tài khoản đã khóa"));
            mockMvc.perform(get("/api/store/account").header("Authorization", bearer(customerToken)))
                    .andExpect(status().isUnauthorized());
            mockMvc.perform(put("/api/store/accounts/" + accountId)
                            .header("Authorization", bearer(adminToken))
                            .contentType("application/json")
                            .content("""
                                    {"displayName":"Tài khoản đã mở","email":"","phone":"","enabled":true}
                                    """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.enabled").value(true));
            mockMvc.perform(post("/api/store/auth/login")
                            .contentType("application/json")
                            .content("""
                                    {"username":"%s","password":"resetpass123"}
                                    """.formatted(username)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.role").value("CUSTOMER"));
        } finally {
            jdbcTemplate.update("DELETE FROM customer_accounts WHERE username = ?", username);
        }
    }

    @Test
    void storefrontAccountAndAdminCustomerEditsKeepOneMembershipProfile() throws Exception {
        String suffix = Long.toString(System.nanoTime());
        String username = "linkedcustomer" + suffix.substring(suffix.length() - 5);
        String originalPhone = "07" + suffix.substring(suffix.length() - 8);
        String updatedPhone = "08" + suffix.substring(suffix.length() - 8);
        String adminPhone = "09" + suffix.substring(suffix.length() - 8);
        Customer existingCustomer = customerRepository.save(new Customer(
                "Hồ sơ CRM cũ", originalPhone, "old@gmail.com", null,
                "BRONZE", java.math.BigDecimal.ZERO, 0, java.time.LocalDate.now()));
        Customer otherCustomer = customerRepository.save(new Customer(
                "Khách khác", adminPhone, null, null,
                "BRONZE", java.math.BigDecimal.ZERO, 0, java.time.LocalDate.now()));
        long existingCustomerId = existingCustomer.getId();
        String adminToken = login("admin");
        var catalog = objectMapper.readTree(mockMvc.perform(get("/api/store/products"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        long assetId = java.util.stream.StreamSupport.stream(catalog.spliterator(), false)
                .filter(product -> "AVAILABLE".equals(product.path("status").asText()))
                .findFirst().orElseThrow().get("id").asLong();

        try {
            MvcResult registration = mockMvc.perform(post("/api/store/auth/register")
                            .contentType("application/json")
                            .content("""
                                    {"username":"%s","displayName":"Khách liên kết","password":"customer123"}
                                    """.formatted(username)))
                    .andExpect(status().isCreated())
                    .andReturn();
            String customerToken = objectMapper.readTree(registration.getResponse().getContentAsString())
                    .get("token").asText();
            String authorization = bearer(customerToken);

            mockMvc.perform(put("/api/store/account")
                            .header("Authorization", authorization)
                            .contentType("application/json")
                            .content("""
                                    {"displayName":"Khách đã đồng bộ","email":"linked@gmail.com","phone":"%s"}
                                    """.formatted(originalPhone)))
                    .andExpect(status().isOk());
            assertTrue(jdbcTemplate.queryForObject(
                    "SELECT customer_id FROM customer_accounts WHERE username = ?", Long.class, username)
                    .equals(existingCustomerId));
            assertTrue(jdbcTemplate.queryForObject(
                    "SELECT full_name FROM customers WHERE id = ?", String.class, existingCustomerId)
                    .equals("Khách đã đồng bộ"));

            mockMvc.perform(put("/api/store/account")
                            .header("Authorization", authorization)
                            .contentType("application/json")
                            .content("""
                                    {"displayName":"Tên khách mới","email":"new@gmail.com","phone":"%s"}
                                    """.formatted(updatedPhone)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.phone").value(updatedPhone));
            assertTrue(jdbcTemplate.queryForObject(
                    "SELECT phone FROM customers WHERE id = ?", String.class, existingCustomerId)
                    .equals(updatedPhone));

            mockMvc.perform(put("/api/customers/" + existingCustomerId)
                            .header("Authorization", bearer(adminToken))
                            .contentType("application/json")
                            .content("""
                                    {
                                      "fullName":"Tên do Admin cập nhật",
                                      "phone":"%s",
                                      "email":"admin-edit@gmail.com",
                                      "address":"Hà Nội",
                                      "membershipTier":"SILVER"
                                    }
                                    """.formatted(updatedPhone)))
                    .andExpect(status().isOk());
            mockMvc.perform(get("/api/store/account").header("Authorization", authorization))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.displayName").value("Tên do Admin cập nhật"))
                    .andExpect(jsonPath("$.email").value("admin-edit@gmail.com"));

            mockMvc.perform(put("/api/store/account")
                            .header("Authorization", authorization)
                            .contentType("application/json")
                            .content("""
                                    {"displayName":"Không được cập nhật","email":"","phone":"%s"}
                                    """.formatted(adminPhone)))
                    .andExpect(status().isConflict());
            assertTrue(jdbcTemplate.queryForObject(
                    "SELECT phone FROM customers WHERE id = ?", String.class, existingCustomerId)
                    .equals(updatedPhone));

            MvcResult orderResult = mockMvc.perform(post("/api/store/requests")
                            .header("Authorization", authorization)
                            .contentType("application/json")
                            .content("{\"assetIds\":[" + assetId + "]}"))
                    .andExpect(status().isCreated())
                    .andReturn();
            long orderCustomerId = objectMapper.readTree(orderResult.getResponse().getContentAsString())
                    .get("customerId").asLong();
            assertTrue(orderCustomerId == existingCustomerId);

            jdbcTemplate.update("DELETE FROM customers WHERE id = ?", existingCustomerId);
            assertTrue(jdbcTemplate.queryForObject(
                    "SELECT customer_id FROM customer_accounts WHERE username = ?", Long.class, username) == null);
            assertTrue(jdbcTemplate.queryForObject(
                    "SELECT customer_id FROM sale_orders WHERE customer_phone = ?", Long.class, updatedPhone) == null);
        } finally {
            jdbcTemplate.update("DELETE FROM sale_orders WHERE customer_phone IN (?, ?, ?)",
                    originalPhone, updatedPhone, adminPhone);
            jdbcTemplate.update("DELETE FROM customer_accounts WHERE username = ?", username);
            jdbcTemplate.update("DELETE FROM customers WHERE id = ?", existingCustomerId);
            customerRepository.deleteById(otherCustomer.getId());
        }
    }

    @Test
    void trashIsAdminOnlyAndCanRestoreAssets() throws Exception {
        mockMvc.perform(get("/api/trash"))
                .andExpect(status().isUnauthorized());

        String staffToken = login("staff");
        mockMvc.perform(get("/api/trash").header("Authorization", bearer(staffToken)))
                .andExpect(status().isForbidden());

        String adminToken = login("admin");
        long assetId = jdbcTemplate.queryForObject(
                "SELECT id FROM computer_assets ORDER BY id LIMIT 1", Long.class);
        MvcResult moveResult = mockMvc.perform(post("/api/trash")
                        .header("Authorization", bearer(adminToken))
                        .contentType("application/json")
                        .content("{\"type\":\"ASSET\",\"id\":" + assetId + "}"))
                .andExpect(status().isCreated())
                .andReturn();
        long trashId = objectMapper.readTree(moveResult.getResponse().getContentAsString())
                .get("id").asLong();

        mockMvc.perform(get("/api/assets/" + assetId).header("Authorization", bearer(adminToken)))
                .andExpect(status().isNotFound());
        mockMvc.perform(patch("/api/trash/" + trashId + "/restore")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/assets/" + assetId).header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk());
    }

    @Test
    void adminsCanManageBrandsAndBrandTrashKeepsProducts() throws Exception {
        String adminToken = login("admin");
        String staffToken = login("staff");
        mockMvc.perform(get("/api/product-brands").header("Authorization", bearer(staffToken)))
                .andExpect(status().isForbidden());

        MvcResult brandsResult = mockMvc.perform(get("/api/product-brands")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andReturn();
        long dellId = -1;
        for (var brand : objectMapper.readTree(brandsResult.getResponse().getContentAsString())) {
            if ("Dell".equals(brand.path("name").asText())) dellId = brand.path("id").asLong();
        }
        assertTrue(dellId > 0);
        long dellAssetId = jdbcTemplate.queryForObject(
                "SELECT id FROM computer_assets WHERE manufacturer = 'Dell' ORDER BY id LIMIT 1", Long.class);
        long[] unusedBrandId = { -1 };

        try {
            mockMvc.perform(put("/api/product-brands/" + dellId)
                            .header("Authorization", bearer(adminToken))
                            .contentType("application/json")
                            .content("{\"name\":\"Dell QA\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.name").value("Dell QA"));
            assertTrue("Dell QA".equals(jdbcTemplate.queryForObject(
                    "SELECT manufacturer FROM computer_assets WHERE id = ?", String.class, dellAssetId)));

            mockMvc.perform(post("/api/trash")
                            .header("Authorization", bearer(adminToken))
                            .contentType("application/json")
                            .content("{\"type\":\"BRAND\",\"id\":" + dellId + "}"))
                    .andExpect(status().isConflict());
            assertTrue(Boolean.FALSE.equals(jdbcTemplate.queryForObject(
                    "SELECT in_trash FROM product_brands WHERE id = ?", Boolean.class, dellId)));
            assertTrue("Dell QA".equals(jdbcTemplate.queryForObject(
                    "SELECT manufacturer FROM computer_assets WHERE id = ?", String.class, dellAssetId)));

            MvcResult unusedBrand = mockMvc.perform(post("/api/product-brands")
                            .header("Authorization", bearer(adminToken))
                            .contentType("application/json")
                            .content("{\"name\":\"Unused QA\"}"))
                    .andExpect(status().isCreated())
                    .andReturn();
            unusedBrandId[0] = objectMapper.readTree(unusedBrand.getResponse().getContentAsString()).path("id").asLong();
            MvcResult trashResult = mockMvc.perform(post("/api/trash")
                            .header("Authorization", bearer(adminToken))
                            .contentType("application/json")
                            .content("{\"type\":\"BRAND\",\"id\":" + unusedBrandId[0] + "}"))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.type").value("BRAND"))
                    .andReturn();
            long trashId = objectMapper.readTree(trashResult.getResponse().getContentAsString()).path("id").asLong();
            mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete(
                                    "/api/trash/" + trashId)
                            .header("Authorization", bearer(adminToken)))
                    .andExpect(status().isNoContent());
            mockMvc.perform(put("/api/product-brands/" + dellId)
                            .header("Authorization", bearer(adminToken))
                            .contentType("application/json")
                            .content("{\"name\":\"Dell\"}"))
                    .andExpect(status().isOk());
        } finally {
            jdbcTemplate.update("UPDATE computer_assets SET manufacturer = 'Dell' WHERE manufacturer = 'Dell QA'");
            jdbcTemplate.update("DELETE FROM trash_records WHERE item_type = 'BRAND' AND entity_id = ?", dellId);
            jdbcTemplate.update("UPDATE product_brands SET name = 'Dell', in_trash = FALSE WHERE id = ?", dellId);
                        if (unusedBrandId[0] > 0) {
                                jdbcTemplate.update("DELETE FROM trash_records WHERE item_type = 'BRAND' AND entity_id = ?", unusedBrandId[0]);
                                jdbcTemplate.update("DELETE FROM product_brands WHERE id = ?", unusedBrandId[0]);
                        }
        }
    }

    @Test
    void repairsLegacyInvalidDemoPasswordHashesWithoutOverwritingOtherAccounts() throws Exception {
        String legacyHash = "$2a$10$wK1Gv8e0z3h4iZJ.H1XnNuH68t495KzV9k0.x3tC6jYd5dJ7f9Fte";
        for (String username : new String[] { "admin", "staff", "fixer" }) {
            jdbcTemplate.update("UPDATE app_users SET password_hash = ? WHERE username = ?", legacyHash, username);
        }

        dataInitializer.run(new String[0]);

        login("admin");
        login("staff");
        login("fixer");
    }

    @Test
    void adminAccountChangesPersistWhenDemoDataInitializerRunsAgain() throws Exception {
        String adminToken = login("admin");
        MvcResult usersResult = mockMvc.perform(get("/api/users").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andReturn();
        long staffId = findUserId(usersResult, "staff");
        assertTrue(staffId > 0);

        try {
            mockMvc.perform(put("/api/users/" + staffId)
                            .header("Authorization", bearer(adminToken))
                            .contentType("application/json")
                            .content("""
                                    {
                                      "displayName":"Nhân viên cập nhật",
                                      "role":"STAFF",
                                      "enabled":true,
                                      "password":"1234"
                                    }
                                    """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.displayName").value("Nhân viên cập nhật"))
                    .andExpect(jsonPath("$.role").value("STAFF"))
                    .andExpect(jsonPath("$.enabled").value(true));

            loginWithPassword("staff", "1234");
            dataInitializer.run(new String[0]);
            loginWithPassword("staff", "1234");
        } finally {
            jdbcTemplate.update(
                    "UPDATE app_users SET display_name = ?, password_hash = ?, user_role = 'STAFF', enabled = TRUE WHERE username = ?",
                    "Nguyễn Thu Ngân", passwordEncoder.encode("123"), "staff");
        }
    }

    @Test
    void adminCanCreateAccountWithShortPassword() throws Exception {
        String adminToken = login("admin");
        try {
            mockMvc.perform(post("/api/users")
                            .header("Authorization", bearer(adminToken))
                            .contentType("application/json")
                            .content("""
                                    {
                                      "username":"short-password-user",
                                      "displayName":"Tài khoản thử nghiệm",
                                      "password":"123",
                                      "role":"STAFF"
                                    }
                                    """))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.username").value("short-password-user"));
            loginWithPassword("short-password-user", "123");
        } finally {
            jdbcTemplate.update("DELETE FROM app_users WHERE username = ?", "short-password-user");
        }
    }

    @Test
    void disablingAnAccountRevokesItsExistingToken() throws Exception {
        String adminToken = login("admin");
        String staffToken = login("staff");
        MvcResult usersResult = mockMvc.perform(get("/api/users").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andReturn();
        long staffId = findUserId(usersResult, "staff");

        try {
            updateAccount(adminToken, staffId, "Nguyễn Thu Ngân", "STAFF", false);
            mockMvc.perform(get("/api/assets").header("Authorization", bearer(staffToken)))
                    .andExpect(status().isUnauthorized());
        } finally {
            updateAccount(adminToken, staffId, "Nguyễn Thu Ngân", "STAFF", true);
        }
    }

    @Test
    void fixerCanAccessMaintenanceButNotInventoryOrCustomers() throws Exception {
        String token = login("fixer");

        mockMvc.perform(get("/api/maintenance").header("Authorization", bearer(token)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/assets/1/maintenance")
                        .header("Authorization", bearer(token))
                        .contentType("application/json")
                        .content("""
                                {"issue":"Quạt phát tiếng ồn"}
                                """))
                .andExpect(status().isCreated());
        mockMvc.perform(get("/api/assets").header("Authorization", bearer(token)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/customers").header("Authorization", bearer(token)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/users").header("Authorization", bearer(token)))
                .andExpect(status().isForbidden());
    }

    @Test
    void staffCanViewInventoryAndMaintenanceButCannotManageAssignmentsOrResolveTickets() throws Exception {
        String token = login("staff");

        mockMvc.perform(get("/api/assets").header("Authorization", bearer(token)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/maintenance").header("Authorization", bearer(token)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/assets/1/assignments")
                        .header("Authorization", bearer(token))
                        .contentType("application/json")
                        .content("""
                                {"assigneeName":"Test","location":"Test","note":""}
                                """))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/maintenance/1/close")
                        .header("Authorization", bearer(token))
                        .contentType("application/json")
                        .content("""
                                {"resolutionNote":"Test"}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void staffCannotSetReviewReplyOrTimestampWhenCreatingReview() throws Exception {
        String token = login("staff");

        MvcResult result = mockMvc.perform(post("/api/reviews")
                        .header("Authorization", bearer(token))
                        .contentType("application/json")
                        .content("""
                                {
                                  "customerName":"Khách kiểm thử",
                                  "productName":"Máy kiểm thử",
                                  "rating":5,
                                  "comment":"Sản phẩm tốt",
                                  "adminReply":"Phản hồi giả mạo",
                                  "createdAt":"2000-01-01T00:00:00"
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn();

        var review = objectMapper.readTree(result.getResponse().getContentAsString());
        assertTrue(review.get("adminReply") == null || review.get("adminReply").isNull());
        assertNotEquals("2000-01-01T00:00:00", review.get("createdAt").asText());
    }

    private String login(String username) throws Exception {
        return loginWithPassword(username, "123");
    }

    private String loginWithPassword(String username, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .get("token")
                .asText();
    }

    private long findUserId(MvcResult usersResult, String username) throws Exception {
        for (var user : objectMapper.readTree(usersResult.getResponse().getContentAsString())) {
            if (username.equals(user.get("username").asText())) {
                return user.get("id").asLong();
            }
        }
        return -1;
    }

    private void updateAccount(String token, long id, String displayName, String role, boolean enabled)
            throws Exception {
        mockMvc.perform(put("/api/users/" + id)
                        .header("Authorization", bearer(token))
                        .contentType("application/json")
                        .content("""
                                {
                                  "displayName":"%s",
                                  "role":"%s",
                                  "enabled":%s
                                }
                                """.formatted(displayName, role, enabled)))
                .andExpect(status().isOk());
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }
}
