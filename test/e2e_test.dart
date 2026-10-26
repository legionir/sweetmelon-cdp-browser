// End-to-end test against tool/e2e/harness.js (fake hub + sshd + gateway).
//
//   (cd tool/e2e && npm install)
//   node tool/e2e/harness.js > /tmp/e2e.json &
//   E2E_CONFIG=/tmp/e2e.json flutter test test/e2e_test.dart
//
// Skipped when E2E_CONFIG is not set. E2E_CONFIG may also point at a real
// deployment (same keys) when `e2eExpectGateway` is false.
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:sweetmelon_cdp_browser/tunnel/cdp_forwarder.dart';
import 'package:sweetmelon_cdp_browser/tunnel/tunnel_config.dart';
import 'package:sweetmelon_cdp_browser/tunnel/tunnel_socket.dart';

void main() {
  final path = Platform.environment['E2E_CONFIG'];
  final skip = path == null ? 'set E2E_CONFIG to run' : null;
  late Map<String, dynamic> cfg;
  if (path != null) cfg = jsonDecode(File(path).readAsStringSync()) as Map<String, dynamic>;

  Future<String> get(String url) async {
    final client = HttpClient();
    try {
      final req = await client.getUrl(Uri.parse(url));
      final res = await req.close();
      return await res.transform(utf8.decoder).join();
    } finally {
      client.close(force: true);
    }
  }

  test('forwards HTTP to the gateway through hub + SSH', () async {
    final f = CdpForwarder(TunnelConfig.fromArgs(cfg));
    await f.start();
    addTearDown(f.stop);
    expect(f.state, ForwarderState.connected);
    expect(f.localUrl, startsWith('http://localhost:'));
    final body = jsonDecode(await get('${f.localUrl}api/state')) as Map<String, dynamic>;
    expect(body['ok'], isTrue);
    // Several parallel requests share one SSH session.
    final many = await Future.wait(List.generate(8, (_) => get('${f.localUrl}api/state')));
    expect(many, everyElement(contains('"ok":true')));
  }, skip: skip);

  test('wrong token is reported as HTTP 403', () async {
    final bad = TunnelConfig.fromArgs({...cfg, 'authToken': 'nope'});
    await expectLater(
      TunnelSocket.connect(bad),
      throwsA(isA<TunnelException>().having((e) => e.message, 'message', contains('403'))),
    );
  }, skip: skip);

  test('unknown server id is reported as offline (503)', () async {
    final bad = TunnelConfig.fromArgs({...cfg, 'serverId': 'ghost'});
    await expectLater(
      TunnelSocket.connect(bad),
      throwsA(isA<TunnelException>().having((e) => e.message, 'message', contains('503'))),
    );
  }, skip: skip);

  test('wrong SSH password fails to start', () async {
    final f = CdpForwarder(TunnelConfig.fromArgs({...cfg, 'sshPassword': 'wrong'}));
    await expectLater(f.start(), throwsA(anything));
    expect(f.state, ForwarderState.failed);
    await f.stop();
  }, skip: skip);
}
