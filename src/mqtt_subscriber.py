#!/usr/bin/env python3
"""
MQTT Subscriber for Polargraph - receives commands from Home Assistant
and forwards them to the local Flask server.
"""

import os
import json
import requests
import paho.mqtt.client as mqtt

# Configuration via environment variables
MQTT_BROKER = os.environ.get('MQTT_BROKER', 'localhost')
MQTT_PORT = int(os.environ.get('MQTT_PORT', '1883'))
MQTT_USER = os.environ.get('MQTT_USER', '')
MQTT_PASS = os.environ.get('MQTT_PASS', '')
MQTT_TOPIC = os.environ.get('MQTT_TOPIC', 'home/polargraph/#')

# Local Flask server
FLASK_URL = os.environ.get('FLASK_URL', 'http://localhost:80')


def on_connect(client, userdata, flags, rc):
    """Called when connected to MQTT broker."""
    if rc == 0:
        print(f"Connected to MQTT broker at {MQTT_BROKER}")
        client.subscribe(MQTT_TOPIC)
        print(f"Subscribed to {MQTT_TOPIC}")
    else:
        print(f"Connection failed with code {rc}")


def on_message(client, userdata, msg):
    """Called when a message is received."""
    try:
        topic = msg.topic
        payload = msg.payload.decode('utf-8')
        print(f"Received: {topic} -> {payload}")
        
        # Parse the command
        if topic == "home/polargraph/command":
            data = json.loads(payload)
            handle_command(data)
        elif topic == "home/polargraph/gcode":
            # Direct G-code command
            send_gcode(payload)
        elif topic == "home/polargraph/plot":
            # Start plotting with provided G-code
            data = json.loads(payload)
            start_plot(data)
            
    except Exception as e:
        print(f"Error processing message: {e}")


def handle_command(data):
    """Handle a command from MQTT."""
    cmd = data.get('command', '')
    
    endpoints = {
        'connect': '/api/connect',
        'disconnect': '/api/disconnect',
        'home': '/api/home',
        'stop': '/api/emergency_stop',
        'pen_up': '/api/pen',
        'pen_down': '/api/pen',
        'motors_on': '/api/motors',
        'motors_off': '/api/motors',
        'start': '/api/plot/start',
        'pause': '/api/plot/pause',
        'resume': '/api/plot/resume',
        'rewind': '/api/plot/rewind',
        'step': '/api/plot/step',
        'jog': '/api/jog',
        'goto': '/api/goto',
        'gcode': '/api/send_gcode',
    }
    
    if cmd in endpoints:
        try:
            payload = {}
            if cmd == 'pen_up':
                payload = {'action': 'up'}
            elif cmd == 'pen_down':
                payload = {'action': 'down'}
            elif cmd == 'motors_on':
                payload = {'enable': True}
            elif cmd == 'motors_off':
                payload = {'enable': False}
            elif cmd == 'connect':
                payload = {'port': data.get('port', '/dev/ttyUSB0')}
            elif cmd == 'jog':
                payload = {'x': data.get('x', 0), 'y': data.get('y', 0)}
            elif cmd == 'goto':
                payload = {'x': data.get('x', 0), 'y': data.get('y', 0)}
            elif cmd == 'gcode':
                payload = {'command': data.get('gcode', '')}
            elif cmd == 'start' and 'gcode' in data:
                payload = {'gcode': data.get('gcode', [])}
            
            response = requests.post(f"{FLASK_URL}{endpoints[cmd]}", json=payload, timeout=10)
            print(f"Command {cmd}: {response.status_code}")
        except Exception as e:
            print(f"Error sending command {cmd}: {e}")


def send_gcode(gcode):
    """Send a G-code command to the plotter."""
    try:
        response = requests.post(f"{FLASK_URL}/api/gcode/send", 
                                json={'command': gcode}, timeout=10)
        print(f"G-code sent: {response.status_code}")
    except Exception as e:
        print(f"Error sending G-code: {e}")


def start_plot(data):
    """Start a plot with provided G-code lines."""
    try:
        gcode = data.get('gcode', [])
        response = requests.post(f"{FLASK_URL}/api/plot/start", 
                                json={'gcode': gcode}, timeout=10)
        print(f"Plot started: {response.status_code}")
    except Exception as e:
        print(f"Error starting plot: {e}")


def main():
    """Main entry point."""
    print("Polargraph MQTT Subscriber")
    print(f"Broker: {MQTT_BROKER}:{MQTT_PORT}")
    print(f"Topic: {MQTT_TOPIC}")
    print(f"Flask: {FLASK_URL}")
    print("-" * 40)
    
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    
    if MQTT_USER and MQTT_PASS:
        client.username_pw_set(MQTT_USER, MQTT_PASS)
    
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
    except Exception as e:
        print(f"Connection error: {e}")
    finally:
        client.disconnect()


if __name__ == '__main__':
    main()

