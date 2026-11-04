#!/bin/bash

# OBD2 Instrument Cluster Deployment Script for Raspberry Pi
# Run this script directly on your Raspberry Pi for manual deployment

set -e

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/aman-2709/obd2-instrument-cluster.git"
DEPLOY_DIR="$HOME/obd2dashboard"
REGISTRY="ghcr.io"
IMAGE_NAME="aman-2709/obd2-instrument-cluster"

echo -e "${BLUE}🚗 OBD2 Instrument Cluster Deployment Script${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed!${NC}"
    echo -e "${YELLOW}Please install Docker first:${NC}"
    echo "curl -fsSL https://get.docker.com -o get-docker.sh"
    echo "sudo sh get-docker.sh"
    echo "sudo usermod -aG docker,dialout \$USER"
    echo "sudo reboot"
    exit 1
fi

# Determine Docker Compose command (support Compose V2 plugin 'docker compose' and legacy 'docker-compose')
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo -e "${RED}❌ Docker Compose is not installed!${NC}"
    echo -e "${YELLOW}Please install Docker Compose plugin:${NC}"
    echo "sudo apt update && sudo apt install -y docker-compose-plugin"
    exit 1
fi

# Check if user is in docker and dialout groups
if ! groups $USER | grep -q docker; then
    echo -e "${YELLOW}⚠️  User $USER is not in the docker group${NC}"
    echo -e "${YELLOW}Run: sudo usermod -aG docker \$USER && sudo reboot${NC}"
    echo -e "${YELLOW}Continuing anyway (may require sudo)...${NC}"
    echo ""
fi

if ! groups $USER | grep -q dialout; then
    echo -e "${YELLOW}⚠️  User $USER is not in the dialout group (needed for serial/OBD USB access)${NC}"
    echo -e "${YELLOW}Run: sudo usermod -aG dialout \$USER${NC}"
    echo ""
fi

# Create deployment directory
mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

echo -e "${BLUE}📂 Working directory: $DEPLOY_DIR${NC}"
echo ""

# Clone or update repository
if [ -d ".git" ]; then
    echo -e "${YELLOW}📥 Updating repository...${NC}"
    git pull origin main
else
    echo -e "${YELLOW}📥 Cloning repository...${NC}"
    git clone "$REPO_URL" .
fi

echo ""

# Check for OBD2 devices
echo -e "${BLUE}🔌 Checking for OBD2 devices...${NC}"
OBD_DEVICES=$(ls /dev/ttyUSB* /dev/serial* /dev/ttyAMA* 2>/dev/null || true)
if [ -n "$OBD_DEVICES" ]; then
    echo -e "${GREEN}✅ Found OBD2 devices:${NC}"
    echo "$OBD_DEVICES"
else
    echo -e "${YELLOW}⚠️  No OBD2 devices found${NC}"
    echo -e "${YELLOW}Make sure your OBD2 adapter is connected${NC}"
fi
echo ""

# Stop existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
$COMPOSE_CMD down 2>/dev/null || true
echo ""

# Deploy containers (pull if available, build locally otherwise)
export REGISTRY="$REGISTRY"
export IMAGE_NAME="$IMAGE_NAME"

COMPOSE_ARGS=""
if [ -f "docker-compose.prod.yml" ]; then
    echo -e "${BLUE}Using production configuration (docker-compose.prod.yml)...${NC}"
    COMPOSE_ARGS="-f docker-compose.yml -f docker-compose.prod.yml"
fi

echo -e "${YELLOW}📦 Deploying application...${NC}"
if $COMPOSE_CMD $COMPOSE_ARGS pull 2>/dev/null; then
    echo -e "${YELLOW}🚀 Starting services from pulled images...${NC}"
    $COMPOSE_CMD $COMPOSE_ARGS up -d
else
    echo -e "${YELLOW}⚠️  Image pull unavailable or failed. Building images locally on Raspberry Pi...${NC}"
    $COMPOSE_CMD $COMPOSE_ARGS up --build -d
fi

echo ""

# Wait for services to start
echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 15

# Check service status
echo -e "${BLUE}🔍 Checking service status...${NC}"
$COMPOSE_CMD $COMPOSE_ARGS ps

echo ""

# Get Pi IP address
PI_IP=$(hostname -I | awk '{print $1}')

# Health checks
echo -e "${BLUE}❤️  Running health checks...${NC}"
if curl -f http://localhost:3000 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is running${NC}"
    FRONTEND_STATUS="✅ Running"
else
    echo -e "${RED}❌ Frontend health check failed${NC}"
    FRONTEND_STATUS="❌ Failed"
fi

if curl -f http://localhost:8000 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running${NC}"
    BACKEND_STATUS="✅ Running"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
    BACKEND_STATUS="❌ Failed"
fi

echo ""

# Show recent logs if there are issues
if [[ "$FRONTEND_STATUS" == *"Failed"* ]] || [[ "$BACKEND_STATUS" == *"Failed"* ]]; then
    echo -e "${YELLOW}📄 Recent logs (last 10 lines):${NC}"
    $COMPOSE_CMD $COMPOSE_ARGS logs --tail=10
    echo ""
fi

echo -e "${GREEN}🎉 Deployment completed!${NC}"
echo -e "${GREEN}========================${NC}"
echo ""
echo -e "${BLUE}📍 Raspberry Pi IP: ${YELLOW}$PI_IP${NC}"
echo -e "${BLUE}🌐 Frontend: ${YELLOW}http://$PI_IP:3000${NC}"
echo -e "${BLUE}🔌 Backend: ${YELLOW}http://$PI_IP:8000${NC}"
echo -e "${BLUE}📊 Frontend Status: $FRONTEND_STATUS${NC}"
echo -e "${BLUE}🔧 Backend Status: $BACKEND_STATUS${NC}"
echo ""
echo -e "${BLUE}📝 Useful commands:${NC}"
echo -e "${YELLOW}  View logs:${NC} $COMPOSE_CMD logs -f"
echo -e "${YELLOW}  Stop app:${NC} $COMPOSE_CMD down"
echo -e "${YELLOW}  Restart:${NC} $COMPOSE_CMD restart"
echo -e "${YELLOW}  Rebuild locally:${NC} $COMPOSE_CMD up --build -d"
echo -e "${YELLOW}  Update:${NC} ./deploy-pi.sh"
echo ""

# Check if OBD2 device access might be an issue
if [ -n "$OBD_DEVICES" ]; then
    for device in $OBD_DEVICES; do
        if [ ! -r "$device" ] || [ ! -w "$device" ]; then
            echo -e "${YELLOW}⚠️  Permission issue with $device${NC}"
            echo -e "${YELLOW}   Run: sudo chmod 666 $device${NC}"
            echo -e "${YELLOW}   Or: sudo usermod -aG dialout \$USER${NC}"
        fi
    done
    echo ""
fi

echo -e "${GREEN}🚗 Your OBD2 Instrument Cluster is ready!${NC}"