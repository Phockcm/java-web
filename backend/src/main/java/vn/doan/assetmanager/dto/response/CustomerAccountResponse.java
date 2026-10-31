package vn.doan.assetmanager.dto.response;

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

import java.time.LocalDateTime;
import vn.doan.assetmanager.entity.CustomerAccount;

public record CustomerAccountResponse(
        Long id,
        String username,
        String displayName,
        String email,
        String phone,
        boolean enabled,
        LocalDateTime createdAt) {

    public static CustomerAccountResponse from(CustomerAccount account) {
        return new CustomerAccountResponse(account.getId(), account.getUsername(), account.getDisplayName(),
                account.getEmail(), account.getPhone(), account.isEnabled(), account.getCreatedAt());
    }
}
