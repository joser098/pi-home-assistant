#!/usr/bin/env bash
# Configura la Raspberry Pi (Raspberry Pi OS Bookworm, escritorio con labwc/Wayland)
# para abrir la app en Chromium modo kiosko al arrancar.
#
# Uso:  ./install.sh https://tu-app.vercel.app
set -euo pipefail

URL="${1:-}"
if [[ -z "$URL" ]]; then
  echo "Uso: $0 <URL de la app>   (ej: https://casa.vercel.app)" >&2
  exit 1
fi
KIOSK_URL="${URL%/}/?kiosk=1&nocursor=1"

echo "→ Instalando paquetes"
sudo apt-get update -qq
if ! command -v chromium >/dev/null && ! command -v chromium-browser >/dev/null; then
  sudo apt-get install -y chromium
fi
CHROMIUM="$(command -v chromium || command -v chromium-browser)"

echo "→ Desactivando el apagado automático de pantalla (el modo noche lo maneja la app)"
sudo raspi-config nonint do_blanking 1 || true

echo "→ Activando login automático al escritorio"
sudo raspi-config nonint do_boot_behaviour B4 || true

echo "→ Creando el lanzador del kiosko"
mkdir -p "$HOME/.local/bin"
cat > "$HOME/.local/bin/pihome-kiosk" <<EOF
#!/usr/bin/env bash
# Espera la red un rato (sin red igual arranca: la app usa su cache offline).
for i in \$(seq 1 20); do ping -c1 -W1 1.1.1.1 >/dev/null 2>&1 && break; sleep 1; done
# Evita el cartel de "Chromium no se cerró correctamente".
PREFS="\$HOME/.config/chromium/Default/Preferences"
[ -f "\$PREFS" ] && sed -i 's/"exited_cleanly":false/"exited_cleanly":true/; s/"exit_type":"[^"]*"/"exit_type":"Normal"/' "\$PREFS"
exec "$CHROMIUM" \\
  --kiosk "$KIOSK_URL" \\
  --ozone-platform=wayland \\
  --noerrdialogs --disable-infobars --no-first-run \\
  --disable-session-crashed-bubble --disable-features=Translate \\
  --overscroll-history-navigation=0 --disable-pinch \\
  --password-store=basic \\
  --check-for-update-interval=31536000
EOF
chmod +x "$HOME/.local/bin/pihome-kiosk"

echo "→ Agregando el kiosko al autostart de labwc"
AUTOSTART="$HOME/.config/labwc/autostart"
mkdir -p "$(dirname "$AUTOSTART")"
touch "$AUTOSTART"
sed -i '/pihome-kiosk/d' "$AUTOSTART"
echo "$HOME/.local/bin/pihome-kiosk &" >> "$AUTOSTART"

echo "→ Reinicio diario a las 4:30 (mantiene Chromium fresco)"
( sudo crontab -l 2>/dev/null | grep -v pihome-reboot; echo "30 4 * * * /sbin/shutdown -r now # pihome-reboot" ) | sudo crontab -

cat <<EOF

✓ Listo. Reiniciá la Pi:  sudo reboot

Primera vez: la pantalla va a pedir login. Conectá un teclado USB (o entrá por VNC)
y usá el usuario del kiosko. La sesión queda guardada.

Para salir del kiosko: conectá un teclado y apretá Alt+F4.
EOF
