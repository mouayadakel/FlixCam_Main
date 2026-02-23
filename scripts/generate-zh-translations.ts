/**
 * Generate Chinese translations for missing keys
 * This script provides Chinese translations for all missing keys
 */

import * as fs from 'fs'
import * as path from 'path'

const zhPath = path.join(__dirname, '../src/messages/zh.json')
const missingPath = path.join(__dirname, 'missing-zh-keys.json')

// Manual Chinese translations for missing keys
const translations: Record<string, string> = {
  // Common
  'common.viewDetails': '查看详情',
  'common.typeEquipment': '设备',
  'common.typeStudio': '工作室',
  'common.typePackage': '套餐',
  'common.typeKit': '套件',

  // Equipment
  'equipment.noSubcategories': '暂无子类别',
  'equipment.selectCategoryForSubcategories': '请选择上方类别以查看子类别',
  'equipment.selectDates': '选择租赁日期',
  'equipment.rentalPricing': '租赁价格',
  'equipment.bestValue': '最佳价值',
  'equipment.week': '周',
  'equipment.month': '月',
  'equipment.noImages': '暂无图片',
  'equipment.listedBy': '发布者',
  'equipment.similarItems': '您可能喜欢的类似设备',
  'equipment.estimatedTotal': '预估总计',
  'equipment.forDays': '{days}天',
  'equipment.rentalDates': '租赁日期',
  'equipment.priceRange': '价格范围',
  'equipment.showResults': '显示{count}个结果',
  'equipment.adjustFilters': '尝试调整筛选条件',
  'equipment.trustDelivery': '提供配送服务',
  'equipment.trustVerified': '设备已检验认证',
  'equipment.qty': '数量',
  'equipment.gridView': '网格视图',
  'equipment.listView': '列表视图',
  'equipment.browseByCategory': '按类别浏览',
  'equipment.categoriesCount': '{count}个类别',
  'equipment.itemsAvailable': '{count}件可用产品',
  'equipment.browse': '浏览',
  'equipment.item': '产品',
  'equipment.items': '产品',
  'equipment.noCategoriesYet': '暂无类别',
  'equipment.noCategoriesDesc': '添加设备后类别将显示在此处。',

  // Studios
  'studios.heroSubtitle': '利雅得全配专业摄影工作室',
  'studios.studiosAvailable': '可用工作室',
  'studios.searchPlaceholder': '搜索工作室...',
  'studios.filters': '筛选',
  'studios.sortName': '名称',
  'studios.sortPriceAsc': '价格：低到高',
  'studios.sortPriceDesc': '价格：高到低',
  'studios.sortCapacity': '容量',
  'studios.filterType': '类型',
  'studios.filterAllTypes': '所有类型',
  'studios.filterPriceRange': '价格范围（沙特里亚尔/小时）',
  'studios.filterCapacity': '容量',
  'studios.filterLocation': '位置',
  'studios.filterAllLocations': '所有位置',
  'studios.clearFilters': '清除筛选',
  'studios.result': '结果',
  'studios.results': '结果',
  'studios.noResultsHint': '尝试调整搜索或筛选条件',

  // Checkout
  'checkout.addTechnician': '添加技术员（可选）',
  'checkout.addonsTechNote': '可在付款时添加保险和可选配件。',
  'checkout.depositHeldNote': '将保留{amount}押金，归还设备后退还。',
  'checkout.paymentMethods': '支付方式：卡/Apple Pay/银行转账',
  'checkout.completePrevious': '请先完成前面的步骤。',
  'checkout.backToCheckout': '返回订单',
  'checkout.completeProfile': '完成个人资料以继续。',
  'checkout.otpSentTitle': '验证码已发送',
  'checkout.otpSentTo': '验证码已发送至{phone}',
  'checkout.changePhone': '更改',
  'checkout.verifiedTitle': '已验证',
  'checkout.continuing': '继续中...',
  'checkout.loginFailed': '登录失败',
  'checkout.accountCreated': '账户已创建',
  'checkout.failedSendCode': '发送验证码失败',
  'checkout.verificationFailed': '验证失败',
  'checkout.registrationFailed': '创建账户失败',
  'checkout.detailsSaved': '已保存',
  'checkout.detailsSavedDesc': '正在继续审核...',
  'checkout.detailsSaveFailed': '保存数据失败',
  'checkout.paymentTitle': '付款',
  'checkout.paymentIncomplete': '请从购物车和验证页面完成订单。',
  'checkout.paymentRedirecting': '正在跳转到付款...',
  'checkout.paymentError': '付款错误',
  'checkout.paymentSessionFailed': '创建付款会话失败',
  'checkout.bookingConfirmed': '预订已确认',
  'checkout.bookingNumber': '预订号：{number}',
  'checkout.bookingLoginPrompt': '登录查看详情或联系支持。',
  'checkout.bookingStudio': '工作室',
  'checkout.bookingAppointment': '预约',
  'checkout.bookingDates': '日期',
  'checkout.bookingTotal': '总计',
  'checkout.bookingEquipment': '设备',
  'checkout.downloadInvoice': '下载发票',
  'checkout.addToCalendar': '添加到日历',
  'checkout.whatsapp': 'WhatsApp',
  'checkout.myBookings': '我的预订',

  // About
  'about.heroTitle': '关于我们',
  'about.heroSubtitle':
    'FlixCam是利雅得领先的电影设备和工作室租赁平台。我们将内容创作者与最佳专业设备连接起来。',
  'about.ourStory': '我们的故事',
  'about.storyP1':
    'FlixCam成立的目的是弥合内容创作者与专业设备之间的差距。我们相信每个项目都应该能够使用最好的工具，而无需拥有它们。',
  'about.storyP2':
    '我们精心挑选来自世界知名品牌的设备，并以最高质量标准维护它们。我们的团队专门从预订到归还为您提供支持。',
  'about.storyP3':
    '我们的使命是通过提供专业的电影设备和简单可靠的预订体验，赋能沙特和阿拉伯世界的创作者。',
  'about.whyFlixCam': '为什么选择FlixCam？',
  'about.val1Title': '精心挑选的专业设备',
  'about.val1Desc': '来自世界知名品牌的相机、灯光、音频设备',
  'about.val2Title': '快速预订和可靠交付',
  'about.val2Desc': '在线预订，当天或次日送达利雅得',
  'about.val3Title': '灵活的租赁期限',
  'about.val3Desc': '按天、周或月租赁，享受长期折扣',
  'about.val4Title': '专家支持',
  'about.val4Desc': '我们的团队随时为您提供技术建议和帮助',
  'about.statsEquipment': '件设备',
  'about.statsBookings': '次预订',
  'about.statsYears': '年经验',
  'about.statsClients': '满意客户',
  'about.contactTitle': '联系我们',
  'about.contactDesc': '有问题或需要帮助？我们的团队随时为您服务。',
  'about.contactPhone': '电话',
  'about.contactEmail': '电子邮件',
  'about.contactAddress': '地址',
  'about.contactHours': '营业时间',
  'about.contactHoursValue': '周日至周四：上午9点 - 晚上9点',

  // SEO
  'seo.homeTitle': 'FlixCam.rent – 租赁电影设备和工作室 | 利雅得',
  'seo.homeDescription':
    '在利雅得预订电影设备和工作室。相机、灯光、音频和专业工作室，提供每日或每周租赁。',
  'seo.aboutTitle': '关于我们 | FlixCam.rent',
  'seo.aboutDescription':
    '了解FlixCam – 利雅得的电影设备和工作室租赁平台。我们的使命、价值观和团队。',
  'seo.supportTitle': '支持 | FlixCam.rent',
  'seo.supportDescription': '联系我们咨询预订、付款或技术援助。WhatsApp、电话、电子邮件。',
  'seo.packagesTitle': '租赁套餐 | FlixCam.rent',
  'seo.packagesDescription':
    '预制设备租赁套餐，享受折扣价格。相机、灯光、音频 – 以优惠价格预订完整套件。',
  'seo.equipmentTitle': '租赁电影设备 | FlixCam.rent',
  'seo.equipmentDescription': '浏览我们的电影设备目录 – 相机、灯光、音频、镜头。在利雅得在线预订。',
  'seo.policiesTitle': '租赁政策 | FlixCam.rent',
  'seo.policiesDescription':
    '租赁条款：保险、押金、身份证明、滞纳金、损坏、取消。FlixCam租赁政策。',
  'seo.howItWorksTitle': '如何运作 | FlixCam.rent',
  'seo.howItWorksDescription':
    '5个简单步骤预订电影设备：选择、预订、付款、取货、归还。专业设备租赁指南。',
  'seo.faqTitle': '常见问题 | FlixCam.rent',
  'seo.faqDescription':
    '关于在利雅得租赁设备和工作室的常见问题。关于预订、付款、取货和归还的答案。',
  'seo.studiosTitle': '摄影工作室 | FlixCam.rent',
  'seo.studiosDescription': '在利雅得租赁专业摄影工作室。配备电影和电视制作设备的工作室。',
  'seo.contactTitle': '联系我们 | FlixCam.rent',
  'seo.contactDescription': '联系我们咨询预订、付款或技术援助。WhatsApp、电话、电子邮件。',

  // Support Page
  'supportPage.heroTitle': '支持',
  'supportPage.heroSubtitle': '联系我们咨询预订、付款或技术援助。',
  'supportPage.phoneAndWhatsapp': '电话和WhatsApp',
  'supportPage.phoneDesc': '我们在WhatsApp上快速回复',
  'supportPage.contactWhatsapp': '通过WhatsApp联系',
  'supportPage.emailTitle': '电子邮件',
  'supportPage.emailDesc': '用于正式请求或文档',
  'supportPage.faqTitle': '常见问题',
  'supportPage.faqDesc': '关于预订、付款和配送的最常见问题的答案。',
  'supportPage.browseFaq': '浏览常见问题',
  'supportPage.hoursTitle': '营业时间',
  'supportPage.hoursValue': '周日至周四：上午9点 - 晚上9点',
  'supportPage.addressTitle': '地址',
  'supportPage.addressValue': '利雅得，沙特阿拉伯',
  'supportPage.needHelp': '需要帮助？',
  'supportPage.reachOut': '通过您喜欢的渠道联系我们',

  // Auth
  'auth.invalidCredentials': '电子邮件或密码不正确。',
  'auth.vendorAccessDenied': '您无权访问供应商面板。请联系管理员。',
  'auth.defaultError': '登录时出错。请重试。',
  'auth.loginSuccess': '登录成功',
  'auth.redirecting': '正在跳转到控制面板...',
  'auth.unexpectedError': '发生意外错误。请重试。',
  'auth.emailAlreadyRegistered': '电子邮件已注册',
  'auth.signInOrUseAnother': '登录或使用其他电子邮件。',
  'auth.registerSuccess': '注册成功',
  'auth.accountCreated': '账户已创建',
  'auth.verificationEmailSent': '验证电子邮件已发送',
  'auth.checkInbox': '请检查您的收件箱以验证您的账户。',
  'auth.registerError': '注册失败',
  'auth.tryAgain': '请重试或联系支持。',
  'auth.forgotPasswordTitle': '忘记密码',
  'auth.forgotPasswordDesc': '输入您的电子邮件以接收重置链接。',
  'auth.emailSent': '电子邮件已发送',
  'auth.checkEmailForReset': '检查您的电子邮件以获取重置链接。',
  'auth.sendResetLink': '发送重置链接',
  'auth.backToLogin': '返回登录',
  'auth.resetPasswordTitle': '重置密码',
  'auth.resetPasswordDesc': '输入您的新密码。',
  'auth.newPassword': '新密码',
  'auth.confirmPassword': '确认密码',
  'auth.resetPassword': '重置密码',
  'auth.passwordReset': '密码已重置',
  'auth.passwordResetSuccess': '您的密码已成功重置。',
  'auth.invalidToken': '无效或过期的令牌',
  'auth.requestNewReset': '请求新的重置链接。',
  'auth.verifyEmailTitle': '验证电子邮件',
  'auth.verifying': '正在验证您的电子邮件...',
  'auth.emailVerified': '电子邮件已验证',
  'auth.emailVerifiedSuccess': '您的电子邮件已成功验证。',
  'auth.verificationFailed': '验证失败',
  'auth.invalidVerificationToken': '无效或过期的验证令牌。',
  'auth.resendVerification': '重新发送验证',
  'auth.goToDashboard': '前往控制面板',
  'auth.sessionExpired': '会话已过期',
  'auth.pleaseLoginAgain': '请重新登录。',
  'auth.serverError': '服务器错误。请检查服务器设置。',

  // Vendor
  'vendor.equipmentPage': '我的设备',
  'vendor.manageEquipmentDesc': '管理您的租赁设备库存',
  'vendor.addNewEquipment': '添加新设备',
  'vendor.equipmentList': '设备列表',
  'vendor.noEquipmentYet': '尚未添加设备',
  'vendor.addFirstEquipment': '添加您的第一件设备',
  'vendor.pendingReview': '待审核',
  'vendor.approved': '已批准',
  'vendor.rejected': '已拒绝',
  'vendor.inactive': '未激活',
  'vendor.perDay': '每天',
  'vendor.edit': '编辑',
  'vendor.earningsPage': '收入',
  'vendor.earningsSummaryDesc': '您的收入摘要和统计',
  'vendor.totalGrossRevenue': '总收入',
  'vendor.platformCommission': '平台佣金',
  'vendor.netEarnings': '净收入',
  'vendor.thisMonth': '本月',
  'vendor.allTime': '所有时间',
  'vendor.commissionRate': '佣金率{rate}%',
  'vendor.vsLastMonth': '与上月相比{pct}%',
  'vendor.monthlyEarnings': '月收入',
  'vendor.payoutsPage': '付款',
  'vendor.payoutsDesc': '您的付款历史和待处理付款',
  'vendor.pendingPayout': '待付款',
  'vendor.paidOut': '已付款',
  'vendor.paymentUnit': '笔付款',
  'vendor.payoutsHistory': '付款历史',
  'vendor.noPayoutsYet': '尚无付款',
  'vendor.statusPending': '待处理',
  'vendor.statusProcessing': '处理中',
  'vendor.statusPaid': '已付款',
  'vendor.statusFailed': '失败',
  'vendor.bookingHash': '预订#{id}',
  'vendor.paidAt': '付款于{date}',
  'vendor.grossMinusCommission': '总额{gross} - 佣金{commission}',

  // Portal
  'portal.contractsPage': '合同',
  'portal.contractsDesc': '查看和管理您的租赁合同',
  'portal.noContractsYet': '尚无合同',
  'portal.noContractsDesc': '您的租赁合同将显示在此处。',
  'portal.contractNumber': '合同#{number}',
  'portal.viewContract': '查看合同',
  'portal.downloadPdf': '下载PDF',
  'portal.signContract': '签署合同',
  'portal.contractSigned': '已签署',
  'portal.contractPending': '待签署',
  'portal.contractDetailsPage': '合同详情',
  'portal.contractDetailsDesc': '合同#{id}的详细信息',
  'portal.contractNotFound': '未找到合同',
  'portal.contractNotFoundDesc': '请求的合同不存在或您无权访问。',
  'portal.backToContracts': '返回合同',
  'portal.contractInfo': '合同信息',
  'portal.contractStatus': '状态',
  'portal.contractCreated': '创建于',
  'portal.contractSigning': '签署合同',
  'portal.contractSigningDesc': '请在下方签名以确认您同意条款。',
  'portal.signHere': '在此签名',
  'portal.clearSignature': '清除',
  'portal.submitSignature': '提交签名',
  'portal.signatureRequired': '需要签名',
  'portal.invoicesPage': '发票',
  'portal.invoicesDesc': '查看和下载您的发票',
  'portal.noInvoicesYet': '尚无发票',
  'portal.noInvoicesDesc': '您的发票将显示在此处。',
  'portal.invoiceNumber': '发票#{number}',
  'portal.viewInvoice': '查看发票',
  'portal.invoicePaid': '已付款',
  'portal.invoicePending': '待付款',
  'portal.invoiceOverdue': '逾期',
  'portal.documentsPage': '文档',
  'portal.documentsDesc': '访问您的租赁文档',
  'portal.noDocumentsYet': '尚无文档',
  'portal.noDocumentsDesc': '您的文档将显示在此处。',
  'portal.downloadDocument': '下载',
  'portal.notificationsPage': '通知',
  'portal.notificationsDesc': '查看您的通知和更新',
  'portal.noNotificationsYet': '尚无通知',
  'portal.noNotificationsDesc': '您的通知将显示在此处。',
  'portal.markAllRead': '全部标记为已读',
  'portal.bookingDetailPage': '预订详情',
  'portal.bookingDetailDesc': '预订#{id}的详细信息',
  'portal.bookingNotFound': '未找到预订',
  'portal.bookingNotFoundDesc': '请求的预订不存在或您无权访问。',
  'portal.backToBookings': '返回预订',
  'portal.bookingInfo': '预订信息',
  'portal.bookingItems': '预订项目',
  'portal.bookingTimeline': '时间线',
  'portal.bookingActions': '操作',
  'portal.cancelBooking': '取消预订',
  'portal.modifyBooking': '修改预订',
  'portal.contactSupport': '联系支持',
}

async function main() {
  // Read current zh.json
  const zhContent = JSON.parse(fs.readFileSync(zhPath, 'utf-8'))

  // Merge translations into nested structure
  for (const [key, value] of Object.entries(translations)) {
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

  // Write updated zh.json
  fs.writeFileSync(zhPath, JSON.stringify(zhContent, null, 2) + '\n')

  console.log(`✓ Added ${Object.keys(translations).length} Chinese translations to zh.json`)
  console.log('✓ Chinese translation file updated successfully')
}

main().catch(console.error)
