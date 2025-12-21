#!/bin/bash
# Polargraph Pi Setup Script
# Run as: sudo bash setup.sh

set -e

echo "=================================="
echo "  Polargraph Pi Setup"
echo "=================================="

# Update system
echo "[1/8] Updating system..."
apt-get update && apt-get upgrade -y

# Install dependencies
echo "[2/8] Installing dependencies..."
apt-get install -y python3-pip python3-venv python3-dev \
    libjpeg-dev zlib1g-dev libfreetype6-dev \
    avahi-daemon avahi-utils libcairo2-dev

# Create user if not exists
if ! id "pi" &>/dev/null; then
    echo "[3/8] Creating pi user..."
    useradd -m -s /bin/bash pi
    usermod -aG dialout,gpio pi
else
    echo "[3/8] User pi exists, adding to groups..."
    usermod -aG dialout,gpio pi
fi

# Setup directory
echo "[4/8] Setting up application..."
INSTALL_DIR="/home/pi/polargraph"

if [ -d "$INSTALL_DIR" ]; then
    echo "  Directory exists, updating..."
    cd "$INSTALL_DIR"
    git pull 2>/dev/null || true
else
    echo "  Cloning repository..."
    git clone https://github.com/Twarner491/polargraph.git "$INSTALL_DIR" 2>/dev/null || \
    cp -r "$(dirname "$0")" "$INSTALL_DIR"
fi

# Set ownership
chown -R pi:pi "$INSTALL_DIR"

# Create virtual environment
echo "[5/8] Creating Python environment..."
cd "$INSTALL_DIR"
sudo -u pi python3 -m venv venv
sudo -u pi ./venv/bin/pip install --upgrade pip
sudo -u pi ./venv/bin/pip install -r requirements.txt

# Create required directories
echo "[6/8] Creating directories..."
mkdir -p "$INSTALL_DIR/src/uploads"
mkdir -p "$INSTALL_DIR/src/config"
chown -R pi:pi "$INSTALL_DIR"

# Install systemd services
echo "[7/8] Installing services..."
cp "$INSTALL_DIR/system-config/polargraph.service" /etc/systemd/system/
cp "$INSTALL_DIR/system-config/avahi-alias.service" /etc/systemd/system/

systemctl daemon-reload
systemctl enable polargraph.service
systemctl enable avahi-alias.service
systemctl enable avahi-daemon.service

# Set hostname
echo "[8/8] Configuring hostname..."
hostnamectl set-hostname plotter

# Update /etc/hosts
if ! grep -q "plotter" /etc/hosts; then
    sed -i 's/127.0.1.1.*/127.0.1.1\tplotter/' /etc/hosts
fi

echo ""
echo "=================================="
echo "  Setup Complete!"
echo "=================================="
echo ""
echo "Starting services..."
systemctl start avahi-daemon
systemctl start avahi-alias
systemctl start polargraph

echo ""
echo "Access the plotter at: http://plotter.local"
echo "Or via IP: http://$(hostname -I | awk '{print $1}')"
echo ""
echo "Reboot recommended: sudo reboot"

