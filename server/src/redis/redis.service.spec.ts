import { Test, TestingModule } from "@nestjs/testing";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { RedisService } from "./redis.service";

describe("RedisService", () => {
  let service: RedisService;

  const mockCacheManager = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    stores: [
      {
        iterator: jest.fn(),
      },
    ],
  };

  const mockRedis = {
    zadd: jest.fn(),
    zrem: jest.fn(),
    zpopmin: jest.fn(),
    zpopmax: jest.fn(),
    zcard: jest.fn(),
    zscore: jest.fn(),
    zrange: jest.fn(),
    zrevrange: jest.fn(),
    zrangebyscore: jest.fn(),
    zcount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("checkRedisConnection", () => {
    it("should return Connected when connection is successful", async () => {
      mockCacheManager.set.mockResolvedValue(undefined);
      mockCacheManager.get.mockResolvedValue("ok");
      mockCacheManager.del.mockResolvedValue(true);

      const result = await service.checkRedisConnection();

      expect(result).toBe("Connected");
      expect(mockCacheManager.set).toHaveBeenCalledWith("connection-test", "ok", 1000);
      expect(mockCacheManager.get).toHaveBeenCalledWith("connection-test");
      expect(mockCacheManager.del).toHaveBeenCalledWith("connection-test");
    });

    it("should return Failed when connection test fails", async () => {
      mockCacheManager.set.mockResolvedValue(undefined);
      mockCacheManager.get.mockResolvedValue("failed");
      mockCacheManager.del.mockResolvedValue(true);

      const result = await service.checkRedisConnection();

      expect(result).toBe("Failed");
    });

    it("should return Error when connection throws error", async () => {
      mockCacheManager.set.mockRejectedValue(new Error("Connection failed"));

      const result = await service.checkRedisConnection();

      expect(result).toBe("Error");
    });
  });

  describe("set", () => {
    it("should set a key-value pair without TTL", async () => {
      const key = "test-key";
      const value = "test-value";

      mockCacheManager.set.mockResolvedValue(undefined);

      await service.set(key, value);

      expect(mockCacheManager.set).toHaveBeenCalledWith(key, value, undefined);
    });

    it("should set a key-value pair with TTL", async () => {
      const key = "test-key";
      const value = "test-value";
      const ttl = 3600;

      mockCacheManager.set.mockResolvedValue(undefined);

      await service.set(key, value, ttl);

      expect(mockCacheManager.set).toHaveBeenCalledWith(key, value, ttl);
    });

    it("should handle set error", async () => {
      const key = "test-key";
      const value = "test-value";
      const error = new Error("Redis connection failed");

      mockCacheManager.set.mockRejectedValue(error);

      await expect(service.set(key, value)).rejects.toThrow("Redis connection failed");
    });
  });

  describe("setMany", () => {
    it("should set multiple key-value pairs", async () => {
      const entries = [
        { key: "key1", value: "value1", ttl: 1000 },
        { key: "key2", value: "value2" },
      ];

      mockCacheManager.set.mockResolvedValue(undefined);

      await service.setMany(entries);

      expect(mockCacheManager.set).toHaveBeenCalledTimes(2);
      expect(mockCacheManager.set).toHaveBeenCalledWith("key1", "value1", 1000);
      expect(mockCacheManager.set).toHaveBeenCalledWith("key2", "value2", undefined);
    });
  });

  describe("get", () => {
    it("should get a value by key", async () => {
      const key = "test-key";
      const expectedValue = "test-value";

      mockCacheManager.get.mockResolvedValue(expectedValue);

      const result = await service.get(key);

      expect(result).toBe(expectedValue);
      expect(mockCacheManager.get).toHaveBeenCalledWith(key);
    });

    it("should return undefined when key does not exist", async () => {
      const key = "non-existent-key";

      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await service.get(key);

      expect(result).toBeUndefined();
      expect(mockCacheManager.get).toHaveBeenCalledWith(key);
    });

    it("should handle get error", async () => {
      const key = "test-key";
      const error = new Error("Redis connection failed");

      mockCacheManager.get.mockRejectedValue(error);

      await expect(service.get(key)).rejects.toThrow("Redis connection failed");
    });
  });

  describe("getMany", () => {
    it("should get multiple values", async () => {
      const keys = ["key1", "key2"];
      const values = ["value1", "value2"];

      mockCacheManager.get.mockResolvedValueOnce(values[0]).mockResolvedValueOnce(values[1]);

      const result = await service.getMany(keys);

      expect(result).toEqual(values);
      expect(mockCacheManager.get).toHaveBeenCalledTimes(2);
    });
  });

  describe("has", () => {
    it("should return true when key exists", async () => {
      const key = "test-key";
      mockCacheManager.get.mockResolvedValue("exists");

      const result = await service.has(key);

      expect(result).toBe(true);
      expect(mockCacheManager.get).toHaveBeenCalledWith(key);
    });

    it("should return false when key does not exist", async () => {
      const key = "test-key";
      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await service.has(key);

      expect(result).toBe(false);
      expect(mockCacheManager.get).toHaveBeenCalledWith(key);
    });
  });

  describe("delete", () => {
    it("should delete a key", async () => {
      const key = "test-key";
      mockCacheManager.del.mockResolvedValue(true);

      const result = await service.del(key);

      expect(result).toBe(true);
      expect(mockCacheManager.del).toHaveBeenCalledWith(key);
    });

    it("should handle delete error", async () => {
      const key = "test-key";
      const error = new Error("Redis connection failed");

      mockCacheManager.del.mockRejectedValue(error);

      await expect(service.del(key)).rejects.toThrow("Redis connection failed");
    });
  });

  describe("deleteMany", () => {
    it("should delete multiple keys", async () => {
      const keys = ["key1", "key2", "key3"];
      const results = [true, false, true];

      mockCacheManager.del.mockResolvedValueOnce(results[0]).mockResolvedValueOnce(results[1]).mockResolvedValueOnce(results[2]);

      const result = await service.deleteMany(keys);

      expect(result).toEqual(results);
      expect(mockCacheManager.del).toHaveBeenCalledTimes(3);
    });
  });

  describe("clear", () => {
    it("should clear all keys", async () => {
      const mockIterator = jest.fn().mockReturnValue(
        [
          ["key1", "value1"],
          ["key2", "value2"],
        ][Symbol.iterator]()
      );

      mockCacheManager.stores[0].iterator = mockIterator;
      mockCacheManager.del.mockResolvedValue(true);

      await service.clear();

      expect(mockCacheManager.del).toHaveBeenCalledTimes(2);
    });
  });

  describe("clearByPrefix", () => {
    it("should clear keys with specific prefix", async () => {
      const prefix = "test:";
      const mockIterator = jest.fn().mockReturnValue(
        [
          ["test:key1", "value1"],
          ["other:key2", "value2"],
          ["test:key3", "value3"],
        ][Symbol.iterator]()
      );

      mockCacheManager.stores[0].iterator = mockIterator;
      mockCacheManager.del.mockResolvedValue(true);

      const result = await service.clearByPrefix(prefix);

      expect(result).toBe(2);
      expect(mockCacheManager.del).toHaveBeenCalledTimes(2);
    });
  });

  describe("getKeysByPrefix", () => {
    it("should get keys with specific prefix", async () => {
      const prefix = "test:";
      const mockIterator = jest.fn().mockReturnValue(
        [
          ["test:key1", "value1"],
          ["other:key2", "value2"],
          ["test:key3", "value3"],
        ][Symbol.iterator]()
      );

      mockCacheManager.stores[0].iterator = mockIterator;

      const result = await service.getKeysByPrefix(prefix);

      expect(result).toEqual(["test:key1", "test:key3"]);
    });
  });

  describe("getStats", () => {
    it("should return cache statistics", async () => {
      const mockIterator = jest.fn().mockReturnValue(
        [
          ["user:1", "value1"],
          ["user:2", "value2"],
          ["cache:1", "value3"],
        ][Symbol.iterator]()
      );

      mockCacheManager.stores[0].iterator = mockIterator;

      const result = await service.getStats();

      expect(result.totalKeys).toBe(3);
      expect(result.keysByPrefix).toEqual({
        user: 2,
        cache: 1,
      });
      expect(result.memoryUsage).toBeDefined();
    });
  });

  describe("setWithExpiry", () => {
    it("should set a key with explicit expiry", async () => {
      const key = "test-key";
      const value = "test-value";
      const ttl = 5000;

      mockCacheManager.set.mockResolvedValue(undefined);

      await service.setWithExpiry(key, value, ttl);

      expect(mockCacheManager.set).toHaveBeenCalledWith(key, value, ttl);
    });
  });

  describe("getWithTTL", () => {
    it("should get a value with TTL info", async () => {
      const key = "test-key";
      const value = "test-value";

      mockCacheManager.get.mockResolvedValue(value);

      const result = await service.getWithTTL(key);

      expect(result).toEqual({ value, ttl: undefined });
      expect(mockCacheManager.get).toHaveBeenCalledWith(key);
    });
  });

  describe("iterator", () => {
    it("should iterate over all key-value pairs", async () => {
      const mockIterator = jest.fn().mockReturnValue(
        [
          ["key1", "value1"],
          ["key2", "value2"],
        ][Symbol.iterator]()
      );

      mockCacheManager.stores[0].iterator = mockIterator;

      const results: [string, any][] = [];
      for await (const [key, value] of service.iterator()) {
        results.push([key, value]);
      }

      expect(results).toEqual([
        ["key1", "value1"],
        ["key2", "value2"],
      ]);
    });
  });
});
