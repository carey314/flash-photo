Component({
  properties: {
    show: {
      type: Boolean,
      value: false,
      observer(val) {
        if (val) {
          this.startAnimation()
        } else {
          this.stopAnimation()
        }
      }
    }
  },

  data: {
    stepIndex: -1,
    tipText: 'AI正在处理中...',
  },

  methods: {
    startAnimation() {
      this._timer = null
      this._step = 0

      const tips = [
        '正在检测人脸位置...',
        'AI智能抠图中...',
        '更换背景颜色...',
        '生成高清证件照...',
      ]

      const advance = () => {
        if (this._step < 4) {
          this.setData({
            stepIndex: this._step,
            tipText: tips[this._step] || 'AI正在处理中...',
          })
          this._step++
          const delay = this._step < 3 ? 800 : 1200
          this._timer = setTimeout(advance, delay)
        }
      }

      // 开始动画
      setTimeout(advance, 300)
    },

    stopAnimation() {
      if (this._timer) {
        clearTimeout(this._timer)
        this._timer = null
      }
      this.setData({ stepIndex: -1 })
    },

    prevent() {},
  },
})
