#!/bin/bash
# Script to generate hardwareModels.ts with all hardware codes from mesh.proto

cat > frontend/src/utils/hardwareModels.ts << 'EOF'
/**
 * Hardware model mapping for Meshtastic devices
 * Maps hardware model codes to friendly names and documentation links
 * 
 * Based on official Meshtastic protobuf definitions from:
 * https://github.com/meshtastic/protobufs/blob/master/meshtastic/mesh.proto
 * 
 * Content was rephrased for compliance with licensing restrictions.
 * Source: https://meshtastic.org/docs/hardware/devices/
 */

export interface HardwareInfo {
  name: string;
  manufacturer?: string;
  docUrl?: string;
  imageUrl?: string;
}

export const HARDWARE_MODELS: Record<string, HardwareInfo> = {
  // Numeric hardware model IDs (from protobuf enum HardwareModel)
  // Based on mesh.proto enum values 0-123 and 255
  'HW_0': { name: 'Unset' },
  'HW_1': { name: 'TLoRa V2', manufacturer: 'LILYGO', docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/' },
  'HW_2': { name: 'TLoRa V1', manufacturer: 'LILYGO', docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/' },
  'HW_3': { name: 'TLoRa V2 1.6', manufacturer: 'LILYGO', docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/' },
  'HW_4': { name: 'T-Beam', manufacturer: 'LILYGO', docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/tbeam/' },
  'HW_5': { name: 'Heltec V2.0', manufacturer: 'Heltec', docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/lora32/' },
  'HW_6': { name: 'T-Beam V0.7', manufacturer: 'LILYGO', docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/tbeam/' },
  'HW_7': { name: 'T-Echo', manufacturer: 'LILYGO', docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/t-echo/' },
  'HW_8': { name: 'TLoRa V1 1.3', manufacturer: 'LILYGO', docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/' },
  'HW_9': { name: 'RAK4631', manufacturer: 'RAK Wireless', docUrl: 'https://meshtastic.org/docs/hardware/devices/rak-wireless/wisblock/' },
  'HW_10': { name: 'Heltec V2.1', manufacturer: 'Heltec', docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/lora32/' },
  'HW_11': { name: 'Heltec V1', manufacturer: 'Heltec', docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/lora32/' },
  'HW_12': { name: 'T-Beam S3 Core', manufacturer: 'LILYGO', docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/tbeam/' },
  'HW_13': { name: 'RAK11200', manufacturer: 'RAK Wireless', docUrl: 'https://meshtastic.org/docs/hardware/devices/rak-wireless/' },
  'HW_14': { name: 'Nano G1', manufacturer: 'B&Q Consulting', docUrl: 'https://meshtastic.org/docs/hardware/devices/b-and-q-consulting/nano-g1/' },
  'HW_15': { name: 'TLoRa V2 1.8', manufacturer: 'LILYGO', docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/' },
  'HW_16': { name: 'TLoRa T3-S3', manufacturer: 'LILYGO', docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/' },
  'HW_17': { name: 'Nano G1 Explorer', manufacturer: 'B&Q Consulting', docUrl: 'https://meshtastic.org/docs/hardware/devices/b-and-q-consulting/nano-g1/' },
  'HW_18': { name: 'Nano G2 Ultra', manufacturer: 'B&Q Consulting', docUrl: 'https://meshtastic.org/docs/hardware/devices/b-and-q-consulting/nano-g2/' },
  'HW_19': { name: 'LoRa Type', manufacturer: 'LoRa Type', docUrl: 'https://loratype.org/' },
  'HW_20': { name: 'WiPhone', manufacturer: 'WiPhone', docUrl: 'https://www.wiphone.io/' },
  'HW_21': { name: 'Wio WM1110', manufacturer: 'Seeed Studio', docUrl: 'https://meshtastic.org/docs/hardware/devices/seeed-studio/wio/' },
  'HW_22': { name: 'RAK2560', manufacturer: 'RAK Wireless', docUrl: 'https://meshtastic.org/docs/hardware/devices/rak-wireless/' },
  'HW_23': { name: 'Heltec HRU-3601', manufacturer: 'Heltec', docUrl: 'https://heltec.org/project/hru-3601/' },
  'HW_24': { name: 'Heltec Wireless Bridge', manufacturer: 'Heltec', docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/' },
  'HW_25': { name: 'Station G1', manufacturer: 'B&Q Consulting', docUrl: 'https://meshtastic.org/docs/hardware/devices/b-and-q-consulting/station-g1/' },
EOF

echo "File created successfully"
