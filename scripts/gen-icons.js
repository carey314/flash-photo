/**
 * 生成 tabBar 图标（纯 Node.js，无第三方依赖）
 * 输出 81x81 PNG 文件到 miniprogram/images/
 */
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const SIZE = 81
const OUT_DIR = path.join(__dirname, '../miniprogram/images')

// 确保输出目录存在
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

/**
 * 创建最小 PNG 文件
 * @param {number} width
 * @param {number} height
 * @param {Function} pixelFn - (x, y) => [r, g, b, a]
 * @returns {Buffer}
 */
function createPNG(width, height, pixelFn) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR chunk
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 6  // color type: RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  // Raw image data (filter byte + RGBA pixels per row)
  const rawData = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4)
    rawData[rowOffset] = 0 // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y)
      const pixOffset = rowOffset + 1 + x * 4
      rawData[pixOffset] = r
      rawData[pixOffset + 1] = g
      rawData[pixOffset + 2] = b
      rawData[pixOffset + 3] = a
    }
  }

  const compressed = zlib.deflateSync(rawData)

  // Build chunks
  const chunks = [
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]

  return Buffer.concat([signature, ...chunks])
}

function makeChunk(type, data) {
  const typeBuffer = Buffer.from(type)
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)

  const crcData = Buffer.concat([typeBuffer, data])
  const crc = crc32(crcData)
  const crcBuffer = Buffer.alloc(4)
  crcBuffer.writeUInt32BE(crc >>> 0)

  return Buffer.concat([length, typeBuffer, data, crcBuffer])
}

// CRC32 lookup table
const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
  }
  crcTable[n] = c
}

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)
  }
  return crc ^ 0xFFFFFFFF
}

// ================ 图标绘制函数 ================

// 辅助：画圆
function isInCircle(x, y, cx, cy, r) {
  return (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2
}

// 辅助：画圆角矩形
function isInRoundRect(x, y, rx, ry, rw, rh, radius) {
  if (x < rx || x > rx + rw || y < ry || y > ry + rh) return false
  // 检查四个角
  const corners = [
    [rx + radius, ry + radius],
    [rx + rw - radius, ry + radius],
    [rx + radius, ry + rh - radius],
    [rx + rw - radius, ry + rh - radius],
  ]
  for (const [cx, cy] of corners) {
    const inCornerZone = (x < rx + radius || x > rx + rw - radius) &&
                         (y < ry + radius || y > ry + rh - radius)
    if (inCornerZone && !isInCircle(x, y, cx, cy, radius)) return false
  }
  return true
}

/**
 * 首页图标 - 房子形状
 */
function homeIcon(x, y, color, alpha) {
  const cx = SIZE / 2, cy = SIZE / 2
  const s = SIZE

  // 屋顶三角形
  const roofTop = s * 0.15
  const roofBottom = s * 0.45
  const roofLeft = s * 0.12
  const roofRight = s * 0.88

  if (y >= roofTop && y <= roofBottom) {
    const progress = (y - roofTop) / (roofBottom - roofTop)
    const halfWidth = progress * (roofRight - roofLeft) / 2
    const left = cx - halfWidth
    const right = cx + halfWidth
    if (x >= left && x <= right) {
      // 只画边框（3px粗）
      const innerProgress = Math.max(0, (y - roofTop - 3) / (roofBottom - roofTop - 3))
      const innerHalf = innerProgress * ((roofRight - roofLeft) / 2 - 6)
      const innerLeft = cx - innerHalf
      const innerRight = cx + innerHalf
      if (y < roofTop + 3 || x < left + 3 || x > right - 3 ||
          (y > roofBottom - 3) || !(x > innerLeft && x < innerRight && y > roofTop + 3)) {
        return [...color, alpha]
      }
    }
  }

  // 房体矩形
  const bodyLeft = s * 0.2
  const bodyRight = s * 0.8
  const bodyTop = roofBottom - 2
  const bodyBottom = s * 0.82

  if (x >= bodyLeft && x <= bodyRight && y >= bodyTop && y <= bodyBottom) {
    // 边框
    if (x <= bodyLeft + 3 || x >= bodyRight - 3 || y >= bodyBottom - 3) {
      return [...color, alpha]
    }
    // 门
    const doorLeft = s * 0.38
    const doorRight = s * 0.62
    const doorTop = s * 0.55
    if (x >= doorLeft && x <= doorRight && y >= doorTop && y <= bodyBottom) {
      if (x <= doorLeft + 3 || x >= doorRight - 3 || y <= doorTop + 3) {
        return [...color, alpha]
      }
    }
  }

  return [0, 0, 0, 0]
}

/**
 * 个人图标 - 人形
 */
function profileIcon(x, y, color, alpha) {
  const cx = SIZE / 2
  const s = SIZE

  // 头部圆形
  const headCx = cx
  const headCy = s * 0.28
  const headR = s * 0.15
  const headRInner = headR - 3

  if (isInCircle(x, y, headCx, headCy, headR) && !isInCircle(x, y, headCx, headCy, headRInner)) {
    return [...color, alpha]
  }

  // 身体弧形 (半椭圆)
  const bodyCy = s * 0.75
  const bodyRx = s * 0.32
  const bodyRy = s * 0.28
  const bodyRxInner = bodyRx - 3
  const bodyRyInner = bodyRy - 3

  const dx = (x - cx) / bodyRx
  const dy = (y - bodyCy) / bodyRy
  const dxI = (x - cx) / bodyRxInner
  const dyI = (y - bodyCy) / bodyRyInner

  if (y >= bodyCy - bodyRy * 0.1 && y <= bodyCy) {
    if (dx * dx + dy * dy <= 1 && !(dxI * dxI + dyI * dyI <= 1)) {
      return [...color, alpha]
    }
  }

  // 底部直线
  if (y >= bodyCy - 2 && y <= bodyCy + 1) {
    if (Math.abs(x - cx) <= bodyRx) {
      return [...color, alpha]
    }
  }

  return [0, 0, 0, 0]
}

// ================ 生成图标 ================

const icons = [
  {
    name: 'tab-home',
    color: [153, 153, 153],
    fn: homeIcon,
  },
  {
    name: 'tab-home-active',
    color: [74, 144, 217],
    fn: homeIcon,
  },
  {
    name: 'tab-profile',
    color: [153, 153, 153],
    fn: profileIcon,
  },
  {
    name: 'tab-profile-active',
    color: [74, 144, 217],
    fn: profileIcon,
  },
]

for (const icon of icons) {
  const png = createPNG(SIZE, SIZE, (x, y) => {
    const result = icon.fn(x, y, icon.color, 255)
    return result
  })
  const filepath = path.join(OUT_DIR, `${icon.name}.png`)
  fs.writeFileSync(filepath, png)
  console.log(`Generated: ${icon.name}.png (${png.length} bytes)`)
}

// 生成默认头像
const avatarPng = createPNG(SIZE, SIZE, (x, y) => {
  const cx = SIZE / 2, s = SIZE
  // 灰色圆形背景
  if (isInCircle(x, y, cx, cx, s * 0.48)) {
    // 头
    if (isInCircle(x, y, cx, s * 0.35, s * 0.14)) {
      return [255, 255, 255, 255]
    }
    // 身体
    const bodyCy = s * 0.72
    const dx = (x - cx) / (s * 0.28)
    const dy = (y - bodyCy) / (s * 0.22)
    if (y >= bodyCy - s * 0.05 && y <= bodyCy && dx * dx + dy * dy <= 1) {
      return [255, 255, 255, 255]
    }
    return [200, 200, 200, 255]
  }
  return [0, 0, 0, 0]
})
fs.writeFileSync(path.join(OUT_DIR, 'default-avatar.png'), avatarPng)
console.log(`Generated: default-avatar.png (${avatarPng.length} bytes)`)

console.log('\nAll icons generated successfully!')
