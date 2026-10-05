#!/usr/bin/env bash
# Configura la Raspberry Pi (Raspberry Pi OS Bookworm/Trixie con escritorio labwc/Wayland)
# para abrir la app en Chromium modo kiosko al arrancar. No necesita sudo.
#
# Uso:  ./install.sh https://tu-app.vercel.app
# Cambiar la URL después:  echo https://otra-url > ~/.config/pihome/url && pkill -x chromium
#
# Requisitos (una vez, con sudo):
#   sudo apt install -y chromium fonts-noto-color-emoji
#   sudo raspi-config nonint do_boot_behaviour B4   # login automático al escritorio
set -euo pipefail

URL="${1:-}"
if [[ -z "$URL" ]]; then
  echo "Uso: $0 <URL de la app>   (ej: https://casa.vercel.app)" >&2
  exit 1
fi
command -v chromium >/dev/null || { echo "Falta chromium: sudo apt install -y chromium" >&2; exit 1; }

mkdir -p "$HOME/.config/pihome" "$HOME/.local/bin" "$HOME/.config/labwc"
echo "${URL%/}" > "$HOME/.config/pihome/url"

echo "→ Lanzador ~/.local/bin/pihome-kiosk"
cat > "$HOME/.local/bin/pihome-kiosk" <<'EOF'
#!/usr/bin/env bash
# Kiosko PI HOME: abre la app en Chromium a pantalla completa y la reabre si se cierra.
# La URL se cambia en ~/.config/pihome/url (sin tocar este archivo).
URL_FILE="$HOME/.config/pihome/url"
PREFS="$HOME/.config/chromium/Default/Preferences"

# Espera la red hasta 30 s (sin red igual arranca: la app usa su cache).
for _ in $(seq 1 30); do ping -c1 -W1 1.1.1.1 >/dev/null 2>&1 && break; sleep 1; done

while true; do
  URL="$(head -n1 "$URL_FILE" | tr -d '[:space:]')"
  URL="${URL%/}"
  # Evita el cartel de "Chromium no se cerro correctamente".
  [ -f "$PREFS" ] && sed -i 's/"exited_cleanly":false/"exited_cleanly":true/; s/"exit_type":"[^"]*"/"exit_type":"Normal"/' "$PREFS"
  chromium \
    --kiosk "$URL/?kiosk=1&nocursor=1" \
    --ozone-platform=wayland \
    --noerrdialogs --disable-infobars --no-first-run \
    --disable-session-crashed-bubble --disable-features=Translate,TranslateUI --lang=es-AR --accept-lang=es-AR,es \
    --overscroll-history-navigation=0 --disable-pinch \
    --password-store=basic \
    --check-for-update-interval=31536000
  sleep 3
done
EOF
chmod +x "$HOME/.local/bin/pihome-kiosk"

echo "→ Autostart de labwc (reemplaza el del sistema: sin panel ni escritorio)"
AUTOSTART="$HOME/.config/labwc/autostart"
[ -f "$AUTOSTART" ] && cp "$AUTOSTART" "$AUTOSTART.bak"
cat > "$AUTOSTART" <<EOF
# PI HOME: kiosko. Reemplaza /etc/xdg/labwc/autostart (sin panel ni escritorio).
# Para volver al escritorio normal: borrar este archivo y reiniciar.
/usr/bin/kanshi &
$HOME/.local/bin/pihome-kiosk &
/usr/bin/lxsession-xdg-autostart
EOF

cat <<EOF

✓ Listo. Reiniciá la Pi (sudo reboot) o lanzalo ya:
    WAYLAND_DISPLAY=wayland-0 XDG_RUNTIME_DIR=/run/user/\$(id -u) setsid ~/.local/bin/pihome-kiosk &

Primera vez: iniciá sesión con el usuario del kiosko (teclado USB o Pi Connect → Screen sharing).
Recargar la app:  pkill -x chromium   (el lanzador la vuelve a abrir)
Salir del kiosko: pkill -f pihome-kiosk; pkill -x chromium
EOF
