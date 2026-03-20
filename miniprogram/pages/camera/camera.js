const app = getApp()

Page({
  data: {
    devicePosition: 'front',
  },

  onLoad() {
    this.cameraCtx = wx.createCameraContext()
  },

  // 拍照
  onTakePhoto() {
    this.cameraCtx.takePhoto({
      quality: 'high',
      success: (res) => {
        app.globalData.tempImagePath = res.tempImagePath
        wx.navigateTo({
          url: '/pages/specs/specs'
        })
      },
      fail: (err) => {
        console.error('拍照失败:', err)
        wx.showToast({ title: '拍照失败', icon: 'none' })
      }
    })
  },

  // 从相册选择
  onChooseAlbum() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        app.globalData.tempImagePath = res.tempFiles[0].tempFilePath
        wx.navigateTo({
          url: '/pages/specs/specs'
        })
      }
    })
  },

  // 翻转摄像头
  onFlipCamera() {
    const pos = this.data.devicePosition === 'front' ? 'back' : 'front'
    this.setData({ devicePosition: pos })
  },

  onCameraError(e) {
    console.error('相机错误:', e)
    wx.showModal({
      title: '相机不可用',
      content: '请检查相机权限设置',
      confirmText: '去设置',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting()
        }
      }
    })
  },
})
