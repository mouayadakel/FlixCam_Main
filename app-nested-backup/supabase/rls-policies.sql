-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Run this AFTER running schema.sql
-- ============================================

-- Enable RLS on all tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_delivery ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTION: Check user role
-- ============================================

CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS VARCHAR AS $$
DECLARE
    role_name VARCHAR;
BEGIN
    SELECT r.name INTO role_name
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid
    LIMIT 1;
    
    RETURN COALESCE(role_name, 'client');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROLES & PERMISSIONS POLICIES
-- ============================================

-- Roles: All authenticated users can read
CREATE POLICY "Roles are viewable by authenticated users"
    ON roles FOR SELECT
    TO authenticated
    USING (true);

-- User roles: Users can see their own role
CREATE POLICY "Users can view their own role"
    ON user_roles FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Admins can view all user roles
CREATE POLICY "Admins can view all user roles"
    ON user_roles FOR SELECT
    TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('super_admin', 'admin')
    );

-- ============================================
-- CLIENTS POLICIES
-- ============================================

-- Clients: Users can view their own client record
CREATE POLICY "Users can view own client record"
    ON clients FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Staff can view all clients
CREATE POLICY "Staff can view all clients"
    ON clients FOR SELECT
    TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('super_admin', 'admin', 'staff')
    );

-- Staff can create/update clients
CREATE POLICY "Staff can manage clients"
    ON clients FOR ALL
    TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('super_admin', 'admin', 'staff')
    );

-- ============================================
-- EQUIPMENT POLICIES
-- ============================================

-- Equipment: All authenticated users can view
CREATE POLICY "Equipment is viewable by authenticated users"
    ON equipment_items FOR SELECT
    TO authenticated
    USING (true);

-- Only staff can modify equipment
CREATE POLICY "Staff can manage equipment"
    ON equipment_items FOR ALL
    TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('super_admin', 'admin', 'staff', 'warehouse')
    );

-- Equipment pricing: Viewable by all, editable by staff
CREATE POLICY "Equipment pricing viewable by all"
    ON equipment_pricing FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Staff can manage equipment pricing"
    ON equipment_pricing FOR ALL
    TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('super_admin', 'admin', 'staff')
    );

-- ============================================
-- BOOKINGS POLICIES
-- ============================================

-- Bookings: Users can view their own bookings
CREATE POLICY "Users can view own bookings"
    ON bookings FOR SELECT
    TO authenticated
    USING (
        client_id IN (
            SELECT id FROM clients WHERE user_id = auth.uid()
        )
        OR created_by = auth.uid()
    );

-- Staff can view all bookings
CREATE POLICY "Staff can view all bookings"
    ON bookings FOR SELECT
    TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('super_admin', 'admin', 'staff', 'warehouse', 'driver', 'technician')
    );

-- Users can create bookings
CREATE POLICY "Users can create bookings"
    ON bookings FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Staff can update bookings
CREATE POLICY "Staff can update bookings"
    ON bookings FOR UPDATE
    TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('super_admin', 'admin', 'staff', 'warehouse')
    );

-- ============================================
-- PAYMENTS POLICIES
-- ============================================

-- Payments: Users can view payments for their bookings
CREATE POLICY "Users can view own payment records"
    ON payments FOR SELECT
    TO authenticated
    USING (
        booking_id IN (
            SELECT id FROM bookings 
            WHERE client_id IN (
                SELECT id FROM clients WHERE user_id = auth.uid()
            )
        )
    );

-- Staff can view all payments
CREATE POLICY "Staff can view all payments"
    ON payments FOR SELECT
    TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('super_admin', 'admin', 'staff')
    );

-- Only admins can create/update payments
CREATE POLICY "Admins can manage payments"
    ON payments FOR ALL
    TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('super_admin', 'admin')
    );

-- ============================================
-- NOTIFICATIONS POLICIES
-- ============================================

-- Notifications: Users can only view their own
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- System can create notifications (via service role)
CREATE POLICY "System can create notifications"
    ON notifications FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ============================================
-- AUDIT LOGS POLICIES
-- ============================================

-- Audit logs: Only admins can view
CREATE POLICY "Admins can view audit logs"
    ON audit_logs FOR SELECT
    TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('super_admin', 'admin')
    );

-- All authenticated users can create audit logs
CREATE POLICY "Users can create audit logs"
    ON audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ============================================
-- CONTRACTS POLICIES
-- ============================================

-- Contracts: Users can view contracts for their bookings
CREATE POLICY "Users can view own contracts"
    ON contracts FOR SELECT
    TO authenticated
    USING (
        booking_id IN (
            SELECT id FROM bookings 
            WHERE client_id IN (
                SELECT id FROM clients WHERE user_id = auth.uid()
            )
        )
    );

-- Staff can view all contracts
CREATE POLICY "Staff can view all contracts"
    ON contracts FOR SELECT
    TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('super_admin', 'admin', 'staff')
    );

-- Staff can create/update contracts
CREATE POLICY "Staff can manage contracts"
    ON contracts FOR ALL
    TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('super_admin', 'admin', 'staff')
    );
