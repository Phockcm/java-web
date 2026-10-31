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


import java.math.BigDecimal;

public record DashboardResponse(long total, long available, long assigned, long maintenance, long retired,
        long maintenanceRequests, long totalOrders, long completedOrders, long pendingOrders,
        BigDecimal totalRevenue, long totalCustomers, long totalReviews) {
    public DashboardResponse(long total, long available, long assigned, long maintenance, long retired,
            long maintenanceRequests) {
        this(total, available, assigned, maintenance, retired, maintenanceRequests, 0, 0, 0,
                BigDecimal.ZERO, 0, 0);
    }
}
