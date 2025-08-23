import { getProxy } from '../services/proxyService.js';

export const getProxyStrategy = (strategyName = 'roundRobin') => {
  return getProxy;
};

export const rotateProxyList = (newList) => {
  // This would trigger a rotation in the proxyService
  // Implementation depends on how you manage state
};
 
