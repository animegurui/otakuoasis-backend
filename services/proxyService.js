import { NIGERIA_CONFIG } from '../config/nigeriaConfig.js';
import { getProxyStrategy } from '../utils/proxyStrategy.js';
import logger from '../utils/logger.js';

let currentProxyIndex = 0;
let proxyList = NIGERIA_CONFIG.proxies;

export const getProxy = () => {
  if (proxyList.length === 0) return null;
  
  const strategy = getProxyStrategy('roundRobin');
  return strategy();
};

export const rotateProxies = (newProxies) => {
  if (newProxies && newProxies.length > 0) {
    proxyList = newProxies;
    currentProxyIndex = 0;
    logger.info(`Proxy list rotated to new list with ${newProxies.length} proxies`);
    return true;
  }
  return false;
};

export const checkProxyHealth = async (proxy) => {
  try {
    const [host, port] = proxy.split(':');
    const response = await fetch('http://example.com', {
      method: 'HEAD',
      proxy: { host, port },
      timeout: 5000
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

export const checkAllProxies = async () => {
  const healthyProxies = [];
  for (const proxy of proxyList) {
    const isHealthy = await checkProxyHealth(proxy);
    if (isHealthy) healthyProxies.push(proxy);
  }
  
  if (healthyProxies.length > 0) {
    proxyList = healthyProxies;
    logger.info(`Proxy health check complete. ${healthyProxies.length}/${proxyList.length} proxies healthy`);
  } else {
    logger.warn('No healthy proxies available');
  }
  
  return healthyProxies;
};
 
