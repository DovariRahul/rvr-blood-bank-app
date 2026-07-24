const os = require('os');

/**
 * Dynamically detect the developer machine's local IPv4 address.
 */
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const interfaceName in interfaces) {
    for (const iface of interfaces[interfaceName]) {
      // Skip loopback, non-IPv4, and link-local (169.254.x.x) addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        if (!iface.address.startsWith('169.254.')) {
          return iface.address;
        }
      }
    }
  }
  return '127.0.0.1';
}

module.exports = ({ config }) => {
  const localIp = getLocalIpAddress();
  console.log(`[LifeLink] Detected local development machine IP: ${localIp}`);

  return {
    ...config,
    extra: {
      ...config.extra,
      localIpAddress: localIp,
    },
  };
};
