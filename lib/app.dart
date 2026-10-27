import 'package:flutter/material.dart';
import 'package:sweetmelon/packages/core/lib/core.dart';

import 'di/service_locator.dart';

class CdpBrowserApp extends StatelessWidget {
  const CdpBrowserApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CDP Browser',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(scaffoldBackgroundColor: const Color(0xFF0A0A1A)),
      home: Scaffold(
        // The soft keyboard must overlay the WebView, not shrink it: a shrinking view makes the
        // remote browser resize (small image, then a stretched frame when the keyboard closes).
        resizeToAvoidBottomInset: false,
        body: SafeArea(
          child: WebViewHost(
            loadFromAssets: true,
            config: sl<WebViewHostConfig>(),
            assetConfig: sl<AssetServerConfig>(),
            bridge: sl<MessageBridge>(),
          ),
        ),
      ),
    );
  }
}
