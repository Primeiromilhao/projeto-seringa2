package com.bfavore.seringa;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

/** Mostra a notificação do lembrete e volta a agendar depois de reiniciar o celular ou atualizar o app. */
public class LembreteReceiver extends BroadcastReceiver {
    static final String ACAO = "com.bfavore.seringa.LEMBRETE";
    static final String CANAL = "lembretes";

    @Override
    public void onReceive(Context c, Intent i) {
        String a = i == null ? null : i.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(a) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(a)) { Lembretes.agendar(c); return; }
        if (!ACAO.equals(a)) return;
        mostrar(c);
    }

    static void mostrar(Context c) {
        if (Build.VERSION.SDK_INT >= 33 && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(CANAL, "Lembretes de aplicação", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Avisa na data e hora da próxima aplicação que você indicou.");
            ch.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
            nm.createNotificationChannel(ch);
        }
        PendingIntent abrir = PendingIntent.getActivity(c, 2, new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, CANAL) : new Notification.Builder(c);
        // No ecrã bloqueado não aparece o nome do medicamento (dado de saúde): só «Seringa — lembrete».
        Notification publica = (Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, CANAL) : new Notification.Builder(c))
            .setSmallIcon(R.drawable.ic_notificacao).setContentTitle("Seringa").setContentText("Você tem um lembrete.").build();
        b.setSmallIcon(R.drawable.ic_notificacao)
            .setContentTitle(Lembretes.titulo(c))
            .setContentText(Lembretes.texto(c))
            .setStyle(new Notification.BigTextStyle().bigText(Lembretes.texto(c)))
            .setColor(0xFF6D28D9)
            .setContentIntent(abrir)
            .setAutoCancel(true)
            .setVisibility(Notification.VISIBILITY_PRIVATE)
            .setPublicVersion(publica)
            .setCategory(Notification.CATEGORY_REMINDER);
        if (Build.VERSION.SDK_INT < 26) b.setPriority(Notification.PRIORITY_HIGH).setDefaults(Notification.DEFAULT_ALL);
        nm.notify(1, b.build());
    }
}
