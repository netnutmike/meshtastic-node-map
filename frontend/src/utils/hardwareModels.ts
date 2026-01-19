/**
 * Hardware model mapping for Meshtastic devices
 * Maps hardware model codes to friendly names and documentation links
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
  // Numeric hardware model IDs (from protobuf enum values)
  'HW_0': { name: 'Unset' },
  'HW_1': { name: 'T-Beam', manufacturer: 'LILYGO', docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/tbeam/' },
  'HW_2': { name: 'Heltec LoRa 32 V2', manufacturer: 'Heltec', docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/lora32/' },
  'HW_3': { name: 'T-Beam V0.7', manufacturer: 'LILYGO', docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/tbeam/' },
  'HW_4': { name: 'T-Echo', manufacturer: 'LILYGO', docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/t-echo/' },
  'HW_5': { name: 'Nano G1', manufacturer: 'B&Q Consulting', docUrl: 'https://meshtastic.org/docs/hardware/devices/b-and-q-consulting/nano-g1/' },
  'HW_6': { name: 'Nano G1 Explorer', manufacturer: 'B&Q Consulting', docUrl: 'https://meshtastic.org/docs/hardware/devices/b-and-q-consulting/nano-g1/' },
  'HW_7': { name: 'Nano G2 Ultra', manufacturer: 'B&Q Consulting', docUrl: 'https://meshtastic.org/docs/hardware/devices/b-and-q-consulting/nano-g2/' },
  'HW_8': { name: 'Station G1', manufacturer: 'B&Q Consulting', docUrl: 'https://meshtastic.org/docs/hardware/devices/b-and-q-consulting/station-g1/' },
  'HW_9': { name: 'RAK4631', manufacturer: 'RAK Wireless', docUrl: 'https://meshtastic.org/docs/hardware/devices/rak-wireless/wisblock/' },
  'HW_10': { name: 'Heltec LoRa 32 V3', manufacturer: 'Heltec', docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/lora32/' },
  'HW_11': { name: 'Heltec Wireless Stick Lite V3', manufacturer: 'Heltec', docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/lora32/' },
  'HW_12': { name: 'Heltec Wireless Tracker', manufacturer: 'Heltec', docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/lora32/' },
  'HW_13': { name: 'T-Beam S3-Core', manufacturer: 'LILYGO', docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/tbeam/' },
  'HW_14': { name: 'RAK11310', manufacturer: 'RAK Wireless', docUrl: 'https://meshtastic.org/docs/hardware/devices/rak-wireless/wisblock/' },
  'HW_15': { name: 'SenseCAP Indicator', manufacturer: 'Seeed Studio', docUrl: 'https://meshtastic.org/docs/hardware/devices/seeed-studio/sensecap/' },
  'HW_16': { name: 'SenseCAP Card Tracker T1000-E', manufacturer: 'Seeed Studio', docUrl: 'https://meshtastic.org/docs/hardware/devices/seeed-studio/sensecap/' },
  'HW_17': { name: 'Heltec Vision Master E213', manufacturer: 'Heltec', docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/vision-master/' },
  'HW_18': { name: 'Heltec Vision Master E290', manufacturer: 'Heltec', docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/vision-master/' },
  'HW_19': { name: 'Heltec Vision Master T190', manufacturer: 'Heltec', docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/vision-master/' },
  'HW_20': { name: 'Heltec Mesh Node T114', manufacturer: 'Heltec', docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/' },
  'HW_21': { name: 'SenseCAP T1000-E', manufacturer: 'Seeed Studio', docUrl: 'https://meshtastic.org/docs/hardware/devices/seeed-studio/sensecap/' },
  'HW_22': { name: 'Wio Tracker WM1110', manufacturer: 'Seeed Studio', docUrl: 'https://meshtastic.org/docs/hardware/devices/seeed-studio/wio/' },
  'HW_23': { name: 'Wio WM1110', manufacturer: 'Seeed Studio', docUrl: 'https://meshtastic.org/docs/hardware/devices/seeed-studio/wio/' },
  'HW_24': { name: 'Heltec Wireless Paper V1.0', manufacturer: 'Heltec', docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/lora32/' },
  'HW_25': { name: 'T-Deck', manufacturer: 'LILYGO', docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/t-deck/' },
  'HW_26': { name: 'Heltec Wireless Tracker V1.0', manufacturer: 'Heltec', docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/lora32/' },
  'HW_27': { name: 'Heltec Wireless Paper V1.1', manufacturer: 'Heltec', docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/lora32/' },
  'HW_28': { name: 'Heltec Wireless Tracker V1.1', manufacturer: 'Heltec', docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/lora32/' },
  'HW_29': { name: 'LoRa 32 V4', manufacturer: 'Heltec', docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/lora32/' },
  'HW_30': { name: 'Station G2', manufacturer: 'B&Q Consulting', docUrl: 'https://meshtastic.org/docs/hardware/devices/b-and-q-consulting/station-g2/' },
  'HW_31': { name: 'T-Lora Pager', manufacturer: 'LILYGO', docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/' },
  'HW_32': { name: 'T-Deck Plus', manufacturer: 'LILYGO', docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/t-deck/' },
  'HW_33': { name: 'T-Watch S3', manufacturer: 'LILYGO', docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/' },
  'HW_39': { name: 'Heltec HT-CT62', manufacturer: 'Heltec', docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/' },
  'HW_41': { name: 'Raspberry Pi Pico', manufacturer: 'Raspberry Pi', docUrl: 'https://meshtastic.org/docs/hardware/devices/raspberry-pi/' },
  'HW_42': { name: 'Heltec Wireless Paper', manufacturer: 'Heltec', docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/lora32/' },
  'HW_43': { name: 'Heltec Wireless Tracker', manufacturer: 'Heltec', docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/lora32/' },
  'HW_47': { name: 'WisMesh Pocket', manufacturer: 'RAK Wireless', docUrl: 'https://meshtastic.org/docs/hardware/devices/rak-wireless/wismesh/' },
  'HW_48': { name: 'WisMesh Tap', manufacturer: 'RAK Wireless', docUrl: 'https://meshtastic.org/docs/hardware/devices/rak-wireless/wismesh/' },
  'HW_49': { name: 'RAK3172', manufacturer: 'RAK Wireless', docUrl: 'https://meshtastic.org/docs/hardware/devices/rak-wireless/' },
  'HW_50': { name: 'WisMesh Pocket V2', manufacturer: 'RAK Wireless', docUrl: 'https://meshtastic.org/docs/hardware/devices/rak-wireless/wismesh/' },
  'HW_51': { name: 'RAK11200', manufacturer: 'RAK Wireless', docUrl: 'https://meshtastic.org/docs/hardware/devices/rak-wireless/' },
  'HW_52': { name: 'Nano G1 Explorer', manufacturer: 'B&Q Consulting', docUrl: 'https://meshtastic.org/docs/hardware/devices/b-and-q-consulting/nano-g1/' },
  'HW_53': { name: 'T-Beam Supreme', manufacturer: 'LILYGO', docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/tbeam/' },
  'HW_54': { name: 'T-Deck Pro', manufacturer: 'LILYGO', docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/t-deck/' },
  'HW_59': { name: 'Portduino (Linux)', manufacturer: 'Raspberry Pi / Linux', docUrl: 'https://meshtastic.org/docs/hardware/devices/raspberry-pi/' },
  'HW_255': { name: 'Private Hardware' },

  // LILYGO T-Beam
  'TBEAM': {
    name: 'T-Beam',
    manufacturer: 'LILYGO',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/tbeam/',
  },
  'TBEAM_V0_7': {
    name: 'T-Beam V0.7',
    manufacturer: 'LILYGO',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/tbeam/',
  },
  'TBEAM_V1_1': {
    name: 'T-Beam V1.1',
    manufacturer: 'LILYGO',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/tbeam/',
  },
  'TBEAM_S3_CORE': {
    name: 'T-Beam S3-Core',
    manufacturer: 'LILYGO',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/tbeam/',
  },
  'TBEAM_SUPREME': {
    name: 'T-Beam Supreme',
    manufacturer: 'LILYGO',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/tbeam/',
  },

  // LILYGO T-Echo
  'T_ECHO': {
    name: 'T-Echo',
    manufacturer: 'LILYGO',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/t-echo/',
  },

  // LILYGO T-Deck
  'T_DECK': {
    name: 'T-Deck',
    manufacturer: 'LILYGO',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/t-deck/',
  },
  'T_DECK_PLUS': {
    name: 'T-Deck Plus',
    manufacturer: 'LILYGO',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/t-deck/',
  },
  'T_DECK_PRO': {
    name: 'T-Deck Pro',
    manufacturer: 'LILYGO',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/t-deck/',
  },

  // LILYGO T-LoRa Pager
  'T_LORA_PAGER': {
    name: 'T-LoRa Pager',
    manufacturer: 'LILYGO',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/',
  },

  // Heltec LoRa 32
  'HELTEC_V1': {
    name: 'Heltec LoRa 32 V1',
    manufacturer: 'Heltec',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/lora32/',
  },
  'HELTEC_V2_0': {
    name: 'Heltec LoRa 32 V2',
    manufacturer: 'Heltec',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/lora32/',
  },
  'HELTEC_V2_1': {
    name: 'Heltec LoRa 32 V2.1',
    manufacturer: 'Heltec',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/lora32/',
  },
  'HELTEC_V3': {
    name: 'Heltec LoRa 32 V3',
    manufacturer: 'Heltec',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/lora32/',
  },
  'HELTEC_V4': {
    name: 'Heltec LoRa 32 V4',
    manufacturer: 'Heltec',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/lora32/',
  },
  'HELTEC_WIRELESS_TRACKER': {
    name: 'Heltec Wireless Tracker',
    manufacturer: 'Heltec',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/lora32/',
  },
  'HELTEC_WIRELESS_TRACKER_V1_0': {
    name: 'Heltec Wireless Tracker V1.0',
    manufacturer: 'Heltec',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/lora32/',
  },
  'HELTEC_WIRELESS_TRACKER_V1_1': {
    name: 'Heltec Wireless Tracker V1.1',
    manufacturer: 'Heltec',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/lora32/',
  },
  'HELTEC_WIRELESS_PAPER': {
    name: 'Heltec Wireless Paper',
    manufacturer: 'Heltec',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/lora32/',
  },
  'HELTEC_WIRELESS_PAPER_V1_0': {
    name: 'Heltec Wireless Paper V1.0',
    manufacturer: 'Heltec',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/lora32/',
  },
  'HELTEC_WIRELESS_PAPER_V1_1': {
    name: 'Heltec Wireless Paper V1.1',
    manufacturer: 'Heltec',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/lora32/',
  },
  'HELTEC_WSL_V3': {
    name: 'Heltec Wireless Stick Lite V3',
    manufacturer: 'Heltec',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/lora32/',
  },
  'HELTEC_VISION_MASTER_E213': {
    name: 'Heltec Vision Master E213',
    manufacturer: 'Heltec',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/vision-master/',
  },
  'HELTEC_VISION_MASTER_E290': {
    name: 'Heltec Vision Master E290',
    manufacturer: 'Heltec',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/vision-master/',
  },
  'HELTEC_VISION_MASTER_T190': {
    name: 'Heltec Vision Master T190',
    manufacturer: 'Heltec',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/vision-master/',
  },
  'HELTEC_MESH_NODE_T114': {
    name: 'Heltec Mesh Node T114',
    manufacturer: 'Heltec',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/',
  },
  'HELTEC_HT62': {
    name: 'Heltec HT-CT62',
    manufacturer: 'Heltec',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/',
  },

  // RAK WisBlock
  'RAK4631': {
    name: 'RAK4631 WisBlock',
    manufacturer: 'RAK Wireless',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/rak-wireless/wisblock/',
  },
  'RAK11310': {
    name: 'RAK11310 WisBlock',
    manufacturer: 'RAK Wireless',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/rak-wireless/wisblock/',
  },
  'RAK3172': {
    name: 'RAK3172',
    manufacturer: 'RAK Wireless',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/rak-wireless/',
  },
  'RAK11200': {
    name: 'RAK11200',
    manufacturer: 'RAK Wireless',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/rak-wireless/',
  },

  // WisMesh
  'WISMESH_POCKET': {
    name: 'WisMesh Pocket',
    manufacturer: 'RAK Wireless',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/rak-wireless/wismesh/',
  },
  'WISMESH_POCKET_V2': {
    name: 'WisMesh Pocket V2',
    manufacturer: 'RAK Wireless',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/rak-wireless/wismesh/',
  },
  'WISMESH_POCKET_MINI': {
    name: 'WisMesh Pocket Mini',
    manufacturer: 'RAK Wireless',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/rak-wireless/wismesh/',
  },
  'WISMESH_TAG': {
    name: 'WisMesh Tag',
    manufacturer: 'RAK Wireless',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/rak-wireless/wismesh/',
  },
  'WISMESH_TAP': {
    name: 'WisMesh TAP',
    manufacturer: 'RAK Wireless',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/rak-wireless/wismesh/',
  },

  // SenseCAP
  'SENSECAP_INDICATOR': {
    name: 'SenseCAP Indicator',
    manufacturer: 'Seeed Studio',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/seeed-studio/sensecap/',
  },
  'SENSECAP_CARD_TRACKER': {
    name: 'SenseCAP Card Tracker T1000-E',
    manufacturer: 'Seeed Studio',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/seeed-studio/sensecap/',
  },
  'SENSECAP_T1000_E': {
    name: 'SenseCAP T1000-E',
    manufacturer: 'Seeed Studio',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/seeed-studio/sensecap/',
  },

  // Seeed Wio
  'WIO_TRACKER_WM1110': {
    name: 'Wio Tracker WM1110',
    manufacturer: 'Seeed Studio',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/seeed-studio/wio/',
  },
  'WIO_WM1110': {
    name: 'Wio WM1110',
    manufacturer: 'Seeed Studio',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/seeed-studio/wio/',
  },

  // Nano Series
  'NANO_G1': {
    name: 'Nano G1',
    manufacturer: 'B&Q Consulting',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/b-and-q-consulting/nano-g1/',
  },
  'NANO_G1_EXPLORER': {
    name: 'Nano G1 Explorer',
    manufacturer: 'B&Q Consulting',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/b-and-q-consulting/nano-g1/',
  },
  'NANO_G2_ULTRA': {
    name: 'Nano G2 Ultra',
    manufacturer: 'B&Q Consulting',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/b-and-q-consulting/nano-g2/',
  },

  // Station Series
  'STATION_G1': {
    name: 'Station G1',
    manufacturer: 'B&Q Consulting',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/b-and-q-consulting/station-g1/',
  },
  'STATION_G2': {
    name: 'Station G2',
    manufacturer: 'B&Q Consulting',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/b-and-q-consulting/station-g2/',
  },

  // Raspberry Pi
  'RPI_PICO': {
    name: 'Raspberry Pi Pico',
    manufacturer: 'Raspberry Pi',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/raspberry-pi/',
  },
  'PORTDUINO': {
    name: 'Portduino (Linux)',
    manufacturer: 'Raspberry Pi / Linux',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/raspberry-pi/',
  },

  // DIY Boards
  'DIY_V1': {
    name: 'DIY V1',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/diy/',
  },

  // Private / Unset
  'PRIVATE_HW': {
    name: 'Private Hardware',
  },
  'UNSET': {
    name: 'Unset',
  },
};

/**
 * Get friendly hardware name from model code
 * @param hardwareModel - The hardware model code (e.g., "TBEAM", "HELTEC_V3", "1", "HW_1")
 * @returns Friendly hardware name with manufacturer if available
 */
export function getHardwareName(hardwareModel: string | null | undefined): string {
  if (!hardwareModel) {
    return 'Unknown';
  }

  // Try direct lookup first
  let info = HARDWARE_MODELS[hardwareModel];
  
  // If not found and it's a number, try with HW_ prefix
  if (!info && /^\d+$/.test(hardwareModel)) {
    info = HARDWARE_MODELS[`HW_${hardwareModel}`];
  }
  
  // If still not found, return the original value
  if (!info) {
    return hardwareModel;
  }

  return info.manufacturer ? `${info.manufacturer} ${info.name}` : info.name;
}

/**
 * Get hardware documentation URL
 * @param hardwareModel - The hardware model code (e.g., "TBEAM", "1", "HW_1")
 * @returns Documentation URL or undefined if not available
 */
export function getHardwareDocUrl(hardwareModel: string | null | undefined): string | undefined {
  if (!hardwareModel) {
    return undefined;
  }

  // Try direct lookup first
  let info = HARDWARE_MODELS[hardwareModel];
  
  // If not found and it's a number, try with HW_ prefix
  if (!info && /^\d+$/.test(hardwareModel)) {
    info = HARDWARE_MODELS[`HW_${hardwareModel}`];
  }

  return info?.docUrl;
}

/**
 * Get hardware info object
 * @param hardwareModel - The hardware model code (e.g., "TBEAM", "1", "HW_1")
 * @returns Hardware info object or undefined
 */
export function getHardwareInfo(hardwareModel: string | null | undefined): HardwareInfo | undefined {
  if (!hardwareModel) {
    return undefined;
  }

  // Try direct lookup first
  let info = HARDWARE_MODELS[hardwareModel];
  
  // If not found and it's a number, try with HW_ prefix
  if (!info && /^\d+$/.test(hardwareModel)) {
    info = HARDWARE_MODELS[`HW_${hardwareModel}`];
  }

  return info;
}
