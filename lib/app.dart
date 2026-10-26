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
