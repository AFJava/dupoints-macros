-- Student Identity Information
-- References Supabase Auth
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    netid VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Student Nutritional Profiles
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    age INT NOT NULL CHECK (age > 0),
    height_cm NUMERIC(6,2) NOT NULL,
    body_weight_kg NUMERIC(6,2) NOT NULL,
    activity_level INT NOT NULL CHECK (activity_level BETWEEN 0 AND 7),
    goal VARCHAR(50) NOT NULL,
    meal_plan_id UUID REFERENCES meal_plans(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


-- 3. Food Logging
CREATE TABLE meal_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id BIGINT NOT NULL REFERENCES items(id),
    meal_type VARCHAR(20),
    quantity NUMERIC(8,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    logged_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);