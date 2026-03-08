-- ============================================
-- FLIXCAM.RENT - SUPABASE DATABASE SCHEMA
-- ============================================
-- This schema creates all 60+ tables for the cinema equipment rental system
-- Run this in Supabase SQL Editor after creating your project
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE equipment_condition AS ENUM ('new', 'excellent', 'good', 'fair', 'damaged', 'retired');
CREATE TYPE equipment_status AS ENUM ('available', 'booked', 'checked_out', 'maintenance', 'lost', 'sold');
CREATE TYPE booking_state AS ENUM (
    'draft',
    'risk_check',
    'payment_pending',
    'confirmed',
    'active',
    'returned',
    'closed',
    'cancelled'
);
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'staff', 'warehouse', 'driver', 'technician', 'client');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'paid', 'failed', 'refunded', 'partially_refunded');
CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'paid', 'overdue', 'cancelled');
CREATE TYPE quote_state AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted');
CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'whatsapp', 'sms');

-- ============================================
-- ROLES & PERMISSIONS
-- ============================================

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(resource, action)
);

CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

-- ============================================
-- CLIENTS
-- ============================================

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    company_name VARCHAR(255),
    tax_id VARCHAR(50),
    commercial_registration VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Saudi Arabia',
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    is_blacklisted BOOLEAN DEFAULT FALSE,
    blacklist_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EQUIPMENT CATEGORIES & BRANDS
-- ============================================

CREATE TABLE equipment_categories (
    id SERIAL PRIMARY KEY,
    name JSONB NOT NULL, -- {ar: "كاميرات", en: "Cameras"}
    slug VARCHAR(100) UNIQUE NOT NULL,
    description JSONB,
    parent_id INTEGER REFERENCES equipment_categories(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE equipment_brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EQUIPMENT ITEMS
-- ============================================

CREATE TABLE equipment_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id INTEGER REFERENCES equipment_categories(id),
    brand_id INTEGER REFERENCES equipment_brands(id),
    name JSONB NOT NULL, -- {ar: "كاميرا سوني", en: "Sony Camera"}
    model VARCHAR(255),
    serial_number VARCHAR(255) UNIQUE NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    description JSONB,
    specifications JSONB,
    condition equipment_condition DEFAULT 'good',
    status equipment_status DEFAULT 'available',
    purchase_date DATE,
    purchase_price DECIMAL(10, 2),
    current_value DECIMAL(10, 2),
    qr_code TEXT,
    barcode VARCHAR(255),
    location VARCHAR(255),
    is_sub_rented BOOLEAN DEFAULT FALSE,
    supplier_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE equipment_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id UUID REFERENCES equipment_items(id) ON DELETE CASCADE,
    daily_rate DECIMAL(10, 2) NOT NULL,
    weekly_rate DECIMAL(10, 2),
    monthly_rate DECIMAL(10, 2),
    replacement_value DECIMAL(10, 2),
    deposit_amount DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE equipment_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id UUID REFERENCES equipment_items(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'image',
    filename VARCHAR(255),
    mime_type VARCHAR(100),
    size INTEGER,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BOOKINGS
-- ============================================

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id),
    state booking_state DEFAULT 'draft',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    subtotal DECIMAL(10, 2) DEFAULT 0,
    tax DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) DEFAULT 0,
    deposit_amount DECIMAL(10, 2) DEFAULT 0,
    deposit_paid BOOLEAN DEFAULT FALSE,
    payment_method VARCHAR(50),
    delivery_required BOOLEAN DEFAULT FALSE,
    delivery_address TEXT,
    delivery_fee DECIMAL(10, 2),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE booking_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    equipment_id UUID REFERENCES equipment_items(id),
    quantity INTEGER DEFAULT 1,
    daily_rate DECIMAL(10, 2),
    total_price DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE booking_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    changes JSONB,
    performed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- QUOTES
-- ============================================

CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id),
    state quote_state DEFAULT 'draft',
    valid_until DATE,
    subtotal DECIMAL(10, 2) DEFAULT 0,
    tax DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quote_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
    equipment_id UUID REFERENCES equipment_items(id),
    quantity INTEGER DEFAULT 1,
    daily_rate DECIMAL(10, 2),
    total_price DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PAYMENTS
-- ============================================

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'SAR',
    status payment_status DEFAULT 'pending',
    gateway VARCHAR(50) DEFAULT 'tap',
    gateway_transaction_id VARCHAR(255),
    gateway_charge_id VARCHAR(255),
    paid_at TIMESTAMPTZ,
    refund_amount DECIMAL(10, 2),
    refund_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INVOICES
-- ============================================

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    booking_id UUID REFERENCES bookings(id),
    client_id UUID REFERENCES clients(id),
    status invoice_status DEFAULT 'draft',
    subtotal DECIMAL(10, 2) DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) DEFAULT 0,
    issued_at TIMESTAMPTZ,
    due_date DATE,
    paid_at TIMESTAMPTZ,
    zatca_uuid VARCHAR(255),
    zatca_qr_code TEXT,
    zatca_xml TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONTRACTS
-- ============================================

CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id),
    contract_number VARCHAR(50) UNIQUE NOT NULL,
    terms_version VARCHAR(50),
    contract_content JSONB,
    signed_at TIMESTAMPTZ,
    signed_by UUID REFERENCES auth.users(id),
    signature_data JSONB,
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DELIVERY & LOGISTICS
-- ============================================

CREATE TABLE booking_delivery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id),
    delivery_type VARCHAR(50), -- 'pickup', 'delivery'
    address TEXT,
    driver_id UUID REFERENCES auth.users(id),
    scheduled_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE booking_checkout_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id),
    session_type VARCHAR(50), -- 'checkout', 'checkin'
    performed_by UUID REFERENCES auth.users(id),
    items_checked JSONB,
    photos JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    channel notification_channel DEFAULT 'in_app',
    type VARCHAR(100) NOT NULL,
    title JSONB NOT NULL,
    message JSONB NOT NULL,
    data JSONB,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUDIT LOGS
-- ============================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    resource_type VARCHAR(100),
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Equipment indexes
CREATE INDEX idx_equipment_items_category ON equipment_items(category_id);
CREATE INDEX idx_equipment_items_brand ON equipment_items(brand_id);
CREATE INDEX idx_equipment_items_status ON equipment_items(status);
CREATE INDEX idx_equipment_items_condition ON equipment_items(condition);
CREATE INDEX idx_equipment_items_serial ON equipment_items(serial_number);

-- Booking indexes
CREATE INDEX idx_bookings_client ON bookings(client_id);
CREATE INDEX idx_bookings_state ON bookings(state);
CREATE INDEX idx_bookings_dates ON bookings(start_date, end_date);
CREATE INDEX idx_bookings_created_by ON bookings(created_by);

-- Payment indexes
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_gateway_txn ON payments(gateway_transaction_id);

-- Notification indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- Audit log indexes
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_equipment_items_updated_at
    BEFORE UPDATE ON equipment_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert default roles
INSERT INTO roles (name, description) VALUES
    ('super_admin', 'Super Administrator - Full system access'),
    ('admin', 'Administrator - Management access'),
    ('staff', 'Staff - General operations'),
    ('warehouse', 'Warehouse - Inventory management'),
    ('driver', 'Driver - Delivery operations'),
    ('technician', 'Technician - Equipment maintenance'),
    ('client', 'Client - Customer access')
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions (examples - expand as needed)
INSERT INTO permissions (resource, action, description) VALUES
    ('bookings', 'create', 'Create new bookings'),
    ('bookings', 'read', 'View bookings'),
    ('bookings', 'update', 'Update bookings'),
    ('bookings', 'delete', 'Delete bookings'),
    ('equipment', 'create', 'Create equipment items'),
    ('equipment', 'read', 'View equipment'),
    ('equipment', 'update', 'Update equipment'),
    ('equipment', 'delete', 'Delete equipment'),
    ('payments', 'create', 'Create payments'),
    ('payments', 'read', 'View payments'),
    ('payments', 'refund', 'Process refunds'),
    ('clients', 'create', 'Create clients'),
    ('clients', 'read', 'View clients'),
    ('clients', 'update', 'Update clients'),
    ('clients', 'delete', 'Delete clients')
ON CONFLICT (resource, action) DO NOTHING;

-- Assign all permissions to super_admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;
