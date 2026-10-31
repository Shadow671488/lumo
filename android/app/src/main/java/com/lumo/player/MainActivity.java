package com.lumo.player;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView.setWebContentsDebuggingEnabled(true);

        WebView initialWebView = getBridge() != null ? getBridge().getWebView() : null;
        if (initialWebView != null) {
            initialWebView.setBackgroundColor(Color.parseColor("#121214"));
        }

        BroadcastReceiver evalReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String js = intent.getStringExtra("js");
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (js != null && webView != null) {
                    webView.evaluateJavascript(js, result -> Log.i("LUMO_EVAL", "RESULT: " + result));
                }
            }
        };

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(evalReceiver, new IntentFilter("com.lumo.player.EVAL"), Context.RECEIVER_EXPORTED);
        } else {
            registerReceiver(evalReceiver, new IntentFilter("com.lumo.player.EVAL"));
        }

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView != null) {
                    webView.evaluateJavascript(
                        "(function() { " +
                        "  if (typeof window.__handleAndroidBack === 'function') { return window.__handleAndroidBack(); } " +
                        "  return false; " +
                        "})()",
                        result -> {
                            if (!"\"handled\"".equals(result) && !"true".equals(result)) {
                                moveTaskToBack(true);
                            }
                        }
                    );
                } else {
                    moveTaskToBack(true);
                }
            }
        });
    }

    @Override
    public void onResume() {
        super.onResume();
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            webView.setBackgroundColor(Color.parseColor("#121214"));
        }
    }
}
