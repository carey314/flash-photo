/**
 * 证件照规格数据库
 * 包含中国常用的证件照规格
 */

// 分类定义
const CATEGORIES = {
  common: { name: '常用', icon: '📸' },
  exam: { name: '考试', icon: '📝' },
  visa: { name: '签证', icon: '✈️' },
  certificate: { name: '证件', icon: '🪪' },
  other: { name: '其他', icon: '📄' },
}

// 完整规格列表
const ALL_SPECS = [
  // 常用
  { id: 'one_inch', name: '一寸', width: 295, height: 413, desc: '25×35mm', category: 'common', popular: true, scenes: ['入职', '简历', '体检'] },
  { id: 'two_inch', name: '二寸', width: 413, height: 579, desc: '35×49mm', category: 'common', popular: true, scenes: ['护照', '毕业证'] },
  { id: 'small_one', name: '小一寸', width: 260, height: 378, desc: '22×32mm', category: 'common', scenes: ['驾驶证', '身份证'] },
  { id: 'small_two', name: '小二寸', width: 413, height: 531, desc: '35×45mm', category: 'common', scenes: ['护照', '签证'] },
  { id: 'big_one', name: '大一寸', width: 390, height: 567, desc: '33×48mm', category: 'common', scenes: ['中国护照'] },
  { id: 'big_two', name: '大二寸', width: 413, height: 626, desc: '35×53mm', category: 'common', scenes: ['结婚证'] },

  // 证件
  { id: 'id_card', name: '身份证', width: 358, height: 441, desc: '26×32mm', category: 'certificate', popular: true, scenes: ['二代身份证'] },
  { id: 'social_security', name: '社保照', width: 358, height: 441, desc: '26×32mm', category: 'certificate', scenes: ['社保卡'] },
  { id: 'driving', name: '驾驶证', width: 260, height: 378, desc: '22×32mm', category: 'certificate', scenes: ['驾驶证'] },
  { id: 'medical', name: '医保卡', width: 358, height: 441, desc: '26×32mm', category: 'certificate', scenes: ['医保卡'] },

  // 考试
  { id: 'exam_cet', name: '四六级', width: 240, height: 320, desc: '144×192px', category: 'exam', popular: true, scenes: ['英语四六级'] },
  { id: 'exam_civil', name: '公务员', width: 413, height: 579, desc: '35×49mm', category: 'exam', scenes: ['国考', '省考'] },
  { id: 'exam_teacher', name: '教师资格证', width: 413, height: 579, desc: '35×49mm', category: 'exam', scenes: ['教资考试'] },
  { id: 'graduation', name: '毕业证', width: 390, height: 567, desc: '33×48mm', category: 'exam', scenes: ['毕业证', '学位证'] },
  { id: 'exam_postgrad', name: '考研', width: 531, height: 709, desc: '45×60mm', category: 'exam', scenes: ['研究生考试'] },

  // 签证
  { id: 'passport_cn', name: '中国护照', width: 390, height: 567, desc: '33×48mm', category: 'visa', popular: true, scenes: ['中国护照', '港澳通行证'] },
  { id: 'visa_us', name: '美国签证', width: 600, height: 600, desc: '51×51mm', category: 'visa', scenes: ['美国签证', '美国绿卡'] },
  { id: 'visa_jp', name: '日本签证', width: 531, height: 413, desc: '45×35mm', category: 'visa', scenes: ['日本签证'] },
  { id: 'visa_kr', name: '韩国签证', width: 413, height: 531, desc: '35×45mm', category: 'visa', scenes: ['韩国签证'] },
  { id: 'visa_schengen', name: '申根签证', width: 413, height: 531, desc: '35×45mm', category: 'visa', scenes: ['欧洲申根签证'] },
  { id: 'visa_uk', name: '英国签证', width: 531, height: 413, desc: '45×35mm', category: 'visa', scenes: ['英国签证'] },
  { id: 'visa_au', name: '澳大利亚', width: 413, height: 531, desc: '35×45mm', category: 'visa', scenes: ['澳大利亚签证'] },
]

// 背景色
const BG_COLORS = [
  { id: 'white', name: '白色', color: '#FFFFFF', scenes: ['护照', '签证', '简历'] },
  { id: 'blue', name: '蓝色', color: '#438EDB', scenes: ['身份证', '社保', '毕业证'] },
  { id: 'red', name: '红色', color: '#D93B3B', scenes: ['结婚证', '部分证件'] },
]

module.exports = {
  CATEGORIES,
  ALL_SPECS,
  BG_COLORS,
}
