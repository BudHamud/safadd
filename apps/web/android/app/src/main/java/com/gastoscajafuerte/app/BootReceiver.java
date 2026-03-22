package com.gastoscajafuerte.app;

import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.service.notification.NotificationListenerService;
import android.util.Log;

import com.capacitor.notifications.listener.NotificationService;

/**
 * Runs on BOOT_COMPLETED and MY_PACKAGE_REPLACED.
 *
 * When the device restarts (or the app is updated), the NLS process is dead.
 * The system normally rebinds it automatically, but on MIUI/HyperOS and some
 * other OEM ROMs it doesn't. Calling requestRebind() here tells Android to
 * re-establish the notification listener binding without the user having to
 * toggle the Notification Access permission.
 */
public class BootReceiver extends BroadcastReceiver {

    private static final String TAG = "GastosBootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        Log.d(TAG, "onReceive: " + action);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            try {
                ComponentName cn = new ComponentName(context, NotificationService.class);
                NotificationListenerService.requestRebind(cn);
                Log.d(TAG, "requestRebind dispatched after " + action);
            } catch (Exception e) {
                Log.e(TAG, "requestRebind failed: " + e.getMessage());
            }
        }
    }
}
