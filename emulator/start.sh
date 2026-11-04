#!/bin/bash

# Function to clean up lockfile and processes
cleanup() {
    if [ -f "/var/run/ELM327_emulator.pid" ]; then
        local pid=$(cat /var/run/ELM327_emulator.pid 2>/dev/null)
        if [ ! -z "$pid" ]; then
            kill -9 $pid 2>/dev/null || true
        fi
        rm -f /var/run/ELM327_emulator.pid
    fi
}

# Set up trap to clean up on script exit
trap cleanup EXIT

echo "Starting OBD emulator..."

# Clean up any existing process
cleanup

# Start the OBD emulator as a daemon.
# -i 0.0.0.0 is required: ELM327-emulator 4.0.0+ listens on 127.0.0.1 by
# default, which the backend container cannot reach over the Docker network.
# Keep it on the restart calls below too.
python -m elm -n 35000 -i 0.0.0.0 --daemon

# Wait for PID file to be created
for i in {1..10}; do
    if [ -f "/var/run/ELM327_emulator.pid" ]; then
        EMULATOR_PID=$(cat /var/run/ELM327_emulator.pid)
        echo "OBD emulator started with PID: $EMULATOR_PID"
        break
    fi
    sleep 1
done

# Keep the container running
while true; do
    if [ -f "/var/run/ELM327_emulator.pid" ]; then
        EMULATOR_PID=$(cat /var/run/ELM327_emulator.pid)
        if ps -p $EMULATOR_PID > /dev/null 2>&1; then
            echo "OBD emulator process (PID: $EMULATOR_PID) is still running."
        else
            echo "OBD emulator process (PID: $EMULATOR_PID) died, restarting..."
            cleanup
            python -m elm -n 35000 -i 0.0.0.0 --daemon
            sleep 2
            if [ -f "/var/run/ELM327_emulator.pid" ]; then
                EMULATOR_PID=$(cat /var/run/ELM327_emulator.pid)
                echo "OBD emulator restarted with new PID: $EMULATOR_PID"
            else
                echo "Failed to restart OBD emulator"
            fi
        fi
    else
        echo "PID file missing, restarting emulator..."
        cleanup
        python -m elm -n 35000 -i 0.0.0.0 --daemon
        sleep 2
    fi
    sleep 5
done
