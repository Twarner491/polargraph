# Polargraph

*Have a hard time deciding what to hang on your walls? Boy, do I have the solution for you.*

Wall mounted, web accessible polargraph pen plotter. Full project writeup at [teddywarner.org/Projects/Polargraph](https://teddywarner.org/Projects/Polargraph/).

---

## BOM

| Qty | Description | Price | Link |
|-----|-------------|-------|------|
| 1 | thingy| $XXX | [Amazon](link) |

---

All project CAD may be found in the [hardware](https://github.com/Twarner491/polargraph/hardware) directory in this repo. Full assembly instructions may be found in the [full project writeup](https://teddywarner.org/Projects/Polargraph/).

---

## 1. Raspberry Pi Setup

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

---

## 2. Clone Repository

```bash
git clone https://github.com/Twarner491/polargraph.git ~/polargraph
cd ~/polargraph
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## 3. USB Permissions

Set permissions for the plotter's USB serial connection:

```bash
sudo cp system-config/99-polargraph.rules /etc/udev/rules.d/
sudo udevadm control --reload-rules && sudo udevadm trigger
sudo usermod -a -G dialout pi
```

---

## 4. Start Flask Server

Enable the service to auto-start on boot:

```bash
sudo cp system-config/polargraph.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now polargraph.service
```

Access at **http://plotter.local**

---

## 5. Home Assistant Integration (Optional)

For remote access via `plotter.onethreenine.net` → Home Assistant → MQTT → Pi.

### Home Assistant Automation

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

### Enable CORS

Add to `configuration.yaml`:

```yaml
http:
  cors_allowed_origins:
    - https://plotter.onethreenine.net
```

### Pi MQTT Setup

Edit `src/mqtt_subscriber.py` with your MQTT broker IP:

```python
MQTT_BROKER = "192.168.1.XXX"  # Your Home Assistant IP
```

Then enable the MQTT service:

```bash
sudo cp system-config/polargraph-mqtt.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now polargraph-mqtt.service
```

### Frontend Configuration

Edit `build_static.py` and set your webhook URL:

```python
HA_WEBHOOK_URL = "https://your-ha-instance.duckdns.org/api/webhook/polargraph_command"
```

Then build and deploy:

```bash
python build_static.py
git add docs/
git commit -m "Update static site"
git push
```

The site will be available at **https://plotter.onethreenine.net** via GitHub Pages + Cloudflare.

---

- [Fork this repository](https://github.com/Twarner491/polargraph/fork)
- [Watch this repo](https://github.com/Twarner491/polargraph/subscription)
- [Create issue](https://github.com/Twarner491/polargraph/issues/new)
