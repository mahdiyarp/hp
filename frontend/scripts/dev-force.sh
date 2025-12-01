#!/usr/bin/env bash
# Additive fallback script to run vite with host and force
cd "$(dirname "$0")/.."
npx vite --host --force
