-- 創建會員增值計劃表
CREATE TABLE IF NOT EXISTS member_topup_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    stored_value INTEGER NOT NULL,
    gifted_value INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 添加初始的增值計劃
INSERT INTO member_topup_plans (name, stored_value, gifted_value, display_order, is_active)
VALUES 
    ('增值3000送350', 3000, 350, 10, TRUE),
    ('增值1000送100', 1000, 100, 20, TRUE); 