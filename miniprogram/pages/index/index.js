const app = getApp()

Page({
  data: {
    hotSpecs: [],
    selectedBg: '#438EDB',
    freeCount: 1,
    userInfo: null,
    reviews: [
      { name: '小***6', stars: '⭐⭐⭐⭐⭐', text: '太方便了！考研报名急用照片，3秒就搞定了，比照相馆好太多' },
      { name: '用***8', stars: '⭐⭐⭐⭐⭐', text: '给宝宝拍的证件照，在家拍完直接生成，省了好多事' },
      { name: 'L***y', stars: '⭐⭐⭐⭐', text: '签证照片规格很全，美签的正方形也有，不用再去照相馆了' },
    ],
  },

  onLoad() {
    // 加载热门规格
    const allSpecs = app.globalData.photoSpecs
    const hotSpecs = allSpecs.filter(s => s.popular)
    this.setData({ hotSpecs })

    // 检查今日免费次数
    this.checkFreeCount()
  },

  onShow() {
    this.checkFreeCount()
  },

  // 检查免费次数
  checkFreeCount() {
    const today = new Date().toDateString()
    const usedKey = `free_used_${today}`
    const used = wx.getStorageSync(usedKey) || 0
    const freeDaily = app.globalData.pricing.freeDaily
    this.setData({
      freeCount: Math.max(0, freeDaily - used)
    })
  },

  // 拍照
  onTakePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      camera: 'front',
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.navigateToSpecs(tempFilePath)
      }
    })
  },

  // 从相册选择
  onChoosePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.navigateToSpecs(tempFilePath)
      }
    })
  },

  // 跳转到规格选择页
  navigateToSpecs(imagePath) {
    // 先存到本地临时变量
    app.globalData.tempImagePath = imagePath
    wx.navigateTo({
      url: '/pages/specs/specs'
    })
  },

  // 选择特定规格
  onSelectSpec(e) {
    const spec = e.currentTarget.dataset.spec
    app.globalData.selectedSpec = spec
    // 直接开始拍照/选照片流程
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        app.globalData.tempImagePath = tempFilePath
        wx.navigateTo({
          url: '/pages/specs/specs'
        })
      }
    })
  },

  // 查看全部规格
  onViewAllSpecs() {
    wx.navigateTo({
      url: '/pages/specs/specs?mode=browse'
    })
  },

  onShareAppMessage() {
    return {
      title: 'AI证件照 - 3秒出片，仅需1.99元',
      path: '/pages/index/index',
    }
  },

  onShareTimeline() {
    return {
      title: 'AI证件照 - 3秒出片，比照相馆省95%',
    }
  }
})
