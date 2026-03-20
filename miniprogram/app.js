App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    wx.cloud.init({
      traceUser: true,
    })

    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync()
    this.globalData.systemInfo = systemInfo
    this.globalData.statusBarHeight = systemInfo.statusBarHeight
  },

  globalData: {
    userInfo: null,
    systemInfo: null,
    statusBarHeight: 0,
    // 证件照规格配置
    photoSpecs: [
      { id: 'one_inch', name: '一寸', width: 295, height: 413, desc: '25×35mm', popular: true },
      { id: 'two_inch', name: '二寸', width: 413, height: 579, desc: '35×49mm', popular: true },
      { id: 'small_one', name: '小一寸', width: 260, height: 378, desc: '22×32mm' },
      { id: 'small_two', name: '小二寸', width: 413, height: 531, desc: '35×45mm' },
      { id: 'passport_cn', name: '中国护照', width: 390, height: 567, desc: '33×48mm', popular: true },
      { id: 'visa_us', name: '美国签证', width: 600, height: 600, desc: '51×51mm' },
      { id: 'visa_jp', name: '日本签证', width: 531, height: 413, desc: '45×35mm' },
      { id: 'id_card', name: '身份证', width: 358, height: 441, desc: '26×32mm' },
      { id: 'social_security', name: '社保照', width: 358, height: 441, desc: '26×32mm' },
      { id: 'resume', name: '简历照', width: 295, height: 413, desc: '25×35mm' },
      { id: 'exam_cet', name: '四六级考试', width: 240, height: 320, desc: '144×192px' },
      { id: 'exam_civil', name: '公务员考试', width: 413, height: 579, desc: '35×49mm' },
      { id: 'driving', name: '驾驶证', width: 260, height: 378, desc: '22×32mm' },
      { id: 'graduation', name: '毕业证', width: 390, height: 567, desc: '33×48mm' },
    ],
    // 背景色
    bgColors: [
      { id: 'white', name: '白色', color: '#FFFFFF' },
      { id: 'blue', name: '蓝色', color: '#438EDB' },
      { id: 'red', name: '红色', color: '#D93B3B' },
      { id: 'gradient_blue', name: '渐变蓝', color: 'linear-gradient(#6CB4EE, #438EDB)' },
    ],
    // 定价
    pricing: {
      freeDaily: 1,        // 每天免费次数
      singlePrice: 199,    // 单次价格（分）
      vipMonthly: 1990,    // 月卡价格（分）
      writingPrice: 990,   // 写真套餐（分）
    }
  }
})
