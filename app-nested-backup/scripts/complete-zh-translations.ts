/**
 * Complete remaining Chinese translations (179 missing keys)
 */

import * as fs from 'fs'
import * as path from 'path'

const zhPath = path.join(__dirname, '../src/messages/zh.json')

const remainingTranslations: Record<string, string> = {
  // Portal (115 keys)
  'portal.dashboard': '控制面板',
  'portal.welcomeMessage': '欢迎来到客户控制面板',
  'portal.totalBookings': '总预订数',
  'portal.allBookings': '所有预订',
  'portal.totalSpent': '总支出',
  'portal.paidSoFar': '已支付',
  'portal.upcomingReturns': '即将归还',
  'portal.nextSevenDays': '未来7天内',
  'portal.activeBookings': '活跃预订',
  'portal.upcomingBookings': '即将到来的预订',
  'portal.pastBookings': '过去的预订',
  'portal.viewAll': '查看全部',
  'portal.noActiveBookings': '暂无活跃预订',
  'portal.noUpcomingBookings': '暂无即将到来的预订',
  'portal.noPastBookings': '暂无过去的预订',
  'portal.bookingId': '预订ID',
  'portal.status': '状态',
  'portal.pickupDate': '取货日期',
  'portal.returnDate': '归还日期',
  'portal.total': '总计',
  'portal.actions': '操作',
  'portal.view': '查看',
  'portal.cancel': '取消',
  'portal.modify': '修改',
  'portal.statusConfirmed': '已确认',
  'portal.statusPending': '待处理',
  'portal.statusActive': '活跃',
  'portal.statusCompleted': '已完成',
  'portal.statusCancelled': '已取消',
  'portal.quickActions': '快速操作',
  'portal.browseEquipment': '浏览设备',
  'portal.browseStudios': '浏览工作室',
  'portal.viewContracts': '查看合同',
  'portal.viewInvoices': '查看发票',
  'portal.myProfile': '我的资料',
  'portal.settings': '设置',
  'portal.logout': '登出',
  'portal.recentActivity': '最近活动',
  'portal.noRecentActivity': '暂无最近活动',
  'portal.savedItems': '已保存项目',
  'portal.noSavedItems': '暂无已保存项目',
  'portal.saveForLater': '保存以备后用',
  'portal.removeFromSaved': '从已保存中移除',
  'portal.profilePage': '个人资料',
  'portal.profileDesc': '管理您的个人信息',
  'portal.personalInfo': '个人信息',
  'portal.fullName': '全名',
  'portal.email': '电子邮件',
  'portal.phone': '电话',
  'portal.address': '地址',
  'portal.city': '城市',
  'portal.country': '国家',
  'portal.saveChanges': '保存更改',
  'portal.changePassword': '更改密码',
  'portal.currentPassword': '当前密码',
  'portal.newPassword': '新密码',
  'portal.confirmNewPassword': '确认新密码',
  'portal.updatePassword': '更新密码',
  'portal.profileUpdated': '资料已更新',
  'portal.profileUpdateFailed': '更新资料失败',
  'portal.passwordUpdated': '密码已更新',
  'portal.passwordUpdateFailed': '更新密码失败',
  'portal.preferences': '偏好设置',
  'portal.language': '语言',
  'portal.currency': '货币',
  'portal.timezone': '时区',
  'portal.notifications': '通知',
  'portal.emailNotifications': '电子邮件通知',
  'portal.smsNotifications': '短信通知',
  'portal.pushNotifications': '推送通知',
  'portal.marketingEmails': '营销邮件',
  'portal.bookingReminders': '预订提醒',
  'portal.returnReminders': '归还提醒',
  'portal.specialOffers': '特别优惠',
  'portal.savePreferences': '保存偏好',
  'portal.preferencesUpdated': '偏好已更新',
  'portal.preferencesUpdateFailed': '更新偏好失败',
  'portal.deleteAccount': '删除账户',
  'portal.deleteAccountWarning': '此操作无法撤销。您的所有数据将被永久删除。',
  'portal.confirmDelete': '确认删除',
  'portal.accountDeleted': '账户已删除',
  'portal.accountDeleteFailed': '删除账户失败',
  'portal.verifyIdentity': '验证身份',
  'portal.identityVerified': '身份已验证',
  'portal.identityNotVerified': '身份未验证',
  'portal.uploadId': '上传身份证件',
  'portal.idUploaded': '身份证件已上传',
  'portal.idUploadFailed': '上传身份证件失败',
  'portal.paymentMethods': '支付方式',
  'portal.addPaymentMethod': '添加支付方式',
  'portal.noPaymentMethods': '暂无支付方式',
  'portal.defaultPaymentMethod': '默认支付方式',
  'portal.setAsDefault': '设为默认',
  'portal.removePaymentMethod': '移除支付方式',
  'portal.paymentMethodAdded': '支付方式已添加',
  'portal.paymentMethodRemoved': '支付方式已移除',
  'portal.billingHistory': '账单历史',
  'portal.noBillingHistory': '暂无账单历史',
  'portal.invoiceDate': '发票日期',
  'portal.invoiceAmount': '发票金额',
  'portal.invoiceStatus': '发票状态',
  'portal.downloadInvoice': '下载发票',
  'portal.payNow': '立即支付',
  'portal.referralProgram': '推荐计划',
  'portal.referralCode': '推荐代码',
  'portal.copyCode': '复制代码',
  'portal.shareLink': '分享链接',
  'portal.referralEarnings': '推荐收入',
  'portal.referralsCount': '推荐数量',
  'portal.loyaltyPoints': '忠诚积分',
  'portal.pointsBalance': '积分余额',
  'portal.redeemPoints': '兑换积分',
  'portal.pointsHistory': '积分历史',
  'portal.earnedPoints': '获得积分',
  'portal.redeemedPoints': '已兑换积分',
  'portal.supportTickets': '支持工单',
  'portal.createTicket': '创建工单',
  'portal.noTickets': '暂无工单',
  'portal.ticketSubject': '工单主题',
  'portal.ticketStatus': '工单状态',
  'portal.ticketCreated': '创建时间',
  'portal.viewTicket': '查看工单',
  'portal.openTickets': '未解决工单',
  'portal.closedTickets': '已解决工单',

  // Vendor (26 keys)
  'vendor.dashboard': '供应商控制面板',
  'vendor.welcome': '欢迎，{name}',
  'vendor.listedEquipment': '已列出设备',
  'vendor.activeEquipment': '活跃设备',
  'vendor.activeRentals': '活跃租赁',
  'vendor.now': '现在',
  'vendor.monthEarnings': '本月收入',
  'vendor.netAfterCommission': '扣除佣金后净额',
  'vendor.totalEarnings': '总收入',
  'vendor.recentBookings': '最近预订',
  'vendor.noRecentBookings': '暂无最近预订',
  'vendor.viewAllBookings': '查看所有预订',
  'vendor.equipmentPerformance': '设备表现',
  'vendor.topPerforming': '表现最佳',
  'vendor.needsAttention': '需要关注',
  'vendor.analytics': '分析',
  'vendor.bookingsThisMonth': '本月预订',
  'vendor.revenueThisMonth': '本月收入',
  'vendor.avgBookingValue': '平均预订价值',
  'vendor.utilizationRate': '利用率',
  'vendor.customerRating': '客户评分',
  'vendor.responseTime': '响应时间',
  'vendor.quickStats': '快速统计',
  'vendor.pendingApprovals': '待批准',
  'vendor.upcomingPickups': '即将取货',
  'vendor.upcomingReturns': '即将归还',

  // Auth (24 keys)
  'auth.loginError': '登录错误',
  'auth.configError': '配置不正确。请检查服务器设置。',
  'auth.tooManyAttempts': '尝试次数过多',
  'auth.waitAndRetry': '请稍等片刻后重试。',
  'auth.registrationError': '注册错误',
  'auth.checkDataAndRetry': '检查数据后重试。',
  'auth.signInNextPage': '从下一页登录。',
  'auth.forgotPassword': '忘记密码',
  'auth.sending': '发送中...',
  'auth.checkYourEmail': '检查您的电子邮件',
  'auth.emailLabel': '电子邮件',
  'auth.passwordLabel': '密码',
  'auth.rememberMe': '记住我',
  'auth.loginButton': '登录',
  'auth.noAccount': '还没有账户？',
  'auth.signUp': '注册',
  'auth.registerButton': '注册',
  'auth.haveAccount': '已有账户？',
  'auth.signIn': '登录',
  'auth.nameLabel': '姓名',
  'auth.phoneLabel': '电话',
  'auth.termsAgree': '我同意',
  'auth.termsAndConditions': '条款和条件',
  'auth.privacyPolicy': '隐私政策',

  // About (8 keys)
  'about.statsRentals': '已完成租赁',
  'about.locationTitle': '我们的位置和联系方式',
  'about.openInMaps': '在Google地图中打开',
  'about.ctaTitle': '立即开始预订',
  'about.ctaSubtitle': '浏览我们的设备目录，几分钟内在线预订',
  'about.ctaButton': '浏览设备',
  'about.defaultAddress': '利雅得，沙特阿拉伯',
  'about.defaultHours': '全年 - 按预约',

  // Support Page (6 keys)
  'supportPage.notFoundTitle': '没找到答案？',
  'supportPage.notFoundDesc': '发送消息，我们会尽快回复您。',
  'supportPage.contactUs': '联系我们',
  'supportPage.seeAlso': '另请参阅',
  'supportPage.termsLink': '条款与隐私',
  'supportPage.howItWorksLink': '如何运作',
}

async function main() {
  const zhContent = JSON.parse(fs.readFileSync(zhPath, 'utf-8'))

  for (const [key, value] of Object.entries(remainingTranslations)) {
    const parts = key.split('.')
    let current: any = zhContent

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (!current[part]) {
        current[part] = {}
      }
      current = current[part]
    }

    const lastPart = parts[parts.length - 1]
    current[lastPart] = value
  }

  fs.writeFileSync(zhPath, JSON.stringify(zhContent, null, 2) + '\n')

  console.log(`✓ Added ${Object.keys(remainingTranslations).length} remaining Chinese translations`)
  console.log('✓ Chinese translation file completed')
}

main().catch(console.error)
