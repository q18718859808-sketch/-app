-- ============================================
-- 药小助 (Medicare) 数据库架构
-- Supabase PostgreSQL
-- ============================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 用户表
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    age INTEGER,
    phone TEXT,
    
    -- OAuth 绑定
    wechat_openid TEXT UNIQUE,
    wechat_unionid TEXT,
    qq_openid TEXT UNIQUE,
    avatar TEXT,
    
    -- 联系人信息
    emergency_contact TEXT,
    guardian_name TEXT,
    guardian_phone TEXT,
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_wechat ON users(wechat_openid);
CREATE INDEX IF NOT EXISTS idx_users_qq ON users(qq_openid);

-- ============================================
-- 药品表
-- ============================================
CREATE TABLE IF NOT EXISTS medications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 药品信息
    name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    time_label TEXT DEFAULT '早上',  -- 早上/中午/晚上/睡前
    scheduled_time TIME NOT NULL,
    instructions TEXT,
    stock INTEGER DEFAULT 30,
    
    -- 状态
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'taken', 'skipped')),
    taken_time TIMESTAMPTZ,
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 药品表索引
CREATE INDEX IF NOT EXISTS idx_medications_user ON medications(user_id);
CREATE INDEX IF NOT EXISTS idx_medications_status ON medications(status);
CREATE INDEX IF NOT EXISTS idx_medications_time ON medications(scheduled_time);

-- ============================================
-- 服药记录表
-- ============================================
CREATE TABLE IF NOT EXISTS medication_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 记录信息
    scheduled_time TIME,
    taken_time TIMESTAMPTZ,
    status TEXT DEFAULT 'taken' CHECK (status IN ('taken', 'missed', 'skipped')),
    note TEXT,
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 服药记录索引
CREATE INDEX IF NOT EXISTS idx_med_records_user ON medication_records(user_id);
CREATE INDEX IF NOT EXISTS idx_med_records_medication ON medication_records(medication_id);
CREATE INDEX IF NOT EXISTS idx_med_records_date ON medication_records(created_at);

-- ============================================
-- 健康记录表
-- ============================================
CREATE TABLE IF NOT EXISTS health_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 记录信息
    type TEXT NOT NULL CHECK (type IN ('bloodPressure', 'bloodSugar', 'heartRate', 'symptom', 'weight', 'temperature', 'bloodOxygen')),
    value TEXT NOT NULL,
    unit TEXT,
    status TEXT DEFAULT 'normal' CHECK (status IN ('normal', 'warning', 'danger', 'info')),
    note TEXT,
    
    -- 时间戳
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 健康记录索引
CREATE INDEX IF NOT EXISTS idx_health_user ON health_records(user_id);
CREATE INDEX IF NOT EXISTS idx_health_type ON health_records(type);
CREATE INDEX IF NOT EXISTS idx_health_date ON health_records(recorded_at);

-- ============================================
-- 聊天历史表 (用于 AI 聊天记忆)
-- ============================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    role TEXT NOT NULL CHECK (role IN ('user', 'model')),
    content TEXT NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 聊天记录索引
CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_date ON chat_messages(created_at);

-- ============================================
-- 行级安全策略 (RLS)
-- ============================================

-- 启用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 用户只能访问自己的数据
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Users can view own medications" ON medications
    FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own medication records" ON medication_records
    FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own health records" ON health_records
    FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own chat messages" ON chat_messages
    FOR ALL USING (auth.uid()::text = user_id::text);

-- ============================================
-- 服务角色策略 (允许后端 service_role 完全访问)
-- ============================================
CREATE POLICY "Service role full access users" ON users
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access medications" ON medications
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access medication_records" ON medication_records
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access health_records" ON health_records
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access chat_messages" ON chat_messages
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- 自动更新 updated_at 触发器
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medications_updated_at
    BEFORE UPDATE ON medications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 初始化示例数据 (可选)
-- ============================================
-- 注意：实际使用时应该注释掉这部分

-- INSERT INTO users (id, name, age, phone, emergency_contact)
-- VALUES (
--     'demo-user-001',
--     '张建国',
--     72,
--     '13800138000',
--     '13800138000'
-- ) ON CONFLICT DO NOTHING;
