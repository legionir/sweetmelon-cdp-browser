import 'dart:async';
import 'dart:io';
import 'dart:math';
import 'dart:typed_data';

import 'package:dartssh2/dartssh2.dart';

import 'tunnel_config.dart';
import 'tunnel_socket.dart';

enum ForwarderState { idle, connecting, connected, reconnecting, failed }

typedef StateListener = void Function(ForwarderState state, {String? error});

/// Keeps `127.0.0.1:<port>` on the device wired to the emulator gateway:
///
///   local app ─▶ ServerSocket ─▶ SSH direct-tcpip ─▶ TunnelSocket ─▶ hub ─▶ agent ─▶ sshd ─▶ gateway
///
/// The local listener outlives SSH reconnects, so the URL handed to the web
/// page stays valid while the link recovers.
class CdpForwarder {
  final TunnelConfig config;
  final StateListener? onState;
  final Duration keepAlive;

  CdpForwarder(this.config, {this.onState, this.keepAlive = const Duration(seconds: 20)});

  ServerSocket? _server;
  SSHClient? _client;
  Completer<SSHClient> _ready = Completer<SSHClient>();
  ForwarderState _state = ForwarderState.idle;
  bool _stopped = false;
  int _backoffMs = 1000;
  final Set<Socket> _sockets = {};

  ForwarderState get state => _state;
  int? get localPort => _server?.port;

  /// URL of the emulator UI as seen from the device.
  String? get localUrl {
    final port = localPort;
    if (port == null) return null;
    final token = config.gatewayToken;
    final query = (token == null || token.isEmpty) ? '' : '?token=${Uri.encodeQueryComponent(token)}';
    return 'http://127.0.0.1:$port/$query';
  }

  void _set(ForwarderState s, {String? error}) {
    _state = s;
    onState?.call(s, error: error);
  }

  /// Connects SSH and starts the local listener. Throws on the first failure
  /// (bad token, offline agent, wrong password); later drops reconnect silently.
  Future<void> start() async {
    if (_server != null) throw StateError('already started');
    _stopped = false;
    _set(ForwarderState.connecting);
    try {
      _client = await _openClient();
    } catch (e) {
      _set(ForwarderState.failed, error: _describe(e));
      rethrow;
    }
    _server = await ServerSocket.bind(InternetAddress.loopbackIPv4, 0);
    _server!.listen(_accept);
    _ready.complete(_client);
    _watch(_client!);
    _set(ForwarderState.connected);
  }

  Future<SSHClient> _openClient() async {
    final socket = await TunnelSocket.connect(config);
    final key = config.sshPrivateKey;
    final client = SSHClient(
      socket,
      username: config.sshUser,
      onPasswordRequest: () => config.sshPassword ?? '',
      identities: (key != null && key.isNotEmpty) ? SSHKeyPair.fromPem(key) : null,
      keepAliveInterval: keepAlive,
    );
    try {
      await client.authenticated.timeout(const Duration(seconds: 30));
    } catch (e) {
      client.close();
      socket.destroy();
      rethrow;
    }
    return client;
  }

  void _watch(SSHClient client) {
    client.done.then((_) => _dropped(client), onError: (_) => _dropped(client));
  }

  void _dropped(SSHClient client) {
    if (_stopped || !identical(client, _client)) return;
    _client = null;
    _ready = Completer<SSHClient>();
    _set(ForwarderState.reconnecting);
    unawaited(_reconnect());
  }

  Future<void> _reconnect() async {
    while (!_stopped) {
      final wait = _backoffMs + Random().nextInt(500);
      _backoffMs = min(_backoffMs * 2, 30000);
      await Future<void>.delayed(Duration(milliseconds: wait));
      if (_stopped) return;
      try {
        final client = await _openClient();
        if (_stopped) {
          client.close();
          return;
        }
        _client = client;
        _backoffMs = 1000;
        _ready.complete(client);
        _watch(client);
        _set(ForwarderState.connected);
        return;
      } catch (e) {
        _set(ForwarderState.reconnecting, error: _describe(e));
      }
    }
  }

  Future<void> _accept(Socket local) async {
    _sockets.add(local);
    local.setOption(SocketOption.tcpNoDelay, true);
    SSHForwardChannel? channel;
    try {
      final client = await _ready.future.timeout(const Duration(seconds: 15));
      channel = await client.forwardLocal(config.remoteHost, config.remotePort);
    } catch (_) {
      local.destroy();
      _sockets.remove(local);
      return;
    }
    final ch = channel;
    late final StreamSubscription<Uint8List> fromRemote;
    fromRemote = ch.stream.listen(
      (data) => local.add(data),
      onDone: () => local.close(),
      onError: (_) => local.destroy(),
    );
    local.listen(
      (data) => ch.sink.add(data),
      onDone: () {
        ch.sink.close();
      },
      onError: (_) => ch.destroy(),
      cancelOnError: true,
    );
    unawaited(local.done.then((_) {}, onError: (_) {}).whenComplete(() {
      _sockets.remove(local);
      fromRemote.cancel();
      ch.destroy();
    }));
  }

  Future<void> stop() async {
    _stopped = true;
    final server = _server;
    _server = null;
    await server?.close();
    for (final s in _sockets.toList()) {
      s.destroy();
    }
    _sockets.clear();
    final client = _client;
    _client = null;
    client?.close();
    if (!_ready.isCompleted) _ready.completeError(StateError('stopped'));
    _ready.future.ignore();
    _set(ForwarderState.idle);
  }

  static String _describe(Object e) {
    if (e is TunnelException) return e.message;
    if (e is SSHAuthFailError) return 'SSH authentication failed (check sshUser / sshPassword)';
    if (e is TimeoutException) return 'timed out';
    return e.toString();
  }
}
