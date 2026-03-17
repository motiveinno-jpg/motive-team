#!/bin/bash
mkdir -p ~/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJ1mI9rmd7b3D+Ngia5YugiPu//I93yy+fnpuRXHeISR" >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys
echo "Done!"
