// 云函数: createOrder
// 创建订单并生成微信支付参数
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// 价格配置（分）
const PRICES = {
  id_photo: 199,      // 单次证件照 1.99元
  vip_monthly: 1990,  // 月卡 19.9元
  writing_set: 990,   // 写真套餐 9.9元
}

exports.main = async (event, context) => {
  const { type, fileID, spec, layout } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    const price = PRICES[type]
    if (!price) {
      return { success: false, message: '无效的订单类型' }
    }

    // 生成订单号
    const orderNo = `FP${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    // 创建订单记录
    const orderData = {
      orderNo,
      openid,
      type,
      price,
      fileID: fileID || '',
      spec: spec || null,
      layout: layout || 'single',
      status: 'pending',  // pending -> paid -> completed / refunded
      createdAt: db.serverDate(),
    }

    await db.collection('orders').add({ data: orderData })

    // 调用微信支付统一下单
    const payResult = await cloud.cloudPay.unifiedOrder({
      body: getOrderDescription(type),
      outTradeNo: orderNo,
      spbillCreateIp: '127.0.0.1',
      subMchId: '',  // 需要配置商户号
      totalFee: price,
      envId: cloud.DYNAMIC_CURRENT_ENV,
      functionName: 'payCallback',  // 支付回调云函数
    })

    return {
      success: true,
      orderNo,
      payment: payResult.payment,
    }

  } catch (err) {
    console.error('创建订单失败:', err)
    return {
      success: false,
      message: '创建订单失败，请重试',
      error: err.message,
    }
  }
}

function getOrderDescription(type) {
  const descriptions = {
    id_photo: '闪拍证件照-证件照制作',
    vip_monthly: '闪拍证件照-VIP月卡',
    writing_set: '闪拍证件照-AI写真套餐',
  }
  return descriptions[type] || '闪拍证件照-服务'
}
