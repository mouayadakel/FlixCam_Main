import {
  canAccessAdminDashboard,
  getDashboardPath,
  getNonAdminDashboardPath,
} from '../dashboard-routing'

describe('dashboard-routing', () => {
  it('keeps legacy DATA_ENTRY users on the portal when no staff role is assigned', () => {
    expect(canAccessAdminDashboard('DATA_ENTRY')).toBe(false)
    expect(getDashboardPath('DATA_ENTRY')).toBe('/portal/dashboard')
    expect(getNonAdminDashboardPath('DATA_ENTRY')).toBe('/portal/dashboard')
  })

  it('treats assigned RBAC data_entry as an admin/staff dashboard role', () => {
    expect(canAccessAdminDashboard('DATA_ENTRY', ['data_entry'])).toBe(true)
    expect(getDashboardPath('DATA_ENTRY', ['data_entry'])).toBe('/admin/dashboard')
    expect(getNonAdminDashboardPath('DATA_ENTRY', ['data_entry'])).toBeNull()
  })

  it('routes assigned staff roles ahead of legacy customer roles', () => {
    expect(canAccessAdminDashboard('CUSTOMER', ['finance'])).toBe(true)
    expect(getDashboardPath('CUSTOMER', ['finance'])).toBe('/admin/dashboard')
  })

  it('routes vendor users to the vendor dashboard', () => {
    expect(getDashboardPath('VENDOR')).toBe('/vendor/dashboard')
    expect(getNonAdminDashboardPath('VENDOR')).toBe('/vendor/dashboard')
  })
})
