SET @add_repair_image_data = IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = 'customer_repair_requests'
       AND column_name = 'image_data') = 0,
    'ALTER TABLE customer_repair_requests ADD COLUMN image_data LONGTEXT NULL',
    'SET @migration_noop = 1');
PREPARE add_repair_image_data_stmt FROM @add_repair_image_data;
EXECUTE add_repair_image_data_stmt;
DEALLOCATE PREPARE add_repair_image_data_stmt;