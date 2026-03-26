const fs = require('fs');
const path = require('path');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function write(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

function replaceOnce(source, searchValue, replaceValue, label) {
  if (source.includes(replaceValue)) {
    return source;
  }

  if (!source.includes(searchValue)) {
    throw new Error(`Could not find expected snippet for ${label}`);
  }

  return source.replace(searchValue, replaceValue);
}

function patchNotificationsListenerPlugin(filePath) {
  let source = read(filePath).replace(/\r\n/g, '\n');

  source = replaceOnce(
    source,
    'import android.content.IntentFilter;\nimport android.os.Build;\nimport android.provider.Settings;\n',
    'import android.content.IntentFilter;\nimport android.content.ComponentName;\nimport android.os.Build;\nimport android.os.Handler;\nimport android.os.Looper;\nimport android.provider.Settings;\n',
    'NotificationsListenerPlugin imports'
  );

  source = replaceOnce(
    source,
    '@CapacitorPlugin(\n        name = "NotificationsListener",\n        permissions = {@Permission(alias = "notifications", strings = {Manifest.permission.BIND_NOTIFICATION_LISTENER_SERVICE})}\n)\n',
    '@CapacitorPlugin(name = "NotificationsListener", permissions = {\n        @Permission(alias = "notifications", strings = { Manifest.permission.BIND_NOTIFICATION_LISTENER_SERVICE }) })\n',
    'NotificationsListenerPlugin annotation'
  );

  source = replaceOnce(
    source,
    '        attachAppStateListener();\n        persistentStorage = new SimpleStorage(getContext());\n        NotificationService.pluginInstance = this;\n',
    '        attachAppStateListener();\n        persistentStorage = new SimpleStorage(getContext());\n        NotificationService.pluginInstance = this;\n\n        // On app start, proactively simulate the notification-access toggle:\n        // unbind any stale connection, then rebind fresh. This is what the\n        // manual disable/enable in System Settings does, but done in code.\n        triggerRebindCycle("load()");\n',
    'NotificationsListenerPlugin load patch'
  );

  source = replaceOnce(
    source,
    '        filter.addAction(NotificationService.ACTION_RECEIVE);\n        filter.addAction(NotificationService.ACTION_REMOVE);\n        notificationReceiver = new NotificationReceiver(getContext(), filter);\n        NotificationService.notificationReceiver = notificationReceiver;\n        call.resolve();\n',
    '        filter.addAction(NotificationService.ACTION_RECEIVE);\n        filter.addAction(NotificationService.ACTION_REMOVE);\n        notificationReceiver = new NotificationReceiver(getContext(), filter);\n        NotificationService.notificationReceiver = notificationReceiver;\n\n        // If the NLS binding is missing (process was killed and rebind has not\n        // happened yet), simulate the toggle: unbind -> wait 500ms -> rebind.\n        if (!NotificationService.isConnected) {\n            Log.d(TAG, "startListening(): NLS not connected - triggering rebind cycle");\n            triggerRebindCycle("startListening()");\n        }\n\n        call.resolve();\n',
    'NotificationsListenerPlugin startListening patch'
  );

  source = replaceOnce(
    source,
    '    public void isListening(PluginCall call) {\n        JSObject ret = new JSObject();\n        ret.put("value", NotificationService.isConnected);\n        call.resolve(ret);\n    }\n',
    '    public void isListening(PluginCall call) {\n        JSObject ret = new JSObject();\n        boolean isGranted = false;\n        String packageName = getContext().getPackageName();\n        String enabledListeners = Settings.Secure.getString(getContext().getContentResolver(),\n                "enabled_notification_listeners");\n        if (enabledListeners != null && enabledListeners.contains(packageName)) {\n            isGranted = true;\n        }\n        ret.put("value", isGranted);\n        call.resolve(ret);\n    }\n',
    'NotificationsListenerPlugin isListening patch'
  );

  source = replaceOnce(
    source,
    '        bridge.getApp().setStatusChangeListener((isActive) -> {\n            NotificationService.webViewActive = isActive;\n            // Restore cached notifications if the webview is unpaused, but not before webView starts the listener after killing\n            // restoreCachedNotifications() called from webview will handle that case.\n            if (isActive && NotificationService.cacheEnabled != null && NotificationService.cacheEnabled && NotificationService.notificationReceiver != null) {\n                restoreFromCache();\n            }\n        });\n',
    '        bridge.getApp().setStatusChangeListener((isActive) -> {\n            NotificationService.webViewActive = isActive;\n            // Restore cached notifications if the webview is unpaused, but not before\n            // webView starts the listener after killing\n            // restoreCachedNotifications() called from webview will handle that case.\n            if (isActive && NotificationService.cacheEnabled != null && NotificationService.cacheEnabled\n                    && NotificationService.notificationReceiver != null) {\n                restoreFromCache();\n            }\n        });\n',
    'NotificationsListenerPlugin attachAppStateListener patch'
  );

  source = replaceOnce(
    source,
    '    private void persistWhitelist(ArrayList<String> packagesWhitelist) {\n',
    '    /**\n     * Simulates the manual "disable then re-enable" toggle in Notification Access settings.\n     *\n     * requestRebind() alone is ignored by MIUI/HyperOS when the service was killed\n     * (not cleanly unbound). Calling requestUnbind() first marks the binding as\n     * voluntarily released, so the subsequent requestRebind() is always honored.\n     *\n     * The 600ms delay between unbind and rebind gives the system enough time to\n     * process the disconnect before we ask it to reconnect.\n     */\n    private void triggerRebindCycle(String caller) {\n        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return;\n\n        if (NotificationService.instance != null) {\n            try {\n                NotificationService.instance.requestUnbind();\n                Log.d(TAG, caller + " triggerRebindCycle: requestUnbind dispatched");\n            } catch (Exception e) {\n                Log.e(TAG, caller + " triggerRebindCycle: requestUnbind failed: " + e.getMessage());\n            }\n        }\n\n        new Handler(Looper.getMainLooper()).postDelayed(() -> {\n            try {\n                ComponentName cn = new ComponentName(getContext(), NotificationService.class);\n                android.service.notification.NotificationListenerService.requestRebind(cn);\n                Log.d(TAG, caller + " triggerRebindCycle: requestRebind dispatched");\n            } catch (Exception e) {\n                Log.e(TAG, caller + " triggerRebindCycle: requestRebind failed: " + e.getMessage());\n            }\n        }, 600);\n    }\n\n    private void persistWhitelist(ArrayList<String> packagesWhitelist) {\n',
    'NotificationsListenerPlugin triggerRebindCycle patch'
  );

  source = replaceOnce(
    source,
    '            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {\n',
    '            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O\n                    && Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {\n',
    'NotificationsListenerPlugin receiver formatting patch'
  );

  write(filePath, source);
}

function patchNotificationService(filePath) {
  let source = read(filePath).replace(/\r\n/g, '\n');

  source = replaceOnce(
    source,
    'import android.app.Notification;\nimport android.content.Intent;\n',
    'import android.app.Notification;\nimport android.app.NotificationChannel;\nimport android.app.NotificationManager;\nimport android.content.ComponentName;\nimport android.content.Intent;\n',
    'NotificationService imports'
  );

  source = replaceOnce(
    source,
    '    public static NotificationsListenerPlugin.NotificationReceiver notificationReceiver;\n    // service connected to the android notification service\n    public static boolean isConnected = false;\n    // listening started by the web view app\n',
    '    public static NotificationsListenerPlugin.NotificationReceiver notificationReceiver;\n    // service connected to the android notification service\n    public static boolean isConnected = false;\n    // self-reference so the Plugin can call instance methods (requestUnbind)\n    public static NotificationService instance = null;\n    // listening started by the web view app\n',
    'NotificationService static fields patch'
  );

  source = replaceOnce(
    source,
    '    public NotificationService() {\n        uuid = UUID.randomUUID();\n    }\n\n    @Override\n',
    '    public NotificationService() {\n        uuid = UUID.randomUUID();\n    }\n\n    private static final String FOREGROUND_CHANNEL_ID = "gastos_notif_listener";\n    private static final int FOREGROUND_NOTIF_ID = 7642;\n\n    @Override\n',
    'NotificationService foreground constants patch'
  );

  source = replaceOnce(
    source,
    '        httpClient = new OkHttpClient.Builder()\n                .connectTimeout(10, java.util.concurrent.TimeUnit.SECONDS)\n                .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)\n                .build();\n\n\n    }\n',
    '        httpClient = new OkHttpClient.Builder()\n                .connectTimeout(10, java.util.concurrent.TimeUnit.SECONDS)\n                .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)\n                .build();\n\n        // Promote to Foreground Service so the OS (especially Xiaomi/HyperOS)\n        // does not kill this process when the app is swiped from Recents.\n        startForegroundCompat();\n\n        instance = this;\n    }\n\n    private void startForegroundCompat() {\n        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {\n            NotificationChannel channel = new NotificationChannel(\n                    FOREGROUND_CHANNEL_ID,\n                    "Monitor de notificaciones bancarias",\n                    NotificationManager.IMPORTANCE_MIN\n            );\n            channel.setDescription("Detecta transferencias y cobros en segundo plano");\n            channel.setShowBadge(false);\n            channel.setSound(null, null);\n            NotificationManager nm = getSystemService(NotificationManager.class);\n            if (nm != null) nm.createNotificationChannel(channel);\n        }\n\n        Notification.Builder builder;\n        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {\n            builder = new Notification.Builder(this, FOREGROUND_CHANNEL_ID);\n        } else {\n            builder = new Notification.Builder(this);\n        }\n\n        int iconRes = android.R.drawable.ic_dialog_info;\n        try {\n            int appIcon = getApplicationInfo().icon;\n            if (appIcon != 0) iconRes = appIcon;\n        } catch (Exception ignored) {}\n\n        Notification notif = builder\n                .setContentTitle("Gastos - escuchando notificaciones")\n                .setContentText("Detectando transferencias en segundo plano")\n                .setSmallIcon(iconRes)\n                .setOngoing(true)\n                .build();\n\n        if (Build.VERSION.SDK_INT >= 34) {\n            startForeground(FOREGROUND_NOTIF_ID, notif,\n                    android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);\n        } else {\n            startForeground(FOREGROUND_NOTIF_ID, notif);\n        }\n        Log.d(TAG, "NotificationService running as Foreground Service");\n    }\n',
    'NotificationService onCreate patch'
  );

  source = replaceOnce(
    source,
    '    public void onListenerDisconnected() {\n        isConnected = false;\n        Log.d(TAG, "NotificationListenerService disconnected");\n    }\n\n    @Override\n    public void onDestroy() {\n        Log.d(TAG, "NotificationService being destroyed with UUID: " + uuid);\n        super.onDestroy();\n    }\n',
    '    public void onListenerDisconnected() {\n        isConnected = false;\n        Log.d(TAG, "NotificationListenerService disconnected - requesting rebind");\n        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {\n            try {\n                ComponentName cn = new ComponentName(getApplicationContext(), NotificationService.class);\n                NotificationListenerService.requestRebind(cn);\n                Log.d(TAG, "requestRebind dispatched");\n            } catch (Exception e) {\n                Log.e(TAG, "requestRebind failed: " + e.getMessage());\n            }\n        }\n    }\n\n    @Override\n    public void onDestroy() {\n        Log.d(TAG, "NotificationService being destroyed with UUID: " + uuid);\n        instance = null;\n        super.onDestroy();\n    }\n',
    'NotificationService disconnect patch'
  );

  write(filePath, source);
}

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const pluginFile = path.join(
    repoRoot,
    'node_modules',
    '@posx',
    'capacitor-notifications-listener',
    'android',
    'src',
    'main',
    'java',
    'com',
    'capacitor',
    'notifications',
    'listener',
    'NotificationsListenerPlugin.java'
  );
  const serviceFile = path.join(
    repoRoot,
    'node_modules',
    '@posx',
    'capacitor-notifications-listener',
    'android',
    'src',
    'main',
    'java',
    'com',
    'capacitor',
    'notifications',
    'listener',
    'NotificationService.java'
  );

  if (!fs.existsSync(pluginFile) || !fs.existsSync(serviceFile)) {
    throw new Error('Android notification listener sources were not found in node_modules. Run npm install first.');
  }

  patchNotificationsListenerPlugin(pluginFile);
  patchNotificationService(serviceFile);
  console.log('Applied Android notification listener patch successfully.');
}

main();