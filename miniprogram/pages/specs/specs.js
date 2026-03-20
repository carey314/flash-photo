const app = getApp()

Page({
  data: {
    imagePath: '',
    bgColors: [],
    selectedBgId: 'blue',
    selectedBg: null,
    categories: [
      { key: 'common', name: '常用' },
      { key: 'exam', name: '考试' },
      { key: 'visa', name: '签证' },
      { key: 'other', name: '其他' },
    ],
    activeCategory: 'common',
    allSpecs: [],
    filteredSpecs: [],
    selectedSpecId: '',
    selectedSpec: null,
    isFree: false,
    priceText: '1.99',
    canGenerate: false,
    mode: 'select', // select or browse
  },

  onLoad(options) {
    const bgColors = app.globalData.bgColors
    const allSpecs = app.globalData.photoSpecs
    const imagePath = app.globalData.tempImagePath || ''
    const preSelectedSpec = app.globalData.selectedSpec

    const mode = options.mode || 'select'

    this.setData({
      bgColors,
      allSpecs,
      imagePath,
      mode,
      selectedBg: bgColors.find(b => b.id === 'blue'),
    })

    // 如果有预选规格
    if (preSelectedSpec) {
      this.setData({
        selectedSpecId: preSelectedSpec.id,
        selectedSpec: preSelectedSpec,
      })
    }

    this.filterSpecs('common')
    this.updateCanGenerate()
    this.checkFreeStatus()
  },

  // 分类映射
  specCategoryMap: {
    common: ['one_inch', 'two_inch', 'small_one', 'small_two', 'id_card', 'social_security', 'resume', 'driving'],
    exam: ['exam_cet', 'exam_civil', 'graduation'],
    visa: ['passport_cn', 'visa_us', 'visa_jp'],
    other: [],
  },

  // 筛选规格
  filterSpecs(category) {
    const { allSpecs } = this.data
    const ids = this.specCategoryMap[category] || []

    let filtered
    if (category === 'other') {
      const allIds = Object.values(this.specCategoryMap).flat()
      filtered = allSpecs.filter(s => !allIds.includes(s.id))
    } else {
      filtered = allSpecs.filter(s => ids.includes(s.id))
    }

    this.setData({
      activeCategory: category,
      filteredSpecs: filtered,
    })
  },

  // 切换分类
  onSwitchCategory(e) {
    const key = e.currentTarget.dataset.key
    this.filterSpecs(key)
  },

  // 选择背景色
  onSelectBg(e) {
    const bg = e.currentTarget.dataset.bg
    this.setData({
      selectedBgId: bg.id,
      selectedBg: bg,
    })
  },

  // 选择规格
  onSelectSpec(e) {
    const spec = e.currentTarget.dataset.spec
    this.setData({
      selectedSpecId: spec.id,
      selectedSpec: spec,
    })
    this.updateCanGenerate()
  },

  // 检查免费状态
  checkFreeStatus() {
    const today = new Date().toDateString()
    const usedKey = `free_used_${today}`
    const used = wx.getStorageSync(usedKey) || 0
    const freeDaily = app.globalData.pricing.freeDaily
    const isFree = used < freeDaily

    this.setData({
      isFree,
      priceText: isFree ? '免费' : (app.globalData.pricing.singlePrice / 100).toFixed(2),
    })
  },

  // 更新可生成状态
  updateCanGenerate() {
    const { imagePath, selectedSpecId } = this.data
    this.setData({
      canGenerate: !!(imagePath && selectedSpecId)
    })
  },

  // 生成证件照
  async onGenerate() {
    const { imagePath, selectedSpec, selectedBg, isFree } = this.data

    if (!imagePath) {
      // 如果没有图片，打开选择
      this.choosePhoto()
      return
    }

    if (!selectedSpec) {
      wx.showToast({ title: '请选择规格', icon: 'none' })
      return
    }

    // 显示处理动画
    this.setData({ isProcessing: true })

    try {
      // 上传图片到云存储
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: `photos/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`,
        filePath: imagePath,
      })

      // 调用云函数处理
      const result = await wx.cloud.callFunction({
        name: 'processPhoto',
        data: {
          fileID: uploadRes.fileID,
          spec: selectedSpec,
          bgColor: selectedBg.color,
          isFree: isFree,
        }
      })

      this.setData({ isProcessing: false })

      if (result.result && result.result.success) {
        // 记录免费次数使用
        if (isFree) {
          const today = new Date().toDateString()
          const usedKey = `free_used_${today}`
          const used = wx.getStorageSync(usedKey) || 0
          wx.setStorageSync(usedKey, used + 1)
        }

        // 更新本地统计
        const total = wx.getStorageSync('total_photos') || 0
        wx.setStorageSync('total_photos', total + 1)

        // 保存结果到全局变量
        app.globalData.processResult = result.result
        app.globalData.selectedSpec = selectedSpec
        app.globalData.selectedBg = selectedBg

        // 跳转到结果页
        wx.navigateTo({
          url: '/pages/result/result'
        })
      } else {
        const errMsg = result.result?.message || '处理失败，请重试'
        wx.showModal({
          title: '处理失败',
          content: errMsg + '\n\n建议：\n1. 确保照片中有清晰的正面人脸\n2. 光线充足，避免逆光\n3. 背景尽量简洁',
          showCancel: false,
        })
      }
    } catch (err) {
      this.setData({ isProcessing: false })
      console.error('处理失败:', err)

      // 区分网络错误和其他错误
      const isNetworkError = err.errMsg && err.errMsg.includes('network')
      wx.showModal({
        title: isNetworkError ? '网络异常' : '处理失败',
        content: isNetworkError
          ? '请检查网络连接后重试'
          : '照片处理出错，请更换照片后重试',
        showCancel: false,
      })
    }
  },

  // 选择照片
  choosePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.setData({ imagePath: tempFilePath })
        app.globalData.tempImagePath = tempFilePath
        this.updateCanGenerate()
      }
    })
  },
})
