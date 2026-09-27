package com.anykey.wallpaper;

import android.app.WallpaperManager;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Читает системные цвета обоев (WallpaperColors) — для «системного» Monet.
 * Не требует разрешений; при недоступности возвращает пустой результат.
 */
@CapacitorPlugin(name = "WallpaperColors")
public class WallpaperColorsPlugin extends Plugin {

    @PluginMethod
    public void getColors(PluginCall call) {
        try {
            WallpaperManager wm = WallpaperManager.getInstance(getContext());
            android.app.WallpaperColors colors = null;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                colors = wm.getWallpaperColors(WallpaperManager.FLAG_SYSTEM);
            }
            JSObject ret = new JSObject();
            if (colors != null) {
                if (colors.getPrimaryColor() != null) {
                    ret.put("primary", String.format("#%06X", 0xFFFFFF & colors.getPrimaryColor().toArgb()));
                }
                if (colors.getSecondaryColor() != null) {
                    ret.put("secondary", String.format("#%06X", 0xFFFFFF & colors.getSecondaryColor().toArgb()));
                }
                if (colors.getTertiaryColor() != null) {
                    ret.put("tertiary", String.format("#%06X", 0xFFFFFF & colors.getTertiaryColor().toArgb()));
                }
            }
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("unavailable", e);
        }
    }
}
