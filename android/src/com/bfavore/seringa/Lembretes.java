package com.bfavore.seringa;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

/** Agenda a notificação da próxima aplicação na data/hora que a app calculou a partir do que a pessoa indicou. */
final class Lembretes {
    private static final String PREFS = "lembretes";

    static void guardar(Context c, long quando, String titulo, String texto) {
        c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putLong("quando", quando).putString("titulo", titulo).putString("texto", texto).apply();
        agendar(c);
    }

    static void cancelar(Context c) {
        c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply();
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(intencao(c));
    }

    static long quando(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getLong("quando", 0); }
    static String titulo(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("titulo", "Seringa — lembrete"); }
    static String texto(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("texto", "Hora da aplicação, conforme você indicou."); }

    static void agendar(Context c) {
        long q = quando(c);
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        PendingIntent pi = intencao(c);
        am.cancel(pi);
        if (q <= System.currentTimeMillis()) return;
        if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, q, pi); // sem permissão de alarme exato: o sistema pode atrasar alguns minutos
        } else {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, q, pi);
        }
    }

    static PendingIntent intencao(Context c) {
        Intent i = new Intent(c, LembreteReceiver.class).setAction(LembreteReceiver.ACAO);
        return PendingIntent.getBroadcast(c, 1, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
