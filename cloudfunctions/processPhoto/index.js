// 云函数: processPhoto
// 处理用户上传的照片，生成标准证件照
const cloud = require('wx-server-sdk')
const Jimp = require('jimp')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 解析HEX颜色为RGBA
function hexToRgba(hex) {
  hex = hex.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return { r, g, b, a: 255 }
}

exports.main = async (event, context) => {
  const { fileID, spec, bgColor, isFree } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 1. 下载原始图片
    const fileRes = await cloud.downloadFile({ fileID })
    const imageBuffer = fileRes.fileContent

    // 2. 人像分割（抠图）
    let foregroundBuffer = null

    // 方案A: 微信云开发 openapi 人体分割
    try {
      const segResult = await cloud.openapi.img.aiCrop({
        imgUrl: '',
        img: {
          contentType: 'image/jpeg',
          value: imageBuffer,
        },
        ratioList: `${spec.width}:${spec.height}`,
      })
      if (segResult.results && segResult.results.length > 0) {
        foregroundBuffer = segResult.results[0].imgBuffer
      }
    } catch (e) {
      console.log('openapi.img.aiCrop 不可用，尝试备选方案:', e.message)
    }

    // 方案B: 调用腾讯云人像分割 HTTP API
    if (!foregroundBuffer) {
      try {
        foregroundBuffer = await segmentBodyWithTencentAPI(imageBuffer)
      } catch (e) {
        console.log('腾讯云人像分割不可用:', e.message)
      }
    }

    // 方案C: 如果都不可用，使用简单的颜色替换方案（基础版）
    // 直接用原图 + 背景替换（效果一般但可用）

    // 3. 使用Jimp合成证件照
    const processedBuffer = await compositeIDPhoto({
      foregroundBuffer,
      originalBuffer: imageBuffer,
      bgColor: bgColor || '#438EDB',
      targetWidth: spec.width,
      targetHeight: spec.height,
      addWatermark: isFree,
    })

    // 4. 上传处理后的图片
    const timestamp = Date.now()
    const suffix = isFree ? 'preview' : 'hd'
    const cloudPath = `results/${openid}/${timestamp}_${suffix}.jpg`

    const uploadRes = await cloud.uploadFile({
      cloudPath,
      fileContent: processedBuffer,
    })

    // 5. 记录到数据库
    await db.collection('photo_records').add({
      data: {
        openid,
        originalFileID: fileID,
        resultFileID: uploadRes.fileID,
        spec,
        bgColor,
        isPaid: !isFree,
        createdAt: db.serverDate(),
      }
    })

    // 更新用户统计
    try {
      await db.collection('users').where({ openid }).update({
        data: { totalPhotos: db.command.inc(1) }
      })
    } catch (e) {
      // 用户可能不存在，忽略
    }

    return {
      success: true,
      fileID: uploadRes.fileID,
      previewUrl: uploadRes.fileID,
      imageUrl: uploadRes.fileID,
      isPaid: !isFree,
    }

  } catch (err) {
    console.error('处理照片失败:', err)
    return {
      success: false,
      message: '照片处理失败，请确保照片中有清晰的人脸',
      error: err.message,
    }
  }
}

/**
 * 合成证件照：背景替换 + 裁剪 + 可选水印
 */
async function compositeIDPhoto({ foregroundBuffer, originalBuffer, bgColor, targetWidth, targetHeight, addWatermark }) {
  const color = hexToRgba(bgColor.replace(/linear-gradient.*/, '#438EDB'))

  // 加载原图
  const original = await Jimp.read(originalBuffer)
  const origW = original.getWidth()
  const origH = original.getHeight()

  // 计算目标尺寸（保持高DPI，至少600px宽）
  const scale = Math.max(600 / targetWidth, 1)
  const outW = Math.round(targetWidth * scale)
  const outH = Math.round(targetHeight * scale)

  // 创建纯色背景
  const background = new Jimp(outW, outH, Jimp.rgbaToInt(color.r, color.g, color.b, color.a))

  if (foregroundBuffer) {
    // 有抠图结果：将前景叠加到背景上
    const foreground = await Jimp.read(foregroundBuffer)
    foreground.resize(outW, outH, Jimp.RESIZE_BEZIER)
    background.composite(foreground, 0, 0)
  } else {
    // 无抠图结果：智能裁剪原图到目标比例
    // 假设人脸在图片上半部分中央
    const targetRatio = targetWidth / targetHeight
    const origRatio = origW / origH

    let cropX = 0, cropY = 0, cropW = origW, cropH = origH

    if (origRatio > targetRatio) {
      // 原图太宽，裁剪两边
      cropW = Math.round(origH * targetRatio)
      cropX = Math.round((origW - cropW) / 2)
    } else {
      // 原图太高，从顶部开始裁（保留头部）
      cropH = Math.round(origW / targetRatio)
      cropY = 0
    }

    original.crop(cropX, cropY, cropW, cropH)
    original.resize(outW, outH, Jimp.RESIZE_BEZIER)

    // 简单的背景替换：检测接近白色/灰色的像素替换为目标颜色
    // 这是基础方案，效果有限但无需AI API
    replaceBackground(original, color)

    background.composite(original, 0, 0)
  }

  // 添加水印（免费版）
  if (addWatermark) {
    addWatermarkToImage(background, outW, outH)
  }

  // 轻度美颜：增加一点亮度和对比度
  background.brightness(0.05)
  background.contrast(0.1)

  // 输出为JPEG
  const outputBuffer = await background.getBufferAsync(Jimp.MIME_JPEG)
  return outputBuffer
}

/**
 * 简单背景替换：将接近白色/灰色的边缘像素替换为目标颜色
 * 这是无AI API时的降级方案
 */
function replaceBackground(image, targetColor) {
  const width = image.getWidth()
  const height = image.getHeight()
  const threshold = 30 // 颜色差异阈值

  // 从四边向内扫描，替换接近均匀色的像素
  // 使用Flood Fill思路
  const visited = new Set()

  function isBackgroundPixel(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return false
    const pixel = Jimp.intToRGBA(image.getPixelColor(x, y))
    // 检测是否接近白色、灰色或浅色背景
    const brightness = (pixel.r + pixel.g + pixel.b) / 3
    const saturation = Math.max(pixel.r, pixel.g, pixel.b) - Math.min(pixel.r, pixel.g, pixel.b)
    return brightness > 180 && saturation < 50
  }

  // 从边缘开始Flood Fill
  const queue = []
  for (let x = 0; x < width; x++) {
    queue.push([x, 0])
    queue.push([x, height - 1])
  }
  for (let y = 0; y < height; y++) {
    queue.push([0, y])
    queue.push([width - 1, y])
  }

  const targetInt = Jimp.rgbaToInt(targetColor.r, targetColor.g, targetColor.b, targetColor.a)

  while (queue.length > 0) {
    const [x, y] = queue.shift()
    const key = `${x},${y}`
    if (visited.has(key)) continue
    visited.add(key)

    if (!isBackgroundPixel(x, y)) continue

    image.setPixelColor(targetInt, x, y)

    // 扩展到相邻像素
    if (x > 0) queue.push([x - 1, y])
    if (x < width - 1) queue.push([x + 1, y])
    if (y > 0) queue.push([x, y - 1])
    if (y < height - 1) queue.push([x, y + 1])
  }
}

/**
 * 添加水印文字（使用像素画的方式）
 */
function addWatermarkToImage(image, width, height) {
  const watermarkColor = Jimp.rgbaToInt(200, 200, 200, 128)

  // 在图片对角线画水印线条
  for (let i = 0; i < Math.max(width, height) * 1.5; i += 2) {
    const x1 = i
    const y1 = 0
    // 画斜线
    for (let j = 0; j < 3; j++) {
      const px = x1 - Math.round(height * 0.4) + j
      const py = Math.round(height * 0.4)
      if (px >= 0 && px < width && py >= 0 && py < height) {
        image.setPixelColor(watermarkColor, px, py)
      }
      const px2 = x1 - Math.round(height * 0.6) + j
      const py2 = Math.round(height * 0.6)
      if (px2 >= 0 && px2 < width && py2 >= 0 && py2 < height) {
        image.setPixelColor(watermarkColor, px2, py2)
      }
    }
  }
}

/**
 * 调用腾讯云人像分割 API
 * 需要配置 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY 环境变量
 */
async function segmentBodyWithTencentAPI(imageBuffer) {
  const https = require('https')
  const crypto = require('crypto')

  const secretId = process.env.TENCENT_SECRET_ID
  const secretKey = process.env.TENCENT_SECRET_KEY

  if (!secretId || !secretKey) {
    throw new Error('腾讯云密钥未配置')
  }

  const imageBase64 = imageBuffer.toString('base64')

  // 构造请求
  const payload = JSON.stringify({
    Image: imageBase64,
    RspImgType: 'base64',
    Scene: 'document_photo',
  })

  const timestamp = Math.floor(Date.now() / 1000)
  const date = new Date(timestamp * 1000).toISOString().split('T')[0]

  // 腾讯云API v3签名
  const service = 'bda'
  const host = 'bda.tencentcloudapi.com'
  const action = 'SegmentPortraitPic'
  const version = '2020-03-24'

  const hashedPayload = crypto.createHash('sha256').update(payload).digest('hex')
  const httpRequestMethod = 'POST'
  const canonicalUri = '/'
  const canonicalQueryString = ''
  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`
  const signedHeaders = 'content-type;host;x-tc-action'
  const canonicalRequest = `${httpRequestMethod}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedPayload}`

  const credentialScope = `${date}/${service}/tc3_request`
  const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`

  function hmacSha256(key, data) {
    return crypto.createHmac('sha256', key).update(data).digest()
  }

  const secretDate = hmacSha256(`TC3${secretKey}`, date)
  const secretService = hmacSha256(secretDate, service)
  const secretSigning = hmacSha256(secretService, 'tc3_request')
  const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex')

  const authorization = `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: host,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorization,
        'X-TC-Action': action,
        'X-TC-Version': version,
        'X-TC-Timestamp': timestamp.toString(),
        'X-TC-Region': 'ap-guangzhou',
      },
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          if (result.Response && result.Response.ResultImage) {
            resolve(Buffer.from(result.Response.ResultImage, 'base64'))
          } else {
            reject(new Error(result.Response?.Error?.Message || '分割失败'))
          }
        } catch (e) {
          reject(e)
        }
      })
    })

    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}
