import 'package:flutter/material.dart';

import 'app.dart';
import 'di/service_locator.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ServiceLocator.init();
  runApp(const CdpBrowserApp());
}
