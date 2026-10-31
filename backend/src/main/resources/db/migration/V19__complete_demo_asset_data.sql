UPDATE computer_assets
SET processor = CASE
        WHEN type = 'LAPTOP' AND LOWER(model_name) REGEXP 'gaming|rog|tuf|legion|nitro|predator|alienware|omen|victus|creator|raider|vector' THEN 'AMD Ryzen 7 / Intel Core i7'
        WHEN type = 'LAPTOP' AND LOWER(manufacturer) = 'apple' THEN 'Apple M-series'
        WHEN type IN ('LAPTOP', 'DESKTOP') THEN 'Intel Core i5 / AMD Ryzen 5'
        ELSE processor
    END,
    memory_gb = COALESCE(memory_gb, CASE
        WHEN type IN ('LAPTOP', 'DESKTOP') THEN 16
        ELSE NULL
    END),
    storage = COALESCE(NULLIF(TRIM(storage), ''), CASE
        WHEN type IN ('LAPTOP', 'DESKTOP') THEN '512 GB SSD'
        ELSE NULL
    END),
    location = CASE WHEN NULLIF(TRIM(location), '') IS NULL THEN 'Kho cửa hàng' ELSE location END,
    serial_number = COALESCE(NULLIF(TRIM(serial_number), ''), CONCAT('SN-', asset_code)),
    notes = COALESCE(NULLIF(TRIM(notes), ''), 'Thiết bị đã được nhập kho và cập nhật đầy đủ thông tin')
WHERE processor IS NULL
   OR memory_gb IS NULL
   OR NULLIF(TRIM(storage), '') IS NULL
   OR NULLIF(TRIM(serial_number), '') IS NULL
   OR NULLIF(TRIM(location), '') IS NULL
   OR NULLIF(TRIM(notes), '') IS NULL;

UPDATE computer_assets
SET purchase_cost = COALESCE(purchase_cost, CASE
        WHEN type = 'MONITOR' THEN 5000000
        WHEN type = 'DESKTOP' THEN 18000000
        WHEN type = 'LAPTOP' THEN 15000000
        ELSE 3000000
    END)
WHERE purchase_cost IS NULL;

UPDATE computer_assets
SET screen_size_inch = COALESCE(screen_size_inch, CASE
        WHEN type = 'MONITOR' THEN 27.0
        WHEN type = 'LAPTOP' THEN 15.6
        ELSE NULL
    END),
    usb_ports = COALESCE(NULLIF(TRIM(usb_ports), ''), CASE
        WHEN type = 'LAPTOP' THEN '2 × USB-A, 2 × USB-C'
        WHEN type = 'DESKTOP' THEN '4 × USB-A, 2 × USB-C'
        WHEN type = 'MONITOR' THEN '2 × USB-A, 1 × USB-C'
        ELSE NULL
    END),
    has_headphone_jack = COALESCE(has_headphone_jack, type IN ('LAPTOP', 'DESKTOP'))
WHERE screen_size_inch IS NULL
   OR NULLIF(TRIM(usb_ports), '') IS NULL
   OR has_headphone_jack IS NULL;
