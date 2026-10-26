import 'package:flutter_test/flutter_test.dart';
import 'package:sweetmelon_cdp_browser/plugins/cdp_tunnel_plugin.dart';

void main() {
  test('exposes the bridge surface', () {
    final p = CdpTunnelPlugin();
    expect(p.name, 'cdpTunnel');
    expect(p.supportedMethods, containsAll(['connect', 'disconnect', 'status']));
  });

  test('connect with missing settings fails without touching the network', () async {
    final p = CdpTunnelPlugin();
    final r = await p.onCall('connect', {}) as Map<String, dynamic>;
    expect(r['state'], 'failed');
    expect(r['localUrl'], isNull);
    expect(r['error'], contains('tunnelUrl'));
  });

  test('status is idle before connecting; disconnect is a no-op', () async {
    final p = CdpTunnelPlugin();
    expect((await p.onCall('status', {}) as Map)['state'], 'idle');
    expect((await p.onCall('disconnect', {}) as Map)['state'], 'idle');
  });
}
