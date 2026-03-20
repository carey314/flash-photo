// 云函数: getUserInfo
// 获取用户信息、VIP状态、使用统计
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 查询用户记录
    let userRes = await db.collection('users').where({ openid }).get()
    let user = userRes.data[0]

    // 新用户自动创建
    if (!user) {
      const newUser = {
        openid,
        isVip: false,
        vipExpireAt: null,
        totalPhotos: 0,
        createdAt: db.serverDate(),
      }
      await db.collection('users').add({ data: newUser })
      user = newUser
    }

    // 检查VIP是否过期
    let isVip = user.isVip
    let vipExpire = ''
    if (user.vipExpireAt) {
      const expireDate = new Date(user.vipExpireAt)
      if (expireDate < new Date()) {
        isVip = false
        // 更新数据库
        await db.collection('users').where({ openid }).update({
          data: { isVip: false }
        })
      } else {
        vipExpire = `${expireDate.getMonth() + 1}月${expireDate.getDate()}日到期`
      }
    }

    // 统计照片数
    const photoCount = await db.collection('photo_records')
      .where({ openid })
      .count()

    return {
      success: true,
      isVip,
      vipExpire,
      totalPhotos: photoCount.total,
    }

  } catch (err) {
    console.error('获取用户信息失败:', err)
    return {
      success: false,
      message: err.message,
    }
  }
}
