// 云函数: payCallback
// 微信支付回调 - 更新订单状态
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const { outTradeNo, resultCode, transactionId } = event

  if (resultCode !== 'SUCCESS') {
    return { errcode: 0 }
  }

  try {
    // 更新订单状态
    const orderRes = await db.collection('orders').where({
      orderNo: outTradeNo
    }).update({
      data: {
        status: 'paid',
        transactionId: transactionId || '',
        paidAt: db.serverDate(),
      }
    })

    if (orderRes.stats.updated === 0) {
      console.error('订单不存在:', outTradeNo)
      return { errcode: 0 }
    }

    // 查询订单详情
    const order = (await db.collection('orders').where({
      orderNo: outTradeNo
    }).get()).data[0]

    if (!order) return { errcode: 0 }

    // 根据订单类型处理
    if (order.type === 'vip_monthly') {
      // VIP月卡：更新用户VIP状态
      const expireDate = new Date()
      expireDate.setDate(expireDate.getDate() + 30)

      await db.collection('users').where({
        openid: order.openid
      }).update({
        data: {
          isVip: true,
          vipExpireAt: expireDate,
        }
      })
    } else if (order.type === 'id_photo' && order.fileID) {
      // 单次证件照：生成高清无水印版本
      // 更新照片记录
      await db.collection('photo_records').where({
        resultFileID: order.fileID,
        openid: order.openid,
      }).update({
        data: { isPaid: true }
      })
    }

    // 记录收入
    await db.collection('revenue').add({
      data: {
        openid: order.openid,
        orderNo: outTradeNo,
        amount: order.price,
        type: order.type,
        createdAt: db.serverDate(),
      }
    })

    return { errcode: 0 }

  } catch (err) {
    console.error('支付回调处理失败:', err)
    return { errcode: 0 } // 返回0告诉微信已收到
  }
}
