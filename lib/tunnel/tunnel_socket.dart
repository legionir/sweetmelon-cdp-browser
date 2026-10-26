import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:dartssh2/dartssh2.dart';

import 'tunnel_config.dart';

/// Raised when the hub refuses or drops a tunnel connection.
class TunnelException implements Exception {
  final String message;
  const TunnelException(this.message);

  @override
  String toString() => 'TunnelException: $message';
}

/// Client side of the ws-cf-tunnel `/connect` protocol as an [SSHSocket].
///
/// Wire format (see ws-cf-tunnel `Client/ssh-proxycommand.js`): binary
/// messages are opaque bytes in both directions, the text message `fin`
/// means "I will send no more", and a WebSocket close ends the stream.
class TunnelSocket implements SSHSocket {
  static final Random _rng = Random.secure();

  final WebSocket _ws;
  final StreamController<Uint8List> _in = StreamController<Uint8List>();
  final StreamController<List<int>> _out = StreamController<List<int>>();
  final Completer<void> _done = Completer<void>();
  bool _closed = false;
  late final Future<void> _sent; // completes once the outgoing stream is flushed

  TunnelSocket._(this._ws) {
    _ws.listen(
      (data) {
        if (data is String) {
          if (data == 'fin' && !_in.isClosed) _in.close();
        } else if (data is List<int> && !_in.isClosed) {
          _in.add(data is Uint8List ? data : Uint8List.fromList(data));
        }
      },
      onError: (Object e) => _finish(TunnelException('tunnel error: $e')),
      onDone: () => _finish(_closeError(_ws.closeCode, _ws.closeReason)),
      cancelOnError: true,
    );
    // addStream gives backpressure: the next chunk waits for the previous one.
    _sent = _ws.addStream(_out.stream).then((_) {
      if (_ws.readyState == WebSocket.open) _ws.add('fin');
    }, onError: (_) {});
  }

  /// Opens the tunnel to [config.serverId]. Throws [TunnelException] with a
  /// readable reason when the hub refuses.
  static Future<TunnelSocket> connect(
    TunnelConfig config, {
    Duration timeout = const Duration(seconds: 20),
  }) async {
    final client = HttpClient()..connectionTimeout = timeout;
    try {
      // Manual upgrade instead of WebSocket.connect: dart:io hides the HTTP
      // status of a refused upgrade, and the hub's 403/503 are what the user
      // needs to see.
      final uri = config.connectUri.replace(scheme: config.connectUri.scheme == 'wss' ? 'https' : 'http');
      final request = await client.getUrl(uri).timeout(timeout);
      final key = base64.encode(List<int>.generate(16, (_) => _rng.nextInt(256)));
      request.headers
        ..set('Connection', 'Upgrade')
        ..set('Upgrade', 'websocket')
        ..set('Sec-WebSocket-Version', '13')
        ..set('Sec-WebSocket-Key', key)
        ..set('Authorization', 'Bearer ${config.authToken}')
        ..set('X-Server-ID', config.serverId);
      final response = await request.close().timeout(timeout);
      if (response.statusCode != HttpStatus.switchingProtocols) {
        await response.drain<void>().catchError((_) {});
        throw TunnelException(_refusal(response.statusCode));
      }
      final accept = base64.encode(sha1.convert(utf8.encode('${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11')).bytes);
      if (response.headers.value('sec-websocket-accept') != accept) {
        throw const TunnelException('tunnel hub sent an invalid WebSocket handshake');
      }
      final socket = await response.detachSocket();
      return TunnelSocket._(WebSocket.fromUpgradedSocket(socket, serverSide: false));
    } on TimeoutException {
      throw const TunnelException('timed out reaching the tunnel hub');
    } on SocketException catch (e) {
      throw TunnelException('cannot reach the tunnel hub: ${e.message}');
    } on HandshakeException catch (e) {
      throw TunnelException('TLS error talking to the hub: ${e.message}');
    } finally {
      client.close();
    }
  }

  static const _reasons = {
    '400': 'bad server id',
    '403': 'token rejected (check authToken)',
    '404': 'not found (check tunnelUrl)',
    '429': 'too many sessions',
    '503': 'server is offline (the tunnel agent is not registered)',
  };

  static String _refusal(int status) =>
      'tunnel refused: HTTP $status - ${_reasons['$status'] ?? 'unexpected response'}';

  static TunnelException? _closeError(int? code, String? reason) {
    if (code == null || code == 1000 || code == 1001 || code == 1005) return null;
    const hints = {
      4002: 'the tunnel agent went offline',
      4003: 'the agent did not answer in time (is sshd listening?)',
    };
    return TunnelException(
      'tunnel closed by server: code $code ${reason ?? ''} ${hints[code] ?? ''}'.trim(),
    );
  }

  void _finish([Object? error]) {
    if (!_in.isClosed) {
      if (error != null) _in.addError(error);
      _in.close();
    }
    if (!_out.isClosed) _out.close();
    if (!_done.isCompleted) {
      if (error != null) {
        _done.future.ignore();
        _done.completeError(error);
      } else {
        _done.complete();
      }
    }
  }

  @override
  Stream<Uint8List> get stream => _in.stream;

  @override
  StreamSink<List<int>> get sink => _out.sink;

  @override
  Future<void> get done => _done.future;

  @override
  Future<void> flush() async {}

  @override
  Future<void> close() async {
    if (_closed) return;
    _closed = true;
    if (!_out.isClosed) await _out.close();
    // Wait for the queued bytes and the 'fin', then end the WebSocket.
    await _sent;
    await _ws.close(1000, 'done');
    _finish();
  }

  @override
  void destroy() {
    _closed = true;
    if (!_out.isClosed) _out.close();
    // A WebSocket bound to addStream() cannot be closed until that finishes.
    _sent.whenComplete(() => _ws.close(1000, 'destroyed')).catchError((_) {});
    _finish();
  }
}
