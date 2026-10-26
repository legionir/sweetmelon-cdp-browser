(function () {
  'use strict';

  var FIELDS = ['tunnelUrl', 'authToken', 'serverId', 'sshUser', 'sshPassword',
                'remotePort', 'gatewayToken', 'sshPrivateKey'];
  var KEY = 'cdp_browser_settings';
  var form = document.getElementById('form');
  var statusEl = document.getElementById('status');
  var btn = document.getElementById('btnConnect');
  var frame = document.getElementById('frame');
  var dot = document.getElementById('dot');
  var barText = document.getElementById('barText');
  var localUrl = null;

  var LABELS = {
    connecting: 'در حال اتصال…', connected: 'متصل', reconnecting: 'اتصال مجدد…',
    failed: 'ناموفق', idle: 'قطع'
  };

  function setStatus(text, isError) {
    statusEl.textContent = text || '';
    statusEl.classList.toggle('error', !!isError);
  }

  function show(connected) {
    document.getElementById('setup').hidden = connected;
    document.getElementById('browser').hidden = !connected;
  }

  function readForm() {
    var v = {};
    FIELDS.forEach(function (f) {
      var el = form.elements[f];
      if (!el) return;
      v[f] = f === 'remotePort' ? Number(el.value) || 3000 : el.value;
    });
    return v;
  }

  function fillForm(values) {
    FIELDS.forEach(function (f) {
      var el = form.elements[f];
      if (el && values && values[f] != null) el.value = values[f];
    });
  }

  function load() {
    return NativeSDK.secureStorage.get(KEY).then(function (r) {
      var raw = r && (r.value != null ? r.value : r);
      if (typeof raw === 'string' && raw) fillForm(JSON.parse(raw));
    }).catch(function () {});
  }

  function save(values) {
    return NativeSDK.secureStorage.set(KEY, JSON.stringify(values)).catch(function () {});
  }

  function unwrap(r) { return r && r.data ? r.data : r; }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var values = readForm();
    btn.disabled = true;
    setStatus('در حال اتصال به تونل و SSH…');
    var remember = form.elements.remember.checked;
    (remember ? save(values) : NativeSDK.secureStorage.remove(KEY).catch(function () {}))
      .then(function () {
        return NativeSDK.call('cdpTunnel', 'connect', values, { timeout: 90000 });
      })
      .then(function (res) {
        res = unwrap(res);
        if (res.state === 'connected' && res.localUrl) {
          localUrl = res.localUrl;
          frame.src = localUrl;
          setBar('connected');
          show(true);
          setStatus('');
        } else {
          setStatus(res.error || 'اتصال برقرار نشد', true);
        }
      })
      .catch(function (e) { setStatus(String((e && e.message) || e), true); })
      .then(function () { btn.disabled = false; });
  });

  function setBar(state) {
    dot.className = 'dot' + (state === 'connected' ? ' ok' : state === 'failed' ? ' bad' : '');
    barText.textContent = LABELS[state] || state;
  }

  document.getElementById('btnDisconnect').addEventListener('click', function () {
    frame.src = 'about:blank';
    NativeSDK.call('cdpTunnel', 'disconnect', {}).catch(function () {}).then(function () {
      localUrl = null;
      show(false);
      setStatus('اتصال قطع شد.');
    });
  });

  document.getElementById('btnReload').addEventListener('click', function () {
    if (localUrl) frame.src = localUrl;
  });

  function start() {
    NativeSDK.on('cdpTunnel.state', function (data) {
      data = unwrap(data) || {};
      setBar(data.state);
      // After a drop the forwarder recovers by itself; reload once it is back.
      if (data.state === 'connected' && localUrl && !document.getElementById('browser').hidden) {
        frame.src = localUrl;
      }
    });
    load();
  }

  if (window.NativeSDK && NativeSDK.waitForReady) {
    NativeSDK.waitForReady(15000).then(start).catch(function () {
      setStatus('پل نیتیو آماده نشد.', true);
    });
  } else {
    setStatus('NativeSDK در دسترس نیست.', true);
  }
})();
