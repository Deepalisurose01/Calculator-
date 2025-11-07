-- Jharkhand Civic Platform - Initial Database Schema
-- PostgreSQL 14+ with PostGIS extension

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (citizens and admin staff)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(15) UNIQUE,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'citizen', -- citizen, admin, department_staff, super_admin
    password_hash VARCHAR(255),
    device_id VARCHAR(255),
    fcm_token TEXT,
    is_anonymous BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_device_id ON users(device_id);
CREATE INDEX idx_users_role ON users(role);

-- Departments table
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    name_hi VARCHAR(255), -- Hindi name
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(15),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_departments_code ON departments(code);

-- Wards/Zones table with geographic boundaries
CREATE TABLE wards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ward_number VARCHAR(50) NOT NULL,
    ward_name VARCHAR(255) NOT NULL,
    ward_name_hi VARCHAR(255),
    district VARCHAR(100),
    boundary GEOMETRY(POLYGON, 4326), -- GeoJSON polygon
    population INTEGER,
    area_sq_km DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wards_boundary ON wards USING GIST(boundary);
CREATE INDEX idx_wards_ward_number ON wards(ward_number);

-- Categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    name_hi VARCHAR(255),
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    color VARCHAR(7), -- hex color
    parent_id UUID REFERENCES categories(id),
    default_priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    default_sla_hours INTEGER DEFAULT 72,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);

-- Reports table (main civic issues)
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_number VARCHAR(50) UNIQUE NOT NULL, -- JH-2024-000001
    user_id UUID REFERENCES users(id),
    category_id UUID REFERENCES categories(id),
    ward_id UUID REFERENCES wards(id),
    
    -- Location data
    location GEOMETRY(POINT, 4326) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address TEXT,
    landmark VARCHAR(255),
    
    -- Issue details
    title VARCHAR(500) NOT NULL,
    description TEXT,
    voice_note_url TEXT,
    voice_duration_seconds INTEGER,
    
    -- Status and workflow
    status VARCHAR(50) DEFAULT 'submitted', -- submitted, acknowledged, assigned, in_progress, resolved, closed, rejected
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    assigned_department_id UUID REFERENCES departments(id),
    assigned_to_user_id UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE,
    
    -- SLA tracking
    sla_hours INTEGER,
    due_date TIMESTAMP WITH TIME ZONE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    
    -- Privacy and moderation
    is_anonymous BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    is_duplicate BOOLEAN DEFAULT false,
    duplicate_of_report_id UUID REFERENCES reports(id),
    moderation_status VARCHAR(50) DEFAULT 'pending', -- pending, approved, flagged, removed
    
    -- Metadata
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    submission_source VARCHAR(50) DEFAULT 'mobile_app', -- mobile_app, web, api
    
    -- Engagement
    upvotes INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_category_id ON reports(category_id);
CREATE INDEX idx_reports_ward_id ON reports(ward_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_priority ON reports(priority);
CREATE INDEX idx_reports_location ON reports USING GIST(location);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX idx_reports_report_number ON reports(report_number);
CREATE INDEX idx_reports_assigned_department ON reports(assigned_department_id);
CREATE INDEX idx_reports_due_date ON reports(due_date);

-- Report media table (photos, videos)
CREATE TABLE report_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    media_type VARCHAR(50) NOT NULL, -- photo, video, voice
    original_url TEXT NOT NULL,
    thumbnail_small_url TEXT,
    thumbnail_medium_url TEXT,
    optimized_url TEXT,
    
    -- EXIF and metadata
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    width INTEGER,
    height INTEGER,
    exif_data JSONB,
    capture_timestamp TIMESTAMP WITH TIME ZONE,
    
    -- Processing flags
    is_processed BOOLEAN DEFAULT false,
    is_face_blurred BOOLEAN DEFAULT false,
    phash VARCHAR(64), -- perceptual hash for duplicate detection
    
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_report_media_report_id ON report_media(report_id);
CREATE INDEX idx_report_media_phash ON report_media(phash);

-- Report timeline/audit log
CREATE TABLE report_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL, -- created, acknowledged, assigned, status_changed, comment_added, media_added
    old_value TEXT,
    new_value TEXT,
    comment TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_report_timeline_report_id ON report_timeline(report_id);
CREATE INDEX idx_report_timeline_created_at ON report_timeline(created_at DESC);

-- Assignments table
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id),
    assigned_to_user_id UUID REFERENCES users(id),
    assigned_by_user_id UUID REFERENCES users(id),
    notes TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, in_progress, completed, rejected
    accepted_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assignments_report_id ON assignments(report_id);
CREATE INDEX idx_assignments_department_id ON assignments(department_id);
CREATE INDEX idx_assignments_assigned_to ON assignments(assigned_to_user_id);

-- Routing rules table
CREATE TABLE routing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    priority INTEGER DEFAULT 100, -- lower number = higher priority
    is_active BOOLEAN DEFAULT true,
    
    -- Conditions (JSON DSL)
    conditions JSONB NOT NULL, -- {category_id, ward_id, time_of_day, day_of_week, keywords}
    
    -- Actions
    target_department_id UUID REFERENCES departments(id),
    set_priority VARCHAR(20),
    set_sla_hours INTEGER,
    auto_assign_to_user_id UUID REFERENCES users(id),
    
    -- Metadata
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_routing_rules_priority ON routing_rules(priority);
CREATE INDEX idx_routing_rules_is_active ON routing_rules(is_active);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    report_id UUID REFERENCES reports(id),
    
    notification_type VARCHAR(100) NOT NULL, -- report_submitted, report_acknowledged, report_assigned, status_update, comment_added
    channel VARCHAR(50) NOT NULL, -- in_app, push, sms, email
    
    title VARCHAR(500),
    title_hi VARCHAR(500),
    body TEXT,
    body_hi TEXT,
    
    status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed, read
    sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    metadata JSONB,
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_report_id ON notifications(report_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Feedback/surveys table
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES reports(id),
    user_id UUID REFERENCES users(id),
    
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    resolution_satisfaction INTEGER CHECK (resolution_satisfaction >= 1 AND resolution_satisfaction <= 5),
    response_time_satisfaction INTEGER CHECK (response_time_satisfaction >= 1 AND response_time_satisfaction <= 5),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feedback_report_id ON feedback(report_id);
CREATE INDEX idx_feedback_rating ON feedback(rating);

-- Rate limiting table
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier VARCHAR(255) NOT NULL, -- IP address or device_id
    identifier_type VARCHAR(50) NOT NULL, -- ip, device_id, user_id
    action VARCHAR(100) NOT NULL, -- submit_report, api_call
    count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rate_limits_identifier ON rate_limits(identifier, action, window_start);

-- Analytics aggregations table (pre-computed metrics)
CREATE TABLE analytics_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    category_id UUID REFERENCES categories(id),
    ward_id UUID REFERENCES wards(id),
    department_id UUID REFERENCES departments(id),
    
    total_reports INTEGER DEFAULT 0,
    reports_submitted INTEGER DEFAULT 0,
    reports_resolved INTEGER DEFAULT 0,
    reports_closed INTEGER DEFAULT 0,
    
    avg_resolution_hours DECIMAL(10, 2),
    median_resolution_hours DECIMAL(10, 2),
    sla_breaches INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(date, category_id, ward_id, department_id)
);

CREATE INDEX idx_analytics_daily_date ON analytics_daily(date DESC);
CREATE INDEX idx_analytics_daily_category ON analytics_daily(category_id);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    request_data JSONB,
    response_status INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wards_updated_at BEFORE UPDATE ON wards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_routing_rules_updated_at BEFORE UPDATE ON routing_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
