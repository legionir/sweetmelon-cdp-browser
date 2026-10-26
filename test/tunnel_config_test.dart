import 'package:flutter_test/flutter_test.dart';
import 'package:sweetmelon_cdp_browser/tunnel/tunnel_config.dart';

void main() {
  Map<String, dynamic> valid() => {
        'tunnelUrl': 'https://hub.example.workers.dev',
        'authToken': 't',
        'serverId': 'my-server',
        'sshUser': 'admin',
        'sshPassword': ' keep spaces ',
      };

  test('valid config passes and keeps the password verbatim', () {
    final c = TunnelConfig.fromArgs(valid());
    expect(c.validate(), isNull);
    expect(c.sshPassword, ' keep spaces ');
    expect(c.remotePort, 3000);
    expect(c.remoteHost, '127.0.0.1');
  });

  test('connectUri maps https/http to wss/ws and forces /connect', () {
    expect(TunnelConfig.fromArgs(valid()).connectUri.toString(),
        'wss://hub.example.workers.dev/connect');
    final plain = TunnelConfig.fromArgs({...valid(), 'tunnelUrl': 'http://h:8080/x?y=1'});
    expect(plain.connectUri.toString(), 'ws://h:8080/connect');
  });

  test('rejects bad input', () {
    expect(TunnelConfig.fromArgs({...valid(), 'tunnelUrl': 'ftp://x'}).validate(), contains('tunnelUrl'));
    expect(TunnelConfig.fromArgs({...valid(), 'authToken': ''}).validate(), contains('authToken'));
    expect(TunnelConfig.fromArgs({...valid(), 'serverId': '-bad'}).validate(), contains('serverId'));
    expect(TunnelConfig.fromArgs({...valid(), 'sshUser': ''}).validate(), contains('sshUser'));
    expect(TunnelConfig.fromArgs({...valid(), 'sshPassword': ''}).validate(), contains('sshPassword'));
    expect(TunnelConfig.fromArgs({...valid(), 'remotePort': 70000}).validate(), contains('remotePort'));
  });
}
