import 'package:flutter/foundation.dart';
import 'package:get_it/get_it.dart';

import 'package:sweetmelon/packages/core/lib/core.dart';
import 'package:sweetmelon/packages/plugin_engine/lib/plugin_engine.dart';
import 'package:sweetmelon/packages/performance/lib/performance.dart';
import 'package:sweetmelon/packages/security/lib/security.dart';
import 'package:sweetmelon/plugins/secure_storage/lib/secure_storage_plugin.dart';
import 'package:sweetmelon/plugins/clipboard/lib/clipboard_plugin.dart';
import 'package:sweetmelon/plugins/toast/lib/toast_plugin.dart';

import '../plugins/cdp_tunnel_plugin.dart';

final sl = GetIt.instance;

/// Wires the bridge exactly like the Sweetmelon core does, with only the
/// plugins this app needs plus [CdpTunnelPlugin].
class ServiceLocator {
  static Future<void> init() async {
    if (sl.isRegistered<MessageBridge>()) return;

    sl.registerLazySingleton<CacheManager>(() => CacheManager(maxEntries: 100));
    sl.registerLazySingleton<RateLimiter>(() {
      final limiter = RateLimiter();
      limiter.setDefaultRule(RateLimitRule.perSecond(50));
      return limiter;
    });
    sl.registerLazySingleton<ExecutionGuard>(() => ExecutionGuard(defaultTimeoutMs: 60000));
    sl.registerLazySingleton<PermissionManager>(() {
      final manager = PermissionManager(cacheTtl: const Duration(minutes: 3));
      manager.setProvider(const NativePermissionProvider(
        fallbackStatus: kReleaseMode ? PermissionStatus.denied : PermissionStatus.granted,
      ));
      return manager;
    });
    sl.registerLazySingleton<PluginRegistry>(() => PluginRegistry());
    sl.registerLazySingleton<LazyPluginLoader>(
      () => LazyPluginLoader(registry: sl<PluginRegistry>()),
    );
    sl.registerLazySingleton<PluginManager>(() => PluginManager(
          registry: sl<PluginRegistry>(),
          permissionManager: sl<PermissionManager>(),
          rateLimiter: sl<RateLimiter>(),
          executionGuard: sl<ExecutionGuard>(),
          cacheManager: sl<CacheManager>(),
          lazyLoader: sl<LazyPluginLoader>(),
        ));
    sl.registerLazySingleton<MessageBridge>(() {
      final bridge = MessageBridge();
      final manager = sl<PluginManager>();
      bridge.setMessageHandler(manager.execute);
      bridge.setBatchHandler(manager.executeBatch);
      return bridge;
    });

    final bridge = sl<MessageBridge>();
    final registry = sl<PluginRegistry>();
    registry.setEventEmitter(bridge.emitEvent);

    sl.registerLazySingleton<WebViewHostConfig>(
      () => kReleaseMode ? WebViewHostConfig.production() : WebViewHostConfig.development(),
    );
    sl.registerLazySingleton<AssetServerConfig>(() => const AssetServerConfig());

    final emitter = registry.emitEvent;
    await registry.register(SecureStoragePlugin());
    await registry.register(ClipboardPlugin());
    await registry.register(ToastPlugin());
    await registry.register(CdpTunnelPlugin(eventEmitter: emitter));
  }
}
