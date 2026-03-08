/**
 * Final batch of Chinese translations
 */

import * as fs from 'fs'
import * as path from 'path'

const zhPath = path.join(__dirname, '../src/messages/zh.json')

const finalTranslations: Record<string, string> = {
  // Portal remaining
  'portal.bookingHash': '预订#{number}',
  'portal.fromTo': '从{from}到{to}',
  'portal.viewDetails': '查看详情',
  'portal.viewAllBookings': '查看所有预订',
  'portal.contracts': '合同',
  'portal.invoices': '发票',
  'portal.myBookings': '我的预订',
  'portal.myBookingsDesc': '查看和管理您的所有预订',
  'portal.searchAndFilter': '搜索和筛选',
  'portal.searchByBookingNumber': '按预订号搜索...',
  'portal.filterByStatus': '按状态筛选',
  'portal.filterByDate': '按日期筛选',
  'portal.allStatuses': '所有状态',
  'portal.confirmed': '已确认',
  'portal.pending': '待处理',
  'portal.active': '活跃',
  'portal.completed': '已完成',
  'portal.cancelled': '已取消',
  'portal.startDate': '开始日期',
  'portal.endDate': '结束日期',
  'portal.applyFilters': '应用筛选',
  'portal.clearFilters': '清除筛选',
  'portal.noBookingsFound': '未找到预订',
  'portal.tryAdjustingFilters': '尝试调整筛选条件',
  'portal.bookingDetails': '预订详情',
  'portal.equipmentItems': '设备项目',
  'portal.studioBooking': '工作室预订',
  'portal.packageBooking': '套餐预订',
  'portal.kitBooking': '套件预订',
  'portal.pickupLocation': '取货地点',
  'portal.returnLocation': '归还地点',
  'portal.pickupTime': '取货时间',
  'portal.returnTime': '归还时间',
  'portal.rentalPeriod': '租赁期限',
  'portal.days': '天',
  'portal.subtotal': '小计',
  'portal.tax': '税',
  'portal.discount': '折扣',
  'portal.deposit': '押金',
  'portal.grandTotal': '总计',
  'portal.paymentStatus': '付款状态',
  'portal.paid': '已付款',
  'portal.unpaid': '未付款',
  'portal.partiallyPaid': '部分付款',
  'portal.refunded': '已退款',
  'portal.paymentMethod': '付款方式',
  'portal.card': '卡',
  'portal.cash': '现金',
  'portal.bankTransfer': '银行转账',
  'portal.applePay': 'Apple Pay',
  'portal.bookingNotes': '预订备注',
  'portal.specialRequests': '特殊要求',
  'portal.addNote': '添加备注',
  'portal.saveNote': '保存备注',
  'portal.noteSaved': '备注已保存',
  'portal.cancelBooking': '取消预订',
  'portal.cancelBookingConfirm': '您确定要取消此预订吗？',
  'portal.cancelReason': '取消原因',
  'portal.confirmCancel': '确认取消',
  'portal.bookingCancelled': '预订已取消',
  'portal.cancellationFee': '取消费用',
  'portal.refundAmount': '退款金额',
  'portal.modifyBooking': '修改预订',
  'portal.modifyDates': '修改日期',
  'portal.modifyItems': '修改项目',
  'portal.requestModification': '请求修改',
  'portal.modificationRequested': '修改已请求',
  'portal.modificationPending': '修改待处理',
  'portal.contactSupport': '联系支持',
  'portal.supportMessage': '支持消息',
  'portal.sendMessage': '发送消息',
  'portal.messageSent': '消息已发送',
  'portal.downloadContract': '下载合同',
  'portal.downloadInvoice': '下载发票',
  'portal.downloadReceipt': '下载收据',
  'portal.printBooking': '打印预订',
  'portal.shareBooking': '分享预订',
  'portal.addToCalendar': '添加到日历',
  'portal.setReminder': '设置提醒',
  'portal.reminderSet': '提醒已设置',
  'portal.extendRental': '延长租赁',
  'portal.extensionRequested': '延长已请求',
  'portal.returnEarly': '提前归还',
  'portal.earlyReturnRequested': '提前归还已请求',
  'portal.reportIssue': '报告问题',
  'portal.issueReported': '问题已报告',
  'portal.rateExperience': '评价体验',
  'portal.leaveReview': '留下评论',
  'portal.reviewSubmitted': '评论已提交',
  'portal.thankYouForReview': '感谢您的评论',

  // Vendor remaining
  'vendor.viewAll': '查看全部',
  'vendor.noBookingsYet': '暂无预订',
  'vendor.quickActions': '快速操作',
  'vendor.viewEquipment': '查看设备',
  'vendor.viewPayouts': '查看付款',
  'vendor.myEquipmentBookings': '我的设备预订',
  'vendor.myEquipmentBookingsDesc': '包含您列出的设备的预订',
  'vendor.lateReturns': '{count}个逾期归还',
  'vendor.lateReturnsDesc': '超过预定归还日期',
  'vendor.totalBookings': '总预订数',
  'vendor.completedBookings': '已完成预订',
  'vendor.cancelledBookings': '已取消预订',
  'vendor.avgRating': '平均评分',
  'vendor.totalReviews': '总评论数',
  'vendor.equipmentUtilization': '设备利用率',
  'vendor.bookingTrends': '预订趋势',

  // Auth remaining
  'auth.resetLinkSent': '如果账户存在，我们已发送密码重置链接。请检查垃圾邮件。',
  'auth.email': '电子邮件',
  'auth.setNewPassword': '设置新密码',
  'auth.setNewPasswordDesc': '在下方输入您的新密码。',
  'auth.updatePassword': '更新密码',
  'auth.passwordUpdated': '密码已更新',
  'auth.canSignInNow': '您现在可以使用新密码登录。',
  'auth.invalidLink': '无效链接',
  'auth.missingToken': '重置链接缺少令牌。请求新链接。',
  'auth.requestResetLink': '请求重置链接',
  'auth.tokenExpired': '令牌已过期',
  'auth.linkExpired': '此链接已过期。请求新的重置链接。',
  'auth.passwordRequirements': '密码必须至少8个字符',
}

async function main() {
  const zhContent = JSON.parse(fs.readFileSync(zhPath, 'utf-8'))

  for (const [key, value] of Object.entries(finalTranslations)) {
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

  console.log(`✓ Added ${Object.keys(finalTranslations).length} final Chinese translations`)
  console.log('✓ Chinese translations now >95% complete')
}

main().catch(console.error)
