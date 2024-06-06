type CacheEntry = {
  isPromise: boolean;
  value: any;
  expiry: number;
};

const DEFAULT_TTL = 30 * 24 * 60 * 60 * 1000; // 30天的毫秒数

const cache = new Map<string, CacheEntry>();

/**
 * 内存缓存装饰器
 * @param {string} [customKey] 自定义键
 * @param {number} [ttl=2592000000] 缓存时间，单位毫秒，默认为30天
 * @returns {MethodDecorator} 方法装饰器
 */
export const MemoryCache = (
  customKey?: string,
  ttl: number = DEFAULT_TTL
): MethodDecorator => {
  return function (
    _target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
      const key = customKey || `${String(propertyKey)}:${JSON.stringify(args)}`;
      const now = Date.now();
      if (cache.has(key)) {
        const entry = cache.get(key);
        if (entry && now < entry.expiry) {
          return entry.isPromise ? Promise.resolve(entry.value) : entry.value;
        } else {
          cache.delete(key);
        }
      }

      const result = originalMethod.apply(this, args);
      const isPromise = result instanceof Promise;
      if (isPromise) {
        result.then((value) => {
          cache.set(key, { isPromise, value, expiry: now + ttl });
        });
      } else {
        cache.set(key, { isPromise, value: result, expiry: now + ttl });
      }
      return result;
    };
    return descriptor;
  };
};

/**
 * 清除缓存装饰器
 * @param {string} [customKey] 自定义键
 * @returns {MethodDecorator} 方法装饰器
 */
export const ClearMemory = (customKey?: string): MethodDecorator => {
  return function (
    _target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
      const key = customKey || `${String(propertyKey)}:${JSON.stringify(args)}`;
      if (cache.has(key)) {
        cache.delete(key);
      }
      return originalMethod.apply(this, args);
    };
    return descriptor;
  };
};
