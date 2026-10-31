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
import vn.doan.assetmanager.entity.TrashRecord;

public record TrashRecordResponse(
        Long id,
        String type,
        Long entityId,
        String label,
        String summary,
        LocalDateTime deletedAt,
        String deletedBy) {

    public static TrashRecordResponse from(TrashRecord record) {
        return new TrashRecordResponse(record.getId(), record.getItemType(), record.getEntityId(),
                record.getLabel(), record.getSummary(), record.getDeletedAt(), record.getDeletedBy());
    }
}
