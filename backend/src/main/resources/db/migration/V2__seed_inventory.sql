INSERT INTO computer_assets (asset_code, serial_number, type, manufacturer, model_name, processor, memory_gb, storage, purchase_date, warranty_until, purchase_cost, location, assignee_name, status, notes)
VALUES
('PC-2026-001', 'SN-DEMO-001', 'DESKTOP', 'Dell', 'OptiPlex 7010', 'Intel Core i5-13500', 16, '512 GB SSD', '2025-08-18', '2028-08-18', 18500000.00, 'Phòng Kỹ thuật', 'Nguyễn Minh An', 'ASSIGNED', 'Máy làm việc nhóm kỹ thuật'),
('LT-2026-002', 'SN-DEMO-002', 'LAPTOP', 'Lenovo', 'ThinkPad E14 Gen 6', 'Intel Core Ultra 5', 16, '512 GB SSD', '2026-01-12', '2029-01-12', 22900000.00, 'Kho thiết bị', NULL, 'AVAILABLE', 'Máy dự phòng'),
('PC-2026-003', 'SN-DEMO-003', 'DESKTOP', 'HP', 'Pro Tower 400 G9', 'Intel Core i7-14700', 32, '1 TB SSD', '2025-03-04', '2028-03-04', 27800000.00, 'Phòng Kế toán', NULL, 'MAINTENANCE', 'Đang kiểm tra quạt tản nhiệt'),
('MN-2026-004', 'SN-DEMO-004', 'MONITOR', 'LG', 'UltraFine 27UP650', NULL, NULL, NULL, '2025-10-22', '2027-10-22', 8200000.00, 'Phòng Thiết kế', 'Trần Hà My', 'ASSIGNED', 'Màn hình 4K');

INSERT INTO maintenance_records (asset_id, issue, opened_at, status)
VALUES (3, 'Quạt tản nhiệt phát tiếng ồn bất thường', CURRENT_TIMESTAMP(6), 'OPEN');