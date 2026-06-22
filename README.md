# Polargraph

*Have a hard time deciding what to hang on your walls? Boy, do I have the solution for you.*

Wall mounted, web accessible polargraph pen plotter. Full project writeup at [teddywarner.org/Projects/Polargraph](https://teddywarner.org/Projects/Polargraph/).

<img alt="polargraph" src="docs\static\thumb.png" />

---

All project CAD may be found in the [hardware](https://github.com/Twarner491/polargraph/tree/main/hardware) directory in this repo. Full assembly instructions may be found in the [full project writeup](https://teddywarner.org/Projects/Polargraph/).

### BOM

| Qty | Description | Price | Link | Notes |
|-----|-------------|-------|------|-------|
| 1 | Raspberry Pi 5 | $89.94 | [Link](https://amzn.to/4vjlhqI) | 8GB |
| 1 | Raspberry Pi 5 Active Cooler | $9.90 | [Link](https://amzn.to/4va5XNp) | |
| 1 | Micro SD Card | $16.68 | [Link](https://amzn.to/3SCuewS) | ≥32GB |
| 1 | RAMPS 1.4 Shield | $9.39 | [Link](https://amzn.to/4uwKVak) | |
| 2 | A4988 Stepper Drivers | $9.98 | [Link](https://amzn.to/4uupO8D) | |
| 2 | Nema 17 Pancake Stepper | $21.00 | [Link](https://amzn.to/3QmylfZ) | 42mm x 23mm |
| 1 | MG90S Micro Servo | $9.99 | [Link](https://amzn.to/3QA8Mbn) | 9G |
| 2 | Stepper Motor Cables | $10.99 | [Link](https://amzn.to/4xJbtZ5) | 2M length |
| 2 | GT2 Timing Belt | $19.98 | [Link](https://amzn.to/4vKBLYQ) | 6mm width, 5M length |
| 2 | GT2 Timing Belt Pulley | $6.99 | [Link](https://amzn.to/4opOSfu) | 16 Teeth, 5mm bore |
| 2 | 6806-2RS Ball Bearings | $30.00 | [Link](https://amzn.to/4v6W5ng) | 30mm x 42mm x 7mm |
| 1 | 12V Power Supply | $35.00 | [Link](https://amzn.to/4eqKFUB) | |
| 1 | DC/DC Buck Boost | $9.99 | [Link](https://amzn.to/4xqg8i5) | |
| 1 | C14 AC Inlet | $9.04 | [Link](https://amzn.to/4ahK7z9) | |
| 1 | AC Power Cord | $9.39 | [Link](https://amzn.to/4fIMUF0) | Down angle |
| - | 14 Gauge Wire | $13.99 | [Link](https://a.co/d/foroDOo) | A couple feet |
| 2 | Limit Switch | $5.99 | [Link](https://amzn.to/3S1PjRm) | |
| 3 | Tungsten Weights | $89.97 | [Link](https://amzn.to/4oAiBTd) | |
| 1 | 1/4" Maple Plywood | $37.71 | [Link](https://www.lowes.com/pd/Top-Choice-SkyPly-1-4-in-HPVA-Maple-Plywood-Application-as-4-x-8/1000083311) | 4'x8' sheet |
| 4 | 1"x3" Spruce Pine Boards | $27.92 | [Link](https://www.lowes.com/pd/1-in-x-3-in-x-8-ft-Spruce-Pine-Fir-Furring-Strip/5014776481) | 8' length |
| 1 | Wood PLA | $25.99 | [Link](https://amzn.to/4uAzpLj) | 1.75mm, 1 spool |
| 1 | A0 Paper Roll | $29.86 | [Link](https://amzn.to/4uwP6Tw) | 36" x 1200" |
| 1 | SAKURA Pigma Micron 05 Pens | $20.97 | [Link](https://amzn.to/4fHYW1p) | Multicolor pack |
| 1 | French Cleat | $31.00 | [Link](https://www.homedepot.com/p/OOK-30-in-300-lbs-Picture-and-Mirror-French-Cleat-Hanging-System-534269/302022526) | 30 in. 300 lbs. |
| 1 | Felt Pads | $9.97 | [Link](https://www.homedepot.com/p/Everbilt-Assorted-Beige-Self-Adhesive-Round-Furniture-Sliders-Furniture-Pads-for-Hard-Floors-Surface-Bumpers-Value-Pack-108-Pc-49032/206855255) | Assorted Pack |
| - | M2 and M3 Hardware | - | - | Misc nuts and bolts |
| - | Jumper Wires | - | - | Misc |

*Total: ~$595.82*

### Kits

I offer a kit for the polargraph with electronics and neccessary hardware. I put up a store for some of my open-source projects and will soon be able to offer kits cheaper than buying all the components individually, once I start buying in bulk. Check it out!

- [GPENT kit](https://theodore.net/store/polargraph/)

---

**Raspberry Pi Setup**

Flash Raspberry Pi OS Lite (64-bit) and configure WiFi. SSH in:

```bash
ssh pi@raspberrypi.local
sudo apt update && sudo apt upgrade -y
```

Set hostname to `plotter`:

```bash
sudo hostnamectl set-hostname plotter
sudo nano /etc/hosts  # Change 127.0.1.1 to plotter
sudo reboot
```

Install dependencies:

```bash
sudo apt install -y python3-pip python3-venv avahi-daemon git
sudo systemctl enable avahi-daemon
```

**Clone Repository**

```bash
git clone https://github.com/Twarner491/polargraph.git ~/polargraph
cd ~/polargraph
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**USB Permissions**

Set permissions for the plotter's USB serial connection:

```bash
sudo cp system-config/99-polargraph.rules /etc/udev/rules.d/
sudo udevadm control --reload-rules && sudo udevadm trigger
sudo usermod -a -G dialout pi
```

**Start Flask Server**

Enable the service to auto-start on boot. If your username is not `pi`, edit the service files first to replace `/home/pi/` with your home directory:

```bash
# Edit if needed: nano system-config/polargraph.service
sudo cp system-config/polargraph.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now polargraph.service
```

Access at **http://plotter.local**

**Home Assistant Integration *(Optional)***

For remote access via `plotter.onethreenine.net` → Home Assistant → MQTT → Pi.

*Home Assistant Automation*

Add to `automations.yaml`:

```yaml
alias: "Polargraph Command"
trigger:
  - platform: webhook
    webhook_id: polargraph_command
    allowed_methods: [POST]
    local_only: false
action:
  - service: mqtt.publish
    data:
      topic: "home/polargraph/command"
      payload_template: "{{ trigger.json | tojson }}"
```

*Enable CORS*

Add to `configuration.yaml`:

```yaml
http:
  cors_allowed_origins:
    - https://your-domain.com
```

*Pi MQTT Setup*

Create a `.env` file in the polargraph directory with your MQTT broker settings:

```bash
MQTT_BROKER=192.168.1.XXX
MQTT_PORT=1883
MQTT_USER=
MQTT_PASS=
```

Then enable the MQTT service:

```bash
pip install paho-mqtt
sudo cp system-config/polargraph-mqtt.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now polargraph-mqtt.service
```

*Frontend Configuration (GitHub Secrets)*

To enable remote access on your fork, add these GitHub Secrets to your repository:

1. Go to your fork's **Settings** → **Secrets and variables** → **Actions**
2. Add the following secrets:

| Secret Name | Value |
|-------------|-------|
| `REMOTE_WEBHOOK_URL` | Your Home Assistant webhook URL (e.g., `https://your-ha.duckdns.org/api/webhook/polargraph_command`) |
| `REMOTE_ACCESS_KEY` | A password of your choosing for activating remote mode |

3. Push any change or manually trigger the **Deploy to GitHub Pages** workflow

Once deployed, enter your access key in the Console tab to activate remote mode.

---

- [Fork this repository](https://github.com/Twarner491/polargraph/fork)
- [Watch this repo](https://github.com/Twarner491/polargraph/subscription)
- [Create issue](https://github.com/Twarner491/polargraph/issues/new)
