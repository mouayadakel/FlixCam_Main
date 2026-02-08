# Control Panel Implementation - Quick Action Checklist

## 🚨 WEEK 1: CRITICAL FIXES (Days 1-2)

### P0-1: Fix Fail-Open Permissions (2-4 hours)
- [ ] Update `src/hooks/use-permissions.ts` - change fail-open to fail-closed
- [ ] Add `isSuperAdmin` flag to permissions API response  
- [ ] Add loading/error states to sidebar
- [ ] Test: empty permissions = no access
- [ ] Test: API error = no access
- [ ] Test: super admin = full access

### P0-2: Fix Admin Profile Page (4-6 hours)
**Choose one:**
- [ ] Option A: Create full `/admin/profile` page with:
  - Personal info (name, email, phone, avatar)
  - Password change
  - Preferences (language, timezone, notifications)
  - Activity history
- [ ] Option B: Remove link or redirect to `/admin/settings`

**Recommended: Option A**

---

## 📦 WEEK 1: HIGH PRIORITY (Days 3-5)

### P1-1: Wire Kit Builder to API (6-8 hours)
- [ ] Update page to load kits from `GET /api/kits`
- [ ] Add create kit dialog
- [ ] Wire delete kit to API
- [ ] Wire toggle active/inactive
- [ ] Test full CRUD cycle

### P1-2: Wire AI Recommendations to API (4-6 hours)
- [ ] Load recommendations from `GET /api/ai/recommendations`
- [ ] Add accept/reject actions
- [ ] Add filtering by status
- [ ] Show confidence scores

### P1-3: Replace Mock Data (6-8 hours)
Replace mock data with real APIs for:
- [ ] Wallet (`/admin/wallet`) → use `/api/wallet`
- [ ] Users (`/admin/users`) → use `/api/users`
- [ ] Technicians (`/admin/technicians`) → use `/api/technicians`

---

## 🔧 WEEK 2: MEDIUM PRIORITY

### P2-1: Availability Check on Booking Create (6-8 hours)
- [ ] Create `/api/equipment/availability` endpoint
- [ ] Add availability check to booking form
- [ ] Show available/total for each equipment
- [ ] Block booking if unavailable
- [ ] Show estimated cost before submit

### P2-2: Add Deposit Calculator (4 hours)
- [ ] Calculate deposit (30% of equipment value)
- [ ] Display prominently on booking form
- [ ] Show in quote flow

### P2-3: Add Audit Log Viewer (6-8 hours)
- [ ] Create `/admin/settings/audit-log` page
- [ ] Add filters (action, resource, user, date)
- [ ] Add pagination
- [ ] Add CSV export
- [ ] Show user, IP, changes details

### P2-4: Contract PDF Quick Access (2-4 hours)
- [ ] Add contract card to booking detail
- [ ] Add "View Contract" button (opens PDF)
- [ ] Add "Generate Contract" button if none exists
- [ ] Link to contract detail page

### P2-5: Payment Actions (4-6 hours)
- [ ] Add "Refund" button to payment detail
- [ ] Create refund dialog (amount + reason)
- [ ] Add "Collect" button for pending payments
- [ ] Create `/api/payments/[id]/refund` endpoint
- [ ] Create `/api/payments/[id]/collect` endpoint

### P2-6: Role Conflict Detection (3-4 hours)
- [ ] Create `role-conflicts.ts` with conflict pairs
- [ ] Add conflict checking to role assignment dialog
- [ ] Show warning when conflicts detected
- [ ] Allow override with confirmation

---

## ✨ WEEK 3: ENHANCEMENTS

### P3-1: Orders Detail/Create (6-8 hours)
**First decide:** Are Orders separate from Bookings?
- [ ] If YES: Create detail and create pages
- [ ] If NO: Remove Orders menu or redirect to Bookings

### P3-2: Delivery Schedule Page (4-6 hours)
- [ ] Create `/admin/ops/delivery/schedule` page
- [ ] Add calendar view
- [ ] Show deliveries for selected date
- [ ] Show technician assignments

### P3-3: Sidebar Consolidation (1-2 hours)
- [ ] Ensure one clear "Finance" entry point
- [ ] Group finance sub-pages logically
- [ ] Update menu structure

---

## 🧪 WEEK 4: TESTING & DEPLOYMENT

### Security Testing
- [ ] Test fail-closed permissions with all scenarios
- [ ] Test super admin bypass
- [ ] Test role conflict warnings
- [ ] Verify audit log captures all actions
- [ ] Check for SQL injection vulnerabilities
- [ ] Test CSRF protection

### Feature Testing
- [ ] Admin profile loads and saves correctly
- [ ] Password change works
- [ ] Avatar upload works  
- [ ] Kit Builder CRUD works
- [ ] AI Recommendations display and update
- [ ] Wallet shows real transactions
- [ ] Users/Technicians show real data
- [ ] Availability check prevents double-bookings
- [ ] Cost estimation accurate
- [ ] Deposit calculation correct
- [ ] Contract PDF accessible
- [ ] Payment refund/collect work
- [ ] Audit log filters work
- [ ] Audit log export works

### Regression Testing
- [ ] All existing features still work
- [ ] Sidebar filtering correct
- [ ] APIs respond correctly
- [ ] No console errors
- [ ] Mobile responsive
- [ ] RTL layout correct (Arabic)

### Performance Testing
- [ ] Page load times < 2 seconds
- [ ] API response times < 500ms
- [ ] Database queries optimized
- [ ] No N+1 query problems

---

## 📊 Success Metrics

### Week 1 Target
- Zero security vulnerabilities
- No broken links (404s)
- All mock data replaced

### Week 2 Target  
- Availability prevents double-bookings
- Audit log accessible
- Financial operations work

### Week 3 Target
- All enhancements deployed
- Role conflicts detected

### Week 4 Target
- All tests passing
- Documentation complete
- Ready for production

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All tests pass
- [ ] Code review completed
- [ ] Database backup created
- [ ] Staging environment tested
- [ ] Performance benchmarks met

### Deployment Order
1. [ ] Deploy critical security fixes (P0)
2. [ ] Deploy API connections (P1)
3. [ ] Deploy enhancements (P2)
4. [ ] Deploy polish items (P3)

### Post-Deployment
- [ ] Monitor error logs (first 24 hours)
- [ ] Check audit log for issues
- [ ] Verify permissions working
- [ ] User acceptance testing
- [ ] Performance monitoring

---

## 📋 Daily Standup Template

### What I completed yesterday:
- 

### What I'm working on today:
- 

### Blockers:
- 

### Questions:
- 

---

## 🆘 Escalation Path

| Issue Type | Escalate To | Timeline |
|------------|-------------|----------|
| Security vulnerability | Security Team | Immediate |
| API breaking change | Tech Lead | Same day |
| Scope change | Product Manager | Same day |
| Technical blocker | Senior Developer | 4 hours |
| Testing failure | QA Lead | 2 hours |

---

## 📞 Key Contacts

- **Project Lead:** [Name]
- **Tech Lead:** [Name]  
- **QA Lead:** [Name]
- **DevOps:** [Name]
- **Product Manager:** [Name]

---

## 📚 Documentation Links

- Full Implementation Plan: `control-panel-implementation-plan.md`
- API Documentation: `/docs/api`
- Roles & Permissions: `ROLES_AND_SECURITY.md`
- Booking Engine Spec: `BOOKING_ENGINE.md`

---

**Last Updated:** February 7, 2026  
**Version:** 1.0
