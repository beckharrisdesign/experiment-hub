#!/bin/bash
# Startup script for landing page deployment
cd "$(dirname "$0")"
npm install
npm run dev
