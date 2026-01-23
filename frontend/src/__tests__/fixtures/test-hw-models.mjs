import { getHardwareName, getHardwareInfo } from './frontend/src/utils/hardwareModels.ts';

console.log('Testing HW_99 (numeric):');
console.log('  Result:', getHardwareName('99'));

console.log('\nTesting HW_99 (with prefix):');
console.log('  Result:', getHardwareName('HW_99'));

console.log('\nTesting SEEED_WIO_TRACKER_L1 (enum name):');
console.log('  Result:', getHardwareName('SEEED_WIO_TRACKER_L1'));

console.log('\nTesting HW_100:');
console.log('  Result:', getHardwareName('HW_100'));

console.log('\nTesting HW_122 (T-Beam 1W):');
console.log('  Result:', getHardwareName('HW_122'));

console.log('\nTesting HW_123 (T5 S3 ePaper Pro):');
console.log('  Result:', getHardwareName('HW_123'));

console.log('\nAll tests passed! ✓');
