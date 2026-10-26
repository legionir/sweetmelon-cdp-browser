import 'dart:async';

import 'package:sweetmelon/packages/core/lib/core.dart';
import 'package:sweetmelon/packages/plugin_engine/lib/plugin_engine.dart';

import '../tunnel/cdp_forwarder.dart';
import '../tunnel/tunnel_config.dart';

typedef CdpEventEmitter = Future<void> Function(String event, dynamic data);

/// Bridge plugin: `NativeSDK`-style calls `cdpTunnel.connect/disconnect/status`.
///
/// Events: `cdpTunnel.state` with `{state, localUrl, error}`.
class CdpTunnelPlugin extends Plugin {
  final CdpEventEmitter? eventEmitter;

  CdpTunnelPlugin({this.eventEmitter});

  CdpForwarder? _forwarder;
  String? _lastError;

  @override
  String get name => 'cdpTunnel';

  @override
  String get version => '1.0.0';

  @override
  String get description =>
      'Reaches a remote cdp-browser-emulator through ws-cf-tunnel and an SSH port forward';

  @override
  List<String> get supportedMethods => ['connect', 'disconnect', 'status'];

  @override
  Future<void> onDispose() => _stop();

  @override
  Future<dynamic> onCall(String method, Map<String, dynamic> args) async {
    switch (method) {
      case 'connect':
        return _connect(args);
      case 'disconnect':
        await _stop();
        return status();
      case 'status':
        return status();
      default:
        throw UnsupportedError('Method "$method" not supported');
    }
  }

  Map<String, dynamic> status() => {
        'state': (_forwarder?.state ?? ForwarderState.idle).name,
        'localUrl': _forwarder?.localUrl,
        'error': _lastError,
      };

  Future<Map<String, dynamic>> _connect(Map<String, dynamic> args) async {
    final config = TunnelConfig.fromArgs(args);
    final problem = config.validate();
    if (problem != null) return {'state': 'failed', 'localUrl': null, 'error': problem};

    await _stop();
    _lastError = null;
    final forwarder = CdpForwarder(config, onState: (s, {error}) {
      _lastError = error;
      // Never put the gateway token into events; localUrl only goes to the caller.
      eventEmitter?.call('cdpTunnel.state', {'state': s.name, 'error': error});
    });
    _forwarder = forwarder;
    try {
      await forwarder.start();
    } catch (e) {
      _lastError ??= e.toString();
      await forwarder.stop();
      _forwarder = null;
      BridgeLogger.error('CdpTunnel', 'connect failed: $_lastError');
      return {'state': 'failed', 'localUrl': null, 'error': _lastError};
    }
    BridgeLogger.info('CdpTunnel', 'forwarding 127.0.0.1:${forwarder.localPort}');
    return status();
  }

  Future<void> _stop() async {
    final f = _forwarder;
    _forwarder = null;
    await f?.stop();
  }
}
