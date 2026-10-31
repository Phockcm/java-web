package vn.doan.assetmanager.service;

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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.doan.assetmanager.dto.request.CreateCustomerRepairRequest;
import vn.doan.assetmanager.dto.request.MaintenanceCloseRequest;
import vn.doan.assetmanager.dto.response.CustomerRepairRequestResponse;
import vn.doan.assetmanager.exception.ConflictException;
import vn.doan.assetmanager.exception.NotFoundException;
import vn.doan.assetmanager.entity.CustomerRepairRequest;
import vn.doan.assetmanager.entity.enums.MaintenanceStatus;
import vn.doan.assetmanager.repository.CustomerAccountRepository;
import vn.doan.assetmanager.repository.CustomerRepairRequestRepository;

@Service
public class CustomerRepairRequestService {

    private final CustomerAccountRepository accounts;
    private final CustomerRepairRequestRepository requests;

    public CustomerRepairRequestService(CustomerAccountRepository accounts,
            CustomerRepairRequestRepository requests) {
        this.accounts = accounts;
        this.requests = requests;
    }

    @Transactional
    public CustomerRepairRequestResponse submit(String username, CreateCustomerRepairRequest request) {
        var account = accounts.findByUsername(username)
                .filter(candidate -> candidate.isEnabled())
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tài khoản khách hàng đang hoạt động"));
        if (account.getPhone() == null || account.getPhone().isBlank()) {
            throw new ConflictException("Vui lòng bổ sung số điện thoại trong trang tài khoản trước khi gửi yêu cầu sửa chữa");
        }
        var saved = requests.save(new CustomerRepairRequest(account, request.deviceType().trim(),
                request.manufacturer().trim(), request.modelName().trim(),
                normalize(request.serialNumber()), request.issue().trim(), normalize(request.imageData())));
        return CustomerRepairRequestResponse.from(saved);
    }

    @Transactional
    public CustomerRepairRequestResponse submitForStaff(CreateCustomerRepairRequest request) {
        String phone = normalize(request.customerPhone());
        if (phone == null) {
            throw new ConflictException("Vui lòng nhập số điện thoại khách hàng");
        }
        var account = accounts.findByPhone(phone)
                .filter(candidate -> candidate.isEnabled())
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tài khoản khách hàng với số điện thoại này"));
        var saved = requests.save(new CustomerRepairRequest(account, request.deviceType().trim(),
                request.manufacturer().trim(), request.modelName().trim(), normalize(request.serialNumber()),
                request.issue().trim(), normalize(request.imageData())));
        return CustomerRepairRequestResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<CustomerRepairRequestResponse> history(String username) {
        return requests.findAllByCustomerAccount_UsernameOrderByOpenedAtDesc(username).stream()
                .map(CustomerRepairRequestResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CustomerRepairRequestResponse> openRequests() {
        return requests.findAllByStatusOrderByOpenedAtDesc(MaintenanceStatus.OPEN).stream()
                .map(CustomerRepairRequestResponse::from)
                .toList();
    }

    @Transactional
    public CustomerRepairRequestResponse close(long id, MaintenanceCloseRequest closeRequest) {
        var request = requests.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy yêu cầu sửa chữa"));
        if (request.getStatus() == MaintenanceStatus.CLOSED) {
            throw new ConflictException("Yêu cầu sửa chữa đã được hoàn tất");
        }
        request.close(normalize(closeRequest.resolutionNote()));
        return CustomerRepairRequestResponse.from(request);
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
