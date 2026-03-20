const app = getApp()

Page({
  data: {
    userInfo: null,
    isVip: false,
    vipExpire: '',
    freeDaily: 1,
    totalPhotos: 0,
    todayFreeLeft: 1,
    totalSaved: 0,
  },

  onLoad() {
    this.setData({
      freeDaily: app.globalData.pricing.freeDaily,
    })
  },

  onShow() {
    this.loadUserData()
  },

  async loadUserData() {
    // 检查登录状态
    const userInfo = app.globalData.userInfo
    if (userInfo) {
      this.setData({ userInfo })
    }

    // 检查今日免费次数
    const today = new Date().toDateString()
    const usedKey = `free_used_${today}`
    const used = wx.getStorageSync(usedKey) || 0
    const freeDaily = app.globalData.pricing.freeDaily

    // 加载本地统计
    const totalPhotos = wx.getStorageSync('total_photos') || 0
    const totalSaved = wx.getStorageSync('total_saved') || 0

    this.setData({
      todayFreeLeft: Math.max(0, freeDaily - used),
      totalPhotos,
      totalSaved,
    })

    // 如果已登录，从云端加载VIP状态
    if (userInfo) {
      try {
        const res = await wx.cloud.callFunction({
          name: 'getUserInfo',
          data: {}
        })
        if (res.result) {
          this.setData({
            isVip: res.result.isVip || false,
            vipExpire: res.result.vipExpire || '',
            totalPhotos: res.result.totalPhotos || totalPhotos,
          })
        }
      } catch (err) {
        console.error('获取用户信息失败:', err)
      }
    }
  },

  // 登录
  onLogin() {
    wx.getUserProfile({
      desc: '用于展示用户信息',
      success: (res) => {
        const userInfo = res.userInfo
        app.globalData.userInfo = userInfo
        this.setData({ userInfo })
        wx.setStorageSync('userInfo', userInfo)
      },
      fail: () => {
        // getUserProfile 已废弃，使用头像昵称填写
        wx.showToast({ title: '请在弹窗中授权', icon: 'none' })
      }
    })
  },

  // 购买VIP
  async onBuyVip() {
    wx.showLoading({ title: '创建订单...', mask: true })

    try {
      const result = await wx.cloud.callFunction({
        name: 'createOrder',
        data: {
          type: 'vip_monthly',
        }
      })

      wx.hideLoading()

      if (result.result && result.result.payment) {
        wx.requestPayment({
          ...result.result.payment,
          success: () => {
            this.setData({ isVip: true })
            wx.showToast({ title: 'VIP开通成功！', icon: 'success' })
          },
          fail: (err) => {
            if (err.errMsg !== 'requestPayment:fail cancel') {
              wx.showToast({ title: '支付失败', icon: 'none' })
            }
          }
        })
      }
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '下单失败，请重试', icon: 'none' })
    }
  },

  onMyPhotos() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  onOrderHistory() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  onAbout() {
    wx.showModal({
      title: '关于闪拍证件照',
      content: 'AI智能证件照制作工具。\n3秒出片，专业品质，超低价格。\n\n如有问题请联系客服。',
      showCancel: false,
    })
  },

  onShareAppMessage() {
    return {
      title: 'AI证件照 - 3秒出片，仅需1.99元',
      path: '/pages/index/index',
    }
  },
})
