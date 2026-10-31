UPDATE computer_assets
SET serial_number = COALESCE(NULLIF(TRIM(serial_number), ''), CONCAT('SN-', asset_code)),
    location = COALESCE(NULLIF(TRIM(location), ''), 'Kho thiết bị'),
    manufacturer = CASE
        WHEN NULLIF(TRIM(manufacturer), '') IS NULL THEN 'Khác'
        ELSE TRIM(manufacturer)
    END,
    status = CASE
        WHEN status IS NULL OR NULLIF(TRIM(status), '') IS NULL THEN 'AVAILABLE'
        ELSE status
    END,
    in_trash = COALESCE(in_trash, FALSE),
    store_view_count = COALESCE(store_view_count, 0),
    processor = CASE
        WHEN NULLIF(TRIM(processor), '') IS NOT NULL THEN processor
        WHEN type = 'DESKTOP' THEN 'Intel Core i5 / AMD Ryzen 5'
        WHEN type = 'LAPTOP' AND LOWER(manufacturer) = 'apple' THEN 'Apple M-series'
        WHEN type = 'LAPTOP' AND LOWER(model_name) REGEXP 'gaming|rog|tuf|legion|nitro|predator|alienware|omen|victus|creator|raider|vector' THEN 'AMD Ryzen 7 / Intel Core i7'
        WHEN type = 'LAPTOP' THEN 'Intel Core i5 / AMD Ryzen 5'
        ELSE NULL
    END,
    memory_gb = COALESCE(memory_gb, CASE WHEN type IN ('LAPTOP', 'DESKTOP') THEN 16 ELSE NULL END),
    storage = COALESCE(NULLIF(TRIM(storage), ''), CASE WHEN type IN ('LAPTOP', 'DESKTOP') THEN '512 GB SSD' ELSE NULL END),
    purchase_cost = COALESCE(purchase_cost, CASE
        WHEN type = 'MONITOR' THEN 5000000
        WHEN type = 'DESKTOP' THEN 18000000
        WHEN type = 'LAPTOP' THEN 15000000
        ELSE 3000000
    END),
    purchase_date = COALESCE(purchase_date, '2026-01-15'),
    warranty_until = COALESCE(warranty_until, DATE_ADD(COALESCE(purchase_date, '2026-01-15'), INTERVAL 3 YEAR)),
    screen_size_inch = COALESCE(screen_size_inch, CASE
        WHEN type = 'MONITOR' THEN 27.0
        WHEN type = 'LAPTOP' AND LOWER(model_name) LIKE '%16%' THEN 16.0
        WHEN type = 'LAPTOP' AND LOWER(model_name) LIKE '%15%' THEN 15.6
        WHEN type = 'LAPTOP' AND LOWER(model_name) LIKE '%13%' THEN 13.3
        WHEN type = 'LAPTOP' THEN 14.0
        ELSE NULL
    END),
    refresh_rate_hz = COALESCE(refresh_rate_hz, CASE
        WHEN type = 'MONITOR' THEN 60
        WHEN type = 'LAPTOP' AND LOWER(model_name) REGEXP 'gaming|rog|tuf|legion|nitro|predator|alienware|omen|victus|creator|raider|vector' THEN 144
        WHEN type = 'LAPTOP' THEN 60
        ELSE NULL
    END),
    usb_ports = COALESCE(NULLIF(TRIM(usb_ports), ''), CASE
        WHEN type = 'LAPTOP' THEN '2 × USB-A, 2 × USB-C'
        WHEN type = 'DESKTOP' THEN '4 × USB-A, 2 × USB-C'
        WHEN type = 'MONITOR' THEN '2 × USB-A, 1 × USB-C'
        ELSE NULL
    END),
    has_headphone_jack = COALESCE(has_headphone_jack, type IN ('LAPTOP', 'DESKTOP')),
    has_dedicated_graphics = COALESCE(has_dedicated_graphics, CASE
        WHEN type NOT IN ('LAPTOP', 'DESKTOP') THEN NULL
        WHEN LOWER(model_name) REGEXP 'gaming|rog|tuf|legion|nitro|predator|alienware|omen|victus|precision|thinkstation|zbook|proart|geforce|quadro|rtx|legion' THEN TRUE
        ELSE FALSE
    END),
    image_url = CASE LOWER(TRIM(manufacturer))
        WHEN 'acer' THEN '/acer.png'
        WHEN 'apple' THEN '/apple.jpg'
        WHEN 'asus' THEN '/asus.jpg'
        WHEN 'dell' THEN '/dell.png'
        WHEN 'hp' THEN '/hp.jpg'
        WHEN 'lenovo' THEN '/lenovo.jpg'
        WHEN 'lg' THEN '/lg-monitor.svg'
        WHEN 'msi' THEN '/msi.webp'
        WHEN 'samsung' THEN '/samsung.jpg'
        ELSE COALESCE(NULLIF(TRIM(image_url), ''), '/acer.png')
    END,
    notes = COALESCE(NULLIF(TRIM(notes), ''), CONCAT('Thiết bị ', asset_code, ' đã được đồng bộ đầy đủ dữ liệu để quản lý tại trang quản trị'));

INSERT IGNORE INTO product_brands (name)
SELECT DISTINCT TRIM(manufacturer)
FROM computer_assets
WHERE TRIM(manufacturer) <> '';
