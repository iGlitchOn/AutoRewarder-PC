package off.iglitch.autorewarder;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;

public final class BingLauncher {
    public static final String BING = "com.microsoft.bing";

    private BingLauncher() {}

    public static boolean isInstalled(Context context) {
        try {
            context.getPackageManager().getPackageInfo(BING, 0);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public static boolean install(Context context) {
        try {
            Intent market = new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + BING));
            market.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            if (market.resolveActivity(context.getPackageManager()) != null) {
                context.startActivity(market);
                return true;
            }
        } catch (Exception ignored) {}
        try {
            Intent web = new Intent(
                    Intent.ACTION_VIEW,
                    Uri.parse("https://play.google.com/store/apps/details?id=" + BING));
            web.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(web);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public static boolean open(Context context, String kind) {
        String url = "https://www.bing.com/?form=APMCS1&setmkt=es-CO";
        if ("news".equals(kind)) {
            url = "https://www.bing.com/news?form=APMCS1&setmkt=es-CO";
        } else if ("rewards".equals(kind) || "login".equals(kind)) {
            url = "https://rewards.bing.com/?form=APMCS1&setmkt=es-CO";
        }
        Intent view = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        view.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        view.setPackage(BING);
        if (canStart(context, view)) {
            context.startActivity(view);
            return true;
        }
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(BING);
        if (launch != null) {
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(launch);
            return true;
        }
        return false;
    }

    private static boolean canStart(Context context, Intent intent) {
        PackageManager pm = context.getPackageManager();
        return intent.resolveActivity(pm) != null;
    }
}
