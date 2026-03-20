Component({
  data: {
    show: false,
  },

  lifetimes: {
    attached() {
      // 监听隐私接口需要授权事件
      if (wx.onNeedPrivacyAuthorization) {
        wx.onNeedPrivacyAuthorization((resolve) => {
          this._resolvePrivacy = resolve
          this.setData({ show: true })
        })
      }
    },
  },

  methods: {
    onAgree() {
      this.setData({ show: false })
      if (this._resolvePrivacy) {
        this._resolvePrivacy({ buttonId: 'agree-btn', event: 'agree' })
      }
      this.triggerEvent('agree')
    },

    onReject() {
      this.setData({ show: false })
      if (this._resolvePrivacy) {
        this._resolvePrivacy({ event: 'disagree' })
      }
      this.triggerEvent('reject')
    },

    onOpenPrivacy() {
      wx.openPrivacyContract({
        fail: () => {
          // 如果无法打开内置隐私协议，打开自定义页面
          wx.showModal({
            title: '隐私保护指引',
            content: '闪拍证件照（以下简称"本小程序"）尊重并保护用户的个人隐私。\n\n1. 信息收集：本小程序仅在您主动使用证件照功能时收集您上传的照片。\n\n2. 信息使用：照片仅用于AI证件照生成处理，处理完成后云端临时文件将在24小时内自动清理。\n\n3. 信息存储：生成的证件照存储在微信云开发环境中，仅您本人可访问。\n\n4. 信息共享：我们不会将您的照片分享给任何第三方。\n\n5. 用户权利：您可以随时通过小程序删除已保存的照片记录。',
            showCancel: false,
          })
        }
      })
    },

    preventMove() {
      // 阻止背景滚动
    },
  },
})
