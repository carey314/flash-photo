// 云函数: generateLayout
// 生成证件照排版（四联/八联）
const cloud = require('wx-server-sdk')
const Jimp = require('jimp')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 标准排版纸张尺寸（像素，300DPI）
const PAPER_SIZES = {
  '5inch': { width: 1500, height: 1050 }, // 5寸照片纸 127×89mm
  '6inch': { width: 1800, height: 1200 }, // 6寸照片纸 152×102mm
}

exports.main = async (event, context) => {
  const { fileID, spec, layout, paperSize = '6inch' } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 下载证件照
    const fileRes = await cloud.downloadFile({ fileID })
    const photoBuffer = fileRes.fileContent
    const photo = await Jimp.read(photoBuffer)

    // 纸张尺寸
    const paper = PAPER_SIZES[paperSize] || PAPER_SIZES['6inch']

    let result
    switch (layout) {
      case 'four':
        result = await generateFourLayout(photo, spec, paper)
        break
      case 'eight':
        result = await generateEightLayout(photo, spec, paper)
        break
      default:
        // 单张 - 直接返回
        return { success: true, fileID }
    }

    // 上传排版结果
    const cloudPath = `layouts/${openid}/${Date.now()}_${layout}.jpg`
    const uploadRes = await cloud.uploadFile({
      cloudPath,
      fileContent: result,
    })

    return {
      success: true,
      fileID: uploadRes.fileID,
      layout,
    }

  } catch (err) {
    console.error('排版生成失败:', err)
    return {
      success: false,
      message: '排版生成失败',
      error: err.message,
    }
  }
}

/**
 * 四联排版：2行2列
 */
async function generateFourLayout(photo, spec, paper) {
  // 计算每张照片的大小（在纸张上）
  const photoW = Math.floor(paper.width * 0.42)
  const photoH = Math.round(photoW * spec.height / spec.width)

  // 创建白色画布
  const canvas = new Jimp(paper.width, paper.height, 0xFFFFFFFF)

  // 缩放照片
  const resized = photo.clone().resize(photoW, photoH, Jimp.RESIZE_BEZIER)

  // 计算间距
  const gapX = Math.floor((paper.width - photoW * 2) / 3)
  const gapY = Math.floor((paper.height - photoH * 2) / 3)

  // 放置4张照片
  const positions = [
    [gapX, gapY],
    [gapX * 2 + photoW, gapY],
    [gapX, gapY * 2 + photoH],
    [gapX * 2 + photoW, gapY * 2 + photoH],
  ]

  for (const [x, y] of positions) {
    canvas.composite(resized.clone(), x, y)
  }

  // 添加裁剪线
  addCutLines(canvas, positions, photoW, photoH)

  return canvas.getBufferAsync(Jimp.MIME_JPEG)
}

/**
 * 八联排版：4行2列
 */
async function generateEightLayout(photo, spec, paper) {
  const photoW = Math.floor(paper.width * 0.42)
  const photoH = Math.round(photoW * spec.height / spec.width)

  // 八联可能需要更大的画布
  const canvasHeight = Math.max(paper.height, photoH * 4 + 100)
  const canvas = new Jimp(paper.width, canvasHeight, 0xFFFFFFFF)

  const resized = photo.clone().resize(photoW, photoH, Jimp.RESIZE_BEZIER)

  const gapX = Math.floor((paper.width - photoW * 2) / 3)
  const gapY = Math.floor((canvasHeight - photoH * 4) / 5)

  const positions = []
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 2; col++) {
      const x = gapX * (col + 1) + photoW * col
      const y = gapY * (row + 1) + photoH * row
      positions.push([x, y])
    }
  }

  for (const [x, y] of positions) {
    canvas.composite(resized.clone(), x, y)
  }

  addCutLines(canvas, positions, photoW, photoH)

  return canvas.getBufferAsync(Jimp.MIME_JPEG)
}

/**
 * 添加裁剪辅助线
 */
function addCutLines(canvas, positions, photoW, photoH) {
  const lineColor = Jimp.rgbaToInt(200, 200, 200, 180)
  const lineLength = 20

  for (const [x, y] of positions) {
    // 四个角画短线
    const corners = [
      [x, y],                          // 左上
      [x + photoW - 1, y],             // 右上
      [x, y + photoH - 1],             // 左下
      [x + photoW - 1, y + photoH - 1], // 右下
    ]

    for (const [cx, cy] of corners) {
      // 画十字标记
      for (let i = -lineLength; i <= lineLength; i++) {
        const px = cx + i
        const py = cy
        if (px >= 0 && px < canvas.getWidth() && py >= 0 && py < canvas.getHeight()) {
          canvas.setPixelColor(lineColor, px, py)
        }
        const px2 = cx
        const py2 = cy + i
        if (px2 >= 0 && px2 < canvas.getWidth() && py2 >= 0 && py2 < canvas.getHeight()) {
          canvas.setPixelColor(lineColor, px2, py2)
        }
      }
    }
  }
}
