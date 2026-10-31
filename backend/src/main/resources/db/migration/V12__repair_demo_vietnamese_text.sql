UPDATE computer_assets
SET location = 'Kho cửa hàng'
WHERE asset_code LIKE 'STORE-DEMO-%'
  AND location = 'Kho c?a h?ng';

UPDATE computer_assets
SET notes = 'Thiết bị mẫu bổ sung cho đồ án cá nhân'
WHERE asset_code LIKE 'STORE-DEMO-%'
  AND notes = 'Thi?t b? m?u b? sung cho ?? ?n c? nh?n';
