const app = getApp()

Page({
  data: {
    resultImageUrl: '',
    resultFileID: '',
    specName: '',
    specDesc: '',
    bgName: '',
    bgColor: '#438EDB',
    activeLayout: 'single',
    hasWatermark: true,
    canWatchAd: true,
    priceText: '1.99',
    orderId: '',
  },

  onLoad() {
    const result = app.globalData.processResult
    const spec = app.globalData.selectedSpec
    const bg = app.globalData.selectedBg

    if (!result || !spec) {
      wx.showToast({ title: '数据异常', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }

    this.setData({
      resultImageUrl: result.previewUrl || result.imageUrl,
      resultFileID: result.fileID,
      specName: spec.name,
      specDesc: spec.desc,
      bgName: bg ? bg.name : '蓝色',
      bgColor: bg ? bg.color : '#438EDB',
      hasWatermark: !result.isPaid,
      priceText: (app.globalData.pricing.singlePrice / 100).toFixed(2),
    })

    // 预加载广告
    this.loadRewardedAd()
  },

  // 选择排版
  onSelectLayout(e) {
    const layout = e.currentTarget.dataset.layout
    this.setData({ activeLayout: layout })
  },

  // 付费下载
  async onPay() {
    wx.showLoading({ title: '创建订单...', mask: true })

    try {
      const result = await wx.cloud.callFunction({
        name: 'createOrder',
        data: {
          fileID: this.data.resultFileID,
          spec: app.globalData.selectedSpec,
          layout: this.data.activeLayout,
          type: 'id_photo',
        }
      })

      wx.hideLoading()

      if (result.result && result.result.payment) {
        // 发起微信支付
        const payment = result.result.payment
        wx.requestPayment({
          ...payment,
          success: () => {
            this.setData({
              hasWatermark: false,
              resultImageUrl: result.result.hdImageUrl || this.data.resultImageUrl,
            })
            wx.showToast({ title: '支付成功！', icon: 'success' })
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
      console.error('创建订单失败:', err)
      wx.showToast({ title: '下单失败，请重试', icon: 'none' })
    }
  },

  // 看广告免费下载
  onWatchAd() {
    if (this.rewardedAd) {
      this.rewardedAd.show().catch(() => {
        this.rewardedAd.load().then(() => this.rewardedAd.show())
      })
    } else {
      wx.showToast({ title: '广告暂不可用', icon: 'none' })
    }
  },

  // 加载激励视频广告
  loadRewardedAd() {
    if (wx.createRewardedVideoAd) {
      this.rewardedAd = wx.createRewardedVideoAd({
        adUnitId: '' // 需要在小程序后台申请广告位ID
      })

      this.rewardedAd.onClose((res) => {
        if (res && res.isEnded) {
          // 广告看完，免费下载
          this.setData({ hasWatermark: false })
          wx.showToast({ title: '已解锁高清版', icon: 'success' })
        }
      })

      this.rewardedAd.onError((err) => {
        console.error('广告加载失败:', err)
        this.setData({ canWatchAd: false })
      })
    }
  },

  // 保存到相册
  async onSavePhoto() {
    try {
      // 获取临时文件
      const { tempFilePath } = await wx.cloud.downloadFile({
        fileID: this.data.resultFileID,
      })

      // 保存到相册
      await wx.saveImageToPhotosAlbum({
        filePath: tempFilePath,
      })

      wx.showToast({ title: '保存成功', icon: 'success' })
    } catch (err) {
      if (err.errMsg && err.errMsg.includes('auth deny')) {
        wx.showModal({
          title: '提示',
          content: '需要相册权限才能保存照片，是否前往设置？',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting()
            }
          }
        })
      } else {
        wx.showToast({ title: '保存失败', icon: 'none' })
      }
    }
  },

  // 重新拍摄
  onRetake() {
    wx.navigateBack({ delta: 2 })
  },

  onShareAppMessage() {
    return {
      title: '我用AI做了一张完美的证件照，只花了1.99元！',
      path: '/pages/index/index',
    }
  },
})
