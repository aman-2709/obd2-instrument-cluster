# 🚗 OBD2 Instrument Cluster - Quick Start (Raspberry Pi)

Deploy your OBD2 Instrument Cluster on Raspberry Pi in just a few commands!

## ⚡ Quick Install

### 1. Install Docker (one-time setup)
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker,dialout $USER

# Install Docker Compose Plugin
sudo apt update
sudo apt install -y docker-compose-plugin

# Reboot to apply changes
sudo reboot
```

### 2. Deploy the Application
```bash
# Download and run deployment script
curl -fsSL https://raw.githubusercontent.com/aman-2709/obd2-instrument-cluster/main/deploy-pi.sh -o deploy-pi.sh
chmod +x deploy-pi.sh
./deploy-pi.sh
```

The script works in `~/obd2dashboard` (it clones the repository there on the first run) and deploys the newest release. To deploy a specific version: `OBD_VERSION=3.1.0 ./deploy-pi.sh`.

### 3. Access Your Dashboard
- On the Pi itself, open a browser and go to: `http://localhost:3000`
- The dashboard shows data only in a browser on the Pi. From another device the page loads but stays empty for now (see Mobile Access).

## 🔌 Connect OBD2 Adapter

1. **Plug in your OBD2 adapter** (USB)
2. **Check it's detected**: `ls /dev/ttyUSB*`
3. **If it is a different device** (for example `/dev/ttyACM0`, or `/dev/serial0` for the Pi's GPIO UART), name it when you deploy: `OBD_PORT=/dev/ttyACM0 ./deploy-pi.sh`. The default is `/dev/ttyUSB0`.

## 🛠️ Management Commands

```bash
cd ~/obd2dashboard

# View logs (use the version you deployed; the deploy script prints it)
OBD_VERSION=3.1.0 docker compose -f docker-compose.prod.yml logs -f

# Stop application
OBD_VERSION=3.1.0 docker compose -f docker-compose.prod.yml down

# Start application (add OBD_PORT=... if your adapter is not /dev/ttyUSB0)
OBD_VERSION=3.1.0 docker compose -f docker-compose.prod.yml up -d

# Update to the newest release
./deploy-pi.sh
```

Compose needs `OBD_VERSION` for every command on this file, even `logs` and `down`.

## 📱 Mobile Access

**Known limitation:** from another device the page loads, but it shows no data. The page connects to the backend at `ws://localhost:8000/ws` only when it is opened as `localhost`; from any other address it tries `ws://obd_backend:8000/ws`, a name only the containers can resolve. Until that is fixed, use a browser on the Pi itself.

To load the page from a phone or tablet anyway:

1. Find your Pi's IP: `hostname -I`
2. On your phone/tablet, browse to: `http://192.168.1.XXX:3000`
3. Add to home screen for app-like experience

## 🚨 Troubleshooting

### Can't access OBD2 device?
```bash
# Give permission to device
sudo chmod 666 /dev/ttyUSB0

# Or add user to dialout group
sudo usermod -aG dialout $USER
sudo reboot
```

### Docker permission denied?
```bash
sudo usermod -aG docker $USER
sudo reboot
```

### Dashboard loads but shows no data?
```bash
# Open it in a browser on the Pi itself: http://localhost:3000
# (other devices cannot reach the backend yet, see Mobile Access)

# Then check the backend's log
docker logs obd_backend
```

### Can't connect to dashboard?
```bash
# Check if services are running
docker ps

# Check Pi's IP address
hostname -I

# Check firewall (if enabled)
sudo ufw status
```

---

**Full documentation**: [docs/raspberry-pi-deployment.md](docs/raspberry-pi-deployment.md)

**Need help?** Create an issue: https://github.com/aman-2709/obd2-instrument-cluster/issues
