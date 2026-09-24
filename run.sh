#!/bin/bash
# BioShield AI - Automated Biomedical Waste Management System
# Launcher Script for Linux / macOS

echo "==========================================================="
echo "  Starting BioShield AI™ Biomedical Waste Server..."
echo "==========================================================="

# Navigate to project directory
cd "$(dirname "$0")"

# Run Python Server on port 8000
python3 server.py
