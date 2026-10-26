(function (global) {
  'use strict';

  function assertBridge() {
    if (!global.Native || typeof global.Native.call !== 'function') {
      throw new Error('Native bridge is not ready');
    }
  }

  function call(plugin, method, args, extra) {
    assertBridge();
    return global.Native.call(
      Object.assign({ plugin: plugin, method: method, args: args || {} }, extra || {})
    );
  }

  function batch(requests, options) {
    assertBridge();
    return global.Native.batch(requests, options || {});
  }

  function on(event, callback) {
    assertBridge();
    return global.Native.on(event, callback);
  }

  function off(event, callback) {
    assertBridge();
    return global.Native.off(event, callback);
  }

  function info() {
    if (!global.Native || !global.Native.info) {
      return { initialized: false, pendingRequests: 0, totalRequests: 0, version: null };
    }
    return global.Native.info();
  }

  function waitForReady(timeoutMs) {
    var timeout = typeof timeoutMs === 'number' ? timeoutMs : 8000;
    return new Promise(function (resolve, reject) {
      if (global.Native && typeof global.Native.call === 'function') {
        resolve(info());
        return;
      }
      var elapsed = 0;
      var step = 50;
      var timer = setInterval(function () {
        elapsed += step;
        if (global.Native && typeof global.Native.call === 'function') {
          clearInterval(timer);
          resolve(info());
          return;
        }
        if (elapsed >= timeout) {
          clearInterval(timer);
          reject(new Error('Native bridge ready timeout'));
        }
      }, step);
    });
  }

  var sdk = {
    call: call,
    batch: batch,
    on: on,
    off: off,
    info: info,
    waitForReady: waitForReady,

    /* ───── فاز ۱ ───── */

    permission: {
      check: function (p) { return call('permission', 'check', { permission: p }); },
      request: function (p) { return call('permission', 'request', { permission: p }); },
      checkMany: function (ps) { return call('permission', 'checkMany', { permissions: ps }); },
      requestMany: function (ps) { return call('permission', 'requestMany', { permissions: ps }); },
      openSettings: function () { return call('permission', 'openSettings', {}); },
      getKnownPermissions: function () { return call('permission', 'getKnownPermissions', {}); }
    },

    appLifecycle: {
      getState: function () { return call('appLifecycle', 'getState', {}); },
      enableEvents: function () { return call('appLifecycle', 'enableEvents', {}); },
      disableEvents: function () { return call('appLifecycle', 'disableEvents', {}); },
      getInfo: function () { return call('appLifecycle', 'getInfo', {}); }
    },

    deviceInfo: {
      getDeviceInfo: function () { return call('deviceInfo', 'getDeviceInfo', {}); },
      getAppInfo: function () { return call('deviceInfo', 'getAppInfo', {}); },
      getAll: function () { return call('deviceInfo', 'getAll', {}); }
    },

    connectivity: {
      getStatus: function () { return call('connectivity', 'getStatus', {}); },
      isOnline: function () { return call('connectivity', 'isOnline', {}); },
      startWatch: function () { return call('connectivity', 'startWatch', {}); },
      stopWatch: function () { return call('connectivity', 'stopWatch', {}); },
      getInfo: function () { return call('connectivity', 'getInfo', {}); }
    },

    storage: {
      get: function (k) { return call('storage', 'get', { key: k }); },
      set: function (k, v) { return call('storage', 'set', { key: k, value: v }); },
      remove: function (k) { return call('storage', 'remove', { key: k }); },
      clear: function () { return call('storage', 'clear', {}); },
      keys: function () { return call('storage', 'keys', {}); },
      has: function (k) { return call('storage', 'has', { key: k }); }
    },

    fileSystem: {
      getDirectories: function () { return call('fileSystem', 'getDirectories', {}); },
      readFile: function (p, b, e) { return call('fileSystem', 'readFile', { path: p, baseDir: b || 'documents', encoding: e || 'utf8' }); },
      writeFile: function (p, c, o) { o = o || {}; return call('fileSystem', 'writeFile', { path: p, content: c, baseDir: o.baseDir || 'documents', encoding: o.encoding || 'utf8', append: !!o.append }); },
      deleteFile: function (p, b) { return call('fileSystem', 'deleteFile', { path: p, baseDir: b || 'documents' }); },
      fileExists: function (p, b) { return call('fileSystem', 'fileExists', { path: p, baseDir: b || 'documents' }); },
      listFiles: function (p, o) { o = o || {}; return call('fileSystem', 'listFiles', { path: p || '', baseDir: o.baseDir || 'documents', recursive: !!o.recursive }); },
      browse: function (p, o) { o = o || {}; return call('fileSystem', 'browse', { path: p || '', extensions: o.extensions }); },
      createDirectory: function (p, o) { o = o || {}; return call('fileSystem', 'createDirectory', { path: p, baseDir: o.baseDir || 'documents', recursive: o.recursive !== false }); },
      deleteDirectory: function (p, o) { o = o || {}; return call('fileSystem', 'deleteDirectory', { path: p, baseDir: o.baseDir || 'documents', recursive: !!o.recursive }); },
      stat: function (p, o) { o = o || {}; return call('fileSystem', 'stat', { path: p, baseDir: o.baseDir || 'documents', type: o.type || 'file' }); }
    },

    http: {
      request: function (o) { return call('http', 'request', o || {}); },
      get: function (u, o) { return call('http', 'get', Object.assign({ url: u }, o || {})); },
      post: function (u, b, o) { return call('http', 'post', Object.assign({ url: u, body: b }, o || {})); },
      put: function (u, b, o) { return call('http', 'put', Object.assign({ url: u, body: b }, o || {})); },
      patch: function (u, b, o) { return call('http', 'patch', Object.assign({ url: u, body: b }, o || {})); },
      delete: function (u, o) { return call('http', 'delete', Object.assign({ url: u }, o || {})); },
      download: function (o) { return call('http', 'download', o || {}); }
    },

    intent: {
      openUrl: function (u, m) { return call('intent', 'openUrl', { url: u, mode: m || 'external' }); },
      canOpenUrl: function (u) { return call('intent', 'canOpenUrl', { url: u }); },
      getInitialLink: function () { return call('intent', 'getInitialLink', {}); },
      getLatestLink: function () { return call('intent', 'getLatestLink', {}); },
      startListening: function () { return call('intent', 'startListening', {}); },
      stopListening: function () { return call('intent', 'stopListening', {}); }
    },

    clipboard: {
      readText: function () { return call('clipboard', 'readText', {}); },
      writeText: function (t) { return call('clipboard', 'writeText', { text: t }); },
      hasText: function () { return call('clipboard', 'hasText', {}); },
      clear: function () { return call('clipboard', 'clear', {}); }
    },

    share: {
      shareText: function (t, s) { return call('share', 'shareText', { text: t, subject: s || null }); },
      shareFiles: function (p, t, s) { return call('share', 'shareFiles', { paths: p, text: t || null, subject: s || null }); }
    },

    camera: {
      getInfo: function () { return call('camera', 'getInfo', {}); },
      takePhoto: function (o) { return call('camera', 'takePhoto', o || {}); },
      pickFromGallery: function (o) { return call('camera', 'pickFromGallery', o || {}); }
    },

    geolocation: {
      checkPermission: function () { return call('geolocation', 'checkPermission', {}); },
      requestPermission: function () { return call('geolocation', 'requestPermission', {}); },
      getCurrentPosition: function (o) { return call('geolocation', 'getCurrentPosition', o || {}); },
      watchPosition: function (o) { return call('geolocation', 'watchPosition', o || {}); },
      clearWatch: function () { return call('geolocation', 'clearWatch', {}); },
      isLocationEnabled: function () { return call('geolocation', 'isLocationEnabled', {}); }
    },

    /* ───── فاز ۳ ───── */

    backButton: {
      enableIntercept: function () { return call('backButton', 'enableIntercept', {}); },
      disableIntercept: function () { return call('backButton', 'disableIntercept', {}); },
      getState: function () { return call('backButton', 'getState', {}); },
      exitApp: function () { return call('backButton', 'exitApp', {}); },
      setExitOnBack: function (enabled) { return call('backButton', 'setExitOnBack', { enabled: !!enabled }); },
      minimizeApp: function () { return call('backButton', 'minimizeApp', {}); }
    },

    secureStorage: {
      get: function (k) { return call('secureStorage', 'get', { key: k }); },
      set: function (k, v) { return call('secureStorage', 'set', { key: k, value: v }); },
      remove: function (k) { return call('secureStorage', 'remove', { key: k }); },
      has: function (k) { return call('secureStorage', 'has', { key: k }); },
      keys: function () { return call('secureStorage', 'keys', {}); },
      clear: function () { return call('secureStorage', 'clear', {}); },
      getInfo: function () { return call('secureStorage', 'getInfo', {}); }
    },

    notification: {
      show: function (o) { return call('notification', 'show', o || {}); },
      cancel: function (id) { return call('notification', 'cancel', { id: id }); },
      cancelAll: function () { return call('notification', 'cancelAll', {}); },
      getActive: function () { return call('notification', 'getActive', {}); },
      getPending: function () { return call('notification', 'getPending', {}); },
      createChannel: function (o) { return call('notification', 'createChannel', o || {}); },
      getInfo: function () { return call('notification', 'getInfo', {}); }
    },

    statusBar: {
      setStyle: function (style, bg) { return call('statusBar', 'setStyle', { style: style, backgroundColor: bg || null }); },
      setColor: function (c, nav) { return call('statusBar', 'setColor', { color: c, navigationBarColor: nav || null }); },
      show: function () { return call('statusBar', 'show', {}); },
      hide: function () { return call('statusBar', 'hide', {}); },
      setFullscreen: function () { return call('statusBar', 'setFullscreen', {}); },
      exitFullscreen: function () { return call('statusBar', 'exitFullscreen', {}); },
      getInfo: function () { return call('statusBar', 'getInfo', {}); }
    },

    orientation: {
      lock: function (o) { return call('orientation', 'lock', { orientation: o || 'portrait' }); },
      unlock: function () { return call('orientation', 'unlock', {}); },
      getInfo: function () { return call('orientation', 'getInfo', {}); }
    },

    haptic: {
      lightImpact: function () { return call('haptic', 'lightImpact', {}); },
      mediumImpact: function () { return call('haptic', 'mediumImpact', {}); },
      heavyImpact: function () { return call('haptic', 'heavyImpact', {}); },
      selectionClick: function () { return call('haptic', 'selectionClick', {}); },
      vibrate: function () { return call('haptic', 'vibrate', {}); },
      getInfo: function () { return call('haptic', 'getInfo', {}); }
    },

    keyboard: {
      getState: function () { return call('keyboard', 'getState', {}); },
      startWatch: function () { return call('keyboard', 'startWatch', {}); },
      stopWatch: function () { return call('keyboard', 'stopWatch', {}); },
      hide: function () { return call('keyboard', 'hide', {}); },
      getInfo: function () { return call('keyboard', 'getInfo', {}); }
    },
    /* ───── فاز ۴ ───── */
    biometrics: {
      isAvailable: function () { return call('biometrics', 'isAvailable', {}); },
      getAvailableBiometrics: function () { return call('biometrics', 'getAvailableBiometrics', {}); },
      authenticate: function (options) { return call('biometrics', 'authenticate', options || {}); },
      getInfo: function () { return call('biometrics', 'getInfo', {}); }
    },

    qrScanner: {
      scan: function (options) { return call('qrScanner', 'scan', options || {}, { timeout: 90000 }); },
      getInfo: function () { return call('qrScanner', 'getInfo', {}); }
    },

    audio: {
      startRecording: function (o) { return call('audio', 'startRecording', o || {}); },
      stopRecording: function () { return call('audio', 'stopRecording', {}); },
      isRecording: function () { return call('audio', 'isRecording', {}); },
      play: function (o) { return call('audio', 'play', o || {}); },
      pause: function () { return call('audio', 'pause', {}); },
      resume: function () { return call('audio', 'resume', {}); },
      stop: function () { return call('audio', 'stop', {}); },
      seek: function (ms) { return call('audio', 'seek', { positionMs: ms }); },
      isPlaying: function () { return call('audio', 'isPlaying', {}); },
      getDuration: function () { return call('audio', 'getDuration', {}); },
      getPosition: function () { return call('audio', 'getPosition', {}); },
      setVolume: function (v) { return call('audio', 'setVolume', { volume: v }); },
      getInfo: function () { return call('audio', 'getInfo', {}); }
    },

    smsOtp: {
      getAppSignature: function () { return call('smsOtp', 'getAppSignature', {}); },
      startListening: function () { return call('smsOtp', 'startListening', {}); },
      stopListening: function () { return call('smsOtp', 'stopListening', {}); },
      getLastCode: function () { return call('smsOtp', 'getLastCode', {}); },
      requestHint: function () { return call('smsOtp', 'requestHint', {}); },
      getInfo: function () { return call('smsOtp', 'getInfo', {}); }
    },

    downloadManager: {
      download: function (o) { return call('downloadManager', 'download', o || {}, { timeout: 300000 }); },
      cancel: function (taskId) { return call('downloadManager', 'cancel', { taskId: taskId }); },
      cancelAll: function () { return call('downloadManager', 'cancelAll', {}); },
      getActive: function () { return call('downloadManager', 'getActive', {}); },
      getInfo: function () { return call('downloadManager', 'getInfo', {}); }
    },

    database: {
      open: function (name, options) { var o = options || {}; return call('database', 'open', { name: name, version: o.version || 1, onCreate: o.onCreate || null }); },
      close: function (name) { return call('database', 'close', { name: name }); },
      execute: function (name, sql, params) { return call('database', 'execute', { name: name, sql: sql, params: params || null }); },
      query: function (name, table, options) { var o = options || {}; return call('database', 'query', Object.assign({ name: name, table: table }, o)); },
      insert: function (name, table, values) { return call('database', 'insert', { name: name, table: table, values: values }); },
      update: function (name, table, values, options) { var o = options || {}; return call('database', 'update', { name: name, table: table, values: values, where: o.where || null, whereArgs: o.whereArgs || null }); },
      delete: function (name, table, options) { var o = options || {}; return call('database', 'delete', { name: name, table: table, where: o.where || null, whereArgs: o.whereArgs || null }); },
      rawQuery: function (name, sql, params) { return call('database', 'rawQuery', { name: name, sql: sql, params: params || null }); },
      rawInsert: function (name, sql, params) { return call('database', 'rawInsert', { name: name, sql: sql, params: params || null }); },
      rawUpdate: function (name, sql, params) { return call('database', 'rawUpdate', { name: name, sql: sql, params: params || null }); },
      rawDelete: function (name, sql, params) { return call('database', 'rawDelete', { name: name, sql: sql, params: params || null }); },
      batch: function (name, statements) { return call('database', 'batch', { name: name, statements: statements }); },
      tableExists: function (name, table) { return call('database', 'tableExists', { name: name, table: table }); },
      getOpenDatabases: function () { return call('database', 'getOpenDatabases', {}); },
      deleteDatabase: function (name) { return call('database', 'deleteDatabase', { name: name }); },
      getInfo: function () { return call('database', 'getInfo', {}); }
    },

    contacts: {
      getAll: function (o) { return call('contacts', 'getAll', o || {}); },
      getById: function (id) { return call('contacts', 'getById', { id: id }); },
      search: function (query) { return call('contacts', 'search', { query: query }); },
      getCount: function () { return call('contacts', 'getCount', {}); },
      pickContact: function () { return call('contacts', 'pickContact', {}); },
      getInfo: function () { return call('contacts', 'getInfo', {}); }
    },

    phoneDialer: {
      dial: function (number) { return call('phoneDialer', 'dial', { number: number }); },
      directCall: function (number) { return call('phoneDialer', 'directCall', { number: number }); },
      canDial: function (number) { return call('phoneDialer', 'canDial', { number: number }); },
      sendSms: function (number, body) { return call('phoneDialer', 'sendSms', { number: number, body: body || '' }); },
      sendEmail: function (options) { return call('phoneDialer', 'sendEmail', options || {}); },
      getInfo: function () { return call('phoneDialer', 'getInfo', {}); }
    },

    /* ───── فاز ۵ ───── */
    bluetooth: {
      isAvailable: function () { return call('bluetooth', 'isAvailable', {}); },
      isOn: function () { return call('bluetooth', 'isOn', {}); },
      startScan: function (o) { return call('bluetooth', 'startScan', o || {}, { timeout: 30000 }); },
      stopScan: function () { return call('bluetooth', 'stopScan', {}); },
      connect: function (deviceId, o) { return call('bluetooth', 'connect', Object.assign({ deviceId: deviceId }, o || {}), { timeout: 30000 }); },
      disconnect: function (deviceId) { return call('bluetooth', 'disconnect', { deviceId: deviceId }); },
      discoverServices: function (deviceId) { return call('bluetooth', 'discoverServices', { deviceId: deviceId }); },
      readCharacteristic: function (o) { return call('bluetooth', 'readCharacteristic', o); },
      writeCharacteristic: function (o) { return call('bluetooth', 'writeCharacteristic', o); },
      getConnectedDevices: function () { return call('bluetooth', 'getConnectedDevices', {}); },
      getInfo: function () { return call('bluetooth', 'getInfo', {}); }
    },

    nfc: {
      isAvailable: function () { return call('nfc', 'isAvailable', {}); },
      startSession: function (o) { return call('nfc', 'startSession', o || {}, { timeout: 60000 }); },
      stopSession: function () { return call('nfc', 'stopSession', {}); },
      writeText: function (text) { return call('nfc', 'writeText', { text: text }, { timeout: 60000 }); },
      writeUri: function (uri) { return call('nfc', 'writeUri', { uri: uri }, { timeout: 60000 }); },
      getInfo: function () { return call('nfc', 'getInfo', {}); }
    },

    speechToText: {
      initialize: function () { return call('speechToText', 'initialize', {}); },
      startListening: function (o) { return call('speechToText', 'startListening', o || {}, { timeout: 60000 }); },
      stopListening: function () { return call('speechToText', 'stopListening', {}); },
      cancelListening: function () { return call('speechToText', 'cancelListening', {}); },
      isAvailable: function () { return call('speechToText', 'isAvailable', {}); },
      getLocales: function () { return call('speechToText', 'getLocales', {}); },
      getInfo: function () { return call('speechToText', 'getInfo', {}); }
    },

    textToSpeech: {
      speak: function (text, o) { return call('textToSpeech', 'speak', Object.assign({ text: text }, o || {})); },
      stop: function () { return call('textToSpeech', 'stop', {}); },
      pause: function () { return call('textToSpeech', 'pause', {}); },
      setLanguage: function (l) { return call('textToSpeech', 'setLanguage', { language: l }); },
      setSpeechRate: function (r) { return call('textToSpeech', 'setSpeechRate', { rate: r }); },
      setPitch: function (p) { return call('textToSpeech', 'setPitch', { pitch: p }); },
      setVolume: function (v) { return call('textToSpeech', 'setVolume', { volume: v }); },
      getLanguages: function () { return call('textToSpeech', 'getLanguages', {}); },
      getVoices: function () { return call('textToSpeech', 'getVoices', {}); },
      isSpeaking: function () { return call('textToSpeech', 'isSpeaking', {}); },
      getInfo: function () { return call('textToSpeech', 'getInfo', {}); }
    },

    modelManager: {
      // The user may take minutes to pick and move a multi-gigabyte model.
      import: function (o) { return call('modelManager', 'import', o || {}, { timeout: 1800000 }); },
      list: function (kind) { return call('modelManager', 'list', kind ? { kind: kind } : {}); },
      get: function (id) { return call('modelManager', 'get', { id: id }); },
      remove: function (id) { return call('modelManager', 'remove', { id: id }); },
      rename: function (id, name) { return call('modelManager', 'rename', { id: id, name: name }); },
      getInfo: function () { return call('modelManager', 'getInfo', {}); }
    },

    llm: {
      load: function (o) { return call('llm', 'load', o || {}, { timeout: 600000 }); },
      unload: function () { return call('llm', 'unload', {}); },
      // Returns at once; the answer streams as 'llm.token' events, then 'llm.done'.
      chat: function (text, o) { return call('llm', 'chat', Object.assign({ text: text }, o || {})); },
      stop: function () { return call('llm', 'stop', {}); },
      reset: function (o) { return call('llm', 'reset', o || {}); },
      setSystemPrompt: function (text) { return call('llm', 'setSystemPrompt', { text: text }); },
      getHistory: function () { return call('llm', 'getHistory', {}); },
      countTokens: function (text) { return call('llm', 'countTokens', { text: text }); },
      status: function () { return call('llm', 'status', {}); },
      getInfo: function () { return call('llm', 'getInfo', {}); }
    },

    speechOffline: {
      loadRecognizer: function (o) { return call('speechOffline', 'loadRecognizer', o || {}, { timeout: 300000 }); },
      unloadRecognizer: function () { return call('speechOffline', 'unloadRecognizer', {}); },
      startListening: function (o) { return call('speechOffline', 'startListening', o || {}); },
      // Ends the recording and resolves with the recognised text.
      stopListening: function (o) { return call('speechOffline', 'stopListening', o || {}, { timeout: 300000 }); },
      cancelListening: function () { return call('speechOffline', 'cancelListening', {}); },
      transcribeFile: function (path) { return call('speechOffline', 'transcribeFile', { path: path }, { timeout: 300000 }); },
      loadSynthesizer: function (o) { return call('speechOffline', 'loadSynthesizer', o || {}, { timeout: 300000 }); },
      unloadSynthesizer: function () { return call('speechOffline', 'unloadSynthesizer', {}); },
      speak: function (text, o) { return call('speechOffline', 'speak', Object.assign({ text: text }, o || {})); },
      synthesize: function (text, o) { return call('speechOffline', 'synthesize', Object.assign({ text: text }, o || {}), { timeout: 300000 }); },
      stopSpeaking: function () { return call('speechOffline', 'stopSpeaking', {}); },
      setVolume: function (v) { return call('speechOffline', 'setVolume', { volume: v }); },
      status: function () { return call('speechOffline', 'status', {}); },
      getInfo: function () { return call('speechOffline', 'getInfo', {}); }
    },

    videoPlayer: {
      create: function (o) { return call('videoPlayer', 'create', o || {}); },
      play: function (id) { return call('videoPlayer', 'play', { playerId: id }); },
      pause: function (id) { return call('videoPlayer', 'pause', { playerId: id }); },
      seekTo: function (id, ms) { return call('videoPlayer', 'seekTo', { playerId: id, positionMs: ms }); },
      setVolume: function (id, v) { return call('videoPlayer', 'setVolume', { playerId: id, volume: v }); },
      setPlaybackSpeed: function (id, s) { return call('videoPlayer', 'setPlaybackSpeed', { playerId: id, speed: s }); },
      setLooping: function (id, l) { return call('videoPlayer', 'setLooping', { playerId: id, looping: l }); },
      getPosition: function (id) { return call('videoPlayer', 'getPosition', { playerId: id }); },
      getDuration: function (id) { return call('videoPlayer', 'getDuration', { playerId: id }); },
      getState: function (id) { return call('videoPlayer', 'getState', { playerId: id }); },
      dispose: function (id) { return call('videoPlayer', 'dispose', { playerId: id }); },
      disposeAll: function () { return call('videoPlayer', 'disposeAll', {}); },
      getInfo: function () { return call('videoPlayer', 'getInfo', {}); }
    },

    inAppBrowser: {
      open: function (url, o) { return call('inAppBrowser', 'open', Object.assign({ url: url }, o || {}), { timeout: 300000 }); },
      getInfo: function () { return call('inAppBrowser', 'getInfo', {}); }
    },

    pdf: {
      generateFromText: function (text, o) { return call('pdf', 'generateFromText', Object.assign({ text: text }, o || {})); },
      generateFromHtml: function (html, o) { return call('pdf', 'generateFromHtml', Object.assign({ html: html }, o || {})); },
      print: function (o) { return call('pdf', 'print', o || {}); },
      share: function (path) { return call('pdf', 'share', { path: path }); },
      getInfo: function () { return call('pdf', 'getInfo', {}); }
    },

    encryption: {
      aesEncrypt: function (data, key, iv) { return call('encryption', 'aesEncrypt', { data: data, key: key, iv: iv || null }); },
      aesDecrypt: function (data, key, iv) { return call('encryption', 'aesDecrypt', { data: data, key: key, iv: iv }); },
      generateAesKey: function (bits) { return call('encryption', 'generateAesKey', { bits: bits || 256 }); },
      hashSha256: function (data) { return call('encryption', 'hashSha256', { data: data }); },
      hashSha512: function (data) { return call('encryption', 'hashSha512', { data: data }); },
      hashMd5: function (data) { return call('encryption', 'hashMd5', { data: data }); },
      hmacSha256: function (data, key) { return call('encryption', 'hmacSha256', { data: data, key: key }); },
      generateRandomBytes: function (len) { return call('encryption', 'generateRandomBytes', { length: len || 32 }); },
      base64Encode: function (data) { return call('encryption', 'base64Encode', { data: data }); },
      base64Decode: function (data) { return call('encryption', 'base64Decode', { data: data }); },
      getInfo: function () { return call('encryption', 'getInfo', {}); }
    },

    _loader: {
      getStats: function () { return call('_loader', 'getStats', {}); },
      getStatus: function (plugin) { return call('_loader', 'getStatus', { plugin: plugin }); },
      preload: function (plugins) { return call('_loader', 'preload', { plugins: plugins }); },
      unload: function (plugin) { return call('_loader', 'unload', { plugin: plugin }); },
      reload: function (plugin) { return call('_loader', 'reload', { plugin: plugin }); },
      getLoadedPlugins: function () { return call('_loader', 'getLoadedPlugins', {}); },
      getUnloadedPlugins: function () { return call('_loader', 'getUnloadedPlugins', {}); }
    },

    websocket: {
      connect: function (url, options) {
        var o = options || {};
        return call('websocket', 'connect', Object.assign({ url: url }, o), { timeout: 15000 });
      },
      disconnect: function (id, code, reason) {
        return call('websocket', 'disconnect', { id: id, code: code, reason: reason });
      },
      send: function (id, data) {
        return call('websocket', 'send', { id: id, data: data });
      },
      sendJson: function (id, data) {
        return call('websocket', 'sendJson', { id: id, data: data });
      },
      getState: function (id) {
        return call('websocket', 'getState', { id: id });
      },
      getConnections: function () {
        return call('websocket', 'getConnections', {});
      },
      disconnectAll: function () {
        return call('websocket', 'disconnectAll', {});
      },
      getInfo: function () {
        return call('websocket', 'getInfo', {});
      }
    },

    backgroundTask: {
      register: function (taskId, options) {
        var o = options || {};
        return call('backgroundTask', 'register', Object.assign({ taskId: taskId }, o));
      },
      unregister: function (taskId) {
        return call('backgroundTask', 'unregister', { taskId: taskId });
      },
      runOnce: function (taskId, options) {
        var o = options || {};
        return call('backgroundTask', 'runOnce', Object.assign({ taskId: taskId }, o), { timeout: 60000 });
      },
      startRepeating: function (taskId, intervalMs, options) {
        var o = options || {};
        return call('backgroundTask', 'startRepeating', Object.assign({
          taskId: taskId,
          intervalMs: intervalMs
        }, o));
      },
      stop: function (taskId) {
        return call('backgroundTask', 'stop', { taskId: taskId });
      },
      stopAll: function () {
        return call('backgroundTask', 'stopAll', {});
      },
      getTaskState: function (taskId) {
        return call('backgroundTask', 'getTaskState', { taskId: taskId });
      },
      getAllTasks: function () {
        return call('backgroundTask', 'getAllTasks', {});
      },
      getInfo: function () {
        return call('backgroundTask', 'getInfo', {});
      }
    },

    dialog: {
      alert: function (options) {
        var o = typeof options === 'string' ? { message: options } : options || {};
        return call('dialog', 'alert', o);
      },
      confirm: function (options) {
        var o = typeof options === 'string' ? { message: options } : options || {};
        return call('dialog', 'confirm', o);
      },
      prompt: function (options) {
        return call('dialog', 'prompt', options || {});
      },
      getInfo: function () { return call('dialog', 'getInfo', {}); }
    },

    toast: {
      show: function (text, options) {
        var o = options || {};
        return call('toast', 'show', Object.assign({ text: text }, o));
      },
      getInfo: function () { return call('toast', 'getInfo', {}); }
    },

    splashScreen: {
      show: function (options) { return call('splashScreen', 'show', options || {}); },
      hide: function () { return call('splashScreen', 'hide', {}); },
      setAutoHide: function (enabled, delayMs) {
        return call('splashScreen', 'setAutoHide', { enabled: enabled, delayMs: delayMs || 3000 });
      },
      isVisible: function () { return call('splashScreen', 'isVisible', {}); },
      getInfo: function () { return call('splashScreen', 'getInfo', {}); }
    },

    pushNotification: {
      register: function () { return call('pushNotification', 'register', {}); },
      getToken: function () { return call('pushNotification', 'getToken', {}); },
      requestPermission: function () { return call('pushNotification', 'requestPermission', {}); },
      checkPermission: function () { return call('pushNotification', 'checkPermission', {}); },
      getDeliveredNotifications: function () { return call('pushNotification', 'getDeliveredNotifications', {}); },
      removeDeliveredNotifications: function (ids) { return call('pushNotification', 'removeDeliveredNotifications', { ids: ids }); },
      removeAllDeliveredNotifications: function () { return call('pushNotification', 'removeAllDeliveredNotifications', {}); },
      subscribe: function (topic) { return call('pushNotification', 'subscribe', { topic: topic }); },
      unsubscribe: function (topic) { return call('pushNotification', 'unsubscribe', { topic: topic }); },
      getInfo: function () { return call('pushNotification', 'getInfo', {}); }
    },

    wakeLock: {
      enable: function () { return call('wakeLock', 'enable', {}); },
      disable: function () { return call('wakeLock', 'disable', {}); },
      toggle: function () { return call('wakeLock', 'toggle', {}); },
      isEnabled: function () { return call('wakeLock', 'isEnabled', {}); },
      getInfo: function () { return call('wakeLock', 'getInfo', {}); }
    },

    cookieManager: {
      setCookie: function (options) { return call('cookieManager', 'setCookie', options || {}); },
      clearCookies: function () { return call('cookieManager', 'clearCookies', {}); },
      clearSession: function () { return call('cookieManager', 'clearSession', {}); },
      getInfo: function () { return call('cookieManager', 'getInfo', {}); }
    },

    cacheControl: {
      clearWebViewCache: function () { return call('cacheControl', 'clearWebViewCache', {}); },
      clearAppCache: function () { return call('cacheControl', 'clearAppCache', {}); },
      getCacheSize: function () { return call('cacheControl', 'getCacheSize', {}); },
      clearAll: function () { return call('cacheControl', 'clearAll', {}); },
      getInfo: function () { return call('cacheControl', 'getInfo', {}); }
    },

    appUpdate: {
      configure: function (options) { return call('appUpdate', 'configure', options || {}); },
      getCurrentVersion: function () { return call('appUpdate', 'getCurrentVersion', {}); },
      checkForUpdate: function (options) { return call('appUpdate', 'checkForUpdate', options || {}); },
      openStore: function (options) { return call('appUpdate', 'openStore', options || {}); },
      getLastCheckResult: function () { return call('appUpdate', 'getLastCheckResult', {}); },
      getInfo: function () { return call('appUpdate', 'getInfo', {}); }
    },

    filePicker: {
      pickFiles: function (o) { return call('filePicker', 'pickFiles', o || {}); },
      pickImages: function (o) { return call('filePicker', 'pickImages', o || {}); },
      pickVideos: function (o) { return call('filePicker', 'pickVideos', o || {}); },
      pickMedia: function (o) { return call('filePicker', 'pickMedia', o || {}); },
      pickDirectory: function () { return call('filePicker', 'pickDirectory', {}); },
      getInfo: function () { return call('filePicker', 'getInfo', {}); }
    },

    fileOpener: {
      open: function (path, mimeType) { return call('fileOpener', 'open', { path: path, mimeType: mimeType }); },
      canOpen: function (path) { return call('fileOpener', 'canOpen', { path: path }); },
      getMimeType: function (path) { return call('fileOpener', 'getMimeType', { path: path }); },
      getInfo: function () { return call('fileOpener', 'getInfo', {}); }
    },

    sensors: {
      startAccelerometer: function (o) { return call('sensors', 'startAccelerometer', o || {}); },
      stopAccelerometer: function () { return call('sensors', 'stopAccelerometer', {}); },
      startGyroscope: function (o) { return call('sensors', 'startGyroscope', o || {}); },
      stopGyroscope: function () { return call('sensors', 'stopGyroscope', {}); },
      startMagnetometer: function (o) { return call('sensors', 'startMagnetometer', o || {}); },
      stopMagnetometer: function () { return call('sensors', 'stopMagnetometer', {}); },
      startUserAccelerometer: function (o) { return call('sensors', 'startUserAccelerometer', o || {}); },
      stopUserAccelerometer: function () { return call('sensors', 'stopUserAccelerometer', {}); },
      stopAll: function () { return call('sensors', 'stopAll', {}); },
      getActiveStreams: function () { return call('sensors', 'getActiveStreams', {}); },
      getInfo: function () { return call('sensors', 'getInfo', {}); }
    },

    screenBrightness: {
      get: function () { return call('screenBrightness', 'get', {}); },
      set: function (brightness) { return call('screenBrightness', 'set', { brightness: brightness }); },
      reset: function () { return call('screenBrightness', 'reset', {}); },
      getSystem: function () { return call('screenBrightness', 'getSystem', {}); },
      setAutoReset: function (enabled) { return call('screenBrightness', 'setAutoReset', { enabled: enabled }); },
      getInfo: function () { return call('screenBrightness', 'getInfo', {}); }
    },

    flashlight: {
      enable: function () { return call('flashlight', 'enable', {}); },
      disable: function () { return call('flashlight', 'disable', {}); },
      toggle: function () { return call('flashlight', 'toggle', {}); },
      isAvailable: function () { return call('flashlight', 'isAvailable', {}); },
      isEnabled: function () { return call('flashlight', 'isEnabled', {}); },
      getInfo: function () { return call('flashlight', 'getInfo', {}); }
    },

    navigationBar: {
      setColor: function (color, darkIcons) { return call('navigationBar', 'setColor', { color: color, darkIcons: darkIcons || false }); },
      setStyle: function (style) { return call('navigationBar', 'setStyle', { style: style }); },
      show: function () { return call('navigationBar', 'show', {}); },
      hide: function () { return call('navigationBar', 'hide', {}); },
      setTransparent: function () { return call('navigationBar', 'setTransparent', {}); },
      getInfo: function () { return call('navigationBar', 'getInfo', {}); }
    },

    privacyScreen: {
      enable: function () { return call('privacyScreen', 'enable', {}); },
      disable: function () { return call('privacyScreen', 'disable', {}); },
      isEnabled: function () { return call('privacyScreen', 'isEnabled', {}); },
      getInfo: function () { return call('privacyScreen', 'getInfo', {}); }
    },

    nativeSettings: {
      open: function (setting) { return call('nativeSettings', 'open', { setting: setting }); },
      openApp: function () { return call('nativeSettings', 'openApp', {}); },
      openWifi: function () { return call('nativeSettings', 'openWifi', {}); },
      openBluetooth: function () { return call('nativeSettings', 'openBluetooth', {}); },
      openLocation: function () { return call('nativeSettings', 'openLocation', {}); },
      openNotification: function () { return call('nativeSettings', 'openNotification', {}); },
      openBattery: function () { return call('nativeSettings', 'openBattery', {}); },
      openDisplay: function () { return call('nativeSettings', 'openDisplay', {}); },
      openSound: function () { return call('nativeSettings', 'openSound', {}); },
      openSecurity: function () { return call('nativeSettings', 'openSecurity', {}); },
      openDate: function () { return call('nativeSettings', 'openDate', {}); },
      openAccessibility: function () { return call('nativeSettings', 'openAccessibility', {}); },
      openStorage: function () { return call('nativeSettings', 'openStorage', {}); },
      openDeveloper: function () { return call('nativeSettings', 'openDeveloper', {}); },
      openAbout: function () { return call('nativeSettings', 'openAbout', {}); },
      getAvailableSettings: function () { return call('nativeSettings', 'getAvailableSettings', {}); },
      getInfo: function () { return call('nativeSettings', 'getInfo', {}); }
    },

    calendar: {
      getCalendars: function () { return call('calendar', 'getCalendars', {}); },
      getEvents: function (calendarId, o) { return call('calendar', 'getEvents', Object.assign({ calendarId: calendarId }, o || {})); },
      createEvent: function (o) { return call('calendar', 'createEvent', o); },
      deleteEvent: function (calendarId, eventId) { return call('calendar', 'deleteEvent', { calendarId: calendarId, eventId: eventId }); },
      hasPermission: function () { return call('calendar', 'hasPermission', {}); },
      requestPermission: function () { return call('calendar', 'requestPermission', {}); },
      getInfo: function () { return call('calendar', 'getInfo', {}); }
    },

    badge: {
      set: function (count) { return call('badge', 'set', { count: count }); },
      clear: function () { return call('badge', 'clear', {}); },
      increase: function (by) { return call('badge', 'increase', { by: by || 1 }); },
      decrease: function (by) { return call('badge', 'decrease', { by: by || 1 }); },
      get: function () { return call('badge', 'get', {}); },
      isSupported: function () { return call('badge', 'isSupported', {}); },
      getInfo: function () { return call('badge', 'getInfo', {}); }
    },

    foregroundService: {
      start: function (o) { return call('foregroundService', 'start', o || {}); },
      stop: function () { return call('foregroundService', 'stop', {}); },
      update: function (o) { return call('foregroundService', 'update', o || {}); },
      isRunning: function () { return call('foregroundService', 'isRunning', {}); },
      getInfo: function () { return call('foregroundService', 'getInfo', {}); }
    },

    backgroundGeolocation: {
      startTracking: function (o) { return call('backgroundGeolocation', 'startTracking', o || {}); },
      stopTracking: function () { return call('backgroundGeolocation', 'stopTracking', {}); },
      getLastPosition: function () { return call('backgroundGeolocation', 'getLastPosition', {}); },
      getHistory: function (o) { return call('backgroundGeolocation', 'getHistory', o || {}); },
      clearHistory: function () { return call('backgroundGeolocation', 'clearHistory', {}); },
      isTracking: function () { return call('backgroundGeolocation', 'isTracking', {}); },
      getInfo: function () { return call('backgroundGeolocation', 'getInfo', {}); }
    },

    mediaManager: {
      saveImageToGallery: function (path, o) { return call('mediaManager', 'saveImageToGallery', Object.assign({ path: path }, o || {})); },
      saveVideoToGallery: function (path) { return call('mediaManager', 'saveVideoToGallery', { path: path }); },
      saveFileToGallery: function (path) { return call('mediaManager', 'saveFileToGallery', { path: path }); },
      getInfo: function () { return call('mediaManager', 'getInfo', {}); }
    },

    fileCompressor: {
      compressImage: function (path, o) { return call('fileCompressor', 'compressImage', Object.assign({ path: path }, o || {})); },
      compressToWebP: function (path, o) { return call('fileCompressor', 'compressToWebP', Object.assign({ path: path }, o || {})); },
      getInfo: function () { return call('fileCompressor', 'getInfo', {}); }
    },

    zip: {
      zip: function (paths, outputPath) { return call('zip', 'zip', { paths: paths, outputPath: outputPath || null }); },
      unzip: function (path, outputDir) { return call('zip', 'unzip', { path: path, outputDir: outputDir || null }); },
      listContents: function (path) { return call('zip', 'listContents', { path: path }); },
      getInfo: function () { return call('zip', 'getInfo', {}); }
    },

    shareTarget: {
      startListening: function () { return call('shareTarget', 'startListening', {}); },
      stopListening: function () { return call('shareTarget', 'stopListening', {}); },
      getLastShared: function () { return call('shareTarget', 'getLastShared', {}); },
      clearLastShared: function () { return call('shareTarget', 'clearLastShared', {}); },
      getInfo: function () { return call('shareTarget', 'getInfo', {}); }
    },

    inAppReview: {
      isAvailable: function () { return call('inAppReview', 'isAvailable', {}); },
      requestReview: function () { return call('inAppReview', 'requestReview', {}); },
      openStoreListing: function (appStoreId) { return call('inAppReview', 'openStoreListing', { appStoreId: appStoreId }); },
      getInfo: function () { return call('inAppReview', 'getInfo', {}); }
    },

    nativeMarket: {
      openStore: function (packageName) { return call('nativeMarket', 'openStore', { packageName: packageName }); },
      openDeveloperPage: function (developerId) { return call('nativeMarket', 'openDeveloperPage', { developerId: developerId }); },
      openOtherApp: function (packageName) { return call('nativeMarket', 'openOtherApp', { packageName: packageName }); },
      getStoreUrl: function (packageName) { return call('nativeMarket', 'getStoreUrl', { packageName: packageName }); },
      getInfo: function () { return call('nativeMarket', 'getInfo', {}); }
    },

    screenshot: {
      capture: function (o) { return call('screenshot', 'capture', o || {}); },
      getInfo: function () { return call('screenshot', 'getInfo', {}); }
    },

    safeArea: {
      getInsets: function () { return call('safeArea', 'getInsets', {}); },
      getScreenInfo: function () { return call('safeArea', 'getScreenInfo', {}); },
      getInfo: function () { return call('safeArea', 'getInfo', {}); }
    },

    datePicker: {
      pickDate: function (o) { return call('datePicker', 'pickDate', o || {}); },
      pickTime: function (o) { return call('datePicker', 'pickTime', o || {}); },
      pickDateTime: function (o) { return call('datePicker', 'pickDateTime', o || {}); },
      pickDateRange: function (o) { return call('datePicker', 'pickDateRange', o || {}); },
      getInfo: function () { return call('datePicker', 'getInfo', {}); }
    },

    actionSheet: {
      show: function (o) { return call('actionSheet', 'show', o); },
      getInfo: function () { return call('actionSheet', 'getInfo', {}); }
    },

    textZoom: {
      get: function () { return call('textZoom', 'get', {}); },
      set: function (zoom) { return call('textZoom', 'set', { zoom: zoom }); },
      increase: function (step) { return call('textZoom', 'increase', { step: step || 10 }); },
      decrease: function (step) { return call('textZoom', 'decrease', { step: step || 10 }); },
      reset: function () { return call('textZoom', 'reset', {}); },
      getInfo: function () { return call('textZoom', 'getInfo', {}); }
    },

    accessibility: {
      isScreenReaderEnabled: function () { return call('accessibility', 'isScreenReaderEnabled', {}); },
      announce: function (message, assertiveness) { return call('accessibility', 'announce', { message: message, assertiveness: assertiveness || 'polite' }); },
      isBoldTextEnabled: function () { return call('accessibility', 'isBoldTextEnabled', {}); },
      isReduceMotionEnabled: function () { return call('accessibility', 'isReduceMotionEnabled', {}); },
      isHighContrastEnabled: function () { return call('accessibility', 'isHighContrastEnabled', {}); },
      getSettings: function () { return call('accessibility', 'getSettings', {}); },
      getInfo: function () { return call('accessibility', 'getInfo', {}); }
    },

    wifiManager: {
      getConnectionInfo: function () { return call('wifiManager', 'getConnectionInfo', {}); },
      getIpAddress: function () { return call('wifiManager', 'getIpAddress', {}); },
      isEnabled: function () { return call('wifiManager', 'isEnabled', {}); },
      getInfo: function () { return call('wifiManager', 'getInfo', {}); }
    },

    rootDetection: {
      isRooted: function () { return call('rootDetection', 'isRooted', {}); },
      getSecurityInfo: function () { return call('rootDetection', 'getSecurityInfo', {}); },
      getInfo: function () { return call('rootDetection', 'getInfo', {}); }
    },

    appIntegrity: {
      checkIntegrity: function () { return call('appIntegrity', 'checkIntegrity', {}); },
      isGenuineInstall: function () { return call('appIntegrity', 'isGenuineInstall', {}); },
      getInstallSource: function () { return call('appIntegrity', 'getInstallSource', {}); },
      getSigningInfo: function () { return call('appIntegrity', 'getSigningInfo', {}); },
      getInfo: function () { return call('appIntegrity', 'getInfo', {}); }
    },

    alarm: {
      set: function (o) { return call('alarm', 'set', o); },
      cancel: function (alarmId) { return call('alarm', 'cancel', { alarmId: alarmId }); },
      cancelAll: function () { return call('alarm', 'cancelAll', {}); },
      getAlarm: function (alarmId) { return call('alarm', 'getAlarm', { alarmId: alarmId }); },
      getAllAlarms: function () { return call('alarm', 'getAllAlarms', {}); },
      getInfo: function () { return call('alarm', 'getInfo', {}); }
    },

    pedometer: {
      startTracking: function () { return call('pedometer', 'startTracking', {}); },
      stopTracking: function () { return call('pedometer', 'stopTracking', {}); },
      getStepCount: function () { return call('pedometer', 'getStepCount', {}); },
      getStatus: function () { return call('pedometer', 'getStatus', {}); },
      isTracking: function () { return call('pedometer', 'isTracking', {}); },
      getInfo: function () { return call('pedometer', 'getInfo', {}); }
    },

    shakeDetection: {
      startListening: function (o) { return call('shakeDetection', 'startListening', o || {}); },
      stopListening: function () { return call('shakeDetection', 'stopListening', {}); },
      configure: function (o) { return call('shakeDetection', 'configure', o || {}); },
      getShakeCount: function () { return call('shakeDetection', 'getShakeCount', {}); },
      resetCount: function () { return call('shakeDetection', 'resetCount', {}); },
      isListening: function () { return call('shakeDetection', 'isListening', {}); },
      getInfo: function () { return call('shakeDetection', 'getInfo', {}); }
    },

    volumeButtons: {
      startListening: function () { return call('volumeButtons', 'startListening', {}); },
      stopListening: function () { return call('volumeButtons', 'stopListening', {}); },
      isListening: function () { return call('volumeButtons', 'isListening', {}); },
      getInfo: function () { return call('volumeButtons', 'getInfo', {}); }
    },

    simInfo: {
      getSimInfo: function () { return call('simInfo', 'getSimInfo', {}); },
      getCarrierName: function () { return call('simInfo', 'getCarrierName', {}); },
      getSimCount: function () { return call('simInfo', 'getSimCount', {}); },
      getInfo: function () { return call('simInfo', 'getInfo', {}); }
    },

    kioskMode: {
      enable: function () { return call('kioskMode', 'enable', {}); },
      disable: function () { return call('kioskMode', 'disable', {}); },
      isEnabled: function () { return call('kioskMode', 'isEnabled', {}); },
      getInfo: function () { return call('kioskMode', 'getInfo', {}); }
    },

    intentLauncher: {
      launch: function (intent) { return call('intentLauncher', 'launch', { intent: intent }); },
      launchUrl: function (url, mode) { return call('intentLauncher', 'launchUrl', { url: url, mode: mode || 'external' }); },
      isAppInstalled: function (packageName) { return call('intentLauncher', 'isAppInstalled', { packageName: packageName }); },
      getInfo: function () { return call('intentLauncher', 'getInfo', {}); }
    },

    emailComposer: {
      compose: function (o) { return call('emailComposer', 'compose', o); },
      canCompose: function () { return call('emailComposer', 'canCompose', {}); },
      getInfo: function () { return call('emailComposer', 'getInfo', {}); }
    },

    // Firebase Analytics
    firebaseAnalytics: {
      logEvent: function (name, parameters) { return call('firebaseAnalytics', 'logEvent', { name: name, parameters: parameters || {} }); },
      setUserId: function (id) { return call('firebaseAnalytics', 'setUserId', { id: id }); },
      setUserProperty: function (name, value) { return call('firebaseAnalytics', 'setUserProperty', { name: name, value: value }); },
      setCurrentScreen: function (screenName, screenClass) { return call('firebaseAnalytics', 'setCurrentScreen', { screenName: screenName, screenClass: screenClass }); },
      logLogin: function (method) { return call('firebaseAnalytics', 'logLogin', { method: method || 'email' }); },
      logSignUp: function (method) { return call('firebaseAnalytics', 'logSignUp', { method: method || 'email' }); },
      logSearch: function (term) { return call('firebaseAnalytics', 'logSearch', { searchTerm: term }); },
      logPurchase: function (o) { return call('firebaseAnalytics', 'logPurchase', o || {}); },
      logViewItem: function (o) { return call('firebaseAnalytics', 'logViewItem', o || {}); },
      logAddToCart: function (o) { return call('firebaseAnalytics', 'logAddToCart', o || {}); },
      setAnalyticsCollectionEnabled: function (enabled) { return call('firebaseAnalytics', 'setAnalyticsCollectionEnabled', { enabled: enabled }); },
      resetAnalyticsData: function () { return call('firebaseAnalytics', 'resetAnalyticsData', {}); },
      getAppInstanceId: function () { return call('firebaseAnalytics', 'getAppInstanceId', {}); },
      getInfo: function () { return call('firebaseAnalytics', 'getInfo', {}); }
    },

    // Firebase Crashlytics
    firebaseCrashlytics: {
      recordError: function (message, type, options) { return call('firebaseCrashlytics', 'recordError', Object.assign({ message: message, type: type || 'Error' }, options || {})); },
      log: function (message) { return call('firebaseCrashlytics', 'log', { message: message }); },
      setUserId: function (id) { return call('firebaseCrashlytics', 'setUserId', { id: id }); },
      setCustomKey: function (key, value) { return call('firebaseCrashlytics', 'setCustomKey', { key: key, value: value }); },
      setCustomKeys: function (keys) { return call('firebaseCrashlytics', 'setCustomKeys', { keys: keys }); },
      sendUnsentReports: function () { return call('firebaseCrashlytics', 'sendUnsentReports', {}); },
      setCrashlyticsCollectionEnabled: function (enabled) { return call('firebaseCrashlytics', 'setCrashlyticsCollectionEnabled', { enabled: enabled }); },
      getInfo: function () { return call('firebaseCrashlytics', 'getInfo', {}); }
    },

    // Firebase Remote Config
    firebaseRemoteConfig: {
      initialize: function (o) { return call('firebaseRemoteConfig', 'initialize', o || {}); },
      fetchAndActivate: function () { return call('firebaseRemoteConfig', 'fetchAndActivate', {}); },
      fetch: function (o) { return call('firebaseRemoteConfig', 'fetch', o || {}); },
      activate: function () { return call('firebaseRemoteConfig', 'activate', {}); },
      getString: function (key) { return call('firebaseRemoteConfig', 'getString', { key: key }); },
      getInt: function (key) { return call('firebaseRemoteConfig', 'getInt', { key: key }); },
      getDouble: function (key) { return call('firebaseRemoteConfig', 'getDouble', { key: key }); },
      getBool: function (key) { return call('firebaseRemoteConfig', 'getBool', { key: key }); },
      getJson: function (key) { return call('firebaseRemoteConfig', 'getJson', { key: key }); },
      getAll: function () { return call('firebaseRemoteConfig', 'getAll', {}); },
      setDefaults: function (defaults) { return call('firebaseRemoteConfig', 'setDefaults', { defaults: defaults }); },
      getLastFetchStatus: function () { return call('firebaseRemoteConfig', 'getLastFetchStatus', {}); },
      getInfo: function () { return call('firebaseRemoteConfig', 'getInfo', {}); }
    },

    // Firebase Auth
    firebaseAuth: {
      getCurrentUser: function () { return call('firebaseAuth', 'getCurrentUser', {}); },
      signInWithEmail: function (email, password) { return call('firebaseAuth', 'signInWithEmail', { email: email, password: password }); },
      signUpWithEmail: function (email, password, displayName) { return call('firebaseAuth', 'signUpWithEmail', { email: email, password: password, displayName: displayName }); },
      signInWithGoogle: function () { return call('firebaseAuth', 'signInWithGoogle', {}); },
      signInAnonymously: function () { return call('firebaseAuth', 'signInAnonymously', {}); },
      signOut: function () { return call('firebaseAuth', 'signOut', {}); },
      sendPasswordResetEmail: function (email) { return call('firebaseAuth', 'sendPasswordResetEmail', { email: email }); },
      updatePassword: function (newPassword) { return call('firebaseAuth', 'updatePassword', { newPassword: newPassword }); },
      updateProfile: function (o) { return call('firebaseAuth', 'updateProfile', o || {}); },
      deleteAccount: function () { return call('firebaseAuth', 'deleteAccount', {}); },
      sendEmailVerification: function () { return call('firebaseAuth', 'sendEmailVerification', {}); },
      getIdToken: function (forceRefresh) { return call('firebaseAuth', 'getIdToken', { forceRefresh: !!forceRefresh }); },
      isSignedIn: function () { return call('firebaseAuth', 'isSignedIn', {}); },
      getInfo: function () { return call('firebaseAuth', 'getInfo', {}); }
    },

    cameraPreview: {
      start: function (o) { return call('cameraPreview', 'start', o || {}); },
      stop: function () { return call('cameraPreview', 'stop', {}); },
      takePhoto: function (o) { return call('cameraPreview', 'takePhoto', o || {}); },
      startRecording: function (o) { return call('cameraPreview', 'startRecording', o || {}); },
      stopRecording: function () { return call('cameraPreview', 'stopRecording', {}); },
      switchCamera: function () { return call('cameraPreview', 'switchCamera', {}); },
      setFlashMode: function (mode) { return call('cameraPreview', 'setFlashMode', { mode: mode }); },
      setZoomLevel: function (zoom) { return call('cameraPreview', 'setZoomLevel', { zoom: zoom }); },
      getMinZoomLevel: function () { return call('cameraPreview', 'getMinZoomLevel', {}); },
      getMaxZoomLevel: function () { return call('cameraPreview', 'getMaxZoomLevel', {}); },
      setFocusPoint: function (x, y) { return call('cameraPreview', 'setFocusPoint', { x: x, y: y }); },
      getAvailableCameras: function () { return call('cameraPreview', 'getAvailableCameras', {}); },
      getState: function () { return call('cameraPreview', 'getState', {}); },
      getInfo: function () { return call('cameraPreview', 'getInfo', {}); }
    },

    documentScanner: {
      scan: function (o) { return call('documentScanner', 'scan', o || {}, { timeout: 120000 }); },
      getInfo: function () { return call('documentScanner', 'getInfo', {}); }
    },

    googleMaps: {
      configure: function (apiKey) { return call('googleMaps', 'configure', { apiKey: apiKey }); },
      geocode: function (address) { return call('googleMaps', 'geocode', { address: address }); },
      reverseGeocode: function (lat, lng) { return call('googleMaps', 'reverseGeocode', { latitude: lat, longitude: lng }); },
      getDirections: function (origin, destination, mode) { return call('googleMaps', 'getDirections', { origin: origin, destination: destination, mode: mode || 'driving' }); },
      searchPlaces: function (query, o) { return call('googleMaps', 'searchPlaces', Object.assign({ query: query }, o || {})); },
      getPlaceDetails: function (placeId) { return call('googleMaps', 'getPlaceDetails', { placeId: placeId }); },
      calculateDistance: function (lat1, lng1, lat2, lng2) { return call('googleMaps', 'calculateDistance', { lat1: lat1, lng1: lng1, lat2: lat2, lng2: lng2 }); },
      getStaticMapUrl: function (lat, lng, o) { return call('googleMaps', 'getStaticMapUrl', Object.assign({ latitude: lat, longitude: lng }, o || {})); },
      getInfo: function () { return call('googleMaps', 'getInfo', {}); }
    },

    socialLogin: {
      signInWithGoogle: function () { return call('socialLogin', 'signInWithGoogle', {}, { timeout: 60000 }); },
      signInWithPhone: function (phoneNumber) { return call('socialLogin', 'signInWithPhone', { phoneNumber: phoneNumber }, { timeout: 120000 }); },
      verifyPhoneCode: function (code, verificationId) { return call('socialLogin', 'verifyPhoneCode', { code: code, verificationId: verificationId }); },
      signInAnonymously: function () { return call('socialLogin', 'signInAnonymously', {}); },
      linkWithGoogle: function () { return call('socialLogin', 'linkWithGoogle', {}, { timeout: 60000 }); },
      signOut: function () { return call('socialLogin', 'signOut', {}); },
      getCurrentUser: function () { return call('socialLogin', 'getCurrentUser', {}); },
      isSignedIn: function () { return call('socialLogin', 'isSignedIn', {}); },
      getProviders: function () { return call('socialLogin', 'getProviders', {}); },
      getInfo: function () { return call('socialLogin', 'getInfo', {}); }
    },

    inAppPurchase: {
      isAvailable: function () { return call('inAppPurchase', 'isAvailable', {}); },
      getProducts: function (productIds) { return call('inAppPurchase', 'getProducts', { productIds: productIds }); },
      buyProduct: function (productId) { return call('inAppPurchase', 'buyProduct', { productId: productId }, { timeout: 120000 }); },
      buySubscription: function (productId) { return call('inAppPurchase', 'buySubscription', { productId: productId }, { timeout: 120000 }); },
      restorePurchases: function () { return call('inAppPurchase', 'restorePurchases', {}); },
      getInfo: function () { return call('inAppPurchase', 'getInfo', {}); }
    },

    oauth2: {
      authorize: function (o) { return call('oauth2', 'authorize', o, { timeout: 120000 }); },
      exchangeCode: function (o) { return call('oauth2', 'exchangeCode', o); },
      refreshToken: function (o) { return call('oauth2', 'refreshToken', o); },
      getInfo: function () { return call('oauth2', 'getInfo', {}); }
    },

    liveUpdater: {
      configure: function (o) { return call('liveUpdater', 'configure', o); },
      checkForUpdate: function () { return call('liveUpdater', 'checkForUpdate', {}); },
      downloadUpdate: function () { return call('liveUpdater', 'downloadUpdate', {}, { timeout: 300000 }); },
      applyUpdate: function () { return call('liveUpdater', 'applyUpdate', {}); },
      checkAndApply: function (o) { return call('liveUpdater', 'checkAndApply', o || {}, { timeout: 300000 }); },
      rollback: function () { return call('liveUpdater', 'rollback', {}); },
      getCurrentVersion: function () { return call('liveUpdater', 'getCurrentVersion', {}); },
      getAvailableUpdate: function () { return call('liveUpdater', 'getAvailableUpdate', {}); },
      getStatus: function () { return call('liveUpdater', 'getStatus', {}); },
      getUpdateHistory: function () { return call('liveUpdater', 'getUpdateHistory', {}); },
      reset: function () { return call('liveUpdater', 'reset', {}); },
      setChannel: function (channel) { return call('liveUpdater', 'setChannel', { channel: channel }); },
      getInfo: function () { return call('liveUpdater', 'getInfo', {}); }
    },

    httpServer: {
      start: function (o) { return call('httpServer', 'start', o || {}); },
      stop: function (id) { return call('httpServer', 'stop', { id: id }); },
      stopAll: function () { return call('httpServer', 'stopAll', {}); },
      addRoute: function (serverId, method, path, response) {
        return call('httpServer', 'addRoute', { serverId: serverId, method: method, path: path, response: response });
      },
      removeRoute: function (serverId, path) { return call('httpServer', 'removeRoute', { serverId: serverId, path: path }); },
      serveDirectory: function (serverId, directory) { return call('httpServer', 'serveDirectory', { serverId: serverId, directory: directory }); },
      getServers: function () { return call('httpServer', 'getServers', {}); },
      getInfo: function () { return call('httpServer', 'getInfo', {}); }
    },

    socket: {
      tcpConnect: function (host, port, o) { return call('socket', 'tcpConnect', Object.assign({ host: host, port: port }, o || {})); },
      tcpSend: function (id, data, encoding) { return call('socket', 'tcpSend', { id: id, data: data, encoding: encoding }); },
      tcpClose: function (id) { return call('socket', 'tcpClose', { id: id }); },
      tcpStartServer: function (o) { return call('socket', 'tcpStartServer', o || {}); },
      tcpStopServer: function () { return call('socket', 'tcpStopServer', {}); },
      udpBind: function (o) { return call('socket', 'udpBind', o || {}); },
      udpSend: function (id, data, host, port) { return call('socket', 'udpSend', { id: id, data: data, host: host, port: port }); },
      udpBroadcast: function (id, data, port) { return call('socket', 'udpBroadcast', { id: id, data: data, port: port }); },
      udpClose: function (id) { return call('socket', 'udpClose', { id: id }); },
      getConnections: function () { return call('socket', 'getConnections', {}); },
      closeAll: function () { return call('socket', 'closeAll', {}); },
      getInfo: function () { return call('socket', 'getInfo', {}); }
    },

    networkInfo: {
      getInterfaces: function () { return call('networkInfo', 'getInterfaces', {}); },
      getIpAddresses: function () { return call('networkInfo', 'getIpAddresses', {}); },
      getLocalIp: function () { return call('networkInfo', 'getLocalIp', {}); },
      getExternalIp: function () { return call('networkInfo', 'getExternalIp', {}); },
      getGateway: function () { return call('networkInfo', 'getGateway', {}); },
      isPortOpen: function (host, port) { return call('networkInfo', 'isPortOpen', { host: host, port: port }); },
      getHostname: function () { return call('networkInfo', 'getHostname', {}); },
      getInfo: function () { return call('networkInfo', 'getInfo', {}); }
    },

    pingDns: {
      ping: function (host, o) { return call('pingDns', 'ping', Object.assign({ host: host }, o || {}), { timeout: 30000 }); },
      dnsLookup: function (host) { return call('pingDns', 'dnsLookup', { host: host }); },
      reverseDns: function (ip) { return call('pingDns', 'reverseDns', { ip: ip }); },
      traceroute: function (host, o) { return call('pingDns', 'traceroute', Object.assign({ host: host }, o || {}), { timeout: 60000 }); },
      isReachable: function (host, port) { return call('pingDns', 'isReachable', { host: host, port: port || 80 }); },
      getInfo: function () { return call('pingDns', 'getInfo', {}); }
    },

    websocketServer: {
      start: function (o) { return call('websocketServer', 'start', o || {}); },
      stop: function () { return call('websocketServer', 'stop', {}); },
      sendToClient: function (clientId, data) { return call('websocketServer', 'sendToClient', { clientId: clientId, data: data }); },
      sendToAll: function (data, exclude) { return call('websocketServer', 'sendToAll', { data: data, exclude: exclude }); },
      disconnectClient: function (clientId) { return call('websocketServer', 'disconnectClient', { clientId: clientId }); },
      getClients: function () { return call('websocketServer', 'getClients', {}); },
      getInfo: function () { return call('websocketServer', 'getInfo', {}); }
    },

    ftpClient: {
      connect: function (host, o) { return call('ftpClient', 'connect', Object.assign({ host: host }, o || {})); },
      disconnect: function () { return call('ftpClient', 'disconnect', {}); },
      login: function (username, password) { return call('ftpClient', 'login', { username: username, password: password }); },
      listFiles: function (path) { return call('ftpClient', 'listFiles', { path: path || '.' }); },
      downloadFile: function (remotePath, localPath) { return call('ftpClient', 'downloadFile', { remotePath: remotePath, localPath: localPath }); },
      uploadFile: function (localPath, remotePath) { return call('ftpClient', 'uploadFile', { localPath: localPath, remotePath: remotePath }); },
      deleteFile: function (path) { return call('ftpClient', 'deleteFile', { path: path }); },
      makeDirectory: function (path) { return call('ftpClient', 'makeDirectory', { path: path }); },
      removeDirectory: function (path) { return call('ftpClient', 'removeDirectory', { path: path }); },
      getCurrentDirectory: function () { return call('ftpClient', 'getCurrentDirectory', {}); },
      changeDirectory: function (path) { return call('ftpClient', 'changeDirectory', { path: path }); },
      getInfo: function () { return call('ftpClient', 'getInfo', {}); }
    },

    sshClient: {
      connect: function (host, username, o) { return call('sshClient', 'connect', Object.assign({ host: host, username: username }, o || {})); },
      disconnect: function (id) { return call('sshClient', 'disconnect', { id: id }); },
      execute: function (id, command) { return call('sshClient', 'execute', { id: id, command: command }); },
      upload: function (id, localPath, remotePath) { return call('sshClient', 'upload', { id: id, localPath: localPath, remotePath: remotePath }); },
      download: function (id, remotePath, localPath) { return call('sshClient', 'download', { id: id, remotePath: remotePath, localPath: localPath }); },
      getConnections: function () { return call('sshClient', 'getConnections', {}); },
      disconnectAll: function () { return call('sshClient', 'disconnectAll', {}); },
      getInfo: function () { return call('sshClient', 'getInfo', {}); }
    },

    wifiAdvanced: {
      scan: function () { return call('wifiAdvanced', 'scan', {}); },
      getConnectionInfo: function () { return call('wifiAdvanced', 'getConnectionInfo', {}); },
      getIpConfig: function () { return call('wifiAdvanced', 'getIpConfig', {}); },
      getSignalStrength: function () { return call('wifiAdvanced', 'getSignalStrength', {}); },
      getDhcpInfo: function () { return call('wifiAdvanced', 'getDhcpInfo', {}); },
      getFrequency: function () { return call('wifiAdvanced', 'getFrequency', {}); },
      isWifiEnabled: function () { return call('wifiAdvanced', 'isWifiEnabled', {}); },
      getInfo: function () { return call('wifiAdvanced', 'getInfo', {}); }
    },

    udpServer: {
      start: function (o) { return call('udpServer', 'start', o || {}); },
      stop: function (id) { return call('udpServer', 'stop', { id: id }); },
      stopAll: function () { return call('udpServer', 'stopAll', {}); },
      sendTo: function (serverId, data, host, port) { return call('udpServer', 'sendTo', { serverId: serverId, data: data, host: host, port: port }); },
      broadcast: function (serverId, data, port) { return call('udpServer', 'broadcast', { serverId: serverId, data: data, port: port }); },
      getServers: function () { return call('udpServer', 'getServers', {}); },
      getStats: function (serverId) { return call('udpServer', 'getStats', { serverId: serverId }); },
      getInfo: function () { return call('udpServer', 'getInfo', {}); }
    },

    tcpServer: {
      start: function (o) { return call('tcpServer', 'start', o || {}); },
      stop: function (id) { return call('tcpServer', 'stop', { id: id }); },
      stopAll: function () { return call('tcpServer', 'stopAll', {}); },
      sendToClient: function (serverId, clientId, data) { return call('tcpServer', 'sendToClient', { serverId: serverId, clientId: clientId, data: data }); },
      sendToAll: function (serverId, data, exclude) { return call('tcpServer', 'sendToAll', { serverId: serverId, data: data, exclude: exclude }); },
      disconnectClient: function (serverId, clientId) { return call('tcpServer', 'disconnectClient', { serverId: serverId, clientId: clientId }); },
      getClients: function (serverId) { return call('tcpServer', 'getClients', { serverId: serverId }); },
      getServers: function () { return call('tcpServer', 'getServers', {}); },
      getInfo: function () { return call('tcpServer', 'getInfo', {}); }
    },

    ftpServer: {
      start: function (rootDir, o) { return call('ftpServer', 'start', Object.assign({ rootDir: rootDir }, o || {})); },
      stop: function () { return call('ftpServer', 'stop', {}); },
      configure: function (o) { return call('ftpServer', 'configure', o || {}); },
      getClients: function () { return call('ftpServer', 'getClients', {}); },
      disconnectClient: function (sessionId) { return call('ftpServer', 'disconnectClient', { sessionId: sessionId }); },
      getStats: function () { return call('ftpServer', 'getStats', {}); },
      getInfo: function () { return call('ftpServer', 'getInfo', {}); }
    },

    sshServer: {
      start: function (o) { return call('sshServer', 'start', o || {}); },
      stop: function () { return call('sshServer', 'stop', {}); },
      configure: function (o) { return call('sshServer', 'configure', o || {}); },
      addAllowedCommand: function (cmd) { return call('sshServer', 'addAllowedCommand', { command: cmd }); },
      addBlockedCommand: function (cmd) { return call('sshServer', 'addBlockedCommand', { command: cmd }); },
      getClients: function () { return call('sshServer', 'getClients', {}); },
      disconnectClient: function (sessionId) { return call('sshServer', 'disconnectClient', { sessionId: sessionId }); },
      getCommandLog: function (sessionId) { return call('sshServer', 'getCommandLog', { sessionId: sessionId }); },
      getInfo: function () { return call('sshServer', 'getInfo', {}); }
    },

  };

  global.NativeSDK = sdk;
})(window);
