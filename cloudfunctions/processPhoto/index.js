// 云函数: processPhoto
// 处理用户上传的照片，生成标准证件照
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const { fileID, spec, bgColor, isFree } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 1. 下载原始图片
    const fileRes = await cloud.downloadFile({ fileID })
    const imageBuffer = fileRes.fileContent

    // 2. 调用腾讯云AI - 人体分割（抠图）
    // 使用微信云开发内置的AI能力
    let segmentResult
    try {
      segmentResult = await cloud.openapi.cv.bodySegment({
        img: imageBuffer,
      })
    } catch (aiErr) {
      console.error('人体分割失败，使用备选方案:', aiErr)
      // 备选：使用腾讯云API直接调用
      segmentResult = await callTencentAI(imageBuffer)
    }

    // 3. 合成证件照（更换背景 + 裁剪到指定尺寸）
    const processedImage = await compositePhoto({
      segmentData: segmentResult,
      originalBuffer: imageBuffer,
      bgColor: bgColor || '#438EDB',
      targetWidth: spec.width,
      targetHeight: spec.height,
    })

    // 4. 上传处理后的图片
    const timestamp = Date.now()
    const cloudPath = isFree
      ? `results/${openid}/${timestamp}_preview.jpg`    // 免费版（带水印）
      : `results/${openid}/${timestamp}_hd.jpg`          // 付费版

    const uploadRes = await cloud.uploadFile({
      cloudPath,
      fileContent: processedImage,
    })

    // 5. 记录到数据库
    await db.collection('photo_records').add({
      data: {
        openid,
        originalFileID: fileID,
        resultFileID: uploadRes.fileID,
        spec: spec,
        bgColor: bgColor,
        isPaid: !isFree,
        createdAt: db.serverDate(),
      }
    })

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

// 合成证件照
async function compositePhoto({ segmentData, originalBuffer, bgColor, targetWidth, targetHeight }) {
  // 使用 Canvas 或 Sharp 处理图片
  // 在云函数环境中，可以使用 jimp 或直接操作 buffer
  //
  // 基础实现流程：
  // 1. 使用分割结果的 alpha 通道提取人像
  // 2. 创建指定颜色的背景图
  // 3. 将人像居中放置在背景上
  // 4. 裁剪到目标尺寸
  //
  // TODO: 接入具体的图片处理库（jimp/sharp）
  // 当前返回原图作为占位

  // 如果有分割结果的buffer，直接使用
  if (segmentData && segmentData.img) {
    return segmentData.img
  }

  return originalBuffer
}

// 备选方案：调用腾讯云AI API
async function callTencentAI(imageBuffer) {
  // 使用腾讯云SDK调用人像分割API
  // 需要在云函数中配置腾讯云 SecretId/SecretKey
  //
  // API: https://cloud.tencent.com/document/api/1208/73578
  //
  // TODO: 实现具体的API调用
  throw new Error('备选AI方案待实现')
}
