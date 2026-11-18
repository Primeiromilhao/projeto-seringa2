package com.bfavore.seringa;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.provider.CalendarContract;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Seringa para Android.
 * Mostra a MESMA app de site/app/ (copiada para os assets do APK no momento da compilação), servida a partir de
 * https://appassets.androidplatform.net/ — uma origem segura e local, sem internet, para que IndexedDB e Web Crypto
 * funcionem exatamente como no navegador. Esta classe não contém regras do tratamento: só liga a app aos recursos
 * do sistema (salvar arquivo, calendário, notificação, imprimir, escolher arquivo, botão voltar).
 */
public class MainActivity extends Activity {
    static final String HOST = "appassets.androidplatform.net";
    static final String INICIO = "https://" + HOST + "/app/index.html";
    static final String SITE_PUBLICO = "https://primeiromilhao.github.io/projeto-seringa2/";
    private static final int PEDIDO_ARQUIVO = 10, PEDIDO_NOTIFICACOES = 11;

    private WebView web;
    private ValueCallback<Uri[]> escolhaPendente;

    @Override
    protected void onCreate(Bundle estado) {
        super.onCreate(estado);
        boolean noturno = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;

        FrameLayout raiz = new FrameLayout(this);
        raiz.setBackgroundColor(noturno ? Color.rgb(17, 24, 39) : Color.rgb(246, 244, 251));
        web = new WebView(this);
        web.setBackgroundColor(noturno ? Color.rgb(17, 24, 39) : Color.rgb(246, 244, 251));
        raiz.addView(web, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(raiz);

        // Android 15+: a janela ocupa o ecrã inteiro; afastamos o conteúdo das barras do sistema e do teclado.
        raiz.setOnApplyWindowInsetsListener((v, ins) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets i = ins.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime() | WindowInsets.Type.displayCutout());
                v.setPadding(i.left, i.top, i.right, i.bottom);
            } else {
                v.setPadding(ins.getSystemWindowInsetLeft(), ins.getSystemWindowInsetTop(), ins.getSystemWindowInsetRight(), ins.getSystemWindowInsetBottom());
            }
            return ins;
        });

        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) WebView.setWebContentsDebuggingEnabled(true);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportMultipleWindows(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);

        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) { return servir(r.getUrl()); }
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) { return abrirFora(r.getUrl()); }
            @Override public boolean onRenderProcessGone(WebView v, android.webkit.RenderProcessGoneDetail d) { recreate(); return true; }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (escolhaPendente != null) escolhaPendente.onReceiveValue(null);
                escolhaPendente = cb;
                try { startActivityForResult(p.createIntent(), PEDIDO_ARQUIVO); return true; }
                catch (ActivityNotFoundException e) { escolhaPendente = null; return false; }
            }
        });
        if (Build.VERSION.SDK_INT >= 24) {
            ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient() {
                @Override public WebResourceResponse shouldInterceptRequest(WebResourceRequest r) { return servir(r.getUrl()); }
            });
        }
        web.addJavascriptInterface(new Ponte(), "SeringaAndroid");

        if (estado != null) web.restoreState(estado);
        if (web.getUrl() == null) web.loadUrl(INICIO);
    }

    /** Serve os arquivos da app a partir dos assets do APK. Qualquer outro endereço não é carregado no app. */
    private WebResourceResponse servir(Uri u) {
        if (u == null || !"https".equals(u.getScheme()) || !HOST.equals(u.getHost())) return null;
        String caminho = u.getPath() == null ? "/" : u.getPath();
        if (caminho.endsWith("/")) caminho += "index.html";
        if (caminho.contains("..")) return vazio(404);
        Map<String, String> cab = new HashMap<>();
        cab.put("Cache-Control", "no-cache");
        cab.put("X-Content-Type-Options", "nosniff");
        try {
            InputStream in = getAssets().open("www" + caminho);
            return new WebResourceResponse(tipo(caminho), "UTF-8", 200, "OK", cab, in);
        } catch (Exception e) {
            return vazio(404);
        }
    }
    private static WebResourceResponse vazio(int codigo) {
        return new WebResourceResponse("text/plain", "UTF-8", codigo, "Not Found", new HashMap<>(), new ByteArrayInputStream(new byte[0]));
    }
    private static String tipo(String c) {
        String x = c.toLowerCase(Locale.ROOT);
        if (x.endsWith(".html")) return "text/html";
        if (x.endsWith(".js")) return "application/javascript";
        if (x.endsWith(".css")) return "text/css";
        if (x.endsWith(".svg")) return "image/svg+xml";
        if (x.endsWith(".png")) return "image/png";
        if (x.endsWith(".json")) return "application/json";
        if (x.endsWith(".webmanifest")) return "application/manifest+json";
        return "application/octet-stream";
    }

    /** Links externos (fontes oficiais, site) abrem no navegador do celular; dentro do app só a app local. */
    private boolean abrirFora(Uri u) {
        if (u == null) return true;
        if ("https".equals(u.getScheme()) && HOST.equals(u.getHost())) {
            String p = u.getPath() == null ? "/" : u.getPath();
            if (p.startsWith("/app/")) return false;
            u = Uri.parse(SITE_PUBLICO);
        }
        String esq = u.getScheme() == null ? "" : u.getScheme();
        if (esq.equals("https") || esq.equals("http") || esq.equals("tel") || esq.equals("mailto")) {
            try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (ActivityNotFoundException e) { /* sem app */ }
        }
        return true;
    }

    @Override
    protected void onActivityResult(int pedido, int resultado, Intent dados) {
        if (pedido == PEDIDO_ARQUIVO && escolhaPendente != null) {
            escolhaPendente.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultado, dados));
            escolhaPendente = null;
            return;
        }
        super.onActivityResult(pedido, resultado, dados);
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.SeringaVoltar ? String(window.SeringaVoltar()) : 'false'", r -> {
            if (!"\"true\"".equals(r)) MainActivity.super.onBackPressed();
        });
    }

    @Override protected void onSaveInstanceState(Bundle s) { super.onSaveInstanceState(s); web.saveState(s); }
    @Override protected void onPause() { super.onPause(); web.onPause(); }
    @Override protected void onResume() { super.onResume(); web.onResume(); }
    @Override protected void onDestroy() { if (web != null) { web.removeJavascriptInterface("SeringaAndroid"); web.destroy(); } super.onDestroy(); }

    /** Pontes chamadas pela app (site/app/app.js). Recebem apenas dados que a própria pessoa introduziu. */
    final class Ponte {
        @JavascriptInterface public String plataforma() { return "android"; }

        /** WebViews antigos não passam o modo escuro do sistema à página; a app pergunta aqui. */
        @JavascriptInterface public boolean modoNoturno() {
            return (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        }

        @JavascriptInterface public String salvarArquivo(String nome, String mime, String base64) {
            try {
                String limpo = nome.replaceAll("[^A-Za-z0-9._-]", "_");
                byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.MediaColumns.DISPLAY_NAME, limpo);
                    cv.put(MediaStore.MediaColumns.MIME_TYPE, mime);
                    cv.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Seringa");
                    Uri alvo = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                    if (alvo == null) return "Não consegui salvar o arquivo.";
                    try (OutputStream o = getContentResolver().openOutputStream(alvo)) { o.write(bytes); }
                    return "Salvo em Downloads/Seringa: " + limpo;
                } else {
                    File dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                    if (dir == null) return "Não consegui salvar o arquivo.";
                    File f = new File(dir, limpo);
                    try (FileOutputStream o = new FileOutputStream(f)) { o.write(bytes); }
                    return "Salvo em " + f.getAbsolutePath();
                }
            } catch (Exception e) {
                return "Não consegui salvar o arquivo.";
            }
        }

        @JavascriptInterface public boolean adicionarCalendario(long inicio, long fim, String titulo, String descricao, String regra) {
            Intent i = new Intent(Intent.ACTION_INSERT).setData(CalendarContract.Events.CONTENT_URI)
                .putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, inicio)
                .putExtra(CalendarContract.EXTRA_EVENT_END_TIME, fim)
                .putExtra(CalendarContract.Events.TITLE, titulo)
                .putExtra(CalendarContract.Events.DESCRIPTION, descricao)
                .putExtra(CalendarContract.Events.RRULE, regra)
                .putExtra(CalendarContract.Events.HAS_ALARM, 1);
            if (i.resolveActivity(getPackageManager()) == null) return false;
            runOnUiThread(() -> { try { startActivity(i); } catch (ActivityNotFoundException e) { /* sem calendário */ } });
            return true;
        }

        @JavascriptInterface public void agendarLembrete(long quando, String titulo, String texto) {
            Lembretes.guardar(MainActivity.this, quando, titulo, texto);
        }
        @JavascriptInterface public void cancelarLembrete() { Lembretes.cancelar(MainActivity.this); }
        @JavascriptInterface public String proximoLembrete() { return String.valueOf(Lembretes.quando(MainActivity.this)); }

        @JavascriptInterface public void pedirNotificacoes() {
            if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                runOnUiThread(() -> requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, PEDIDO_NOTIFICACOES));
            }
        }

        @JavascriptInterface public void imprimir() {
            runOnUiThread(() -> {
                PrintManager pm = (PrintManager) getSystemService(PRINT_SERVICE);
                if (pm != null) pm.print("Seringa — relatório", web.createPrintDocumentAdapter("Relatorio-Seringa"), new PrintAttributes.Builder().build());
            });
        }
    }
}
