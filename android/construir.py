#!/usr/bin/env python3
"""Compila o APK Android do Seringa sem Gradle (só JDK 17 + Android SDK: platforms/android-35 e build-tools 35).

A app NÃO é reescrita: os arquivos de site/app/ e site/conteudo.js são copiados tal como estão para os assets do APK.

Uso (na raiz do repositório):
    python android/construir.py                 # APK de publicação -> site/downloads/Seringa.apk
    python android/construir.py --teste         # APK depurável para testes automáticos -> android/build/Seringa-teste.apk

Chave de assinatura: fica FORA do repositório (por defeito em ../seringa_android_chave/ ao lado do repo, ou na pasta
indicada por SERINGA_CHAVE_DIR). Se não existir, é criada. Guarde essa pasta: sem ela não é possível publicar
atualizações que o Android aceite por cima da versão instalada.
"""
import hashlib, os, secrets, shutil, subprocess, sys, zipfile
from pathlib import Path

VERSAO_CODIGO = 1
VERSAO_NOME = "1.0.0"
PACOTE = "com.bfavore.seringa"

RAIZ = Path(__file__).resolve().parent.parent
AND = RAIZ / "android"
BUILD = AND / "build"
SDK = Path(os.environ.get("ANDROID_HOME") or os.environ.get("ANDROID_SDK_ROOT") or Path(os.environ.get("LOCALAPPDATA", "")) / "Android" / "Sdk")
BT = SDK / "build-tools" / "35.0.0"
PLAT = SDK / "platforms" / "android-35" / "android.jar"
WIN = os.name == "nt"
def ferr(n): return str(BT / (n + (".bat" if WIN and n in ("d8", "apksigner") else ".exe" if WIN else "")))
def correr(*a, **k):
    print("  $", " ".join(str(x) for x in a)[:180]); subprocess.run([str(x) for x in a], check=True, **k)

def chave():
    d = Path(os.environ.get("SERINGA_CHAVE_DIR") or RAIZ.parent / "seringa_android_chave")
    ks, pw = d / "seringa-release.jks", d / "senha.txt"
    if not ks.exists():
        d.mkdir(parents=True, exist_ok=True)
        senha = secrets.token_urlsafe(24); pw.write_text(senha, encoding="utf-8")
        correr("keytool", "-genkeypair", "-keystore", ks, "-alias", "seringa", "-keyalg", "RSA", "-keysize", "3072", "-validity", "10000",
               "-storepass", senha, "-keypass", senha, "-dname", "CN=Seringa, O=BFAVORE, C=BR")
        print("  chave criada em", d, "(guarde esta pasta; não a coloque no repositório)")
    return ks, pw

def main():
    teste = "--teste" in sys.argv
    for p in (BT, PLAT): assert p.exists(), f"Falta {p} no Android SDK"
    if BUILD.exists(): shutil.rmtree(BUILD)
    www = BUILD / "assets" / "www"; (www / "app").mkdir(parents=True)
    # 1) a app real, sem cópia de lógica: site/app/* + site/conteudo.js
    for f in (RAIZ / "site" / "app").iterdir():
        if f.is_file(): shutil.copy2(f, www / "app" / f.name)
    shutil.copy2(RAIZ / "site" / "conteudo.js", www / "conteudo.js")
    # 2) recursos e manifesto
    correr(ferr("aapt2"), "compile", "--dir", AND / "res", "-o", BUILD / "res.zip")
    gen = BUILD / "gen"; gen.mkdir()
    base = BUILD / "base.apk"
    args = [ferr("aapt2"), "link", "-o", base, "-I", PLAT, "--manifest", AND / "AndroidManifest.xml", "-A", BUILD / "assets",
            "--min-sdk-version", "24", "--target-sdk-version", "35", "--version-code", str(VERSAO_CODIGO), "--version-name", VERSAO_NOME,
            "--rename-manifest-package", PACOTE, "--java", gen, "--auto-add-overlay", BUILD / "res.zip"]
    if teste: args.insert(2, "--debug-mode")
    correr(*args)
    # 3) Java -> DEX
    cls = BUILD / "classes"; cls.mkdir()
    fontes = [str(p) for p in (AND / "src").rglob("*.java")] + [str(p) for p in gen.rglob("*.java")]
    correr("javac", "--release", "8", "-encoding", "UTF-8", "-Xlint:-options", "-classpath", PLAT, "-d", cls, *fontes)
    dex = BUILD / "dex"; dex.mkdir()
    correr(ferr("d8"), "--release", "--min-api", "24", "--lib", PLAT, "--output", dex, *[str(p) for p in cls.rglob("*.class")])
    # 4) juntar DEX, alinhar e assinar
    # ZIP novo (sem anexar ao existente): mantém a compressão de cada entrada (resources.arsc fica sem compressão)
    semassin = BUILD / "sem-assinatura.apk"
    with zipfile.ZipFile(base) as zi, zipfile.ZipFile(semassin, "w") as zo:
        for info in zi.infolist():
            novo = zipfile.ZipInfo(info.filename, date_time=(2026, 1, 1, 0, 0, 0)); novo.compress_type = info.compress_type; novo.external_attr = info.external_attr
            zo.writestr(novo, zi.read(info.filename))
        dx = zipfile.ZipInfo("classes.dex", date_time=(2026, 1, 1, 0, 0, 0)); dx.compress_type = zipfile.ZIP_DEFLATED
        zo.writestr(dx, (dex / "classes.dex").read_bytes())
    alinhado = BUILD / "alinhado.apk"
    correr(ferr("zipalign"), "-p", "-f", "4", semassin, alinhado)
    correr(ferr("zipalign"), "-c", "-p", "4", alinhado)
    ks, pw = chave()
    destino = BUILD / "Seringa-teste.apk" if teste else RAIZ / "site" / "downloads" / "Seringa.apk"
    destino.parent.mkdir(parents=True, exist_ok=True)
    correr(ferr("apksigner"), "sign", "--ks", ks, "--ks-key-alias", "seringa", "--ks-pass", f"file:{pw}",
           "--v1-signing-enabled", "true", "--v2-signing-enabled", "true", "--v3-signing-enabled", "true", "--v4-signing-enabled", "false", "--out", destino, alinhado)
    correr(ferr("apksigner"), "verify", "--verbose", destino)
    h = hashlib.sha256(destino.read_bytes()).hexdigest()
    if not teste:
        (destino.parent / "Seringa.apk.sha256").write_text(f"{h}  Seringa.apk\n", encoding="utf-8")
    print(f"\nOK  {destino}\n    {destino.stat().st_size} bytes  sha256={h}")

if __name__ == "__main__":
    main()
