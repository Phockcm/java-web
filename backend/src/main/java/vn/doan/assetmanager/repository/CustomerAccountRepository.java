package vn.doan.assetmanager.repository;

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

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.doan.assetmanager.entity.CustomerAccount;

public interface CustomerAccountRepository extends JpaRepository<CustomerAccount, Long> {
    Optional<CustomerAccount> findByUsername(String username);
    Optional<CustomerAccount> findByPhone(String phone);
    Optional<CustomerAccount> findByCustomer_Id(Long customerId);
    Optional<CustomerAccount> findByIdAndEnabledTrue(Long id);
    List<CustomerAccount> findAllByOrderByCreatedAtDesc();
    boolean existsByUsername(String username);
    boolean existsByPhoneAndIdNot(String phone, Long id);
}
