const PORTAL_SESSION_TTL_SECONDS = 21600;
const PORTAL_PAYMENT_METHODS = Object.freeze([
  'Visa', 'Master', 'AE', 'Apple Pay', 'Google Pay', 'Line Pay', '現場現金'
]);

function getPortalBootstrap(token) {
  const session = optionalMemberSession_(token);
  return {
    courses: getPublicCourses_(),
    coaches: getPublicCoaches_(),
    products: getPublicProducts_(),
    paymentMethods: PORTAL_PAYMENT_METHODS.slice(),
    member: session ? getPortalMember_(session.memberId) : null,
    memberActivity: session ? getMemberActivity_(session.memberId) : null,
    adminAvailable: isAuthorizedEmail_(currentUserEmail_())
  };
}

function registerMember(form) {
  validateRequired_(form, ['englishName', 'phone', 'email', 'password']);
  const email = normalizeEmail_(form.email);
  const password = String(form.password || '');
  const phone = String(form.phone || '').replace(/\s+/g, '').trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Email 格式錯誤');
  if (password.length < 8) throw new Error('密碼至少需要 8 個字元');
  if (phone.length < 8) throw new Error('請輸入有效的行動電話');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const members = getRecords_(CONFIG.SHEETS.MEMBERS);
    if (members.some(function(member) { return normalizeEmail_(member.email) === email; })) {
      throw new Error('此 Email 已註冊，請直接登入');
    }
    if (members.some(function(member) { return String(member.phone || '').replace(/\s+/g, '') === phone; })) {
      throw new Error('此電話已存在；請聯絡 PMM 啟用既有會員帳號');
    }

    const now = new Date();
    const salt = Utilities.getUuid();
    const memberId = generatePortalMemberId_(form.englishName, now, members);
    const member = {
      createdAt: now,
      memberId: memberId,
      chineseName: String(form.chineseName || '').trim(),
      englishName: String(form.englishName || '').trim(),
      birthday: form.birthday || '',
      phone: phone,
      address: String(form.address || '').trim(),
      memberLevel: 'Gold',
      latestTransaction: '',
      completedHours: 0,
      remainingHours: 0,
      status: 'Active',
      updatedAt: now,
      email: email,
      passwordSalt: salt,
      passwordHash: passwordHash_(password, salt),
      locale: String(form.locale || 'zh-Hant'),
      lastLoginAt: now
    };
    appendRecord_(CONFIG.SHEETS.MEMBERS, member);
    auditLog_('MEMBER_SELF_REGISTERED', 'MEMBER', memberId, null, sanitizeMemberForAudit_(member), '會員自行註冊', 'MEMBER:' + memberId);
    const token = createMemberSession_(memberId);
    return { success: true, token: token, member: getPortalMember_(memberId) };
  } finally {
    lock.releaseLock();
  }
}

function loginMember(credentials) {
  validateRequired_(credentials, ['identifier', 'password']);
  const identifier = String(credentials.identifier || '').trim().toLowerCase();
  const member = getRecords_(CONFIG.SHEETS.MEMBERS).find(function(item) {
    return String(item.memberId || '').trim().toLowerCase() === identifier ||
      normalizeEmail_(item.email) === identifier;
  });
  if (!member || !member.passwordSalt || !member.passwordHash) {
    throw new Error('帳號或密碼錯誤');
  }
  const submittedHash = passwordHash_(String(credentials.password || ''), String(member.passwordSalt));
  if (!safeEquals_(submittedHash, String(member.passwordHash))) {
    throw new Error('帳號或密碼錯誤');
  }
  if (String(member.status || 'Active') !== 'Active') throw new Error('會員帳號目前無法使用');

  const now = new Date();
  updateRecordFields_(CONFIG.SHEETS.MEMBERS, member._row, { lastLoginAt: now, updatedAt: now });
  const token = createMemberSession_(member.memberId);
  auditLog_('MEMBER_LOGIN', 'MEMBER', member.memberId, null, null, '會員登入', 'MEMBER:' + member.memberId);
  return { success: true, token: token, member: getPortalMember_(member.memberId), memberActivity: getMemberActivity_(member.memberId) };
}

function logoutMember(token) {
  if (token) CacheService.getScriptCache().remove(memberSessionKey_(token));
  return { success: true };
}

function refreshMemberPortal(token) {
  const session = requireMemberSession_(token);
  return {
    member: getPortalMember_(session.memberId),
    memberActivity: getMemberActivity_(session.memberId)
  };
}

function createMemberOrder(token, data) {
  const session = requireMemberSession_(token);
  return createOrderForMember_(session.memberId, data || {}, 'MEMBER:' + session.memberId);
}

function createMemberBooking(token, form) {
  const session = requireMemberSession_(token);
  return createBookingForMember_(session.memberId, form || {}, 'MEMBER:' + session.memberId);
}

function getPublicCourses_() {
  return [
    { id:'fitness', nameZh:'體適能', nameEn:'Fitness', nameJa:'フィットネス', languages:'正體中文' },
    { id:'active-aging', nameZh:'樂齡活力', nameEn:'Active Aging', nameJa:'シニア・アクティブ', languages:'國語／臺語／客語' },
    { id:'powerlifting', nameZh:'健力', nameEn:'Powerlifting', nameJa:'パワーリフティング', languages:'正體中文' },
    { id:'bodybuilding', nameZh:'健美', nameEn:'Bodybuilding', nameJa:'ボディビル', languages:'正體中文' },
    { id:'aerial-yoga', nameZh:'空中瑜伽', nameEn:'Aerial Yoga', nameJa:'エアリアルヨガ', languages:'正體中文' },
    { id:'vinyasa-yoga', nameZh:'Vinyasa Yoga', nameEn:'Vinyasa Yoga', nameJa:'ヴィンヤサヨガ', languages:'English' },
    { id:'ashtanga-yoga', nameZh:'Ashtanga Yoga', nameEn:'Ashtanga Yoga', nameJa:'アシュタンガヨガ', languages:'English' }
  ];
}

function getPublicCoaches_() {
  const profiles = coachProfileDefaults_();
  const records = getRecords_(CONFIG.SHEETS.COACHES).filter(function(coach) {
    return coach.active === '' || isActive_(coach.active);
  });
  const merged = {};
  records.forEach(function(coach) {
    const fallback = profiles[coach.coachName] || {};
    merged[coach.coachName] = {
      coachId: coach.coachId || fallback.coachId || '',
      coachName: coach.coachName,
      title: coach.title || fallback.title || 'PMM Private Trainer',
      courseName: coach.courseName || fallback.courseName || '私人教練',
      specialty: coach.specialty || fallback.specialty || '客製化訓練',
      languages: coach.languages || fallback.languages || '正體中文',
      bioZh: coach.bioZh || fallback.bioZh || '',
      bioEn: coach.bioEn || fallback.bioEn || '',
      bioJa: coach.bioJa || fallback.bioJa || '',
      sortOrder: Number(coach.sortOrder || fallback.sortOrder || 999)
    };
  });
  Object.keys(profiles).forEach(function(name) {
    if (!merged[name]) merged[name] = profiles[name];
  });
  return Object.keys(merged).map(function(name) { return merged[name]; })
    .sort(function(a, b) { return Number(a.sortOrder) - Number(b.sortOrder); });
}

function getPublicProducts_() {
  return getRecords_(CONFIG.SHEETS.PRODUCTS)
    .filter(function(product) { return product.active === '' || isActive_(product.active); })
    .map(function(product) {
      return {
        productId: product.productId,
        productName: product.productName,
        hours: Number(product.hours || 0),
        price: Number(product.price || 0),
        publicDescription: product.publicDescription || '',
        sortOrder: Number(product.sortOrder || 999)
      };
    })
    .sort(function(a, b) { return a.sortOrder - b.sortOrder; });
}

function getPortalMember_(memberId) {
  const member = findRecord_(CONFIG.SHEETS.MEMBERS, 'memberId', memberId);
  if (!member) throw new Error('找不到會員資料');
  return {
    memberId: member.memberId,
    chineseName: member.chineseName || '',
    englishName: member.englishName || '',
    email: member.email || '',
    phone: member.phone || '',
    memberLevel: member.memberLevel || 'Gold',
    completedHours: Number(member.completedHours || 0),
    remainingHours: Number(member.remainingHours || 0),
    locale: member.locale || 'zh-Hant'
  };
}

function getMemberActivity_(memberId) {
  const orders = getRecords_(CONFIG.SHEETS.ORDERS)
    .filter(function(order) { return String(order.memberId) === String(memberId); })
    .slice(-10).reverse().map(function(order) {
      return {
        orderNumber: order.orderNumber,
        createdAt: displayDateTime_(order.createdAt),
        productName: order.productName,
        amount: Number(order.amount || 0),
        paymentMethod: order.paymentMethod,
        transactionStatus: order.transactionStatus
      };
    });
  const bookings = getRecords_(CONFIG.SHEETS.BOOKINGS)
    .filter(function(booking) { return String(booking.memberId) === String(memberId); })
    .slice(-10).reverse().map(function(booking) {
      return {
        bookingId: booking.bookingId,
        courseDate: displayDate_(booking.courseDate),
        startTime: displayTime_(booking.startTime),
        endTime: displayTime_(booking.endTime),
        coachName: booking.coachName,
        bookingStatus: booking.bookingStatus
      };
    });
  return { orders: orders, bookings: bookings };
}

function coachProfileDefaults_() {
  return {
    'Apple': { coachId:'C001', coachName:'Apple', title:'Fitness Coach', courseName:'體適能', specialty:'動作品質與基礎體能', languages:'正體中文', bioZh:'把訓練做對，再把它做重。', bioEn:'Move well first, then move more.', bioJa:'正しく動いてから、強くなる。', sortOrder:1 },
    'Berry': { coachId:'C002', coachName:'Berry', title:'Active Aging Coach', courseName:'樂齡活力', specialty:'銀髮族活動力與平衡', languages:'國語／臺語／客語', bioZh:'讓每一個年齡都保有行動自由。', bioEn:'Mobility and confidence at every age.', bioJa:'いくつになっても自由に動ける身体へ。', sortOrder:2 },
    'Cindy': { coachId:'C003', coachName:'Cindy', title:'Strength Coach', courseName:'健力', specialty:'深蹲、臥推、硬舉', languages:'正體中文', bioZh:'力量不會背叛你，姿勢可能會。', bioEn:'Strength is honest. Technique needs work.', bioJa:'筋力は裏切らない。フォームは要確認。', sortOrder:3 },
    'Doofy': { coachId:'C004', coachName:'Doofy', title:'Bodybuilding Coach', courseName:'健美', specialty:'增肌與體態雕塑', languages:'正體中文', bioZh:'每一塊肌肉都有它的版面。', bioEn:'Every muscle deserves screen time.', bioJa:'すべての筋肉に見せ場を。', sortOrder:4 },
    'Fancy': { coachId:'C005', coachName:'Fancy', title:'Aerial Yoga Coach', courseName:'空中瑜伽', specialty:'懸吊、核心與柔軟度', languages:'正體中文', bioZh:'離開地面，暫時也離開現實。', bioEn:'Leave the floor. Reality can wait.', bioJa:'床を離れて、現実もしばらく置いていく。', sortOrder:5 },
    'Vinyasa Instructor': { coachId:'C006', coachName:'Vinyasa Instructor', title:'Vinyasa Yoga Instructor', courseName:'Vinyasa Yoga', specialty:'舌根伸展', languages:'English', bioZh:'印度裔英國人，專長為舌根伸展。', bioEn:'British Indian instructor specialising in tongue-root stretching.', bioJa:'インド系イギリス人。舌根ストレッチを専門とする。', sortOrder:6 },
    'Ashtanga Instructor': { coachId:'C007', coachName:'Ashtanga Instructor', title:'Ashtanga Yoga Instructor', courseName:'Ashtanga Yoga', specialty:'大休息一小時', languages:'English', bioZh:'非洲裔印度人，專長為大休息一小時。', bioEn:'African Indian instructor specialising in a one-hour savasana.', bioJa:'アフリカ系インド人。1時間のシャヴァーサナを専門とする。', sortOrder:7 }
  };
}

function createMemberSession_(memberId) {
  const token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  CacheService.getScriptCache().put(memberSessionKey_(token), JSON.stringify({
    memberId: memberId,
    createdAt: new Date().toISOString()
  }), PORTAL_SESSION_TTL_SECONDS);
  return token;
}

function optionalMemberSession_(token) {
  if (!token) return null;
  const raw = CacheService.getScriptCache().get(memberSessionKey_(token));
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (error) { return null; }
}

function requireMemberSession_(token) {
  const session = optionalMemberSession_(token);
  if (!session || !session.memberId) throw new Error('請先登入或註冊會員');
  CacheService.getScriptCache().put(memberSessionKey_(token), JSON.stringify(session), PORTAL_SESSION_TTL_SECONDS);
  return session;
}

function memberSessionKey_(token) {
  return 'PMM_MEMBER_SESSION_' + String(token || '');
}

function passwordHash_(password, salt) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(salt) + '|' + String(password),
    Utilities.Charset.UTF_8
  );
  return Utilities.base64EncodeWebSafe(bytes);
}

function safeEquals_(left, right) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i += 1) mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return mismatch === 0;
}

function normalizeEmail_(value) {
  return String(value || '').trim().toLowerCase();
}

function generatePortalMemberId_(englishName, now, members) {
  const initial = String(englishName || '').trim().substring(0, 1).toUpperCase();
  if (!initial) throw new Error('請輸入英文姓名');
  const prefix = initial + formatDate_(now, 'MMdd');
  const serial = members.filter(function(item) {
    return String(item.memberId || '').indexOf(prefix) === 0;
  }).length + 1;
  return prefix + String(serial).padStart(3, '0');
}

function sanitizeMemberForAudit_(member) {
  const copy = Object.assign({}, member);
  delete copy.passwordSalt;
  delete copy.passwordHash;
  return copy;
}
