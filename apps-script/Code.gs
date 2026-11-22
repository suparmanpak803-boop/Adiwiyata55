const DATA_SHEET = 'Data_Sampah'
const SUMMARY_SHEET = 'Rekap'
const MASTER_CLASS_SHEET = 'Master_Kelas'
const CLASS_HEADERS = ['Kode Kelas', 'Tingkat', 'Rombel', 'Wali Kelas', 'Aktif']
// PERBAIKAN (B-03): sebelumnya [] sehingga setoran lokasi umum yang lolos
// validasi Next.js selalu ditolak di sini. Daftar ini HARUS sama dengan
// lib/general-locations.ts dan fallback di app/api/submit/route.ts.
const GENERAL_LOCATIONS = ['Kantin', 'Halaman', 'Lab', 'Perpustakaan', 'Taman']
const HEADERS = ['Timestamp', 'Tanggal', 'Kelas/Lokasi', 'Jenis Sampah', 'Berat (kg)', 'Kepatuhan Wadah Makan', 'Petugas', 'Catatan', 'ID Unik']
const TIME_ZONE = 'Asia/Jakarta'

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON)
}

function getAuthorizedSpreadsheet(token) {
  const expected = PropertiesService.getScriptProperties().getProperty('SHEETS_SECRET_TOKEN')
  if (!expected || !token || token !== expected) throw new Error('Akses tidak diizinkan.')
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  if (!spreadsheet) throw new Error('Skrip harus terikat ke Google Spreadsheet.')
  return spreadsheet
}

const VIDEO_SHEET = 'Video_Edukasi'
const VIDEO_STATS_SHEET = 'Statistik_Video'
const VIDEO_HEADERS = ['Judul', 'Link YouTube', 'Kategori', 'Deskripsi', 'Durasi', 'Tampil (Ya/Tidak)', 'Urutan', 'Tanggal Publikasi']

function normalizeClassCode(value) {
  const compact = normalizeText(value, 30).toUpperCase().replace(/[\s-]+/g, '')
  const match = compact.match(/^(XII|XI|X)([A-Z])$/)
  return match ? match[1] + '-' + match[2] : ''
}

function ensureMasterClassSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(MASTER_CLASS_SHEET)
  if (!sheet) sheet = spreadsheet.insertSheet(MASTER_CLASS_SHEET)
  if (sheet.getLastRow() === 0) {
    const rows = []
    ;['X', 'XI', 'XII'].forEach(function(grade) {
      'ABCDEFGH'.split('').forEach(function(room) { rows.push([grade + '-' + room, grade, room, '', 'Ya']) })
    })
    sheet.getRange(1, 1, 1, CLASS_HEADERS.length).setValues([CLASS_HEADERS])
    sheet.getRange(2, 1, rows.length, CLASS_HEADERS.length).setValues(rows)
    sheet.getRange(1, 1, 1, CLASS_HEADERS.length).setFontWeight('bold').setBackground('#236b4d').setFontColor('#ffffff')
    sheet.setFrozenRows(1)
    sheet.autoResizeColumns(1, CLASS_HEADERS.length)
  } else {
    const existingCodes = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues().flat().map(normalizeClassCode) : []
    const missingRooms = []
    ;['X', 'XI', 'XII'].forEach(function(grade) {
      'GH'.split('').forEach(function(room) {
        const code = grade + '-' + room
        if (existingCodes.indexOf(code) < 0) missingRooms.push([code, grade, room, '', 'Ya'])
      })
    })
    if (missingRooms.length) sheet.getRange(sheet.getLastRow() + 1, 1, missingRooms.length, CLASS_HEADERS.length).setValues(missingRooms)
  }
  return sheet
}

function listActiveClasses(spreadsheet) {
  const cache = CacheService.getScriptCache()
  const cached = cache.get('active_master_classes_v1')
  if (cached) return JSON.parse(cached)
  const sheet = ensureMasterClassSheet(spreadsheet)
  const values = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, CLASS_HEADERS.length).getDisplayValues() : []
  const classes = values.map(function(row) {
    const code = normalizeClassCode(row[0])
    const match = code.match(/^(XII|XI|X)-([A-Z])$/)
    const grade = normalizeText(row[1], 4).toUpperCase() || (match && match[1])
    const room = normalizeText(row[2], 1).toUpperCase() || (match && match[2])
    return { code: code, grade: grade, rombel: room, homeroomTeacher: normalizeText(row[3], 100), active: String(row[4]).trim().toLowerCase() === 'ya' }
  }).filter(function(item) {
    const match = item.code.match(/^(XII|XI|X)-([A-Z])$/)
    return item.code && item.active && /^(X|XI|XII)$/.test(item.grade) && /^[A-Z]$/.test(item.rombel) && match && item.grade === match[1] && item.rombel === match[2]
  }).sort(function(a, b) {
    const gradeOrder = { X: 1, XI: 2, XII: 3 }
    return gradeOrder[a.grade] - gradeOrder[b.grade] || a.rombel.localeCompare(b.rombel)
  })
  const grouped = { X: [], XI: [], XII: [] }
  classes.forEach(function(item) { grouped[item.grade].push(item) })
  const result = { classes: classes, byGrade: grouped, locations: GENERAL_LOCATIONS }
  cache.put('active_master_classes_v1', JSON.stringify(result), 300)
  return result
}

function ensureVideoSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(VIDEO_SHEET)
  if (!sheet) sheet = spreadsheet.insertSheet(VIDEO_SHEET)
  if (sheet.getLastRow() === 0) {
    const published = new Date()
    const samples = [
      ['Edukasi Pemilahan Sampah Organik dan Anorganik', 'https://www.youtube.com/watch?v=nrANKUUHBf0', 'Pemilahan Sampah', 'Contoh video edukasi RSA UGM tentang memilah sampah dari sumbernya dan prinsip 3R.', '04:05', 'Ya', 1, published],
      ['Kenali Perjalanan Sampah Daur Ulang', '', 'Daur Ulang', 'Contoh konten. Admin dapat mengganti judul, deskripsi, durasi, dan menambahkan tautan video di sheet ini.', '03:30', 'Ya', 2, published],
      ['Kompos dari Sampah Organik Sekolah', '', 'Kompos', 'Contoh konten tentang mengolah sisa organik menjadi kompos untuk kebun sekolah. Tambahkan tautan video.', '05:10', 'Ya', 3, published],
      ['Kurangi Sampah dengan Wadah Pakai Ulang', '', 'Wadah Makan Ramah Lingkungan', 'Contoh konten tentang membawa tumbler dan wadah makan guna ulang. Tambahkan tautan video.', '02:45', 'Ya', 4, published],
      ['Aksi Adiwiyata SMAN 55 Jakarta', '', 'Kegiatan Adiwiyata SMAN 55', 'Contoh konten dokumentasi gerakan lingkungan sekolah. Tambahkan tautan video kegiatan.', '04:20', 'Ya', 5, published],
    ]
    sheet.getRange(1, 1, 1, VIDEO_HEADERS.length).setValues([VIDEO_HEADERS])
    sheet.getRange(2, 1, samples.length, VIDEO_HEADERS.length).setValues(samples)
    sheet.getRange(1, 1, 1, VIDEO_HEADERS.length).setFontWeight('bold').setBackground('#236b4d').setFontColor('#ffffff')
    sheet.getRange('H:H').setNumberFormat('yyyy-mm-dd')
    sheet.setFrozenRows(1)
    sheet.autoResizeColumns(1, VIDEO_HEADERS.length)
  }
  return sheet
}

function ensureVideoStatsSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(VIDEO_STATS_SHEET)
  if (!sheet) sheet = spreadsheet.insertSheet(VIDEO_STATS_SHEET)
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 4).setValues([['Video ID', 'Judul', 'Jumlah Tayang', 'Terakhir Dilihat']])
    sheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#236b4d').setFontColor('#ffffff')
    sheet.getRange('D:D').setNumberFormat('yyyy-mm-dd hh:mm:ss')
    sheet.setFrozenRows(1)
  }
  return sheet
}

function listEducationVideos(spreadsheet) {
  const sheet = ensureVideoSheet(spreadsheet)
  if (sheet.getLastRow() < 2) return []
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, VIDEO_HEADERS.length).getValues()
    .filter(function(row) { return String(row[5]).trim().toLowerCase() === 'ya' })
    .map(function(row) {
      const published = row[7]
      const publishedAt = published instanceof Date && !isNaN(published.getTime())
        ? Utilities.formatDate(published, TIME_ZONE, 'yyyy-MM-dd')
        : /^\d{4}-\d{2}-\d{2}$/.test(String(published)) ? String(published) : ''
      return { title: normalizeText(row[0], 160), youtubeUrl: normalizeText(row[1], 500), category: normalizeText(row[2], 60), description: normalizeText(row[3], 500), duration: normalizeText(row[4], 20), order: Number(row[6]) || 0, publishedAt: publishedAt }
    })
    .filter(function(video) { return video.title && video.category })
    .sort(function(a, b) { return a.order - b.order || a.title.localeCompare(b.title) })
}

function recordVideoView(spreadsheet, videoId, title) {
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) throw new Error('ID video tidak valid.')
  const sheet = ensureVideoStatsSheet(spreadsheet)
  const lock = LockService.getScriptLock()
  lock.waitLock(10000)
  try {
    const lastRow = sheet.getLastRow()
    const ids = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat() : []
    const index = ids.indexOf(videoId)
    if (index >= 0) {
      const row = index + 2
      const views = Number(sheet.getRange(row, 3).getValue()) || 0
      sheet.getRange(row, 2, 1, 3).setValues([[safeCell(normalizeText(title, 160)), views + 1, new Date()]])
    } else {
      sheet.appendRow([videoId, safeCell(normalizeText(title, 160)), 1, new Date()])
    }
  } finally {
    lock.releaseLock()
  }
}

// PERBAIKAN: sinkronisasi laporan dari Next.js (lib/laporan-admin.ts
// syncReports mengirim action 'sync_laporan'). Sebelumnya handler ini
// tidak ada, jadi sinkronisasi laporan selalu gagal.
const LAPORAN_SHEET = 'Laporan'
const LAPORAN_HEADERS = ['Nomor Tiket', 'Tanggal', 'Kategori', 'Lokasi', 'Judul', 'Isi', 'Urgensi', 'Pelapor', 'Status', 'Tanggapan Admin', 'Tanggal Selesai', 'Rating']

function syncLaporanReports(spreadsheet, reports) {
  if (!Array.isArray(reports) || !reports.length) return 0
  let sheet = spreadsheet.getSheetByName(LAPORAN_SHEET)
  if (!sheet) sheet = spreadsheet.insertSheet(LAPORAN_SHEET)
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, LAPORAN_HEADERS.length).setValues([LAPORAN_HEADERS])
    sheet.getRange(1, 1, 1, LAPORAN_HEADERS.length).setFontWeight('bold').setBackground('#236b4d').setFontColor('#ffffff')
    sheet.setFrozenRows(1)
    sheet.autoResizeColumns(1, LAPORAN_HEADERS.length)
  }
  const lock = LockService.getScriptLock()
  lock.waitLock(10000)
  try {
    const lastRow = sheet.getLastRow()
    const tickets = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues().flat() : []
    let synced = 0
    reports.forEach(function(report) {
      const row = [
        safeCell(normalizeText(report.nomor_tiket, 30)),
        safeCell(normalizeText(report.dibuat_pada, 30)),
        safeCell(normalizeText(report.kategori, 40)),
        safeCell(normalizeText(report.lokasi, 30)),
        safeCell(normalizeText(report.judul, 200)),
        safeCell(normalizeText(report.isi, 2000)),
        safeCell(normalizeText(report.urgensi, 20)),
        safeCell(normalizeText(report.nama_pelapor, 100)),
        safeCell(normalizeText(report.status, 20)),
        safeCell(normalizeText(report.tanggapan_admin, 1000)),
        safeCell(normalizeText(report.diselesaikan_pada, 30)),
        report.rating == null ? '' : Number(report.rating),
      ]
      const index = tickets.indexOf(row[0])
      if (index >= 0) {
        sheet.getRange(index + 2, 1, 1, LAPORAN_HEADERS.length).setValues([row])
      } else {
        sheet.appendRow(row)
        tickets.push(row[0])
      }
      synced += 1
    })
    return synced
  } finally {
    lock.releaseLock()
  }
}

function ensureSheets(spreadsheet) {
  spreadsheet.setSpreadsheetTimeZone(TIME_ZONE)
  ensureMasterClassSheet(spreadsheet)
  let data = spreadsheet.getSheetByName(DATA_SHEET)
  if (!data) data = spreadsheet.insertSheet(DATA_SHEET)
  if (data.getLastRow() === 0) {
    data.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    data.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#236b4d').setFontColor('#ffffff')
    data.setFrozenRows(1)
    data.getRange('A:A').setNumberFormat('dd/MM/yyyy HH:mm:ss')
    data.getRange('B:B').setNumberFormat('dd/MM/yyyy')
    data.getRange('E:E').setNumberFormat('0.00')
    data.autoResizeColumns(1, HEADERS.length)
  }

  let summary = spreadsheet.getSheetByName(SUMMARY_SHEET)
  if (!summary) summary = spreadsheet.insertSheet(SUMMARY_SHEET)
  summary.clear()
  const recapHeaders = ['Kode Kelas', 'Tingkat', 'Rombel', 'Organik', 'Anorganik', 'B3', 'Residu', 'Kertas', 'Total Berat (kg)', 'Kepatuhan Wadah Makan']
  summary.getRange(1, 1, 1, recapHeaders.length).setValues([recapHeaders])
  const classes = listActiveClasses(spreadsheet).classes
  if (classes.length) {
    const rows = classes.map(function(item) { return [item.code, item.grade, item.rombel, '', '', '', '', '', '', ''] })
    summary.getRange(2, 1, rows.length, recapHeaders.length).setValues(rows)
    const formulas = rows.map(function(_, index) {
      const row = index + 2
      return [
        '=SUMIFS(Data_Sampah!$E:$E,Data_Sampah!$C:$C,$A' + row + ',Data_Sampah!$D:$D,D$1)',
        '=SUMIFS(Data_Sampah!$E:$E,Data_Sampah!$C:$C,$A' + row + ',Data_Sampah!$D:$D,E$1)',
        '=SUMIFS(Data_Sampah!$E:$E,Data_Sampah!$C:$C,$A' + row + ',Data_Sampah!$D:$D,F$1)',
        '=SUMIFS(Data_Sampah!$E:$E,Data_Sampah!$C:$C,$A' + row + ',Data_Sampah!$D:$D,G$1)',
        '=SUMIFS(Data_Sampah!$E:$E,Data_Sampah!$C:$C,$A' + row + ',Data_Sampah!$D:$D,H$1)',
        '=SUM(D' + row + ':H' + row + ')',
        '=IFERROR(COUNTUNIQUEIFS(Data_Sampah!$B:$B,Data_Sampah!$C:$C,$A' + row + ',Data_Sampah!$F:$F,"Patuh*")/COUNTUNIQUEIFS(Data_Sampah!$B:$B,Data_Sampah!$C:$C,$A' + row + '),0)'
      ]
    })
    summary.getRange(2, 4, formulas.length, 7).setFormulas(formulas)
    summary.getRange(2, 10, formulas.length, 1).setNumberFormat('0.0%')
  }
  summary.getRange(1, 1, 1, recapHeaders.length).setFontWeight('bold').setBackground('#236b4d').setFontColor('#ffffff')
  summary.setFrozenRows(1)
  summary.autoResizeColumns(1, recapHeaders.length)
  return data
}

function normalizeText(value, limit) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, limit)
}

function safeCell(value) {
  const text = String(value || '')
  return /^[=+\-@]/.test(text) ? "'" + text : text
}

function normalizeRecord(record, staff) {
  const date = String(record.date || '')
  const [year, month, day] = date.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  const today = Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy-MM-dd')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || parsed.toISOString().slice(0, 10) !== date || date > today) throw new Error('Tanggal tidak valid atau melewati hari ini.')
  const rawClassName = normalizeText(record.className, 30)
  const className = normalizeClassCode(rawClassName) || rawClassName
  const isGeneralLocation = GENERAL_LOCATIONS.indexOf(className) >= 0
  if (!isGeneralLocation && !listActiveClasses(SpreadsheetApp.getActiveSpreadsheet()).classes.some(function(item) { return item.code === className })) throw new Error('Kode kelas tidak terdaftar atau tidak aktif di Master_Kelas.')
  const wasteType = normalizeText(record.wasteType, 20)
  if (!['Organik', 'Anorganik', 'B3', 'Residu', 'Kertas'].includes(wasteType)) throw new Error('Jenis sampah tidak valid.')
  const weight = Number(record.weight)
  if (!Number.isFinite(weight) || weight <= 0 || weight > 500 || Math.round(weight * 100) !== weight * 100) throw new Error('Berat harus lebih dari 0 dan maksimal dua angka desimal.')
  const compliance = normalizeText(record.compliance, 120)
  const note = normalizeText(record.note, 500)
  if (!compliance || !note || !staff) throw new Error('Kepatuhan, catatan, dan nama petugas wajib diisi.')
  const dateFormatted = Utilities.formatDate(new Date(Date.UTC(year, month - 1, day, 12)), TIME_ZONE, 'dd/MM/yyyy')
  const stableKey = [date, className, wasteType].join('|')
  const uniqueId = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, stableKey)).replace(/=+$/, '').slice(0, 24)
  return { date, dateFormatted, className, wasteType, weight, compliance, staff, note, uniqueId }
}

function doPost(event) {
  try {
    const body = JSON.parse(event.postData.contents || '{}')
    const spreadsheet = getAuthorizedSpreadsheet(body.token)
    if (body.action === 'record_video_view') {
      recordVideoView(spreadsheet, String(body.videoId || ''), String(body.title || ''))
      return jsonResponse({ success: true })
    }
    if (body.action === 'sync_laporan') {
      const synced = syncLaporanReports(spreadsheet, body.reports)
      return jsonResponse({ success: true, synced: synced })
    }
    // L-02: aksi baca juga dilayani lewat POST (token di body, bukan di
    // URL yang tercatat di log). Logika baca tetap di doGet — di sini
    // hanya diteruskan parameternya.
    if (body.action === 'classes' || body.action === 'videos' || body.action === 'summary') {
      const params = { action: body.action, token: body.token }
      ;['from', 'to', 'grade', 'className', 'classNames'].forEach(function(key) {
        if (body[key] !== undefined && body[key] !== '') params[key] = String(body[key])
      })
      return doGet({ parameter: params })
    }
    const sheet = ensureSheets(spreadsheet)
    if (body.action !== 'submit' || !Array.isArray(body.records) || body.records.length < 1 || body.records.length > 5) throw new Error('Permintaan tidak valid.')
    const staff = normalizeText(body.staff, 100)
    if (!staff) throw new Error('Nama petugas wajib diisi.')
    const records = body.records.map(function(record) { return normalizeRecord(record, staff) })
    const lock = LockService.getScriptLock()
    lock.waitLock(10000)
    try {
      if (body.replace === true && sheet.getLastRow() > 1) {
        const activeTypes = records.map(function(record) { return record.wasteType })
        const currentRows = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues()
        for (let index = currentRows.length - 1; index >= 0; index -= 1) {
          const row = currentRows[index]
          const rowDate = row[1] instanceof Date ? Utilities.formatDate(row[1], TIME_ZONE, 'yyyy-MM-dd') : ''
          if (rowDate === records[0].date && row[2] === records[0].className && !activeTypes.includes(row[3])) sheet.deleteRow(index + 2)
        }
      }
      const lastRow = sheet.getLastRow()
      const existing = lastRow > 1 ? sheet.getRange(2, 9, lastRow - 1, 1).getValues().flat() : []
      let inserted = 0
      let updated = 0
      records.forEach(function(record) {
        const rowIndex = existing.indexOf(record.uniqueId)
        const [year, month, day] = record.date.split('-').map(Number)
        const sheetDate = new Date(Date.UTC(year, month - 1, day, 12))
        const row = [new Date(), sheetDate, safeCell(record.className), safeCell(record.wasteType), record.weight, safeCell(record.compliance), safeCell(staff), safeCell(record.note), record.uniqueId]
        if (rowIndex >= 0) {
          sheet.getRange(rowIndex + 2, 1, 1, HEADERS.length).setValues([row])
          updated += 1
        } else {
          sheet.appendRow(row)
          existing.push(record.uniqueId)
          inserted += 1
        }
      })
      return jsonResponse({ success: true, inserted: inserted, updated: updated, spreadsheetUrl: spreadsheet.getUrl() })
    } finally {
      lock.releaseLock()
    }
  } catch (error) {
    return jsonResponse({ success: false, error: error.message || 'Gagal menyimpan data.' })
  }
}

function doGet(event) {
  try {
    const params = event.parameter || {}
    const spreadsheet = getAuthorizedSpreadsheet(params.token)
    if (params.action === 'classes') return jsonResponse({ success: true, master: listActiveClasses(spreadsheet) })
    if (params.action === 'videos') return jsonResponse({ success: true, videos: listEducationVideos(spreadsheet) })
    const sheet = ensureSheets(spreadsheet)
    if (params.action !== 'summary') throw new Error('Permintaan tidak valid.')
    const rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues() : []
    const from = params.from || ''
    const to = params.to || ''
    const classNames = normalizeText(params.classNames || params.className || '', 1000).split(',').map(function(value) { return normalizeClassCode(value) || normalizeText(value, 30) }).filter(Boolean)
    const requestedGrade = ['X', 'XI', 'XII'].indexOf(String(params.grade || '').toUpperCase()) >= 0 ? String(params.grade).toUpperCase() : ''
    const filtered = rows.filter(function(row) {
      const date = row[1] instanceof Date ? Utilities.formatDate(row[1], TIME_ZONE, 'yyyy-MM-dd') : ''
      const rowClass = normalizeClassCode(row[2]) || String(row[2])
      const gradeMatch = !requestedGrade || rowClass.indexOf(requestedGrade + '-') === 0
      const classMatch = !classNames.length || classNames.indexOf(rowClass) >= 0
      return gradeMatch && classMatch && (!from || date >= from) && (!to || date <= to)
    })
    const totalsByType = {}
    const byClass = {}
    const byMonth = {}
    const weekly = {}
    const classMaster = listActiveClasses(spreadsheet).classes
    classMaster.filter(function(item) {
      return (!requestedGrade || item.grade === requestedGrade) && (!classNames.length || classNames.indexOf(item.code) >= 0)
    }).forEach(function(item) {
      byClass[item.code] = { className: item.code, grade: item.grade, entries: 0, totalKg: 0, compliant: 0, compliancePercent: 0, tumbler: 0, lunchbox: 0, _dates: {} }
    })
    filtered.forEach(function(row) {
      const type = String(row[3])
      const classKey = normalizeClassCode(row[2]) || String(row[2])
      const gradeMatch = classKey.match(/^(XII|XI|X)-[A-Z]$/)
      const grade = gradeMatch ? gradeMatch[1] : ''
      const month = row[1] instanceof Date ? Utilities.formatDate(row[1], TIME_ZONE, 'yyyy-MM') : ''
      const weight = Number(row[4]) || 0
      totalsByType[type] = (totalsByType[type] || 0) + weight
      if (!byClass[classKey]) byClass[classKey] = { className: classKey, grade: grade, entries: 0, totalKg: 0, compliant: 0, compliancePercent: 0, tumbler: 0, lunchbox: 0, _dates: {} }
      byClass[classKey].totalKg += weight
      const dateKey = row[1] instanceof Date ? Utilities.formatDate(row[1], TIME_ZONE, 'yyyy-MM-dd') : ''
      const matches = String(row[5]).match(/Tumbler\s+(\d+)\/(\d+).*Lunch box\s+(\d+)\/(\d+)/i)
      if (matches) {
        byClass[classKey].tumbler = Number(matches[1])
        byClass[classKey].lunchbox = Number(matches[3])
      }
      if (dateKey && !byClass[classKey]._dates[dateKey]) {
        byClass[classKey]._dates[dateKey] = true
        byClass[classKey].entries += 1
        if (/^Patuh(?:$|\s|\|)/i.test(String(row[5]))) byClass[classKey].compliant += 1
      }
      if (month) byMonth[month] = (byMonth[month] || 0) + weight
      if (dateKey && grade) {
        const dateParts = dateKey.split('-').map(Number)
        const weekDate = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]))
        weekDate.setUTCDate(weekDate.getUTCDate() - (weekDate.getUTCDay() + 6) % 7)
        const week = Utilities.formatDate(weekDate, 'UTC', 'yyyy-MM-dd')
        const key = week + '|' + grade
        if (!weekly[key]) weekly[key] = { week: week, grade: grade, totalKg: 0 }
        weekly[key].totalKg += weight
      }
    })
    const gradeSummary = {}
    const classSummary = Object.values(byClass).map(function(item) {
      item.compliancePercent = item.entries ? item.compliant / item.entries * 100 : 0
      if (item.grade) {
        if (!gradeSummary[item.grade]) gradeSummary[item.grade] = { grade: item.grade, totalKg: 0, entries: 0, compliant: 0, compliancePercent: 0 }
        gradeSummary[item.grade].totalKg += item.totalKg
        gradeSummary[item.grade].entries += item.entries
        gradeSummary[item.grade].compliant += item.compliant
      }
      delete item._dates
      return item
    })
    Object.keys(gradeSummary).forEach(function(grade) {
      const item = gradeSummary[grade]
      item.compliancePercent = item.entries ? item.compliant / item.entries * 100 : 0
      delete item.compliant
    })
    classSummary.sort(function(a, b) { return a.className.localeCompare(b.className) })
    return jsonResponse({ success: true, totalsByType: totalsByType, byClass: classSummary, byGrade: Object.values(gradeSummary), weeklyByGrade: Object.values(weekly).sort(function(a, b) { return a.week.localeCompare(b.week) || a.grade.localeCompare(b.grade) }), byMonth: byMonth, totalKg: filtered.reduce(function(sum, row) { return sum + (Number(row[4]) || 0) }, 0), recordCount: filtered.length, spreadsheetUrl: spreadsheet.getUrl() })

  } catch (error) {
    return jsonResponse({ success: false, error: error.message || 'Gagal membaca rekap.' })
  }
}
