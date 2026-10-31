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

import org.springframework.data.jpa.repository.JpaRepository;
import vn.doan.assetmanager.entity.SaleOrder;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SaleOrderRepository extends JpaRepository<SaleOrder, Long> {
    List<SaleOrder> findAllByInTrashFalseOrderByCreatedAtDesc();
    List<SaleOrder> findAllByCustomer_IdAndInTrashFalseOrderByCreatedAtDesc(Long customerId);
    Optional<SaleOrder> findByOrderCodeAndInTrashFalse(String orderCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select sale from SaleOrder sale where sale.id = :id and sale.inTrash = false")
    Optional<SaleOrder> findActiveByIdForUpdate(@Param("id") Long id);
}
