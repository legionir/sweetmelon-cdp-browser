/// Settings for one tunnel + SSH + gateway-forward session.
///
/// Every value can come from the JS call or from `--dart-define`; the JS value
/// wins. Nothing here is persisted: the web page keeps what it needs in the
/// `secureStorage` plugin.
class TunnelConfig {
  /// `wss://` / `https://` URL of the ws-cf-tunnel hub.
  final String tunnelUrl;

  /// Client token (hub `AUTH_TOKEN`).
  final String authToken;

  /// `SERVER_ID` of the agent that fronts the machine running the emulator.
  final String serverId;

  final String sshUser;
  final String? sshPassword;
  final String? sshPrivateKey;

  /// Where the emulator gateway listens, as seen from the SSH server.
  final String remoteHost;
  final int remotePort;

  /// Optional `GATEWAY_TOKEN` of the emulator; appended to the UI URL.
  final String? gatewayToken;

  const TunnelConfig({
    required this.tunnelUrl,
    required this.authToken,
    required this.serverId,
    required this.sshUser,
    this.sshPassword,
    this.sshPrivateKey,
    this.remoteHost = '127.0.0.1',
    this.remotePort = 3000,
    this.gatewayToken,
  });

  static final RegExp _serverIdRe = RegExp(r'^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$');

  factory TunnelConfig.fromArgs(Map<String, dynamic> args) {
    String? str(String key, String env) {
      final v = args[key];
      if (v is String && v.trim().isNotEmpty) return v.trim();
      return env.isEmpty ? null : env;
    }

    final port = args['remotePort'];
    return TunnelConfig(
      tunnelUrl: str('tunnelUrl', const String.fromEnvironment('TUNNEL_URL')) ?? '',
      authToken: str('authToken', const String.fromEnvironment('AUTH_TOKEN')) ?? '',
      serverId: str('serverId', const String.fromEnvironment('SERVER_ID')) ?? '',
      sshUser: str('sshUser', const String.fromEnvironment('SSH_USER')) ?? '',
      // Passwords are used verbatim: do not trim.
      sshPassword: (args['sshPassword'] is String && (args['sshPassword'] as String).isNotEmpty)
          ? args['sshPassword'] as String
          : (const String.fromEnvironment('SSH_PASSWORD').isEmpty
              ? null
              : const String.fromEnvironment('SSH_PASSWORD')),
      sshPrivateKey: str('sshPrivateKey', ''),
      remoteHost: str('remoteHost', '') ?? '127.0.0.1',
      remotePort: port is num ? port.toInt() : 3000,
      gatewayToken: str('gatewayToken', const String.fromEnvironment('GATEWAY_TOKEN')),
    );
  }

  /// Returns a human-readable problem, or null when the config is usable.
  String? validate() {
    final uri = Uri.tryParse(tunnelUrl);
    if (uri == null || !const {'wss', 'ws', 'https', 'http'}.contains(uri.scheme) || uri.host.isEmpty) {
      return 'tunnelUrl must start with wss://, ws://, https:// or http://';
    }
    if (authToken.isEmpty) return 'authToken is required';
    if (!_serverIdRe.hasMatch(serverId)) return 'serverId is missing or invalid';
    if (sshUser.isEmpty) return 'sshUser is required';
    if ((sshPassword ?? '').isEmpty && (sshPrivateKey ?? '').isEmpty) {
      return 'sshPassword or sshPrivateKey is required';
    }
    if (remotePort < 1 || remotePort > 65535) return 'remotePort is out of range';
    return null;
  }

  /// `/connect` endpoint of the hub, always `wss:`/`ws:`.
  Uri get connectUri {
    final u = Uri.parse(tunnelUrl);
    final scheme = (u.scheme == 'https' || u.scheme == 'wss') ? 'wss' : 'ws';
    return Uri(
      scheme: scheme,
      host: u.host,
      port: u.hasPort ? u.port : null,
      path: '/connect',
    );
  }
}
