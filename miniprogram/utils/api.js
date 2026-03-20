/**
 * API 封装 - 统一调用云函数
 */

// 处理照片
function processPhoto(fileID, spec, bgColor, isFree) {
  return wx.cloud.callFunction({
    name: 'processPhoto',
    data: { fileID, spec, bgColor, isFree },
  }).then(res => res.result)
}

// 创建订单
function createOrder(type, options = {}) {
  return wx.cloud.callFunction({
    name: 'createOrder',
    data: { type, ...options },
  }).then(res => res.result)
}

// 获取用户信息
function getUserInfo() {
  return wx.cloud.callFunction({
    name: 'getUserInfo',
    data: {},
  }).then(res => res.result)
}

// 上传图片到云存储
function uploadImage(filePath) {
  const cloudPath = `photos/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`
  return wx.cloud.uploadFile({
    cloudPath,
    filePath,
  })
}

// 发起微信支付
function requestPayment(paymentData) {
  return new Promise((resolve, reject) => {
    wx.requestPayment({
      ...paymentData,
      success: resolve,
      fail: (err) => {
        if (err.errMsg === 'requestPayment:fail cancel') {
          reject(new Error('用户取消支付'))
        } else {
          reject(err)
        }
      }
    })
  })
}

module.exports = {
  processPhoto,
  createOrder,
  getUserInfo,
  uploadImage,
  requestPayment,
}
