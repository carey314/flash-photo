// 云函数: initDB
// 初始化数据库集合（部署时运行一次）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// 需要创建的集合
const COLLECTIONS = [
  'users',          // 用户表
  'photo_records',  // 照片记录
  'orders',         // 订单表
  'revenue',        // 收入记录
]

exports.main = async (event, context) => {
  const results = []

  for (const name of COLLECTIONS) {
    try {
      await db.createCollection(name)
      results.push({ collection: name, status: 'created' })
    } catch (err) {
      if (err.errCode === -502005) {
        results.push({ collection: name, status: 'already_exists' })
      } else {
        results.push({ collection: name, status: 'error', message: err.message })
      }
    }
  }

  return {
    success: true,
    results,
    message: '数据库初始化完成',
  }
}
