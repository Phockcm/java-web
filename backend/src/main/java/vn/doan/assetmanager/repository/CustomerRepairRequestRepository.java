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
import vn.doan.assetmanager.entity.CustomerRepairRequest;
import vn.doan.assetmanager.entity.enums.MaintenanceStatus;

public interface CustomerRepairRequestRepository extends JpaRepository<CustomerRepairRequest, Long> {
    long countByStatus(MaintenanceStatus status);
    List<CustomerRepairRequest> findAllByStatusOrderByOpenedAtDesc(MaintenanceStatus status);
    List<CustomerRepairRequest> findAllByCustomerAccount_UsernameOrderByOpenedAtDesc(String username);
    Optional<CustomerRepairRequest> findByIdAndCustomerAccount_Username(long id, String username);
}
