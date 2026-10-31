CREATE TABLE IF NOT EXISTS customers (
    id BIGINT NOT NULL AUTO_INCREMENT,
    full_name VARCHAR(120) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(120),
    address VARCHAR(255),
    membership_tier VARCHAR(20) NOT NULL DEFAULT 'BRONZE',
    total_spent DECIMAL(14, 2) DEFAULT 0.00,
    orders_count INT DEFAULT 0,
    joined_date DATE,
    PRIMARY KEY (id),
    CONSTRAINT uk_customer_phone UNIQUE (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_reviews (
    id BIGINT NOT NULL AUTO_INCREMENT,
    customer_name VARCHAR(120) NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    rating INT NOT NULL,
    comment VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    admin_reply VARCHAR(1000),
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sale_orders (
    id BIGINT NOT NULL AUTO_INCREMENT,
    order_code VARCHAR(50) NOT NULL,
    customer_name VARCHAR(120) NOT NULL,
    customer_phone VARCHAR(30),
    is_guest BOOLEAN DEFAULT FALSE,
    cashier_name VARCHAR(120),
    subtotal DECIMAL(14, 2),
    discount_amount DECIMAL(14, 2),
    total_amount DECIMAL(14, 2) NOT NULL,
    payment_method VARCHAR(50),
    items_json TEXT,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT uk_order_code UNIQUE (order_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
