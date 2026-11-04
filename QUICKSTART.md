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

### 3. Access Your Dashboard
- Open browser and go to: `http://[your-pi-ip]:3000`
- Find your Pi IP with: `hostname -I`

## 🔌 Connect OBD2 Adapter

1. **Plug in your OBD2 adapter** (USB)
2. **Check it's detected**: `ls /dev/ttyUSB*`
3. **If using different device**, edit the docker-compose.yml device mapping

## 🛠️ Management Commands

```bash
cd ~/Documents/obd2dashboard

# View logs
docker-compose logs -f

# Stop application
docker-compose down

# Start application
docker-compose up -d

# Update to latest version
./deploy-pi.sh
```

## 📱 Mobile Access

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
