# Polargraph

*Have a hard time deciding what to hang on your walls? Boy, do I have the solution for you.*

Wall mounted, web accessible polargraph pen plotter. Full project writeup at [teddywarner.org/Projects/Polargraph](https://teddywarner.org/Projects/Polargraph/).

<img alt="polargraph" src="docs\static\thumb.png" />

---

All project CAD may be found in the [hardware](https://github.com/Twarner491/polargraph/tree/main/hardware) directory in this repo. Full assembly instructions may be found in the [full project writeup](https://teddywarner.org/Projects/Polargraph/).

### BOM

| Qty | Description | Price | Link |
|-----|-------------|-------|------|
| 1 | thingy| $XXX | [Amazon](link) |

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
