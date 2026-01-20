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
  'HW_60': { name: 'TD-LORAC', manufacturer: 'Teledatics', docUrl: 'https://meshtastic.org/docs/hardware/devices/' },
  'HW_61': { name: 'CDEBYTE EoRa-S3', manufacturer: 'CDEBYTE', docUrl: 'https://meshtastic.org/docs/hardware/devices/' },
  'HW_62': { name: 'TWC Mesh V4', manufacturer: 'TWC', docUrl: 'https://meshtastic.org/docs/hardware/devices/' },
  'HW_63': { name: 'NRF52 ProMicro DIY', manufacturer: 'DIY', docUrl: 'https://meshtastic.org/docs/hardware/devices/' },
  'HW_64': { name: 'RadioMaster 900 Bandit Nano', manufacturer: 'RadioMaster', docUrl: 'https://www.radiomasterrc.com/products/bandit-nano-expresslrs-rf-module' },
  'HW_65': { name: 'Heltec Capsule Sensor V3', manufacturer: 'Heltec', docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/' },
  'HW_66': { name: 'Heltec Vision Master T190', manufacturer: 'Heltec', docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/vision-master/' },
  'HW_67': { name: 'Heltec Vision Master E213', manufacturer: 'Heltec', docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/vision-master/' },
  'HW_68': { name: 'Heltec Vision Master E290', manufacturer: 'Heltec', docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/vision-master/' },
  'HW_69': { name: 'Heltec Mesh Node T114', manufacturer: 'Heltec', docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/' },
  'HW_70': { name: 'SenseCAP Indicator', manufacturer: 'Seeed Studio', docUrl: 'https://meshtastic.org/docs/hardware/devices/seeed-studio/sensecap/' },
  'HW_71': { name: 'Tracker T1000-E', manufacturer: 'Seeed Studio', docUrl: 'https://meshtastic.org/docs/hardware/devices/seeed-studio/sensecap/' },
  'HW_72': { name: 'RAK3172', manufacturer: 'RAK Wireless', docUrl: 'https://meshtastic.org/docs/hardware/devices/rak-wireless/' },
  'HW_73': { name: 'Wio-E5', manufacturer: 'Seeed Studio', docUrl: 'https://meshtastic.org/docs/hardware/devices/seeed-studio/' },
  'HW_74': { name: 'RadioMaster 900 Bandit', manufacturer: 'RadioMaster', docUrl: 'https://www.radiomasterrc.com/products/bandit-expresslrs-rf-module' },
  'HW_75': { name: 'ME25LS01 4Y10TD', manufacturer: 'Minewsemi', docUrl: 'https://meshtastic.org/docs/hardware/devices/' },
  'HW_76': { name: 'RP2040 Feather RFM95', manufacturer: 'Adafruit', docUrl: 'https://www.adafruit.com/product/5714' },
  'HW_77': { name: 'M5Stack Core Basic', manufacturer: 'M5Stack', docUrl: 'https://m5stack.com/' },
  'HW_78': { name: 'M5Stack Core2', manufacturer: 'M5Stack', docUrl: 'https://m5stack.com/' },
  'HW_79': { name: 'Raspberry Pi Pico2', manufacturer: 'Raspberry Pi', docUrl: 'https://meshtastic.org/docs/hardware/devices/raspberry-pi/' },
  'HW_80': { name: 'M5Stack CoreS3', manufacturer: 'M5Stack', docUrl: 'https://m5stack.com/' },
  'HW_81': { name: 'Seeed XIAO S3', manufacturer: 'Seeed Studio', docUrl: 'https://meshtastic.org/docs/hardware/devices/seeed-studio/' },
  'HW_82': { name: 'MS24SF1', manufacturer: 'Nordic', docUrl: 'https://meshtastic.org/docs/hardware/devices/' },
  'HW_83': { name: 'TLoRa C6', manufacturer: 'LILYGO', docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/' },
  'HW_84': { name: 'WisMesh Tap', manufacturer: 'RAK Wireless', docUrl: 'https://meshtastic.org/docs/hardware/devices/rak-wireless/wismesh/' },
  'HW_85': { name: 'Routastic', manufacturer: 'Routastic', docUrl: 'https://github.com/Jorropo/routastic' },
  'HW_86': { name: 'Mesh-Tab', manufacturer: 'DIY', docUrl: 'https://github.com/valzzu/Mesh-Tab' },
  'HW_87': { name: 'MeshLink', manufacturer: 'LoraItalia', docUrl: 'https://www.loraitalia.it' },
  'HW_88': { name: 'XIAO nRF52 Kit', manufacturer: 'Seeed Studio', docUrl: 'https://meshtastic.org/docs/hardware/devices/seeed-studio/' },
  'HW_89': { name: 'ThinkNode M1', manufacturer: 'Elecrow', docUrl: 'https://www.elecrow.com/wiki/ThinkNode-M1_Transceiver_Device(Meshtastic)_Power_By_nRF52840.html' },
  'HW_90': { name: 'ThinkNode M2', manufacturer: 'Elecrow', docUrl: 'https://www.elecrow.com/wiki/ThinkNode-M2_Transceiver_Device(Meshtastic)_Power_By_NRF52840.html' },
  'HW_91': { name: 'T-ETH-Elite', manufacturer: 'LILYGO', docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/' },
  'HW_92': { name: 'Heltec Sensor Hub', manufacturer: 'Heltec', docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/' },
  'HW_93': { name: 'Muzi Base', manufacturer: 'Muzi Works', docUrl: 'https://meshtastic.org/docs/hardware/devices/' },
  'HW_94': { name: 'Heltec Mesh Pocket', manufacturer: 'Heltec', docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/' },
  'HW_95': { name: 'Seeed Solar Node', manufacturer: 'Seeed Studio', docUrl: 'https://meshtastic.org/docs/hardware/devices/seeed-studio/' },
  'HW_96': { name: 'NomadStar Meteor Pro', manufacturer: 'NomadStar', docUrl: 'https://nomadstar.ch/' },
  'HW_97': { name: 'CrowPanel', manufacturer: 'Elecrow', docUrl: 'https://meshtastic.org/docs/hardware/devices/' },
  'HW_98': { name: 'Link 32', manufacturer: 'LILYGO', docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/' },
  'HW_99': { name: 'Seeed Wio Tracker L1', manufacturer: 'Seeed Studio', docUrl: 'https://meshtastic.org/docs/hardware/devices/seeed-studio/' },
  'HW_100': { name: 'Seeed Wio Tracker L1 E-Ink', manufacturer: 'Seeed Studio', docUrl: 'https://meshtastic.org/docs/hardware/devices/seeed-studio/' },
  'HW_101': { name: 'Muzi R1 Neo', manufacturer: 'Muzi Works', docUrl: 'https://meshtastic.org/docs/hardware/devices/' },
  'HW_102': { name: 'T-Deck Pro', manufacturer: 'LILYGO', docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/t-deck/' },
  'HW_103': { name: 'T-LoRa Pager', manufacturer: 'LILYGO', docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/' },
  'HW_104': { name: 'M5Stack Reserved', manufacturer: 'M5Stack', docUrl: 'https://m5stack.com/' },
  'HW_105': { name: 'WisMesh Tag', manufacturer: 'RAK Wireless', docUrl: 'https://meshtastic.org/docs/hardware/devices/rak-wireless/wismesh/' },
  'HW_106': { name: 'RAK3312', manufacturer: 'RAK Wireless', docUrl: 'https://docs.rakwireless.com/product-categories/wisduo/rak3112-module/overview/' },
  'HW_107': { name: 'ThinkNode M5', manufacturer: 'Elecrow', docUrl: 'https://www.elecrow.com/wiki/ThinkNode_M5_Meshtastic_LoRa_Signal_Transceiver_ESP32-S3.html' },
  'HW_108': { name: 'Heltec MeshSolar', manufacturer: 'Heltec', docUrl: 'https://heltec.org/project/meshsolar/' },
  'HW_109': { name: 'T-Echo Lite', manufacturer: 'LILYGO', docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/t-echo/' },
  'HW_110': { name: 'Heltec LoRa 32 V4', manufacturer: 'Heltec', docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/lora32/' },
  'HW_111': { name: 'M5Stack C6L', manufacturer: 'M5Stack', docUrl: 'https://m5stack.com/' },
  'HW_112': { name: 'M5Stack Cardputer Adv', manufacturer: 'M5Stack', docUrl: 'https://m5stack.com/' },
  'HW_113': { name: 'Heltec Wireless Tracker V2', manufacturer: 'Heltec', docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/' },
  'HW_114': { name: 'T-Watch Ultra', manufacturer: 'LILYGO', docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/' },
  'HW_115': { name: 'ThinkNode M3', manufacturer: 'Elecrow', docUrl: 'https://meshtastic.org/docs/hardware/devices/' },
  'HW_116': { name: 'WisMesh Tap V2', manufacturer: 'RAK Wireless', docUrl: 'https://meshtastic.org/docs/hardware/devices/rak-wireless/wismesh/' },
  'HW_117': { name: 'RAK3401', manufacturer: 'RAK Wireless', docUrl: 'https://meshtastic.org/docs/hardware/devices/rak-wireless/' },
  'HW_118': { name: 'RAK6421 Hat+', manufacturer: 'RAK Wireless', docUrl: 'https://meshtastic.org/docs/hardware/devices/rak-wireless/' },
  'HW_119': { name: 'ThinkNode M4', manufacturer: 'Elecrow', docUrl: 'https://meshtastic.org/docs/hardware/devices/' },
  'HW_120': { name: 'ThinkNode M6', manufacturer: 'Elecrow', docUrl: 'https://meshtastic.org/docs/hardware/devices/' },
  'HW_121': { name: 'Meshstick 1262', manufacturer: 'Elecrow', docUrl: 'https://meshtastic.org/docs/hardware/devices/' },
  'HW_122': { name: 'T-Beam 1W', manufacturer: 'LILYGO', docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/tbeam/' },
  'HW_123': { name: 'T5 S3 ePaper Pro', manufacturer: 'LILYGO', docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/' },
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

  // LILYGO T-Watch
  'T_WATCH_S3': {
    name: 'T-Watch S3',
    manufacturer: 'LILYGO',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/',
  },
  'T_WATCH_ULTRA': {
    name: 'T-Watch Ultra',
    manufacturer: 'LILYGO',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/',
  },

  // LILYGO Other Models
  'TLORA_V2': {
    name: 'TLoRa V2',
    manufacturer: 'LILYGO',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/',
  },
  'TLORA_V1': {
    name: 'TLoRa V1',
    manufacturer: 'LILYGO',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/',
  },
  'TLORA_V2_1_1P6': {
    name: 'TLoRa V2 1.6',
    manufacturer: 'LILYGO',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/',
  },
  'TLORA_V1_1P3': {
    name: 'TLoRa V1 1.3',
    manufacturer: 'LILYGO',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/',
  },
  'TLORA_V2_1_1P8': {
    name: 'TLoRa V2 1.8',
    manufacturer: 'LILYGO',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/',
  },
  'TLORA_T3_S3': {
    name: 'TLoRa T3-S3',
    manufacturer: 'LILYGO',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/',
  },
  'TLORA_C6': {
    name: 'TLoRa C6',
    manufacturer: 'LILYGO',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/',
  },
  'LINK_32': {
    name: 'Link 32',
    manufacturer: 'LILYGO',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/',
  },
  'T_ETH_ELITE': {
    name: 'T-ETH-Elite',
    manufacturer: 'LILYGO',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/',
  },
  'TBEAM_1_WATT': {
    name: 'T-Beam 1W',
    manufacturer: 'LILYGO',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/tbeam/',
  },
  'T5_S3_EPAPER_PRO': {
    name: 'T5 S3 ePaper Pro',
    manufacturer: 'LILYGO',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/',
  },
  'T_ECHO_PLUS': {
    name: 'T-Echo Plus',
    manufacturer: 'LILYGO',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/t-echo/',
  },
  'T_ECHO_LITE': {
    name: 'T-Echo Lite',
    manufacturer: 'LILYGO',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/t-echo/',
  },
  'LILYGO_TBEAM_S3_CORE': {
    name: 'T-Beam S3 Core',
    manufacturer: 'LILYGO',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/lilygo/tbeam/',
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
  'HELTEC_CAPSULE_SENSOR_V3': {
    name: 'Heltec Capsule Sensor V3',
    manufacturer: 'Heltec',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/',
  },
  'HELTEC_HRU_3601': {
    name: 'Heltec HRU-3601',
    manufacturer: 'Heltec',
    docUrl: 'https://heltec.org/project/hru-3601/',
  },
  'HELTEC_WIRELESS_BRIDGE': {
    name: 'Heltec Wireless Bridge',
    manufacturer: 'Heltec',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/',
  },
  'HELTEC_SENSOR_HUB': {
    name: 'Heltec Sensor Hub',
    manufacturer: 'Heltec',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/',
  },
  'HELTEC_MESH_POCKET': {
    name: 'Heltec Mesh Pocket',
    manufacturer: 'Heltec',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/heltec-automation/',
  },
  'HELTEC_MESH_SOLAR': {
    name: 'Heltec MeshSolar',
    manufacturer: 'Heltec',
    docUrl: 'https://heltec.org/project/meshsolar/',
  },
  'HELTEC_WIRELESS_TRACKER_V2': {
    name: 'Heltec Wireless Tracker V2',
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
  'RAK2560': {
    name: 'RAK2560',
    manufacturer: 'RAK Wireless',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/rak-wireless/',
  },
  'RAK3312': {
    name: 'RAK3312',
    manufacturer: 'RAK Wireless',
    docUrl: 'https://docs.rakwireless.com/product-categories/wisduo/rak3112-module/overview/',
  },
  'RAK3401': {
    name: 'RAK3401',
    manufacturer: 'RAK Wireless',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/rak-wireless/',
  },
  'RAK6421': {
    name: 'RAK6421 Hat+',
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
  'WISMESH_TAP_V2': {
    name: 'WisMesh Tap V2',
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
  'TRACKER_T1000_E': {
    name: 'Tracker T1000-E',
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
  'WIO_E5': {
    name: 'Wio-E5',
    manufacturer: 'Seeed Studio',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/seeed-studio/',
  },
  'SEEED_XIAO_S3': {
    name: 'Seeed XIAO S3',
    manufacturer: 'Seeed Studio',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/seeed-studio/',
  },
  'XIAO_NRF52_KIT': {
    name: 'XIAO nRF52 Kit',
    manufacturer: 'Seeed Studio',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/seeed-studio/',
  },
  'SEEED_SOLAR_NODE': {
    name: 'Seeed Solar Node',
    manufacturer: 'Seeed Studio',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/seeed-studio/',
  },
  'SEEED_WIO_TRACKER_L1': {
    name: 'Seeed Wio Tracker L1',
    manufacturer: 'Seeed Studio',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/seeed-studio/',
  },
  'SEEED_WIO_TRACKER_L1_EINK': {
    name: 'Seeed Wio Tracker L1 E-Ink',
    manufacturer: 'Seeed Studio',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/seeed-studio/',
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
  'RPI_PICO2': {
    name: 'Raspberry Pi Pico2',
    manufacturer: 'Raspberry Pi',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/raspberry-pi/',
  },
  'RP2040_LORA': {
    name: 'RP2040 LoRa',
    manufacturer: 'Waveshare',
    docUrl: 'https://www.waveshare.com/rp2040-lora.htm',
  },
  'RP2040_FEATHER_RFM95': {
    name: 'RP2040 Feather RFM95',
    manufacturer: 'Adafruit',
    docUrl: 'https://www.adafruit.com/product/5714',
  },
  'PORTDUINO': {
    name: 'Portduino (Linux)',
    manufacturer: 'Raspberry Pi / Linux',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/raspberry-pi/',
  },

  // M5Stack
  'M5STACK': {
    name: 'M5Stack',
    manufacturer: 'M5Stack',
    docUrl: 'https://m5stack.com/',
  },
  'M5STACK_COREBASIC': {
    name: 'M5Stack Core Basic',
    manufacturer: 'M5Stack',
    docUrl: 'https://m5stack.com/',
  },
  'M5STACK_CORE2': {
    name: 'M5Stack Core2',
    manufacturer: 'M5Stack',
    docUrl: 'https://m5stack.com/',
  },
  'M5STACK_CORES3': {
    name: 'M5Stack CoreS3',
    manufacturer: 'M5Stack',
    docUrl: 'https://m5stack.com/',
  },
  'M5STACK_C6L': {
    name: 'M5Stack C6L',
    manufacturer: 'M5Stack',
    docUrl: 'https://m5stack.com/',
  },
  'M5STACK_CARDPUTER_ADV': {
    name: 'M5Stack Cardputer Adv',
    manufacturer: 'M5Stack',
    docUrl: 'https://m5stack.com/',
  },
  'M5STACK_RESERVED': {
    name: 'M5Stack Reserved',
    manufacturer: 'M5Stack',
    docUrl: 'https://m5stack.com/',
  },

  // Other manufacturers
  'LORA_TYPE': {
    name: 'LoRa Type',
    manufacturer: 'LoRa Type',
    docUrl: 'https://loratype.org/',
  },
  'WIPHONE': {
    name: 'WiPhone',
    manufacturer: 'WiPhone',
    docUrl: 'https://www.wiphone.io/',
  },
  'CANARYONE': {
    name: 'CanaryOne',
    manufacturer: 'Canary Radio Company',
    docUrl: 'https://canaryradio.io/products/canaryone',
  },
  'LORA_RELAY_V1': {
    name: 'LoRa Relay V1',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/',
  },
  'PPR': {
    name: 'PPR',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/',
  },
  'GENIEBLOCKS': {
    name: 'GenieBlocks',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/',
  },
  'NRF52_UNKNOWN': {
    name: 'nRF52 Unknown',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/',
  },
  'ANDROID_SIM': {
    name: 'Android Simulator',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/',
  },
  'NRF52840_PCA10059': {
    name: 'nRF52840 Dongle',
    manufacturer: 'Nordic',
    docUrl: 'https://www.nordicsemi.com/Products/Development-hardware/nrf52840-dongle/',
  },
  'DR_DEV': {
    name: 'Disaster Radio ESP32 V3',
    docUrl: 'https://github.com/sudomesh/disaster-radio/tree/master/hardware/board_esp32_v3',
  },
  'BETAFPV_2400_TX': {
    name: 'BetaFPV 2.4G TX',
    manufacturer: 'BetaFPV',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/',
  },
  'BETAFPV_900_NANO_TX': {
    name: 'BetaFPV 900 Nano TX',
    manufacturer: 'BetaFPV',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/',
  },
  'CHATTER_2': {
    name: 'Chatter 2',
    manufacturer: 'CircuitMess',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/',
  },
  'UNPHONE': {
    name: 'unPhone',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/',
  },
  'TD_LORAC': {
    name: 'TD-LORAC',
    manufacturer: 'Teledatics',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/',
  },
  'CDEBYTE_EORA_S3': {
    name: 'CDEBYTE EoRa-S3',
    manufacturer: 'CDEBYTE',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/',
  },
  'TWC_MESH_V4': {
    name: 'TWC Mesh V4',
    manufacturer: 'TWC',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/',
  },
  'NRF52_PROMICRO_DIY': {
    name: 'NRF52 ProMicro DIY',
    manufacturer: 'DIY',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/',
  },
  'RADIOMASTER_900_BANDIT_NANO': {
    name: 'RadioMaster 900 Bandit Nano',
    manufacturer: 'RadioMaster',
    docUrl: 'https://www.radiomasterrc.com/products/bandit-nano-expresslrs-rf-module',
  },
  'RADIOMASTER_900_BANDIT': {
    name: 'RadioMaster 900 Bandit',
    manufacturer: 'RadioMaster',
    docUrl: 'https://www.radiomasterrc.com/products/bandit-expresslrs-rf-module',
  },
  'ME25LS01_4Y10TD': {
    name: 'ME25LS01 4Y10TD',
    manufacturer: 'Minewsemi',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/',
  },
  'MS24SF1': {
    name: 'MS24SF1',
    manufacturer: 'Nordic',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/',
  },
  'ROUTASTIC': {
    name: 'Routastic',
    manufacturer: 'Routastic',
    docUrl: 'https://github.com/Jorropo/routastic',
  },
  'MESH_TAB': {
    name: 'Mesh-Tab',
    manufacturer: 'DIY',
    docUrl: 'https://github.com/valzzu/Mesh-Tab',
  },
  'MESHLINK': {
    name: 'MeshLink',
    manufacturer: 'LoraItalia',
    docUrl: 'https://www.loraitalia.it',
  },
  'THINKNODE_M1': {
    name: 'ThinkNode M1',
    manufacturer: 'Elecrow',
    docUrl: 'https://www.elecrow.com/wiki/ThinkNode-M1_Transceiver_Device(Meshtastic)_Power_By_nRF52840.html',
  },
  'THINKNODE_M2': {
    name: 'ThinkNode M2',
    manufacturer: 'Elecrow',
    docUrl: 'https://www.elecrow.com/wiki/ThinkNode-M2_Transceiver_Device(Meshtastic)_Power_By_NRF52840.html',
  },
  'THINKNODE_M3': {
    name: 'ThinkNode M3',
    manufacturer: 'Elecrow',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/',
  },
  'THINKNODE_M4': {
    name: 'ThinkNode M4',
    manufacturer: 'Elecrow',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/',
  },
  'THINKNODE_M5': {
    name: 'ThinkNode M5',
    manufacturer: 'Elecrow',
    docUrl: 'https://www.elecrow.com/wiki/ThinkNode_M5_Meshtastic_LoRa_Signal_Transceiver_ESP32-S3.html',
  },
  'THINKNODE_M6': {
    name: 'ThinkNode M6',
    manufacturer: 'Elecrow',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/',
  },
  'MUZI_BASE': {
    name: 'Muzi Base',
    manufacturer: 'Muzi Works',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/',
  },
  'MUZI_R1_NEO': {
    name: 'Muzi R1 Neo',
    manufacturer: 'Muzi Works',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/',
  },
  'NOMADSTAR_METEOR_PRO': {
    name: 'NomadStar Meteor Pro',
    manufacturer: 'NomadStar',
    docUrl: 'https://nomadstar.ch/',
  },
  'CROWPANEL': {
    name: 'CrowPanel',
    manufacturer: 'Elecrow',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/',
  },
  'MESHSTICK_1262': {
    name: 'Meshstick 1262',
    manufacturer: 'Elecrow',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/',
  },
  'PICOMPUTER_S3': {
    name: 'Picomputer S3',
    manufacturer: 'Bobricius',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/',
  },
  'EBYTE_ESP32_S3': {
    name: 'EBYTE ESP32-S3',
    manufacturer: 'EBYTE',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/',
  },
  'ESP32_S3_PICO': {
    name: 'ESP32-S3 Pico',
    manufacturer: 'Waveshare',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/',
  },
  'SENSELORA_RP2040': {
    name: 'SenseLoRA RP2040',
    manufacturer: 'Makerfabs',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/',
  },
  'SENSELORA_S3': {
    name: 'SenseLoRA S3',
    manufacturer: 'Makerfabs',
    docUrl: 'https://meshtastic.org/docs/hardware/devices/',
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
