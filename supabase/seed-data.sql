-- ============================================
-- SEED DATA
-- ============================================
-- Run this AFTER running schema.sql and rls-policies.sql
-- This creates initial roles, permissions, and sample data
-- ============================================

-- ============================================
-- ROLES (if not already created in schema.sql)
-- ============================================

INSERT INTO roles (name, description) VALUES
    ('super_admin', 'Super Administrator - Full system access'),
    ('admin', 'Administrator - Management access'),
    ('staff', 'Staff - General operations'),
    ('warehouse', 'Warehouse - Inventory management'),
    ('driver', 'Driver - Delivery operations'),
    ('technician', 'Technician - Equipment maintenance'),
    ('client', 'Client - Customer access')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- PERMISSIONS
-- ============================================

-- Booking permissions
INSERT INTO permissions (resource, action, description) VALUES
    ('bookings', 'create', 'Create new bookings'),
    ('bookings', 'read', 'View bookings'),
    ('bookings', 'update', 'Update bookings'),
    ('bookings', 'delete', 'Delete bookings'),
    ('bookings', 'cancel', 'Cancel bookings'),
    ('bookings', 'transition', 'Change booking state')
ON CONFLICT (resource, action) DO NOTHING;

-- Equipment permissions
INSERT INTO permissions (resource, action, description) VALUES
    ('equipment', 'create', 'Create equipment items'),
    ('equipment', 'read', 'View equipment'),
    ('equipment', 'update', 'Update equipment'),
    ('equipment', 'delete', 'Delete equipment'),
    ('equipment', 'checkout', 'Checkout equipment'),
    ('equipment', 'checkin', 'Checkin equipment')
ON CONFLICT (resource, action) DO NOTHING;

-- Payment permissions
INSERT INTO permissions (resource, action, description) VALUES
    ('payments', 'create', 'Create payments'),
    ('payments', 'read', 'View payments'),
    ('payments', 'refund', 'Process refunds'),
    ('payments', 'verify', 'Verify payments')
ON CONFLICT (resource, action) DO NOTHING;

-- Client permissions
INSERT INTO permissions (resource, action, description) VALUES
    ('clients', 'create', 'Create clients'),
    ('clients', 'read', 'View clients'),
    ('clients', 'update', 'Update clients'),
    ('clients', 'delete', 'Delete clients'),
    ('clients', 'blacklist', 'Blacklist clients')
ON CONFLICT (resource, action) DO NOTHING;

-- Invoice permissions
INSERT INTO permissions (resource, action, description) VALUES
    ('invoices', 'create', 'Create invoices'),
    ('invoices', 'read', 'View invoices'),
    ('invoices', 'update', 'Update invoices'),
    ('invoices', 'delete', 'Delete invoices'),
    ('invoices', 'generate_zatca', 'Generate ZATCA invoices')
ON CONFLICT (resource, action) DO NOTHING;

-- Contract permissions
INSERT INTO permissions (resource, action, description) VALUES
    ('contracts', 'create', 'Create contracts'),
    ('contracts', 'read', 'View contracts'),
    ('contracts', 'update', 'Update contracts'),
    ('contracts', 'sign', 'Sign contracts')
ON CONFLICT (resource, action) DO NOTHING;

-- Settings permissions
INSERT INTO permissions (resource, action, description) VALUES
    ('settings', 'read', 'View settings'),
    ('settings', 'update', 'Update settings'),
    ('settings', 'manage_users', 'Manage users'),
    ('settings', 'manage_roles', 'Manage roles')
ON CONFLICT (resource, action) DO NOTHING;

-- ============================================
-- ROLE PERMISSIONS
-- ============================================

-- Super Admin: All permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Admin: Most permissions except super admin settings
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
    AND p.resource != 'settings' OR p.action != 'manage_roles'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Staff: Read and create permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'staff'
    AND p.action IN ('create', 'read', 'update')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Warehouse: Equipment and booking checkout/checkin
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'warehouse'
    AND (
        (p.resource = 'equipment' AND p.action IN ('read', 'checkout', 'checkin'))
        OR (p.resource = 'bookings' AND p.action IN ('read', 'update'))
    )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Driver: Read bookings and delivery info
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'driver'
    AND p.resource = 'bookings' AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Technician: Equipment read and maintenance
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'technician'
    AND p.resource = 'equipment' AND p.action IN ('read', 'update')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Client: Read own data only
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'client'
    AND (
        (p.resource = 'bookings' AND p.action IN ('create', 'read'))
        OR (p.resource = 'payments' AND p.action = 'read')
        OR (p.resource = 'invoices' AND p.action = 'read')
        OR (p.resource = 'contracts' AND p.action IN ('read', 'sign'))
    )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================
-- SAMPLE EQUIPMENT CATEGORIES
-- ============================================

INSERT INTO equipment_categories (name, slug, description) VALUES
    ('{"ar": "كاميرات", "en": "Cameras"}', 'cameras', '{"ar": "كاميرات احترافية", "en": "Professional cameras"}'),
    ('{"ar": "عدسات", "en": "Lenses"}', 'lenses', '{"ar": "عدسات كاميرا", "en": "Camera lenses"}'),
    ('{"ar": "إضاءة", "en": "Lighting"}', 'lighting', '{"ar": "معدات الإضاءة", "en": "Lighting equipment"}'),
    ('{"ar": "صوت", "en": "Audio"}', 'audio', '{"ar": "معدات الصوت", "en": "Audio equipment"}'),
    ('{"ar": "ملحقات", "en": "Accessories"}', 'accessories', '{"ar": "ملحقات الكاميرا", "en": "Camera accessories"}')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- SAMPLE EQUIPMENT BRANDS
-- ============================================

INSERT INTO equipment_brands (name, slug, description) VALUES
    ('Sony', 'sony', 'Sony professional cameras and equipment'),
    ('Canon', 'canon', 'Canon professional cameras and lenses'),
    ('RED', 'red', 'RED Digital Cinema cameras'),
    ('ARRI', 'arri', 'ARRI professional cinema equipment'),
    ('Panasonic', 'panasonic', 'Panasonic professional cameras')
ON CONFLICT (slug) DO NOTHING;
