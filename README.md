# Polargraph

Web-based control interface for a custom 60" × 48" polargraph pen plotter. Runs on Raspberry Pi 5, accessible at `plotter.local`.

Full project writeup at [teddywarner.org/Projects/Polargraph](https://teddywarner.org/Projects/Polargraph/).

## Hardware

- **Controller**: Arduino Mega 2560 + RAMPS 1.4 shield
- **Motors**: 2× NEMA 17 (X/Y for left/right belt control)
- **Pen**: Servo on servo0 port
- **Endstops**: X min (left) and Y min (right)
- **Work Area**: A0 paper (841 × 1189 mm)

## Pi Setup

### Quick Install

```bash
# Flash Raspberry Pi OS Lite (64-bit) to SD card
# Enable SSH and configure WiFi in Imager

# SSH into Pi
ssh pi@raspberrypi.local

# Clone and install
git clone https://github.com/Twarner491/polargraph.git
cd polargraph
sudo bash setup.sh
sudo reboot
```

### Manual Install

```bash
# Install dependencies
sudo apt update && sudo apt install -y python3-pip python3-venv avahi-daemon

# Setup Python environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run manually
cd src
python app.py
```

### Access

After setup: **http://plotter.local** or `http://<pi-ip-address>`

## Features

- **Control**: Home, jog, pen up/down, motor enable/disable
- **Generate**: Spirograph, maze, dragon curve, Hilbert curve, fractals, flow fields
- **Convert Images**: Spiral, crosshatch, pulse lines, stipple, squares, random walk
- **File Support**: SVG, DXF, G-code, PNG, JPG, GIF, BMP
- **Export**: G-code, SVG
- **Real-time**: WebSocket console, progress tracking

## G-code Reference

| Command | Description |
|---------|-------------|
| `G28 X Y` | Home both axes |
| `G0 X_ Y_ F_` | Rapid move (pen up) |
| `G1 X_ Y_ F_` | Linear move (pen down) |
| `M280 P0 S_ T_` | Servo angle (S=degrees, T=delay ms) |
| `M17` / `M18` | Enable / disable motors |
| `M112` | Emergency stop |

## Project Structure

```
polargraph/
├── src/
│   ├── app.py              # Flask application
│   ├── modules/            # Backend modules
│   │   ├── serial_handler.py
│   │   ├── gcode_generator.py
│   │   ├── image_converter.py
│   │   ├── turtle_generator.py
│   │   ├── file_handler.py
│   │   └── plotter_settings.py
│   ├── static/             # CSS, JS
│   └── templates/          # HTML
├── system-config/          # Systemd services
├── submodules/
│   ├── Makelangelo-firmware/
│   └── Makelangelo-software/
├── setup.sh
└── requirements.txt
```

## Configuration

Machine settings adjustable via web UI → Settings tab:
- Machine dimensions
- Work area limits  
- Pen servo angles (up: 90°, down: 25°)
- Feed rates (travel: 3000, draw: 2000 mm/min)

Settings saved to `src/config/settings.json`

---

- [Fork this repository](https://github.com/Twarner491/polargraph/fork)
- [Watch this repo](https://github.com/Twarner491/polargraph/subscription)
- [Create issue](https://github.com/Twarner491/polargraph/issues/new)
