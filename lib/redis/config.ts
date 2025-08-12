import { getCurrentUserToken } from '@/lib/auth/get-current-user'
import { Redis } from '@upstash/redis'
import { createClient, RedisClientType } from 'redis'

export type RedisConfig = {
  useLocalRedis: boolean
  upstashRedisRestUrl?: string
  upstashRedisRestToken?: string
  upstashRedisProxyUrl?: string
  localRedisUrl?: string
}

export const redisConfig: RedisConfig = {
  useLocalRedis: process.env.USE_LOCAL_REDIS === 'true',
  upstashRedisRestUrl: process.env.UPSTASH_REDIS_REST_URL,
  upstashRedisRestToken: process.env.UPSTASH_REDIS_REST_TOKEN,
  // Prefer server env; fallback to NEXT_PUBLIC for unified toggle (per request)
  upstashRedisProxyUrl:
    process.env.UPSTASH_REDIS_PROXY_URL ||
    process.env.NEXT_PUBLIC_UPSTASH_REDIS_PROXY_URL,
  localRedisUrl: process.env.LOCAL_REDIS_URL || 'redis://localhost:6379'
}

let localRedisClient: RedisClientType | null = null

// Wrapper class for Redis client
export interface AppRedisClient {
  zrange(
    key: string,
    start: number,
    stop: number,
    options?: { rev: boolean }
  ): Promise<string[]>
  hgetall<T extends Record<string, unknown>>(key: string): Promise<T | null>
  pipeline(): PipelineLike
  hmset(key: string, value: Record<string, any>): Promise<'OK' | number>
  zadd(key: string, score: number, member: string): Promise<number | null>
  del(key: string): Promise<number>
  zrem(key: string, member: string): Promise<number>
  close(): Promise<void>
  get(key: string): Promise<string | null>
  set(
    key: string,
    value: string,
    options?: { ex?: number; EX?: number }
  ): Promise<string | null>
  keys(pattern: string): Promise<string[]>
  ttl(key: string): Promise<number>
}

interface PipelineLike {
  hgetall(key: string): this
  del(key: string): this
  zrem(key: string, member: string): this
  hmset(key: string, value: Record<string, any>): this
  zadd(key: string, score: number, member: string): this
  exec(): Promise<unknown>
}

export class RedisWrapper implements AppRedisClient {
  private client: Redis | RedisClientType

  constructor(client: Redis | RedisClientType) {
    this.client = client
  }

  async zrange(
    key: string,
    start: number,
    stop: number,
    options?: { rev: boolean }
  ): Promise<string[]> {
    let result: string[]
    if (this.client instanceof Redis) {
      result = await this.client.zrange(key, start, stop, options)
    } else {
      const redisClient = this.client as RedisClientType
      if (options?.rev) {
        result = await redisClient.zRange(key, start, stop, { REV: true })
      } else {
        result = await redisClient.zRange(key, start, stop)
      }
    }
    return result
  }

  async get(key: string): Promise<string | null> {
    if (this.client instanceof Redis) {
      return this.client.get<string | null>(key)
    } else {
      return (this.client as RedisClientType).get(key)
    }
  }

  async set(
    key: string,
    value: string,
    options?: { ex?: number; EX?: number }
  ): Promise<string | null> {
    const ttl = options?.ex ?? options?.EX
    if (this.client instanceof Redis) {
      if (ttl && ttl > 0) {
        return this.client.set(key, value, { ex: ttl })
      }
      return this.client.set(key, value)
    } else {
      if (ttl && ttl > 0) {
        return (this.client as RedisClientType).set(key, value, { EX: ttl })
      }
      return (this.client as RedisClientType).set(key, value)
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (this.client instanceof Redis) {
      // Upstash supports KEYS; for large datasets SCAN would be safer, but we mirror current usage
      return this.client.keys(pattern)
    } else {
      return (this.client as RedisClientType).keys(pattern)
    }
  }

  async ttl(key: string): Promise<number> {
    if (this.client instanceof Redis) {
      return this.client.ttl(key)
    } else {
      return (this.client as RedisClientType).ttl(key)
    }
  }

  async hgetall<T extends Record<string, unknown>>(
    key: string
  ): Promise<T | null> {
    if (this.client instanceof Redis) {
      return this.client.hgetall(key) as Promise<T | null>
    } else {
      const result = await (this.client as RedisClientType).hGetAll(key)
      return Object.keys(result).length > 0 ? (result as T) : null
    }
  }

  pipeline() {
    return this.client instanceof Redis
      ? new UpstashPipelineWrapper(this.client.pipeline())
      : new LocalPipelineWrapper((this.client as RedisClientType).multi())
  }

  async hmset(key: string, value: Record<string, any>): Promise<'OK' | number> {
    if (this.client instanceof Redis) {
      return this.client.hmset(key, value)
    } else {
      return (this.client as RedisClientType).hSet(key, value)
    }
  }

  async zadd(
    key: string,
    score: number,
    member: string
  ): Promise<number | null> {
    if (this.client instanceof Redis) {
      return this.client.zadd(key, { score, member })
    } else {
      return (this.client as RedisClientType).zAdd(key, {
        score,
        value: member
      })
    }
  }

  async del(key: string): Promise<number> {
    if (this.client instanceof Redis) {
      return this.client.del(key)
    } else {
      return (this.client as RedisClientType).del(key)
    }
  }

  async zrem(key: string, member: string): Promise<number> {
    if (this.client instanceof Redis) {
      return this.client.zrem(key, member)
    } else {
      return (this.client as RedisClientType).zRem(key, member)
    }
  }

  async close(): Promise<void> {
    if (this.client instanceof Redis) {
      // Upstash Redis doesn't require explicit closing
      return
    } else {
      await (this.client as RedisClientType).quit()
    }
  }
}

// Wrapper class for Upstash Redis pipeline
class UpstashPipelineWrapper {
  private pipeline: ReturnType<Redis['pipeline']>

  constructor(pipeline: ReturnType<Redis['pipeline']>) {
    this.pipeline = pipeline
  }

  hgetall(key: string) {
    this.pipeline.hgetall(key)
    return this
  }

  del(key: string) {
    this.pipeline.del(key)
    return this
  }

  zrem(key: string, member: string) {
    this.pipeline.zrem(key, member)
    return this
  }

  hmset(key: string, value: Record<string, any>) {
    this.pipeline.hmset(key, value)
    return this
  }

  zadd(key: string, score: number, member: string) {
    this.pipeline.zadd(key, { score, member })
    return this
  }

  async exec() {
    try {
      return await this.pipeline.exec()
    } catch (error) {
      throw error
    }
  }
}

// Wrapper class for local Redis pipeline
class LocalPipelineWrapper {
  private pipeline: ReturnType<RedisClientType['multi']>

  constructor(pipeline: ReturnType<RedisClientType['multi']>) {
    this.pipeline = pipeline
  }

  hgetall(key: string) {
    this.pipeline.hGetAll(key)
    return this
  }

  del(key: string) {
    this.pipeline.del(key)
    return this
  }

  zrem(key: string, member: string) {
    this.pipeline.zRem(key, member)
    return this
  }

  hmset(key: string, value: Record<string, any>) {
    // Convert all values to strings
    const stringValue = Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, String(v)])
    )
    this.pipeline.hSet(key, stringValue)
    return this
  }

  zadd(key: string, score: number, member: string) {
    this.pipeline.zAdd(key, { score, value: member })
    return this
  }

  async exec() {
    try {
      return await this.pipeline.exec()
    } catch (error) {
      throw error
    }
  }
}

// Function to get a Redis client
let redisWrapper: AppRedisClient | null = null

export async function getRedisClient(): Promise<AppRedisClient> {
  if (redisWrapper) {
    return redisWrapper
  }

  // Priority 1: Proxy mode via Supabase Edge Function or any HTTP proxy
  if (redisConfig.upstashRedisProxyUrl) {
    redisWrapper = new ProxyRedisWrapper(redisConfig.upstashRedisProxyUrl)
    return redisWrapper
  }

  if (redisConfig.useLocalRedis) {
    if (!localRedisClient) {
      const localRedisUrl =
        redisConfig.localRedisUrl || 'redis://localhost:6379'
      try {
        localRedisClient = createClient({ url: localRedisUrl })
        await localRedisClient.connect()
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('ECONNREFUSED')) {
            console.error(
              `Failed to connect to local Redis at ${localRedisUrl}: Connection refused. Is Redis running?`
            )
          } else if (error.message.includes('ETIMEDOUT')) {
            console.error(
              `Failed to connect to local Redis at ${localRedisUrl}: Connection timed out. Check your network or Redis server.`
            )
          } else if (error.message.includes('ENOTFOUND')) {
            console.error(
              `Failed to connect to local Redis at ${localRedisUrl}: Host not found. Check your Redis URL.`
            )
          } else {
            console.error(
              `Failed to connect to local Redis at ${localRedisUrl}:`,
              error.message
            )
          }
        } else {
          console.error(
            `An unexpected error occurred while connecting to local Redis at ${localRedisUrl}:`,
            error
          )
        }
        throw new Error(
          'Failed to connect to local Redis. Check your configuration and ensure Redis is running.'
        )
      }
    }
    redisWrapper = new RedisWrapper(localRedisClient)
  } else {
    if (
      !redisConfig.upstashRedisRestUrl ||
      !redisConfig.upstashRedisRestToken
    ) {
      throw new Error(
        'Upstash Redis configuration is missing. Please check your environment variables.'
      )
    }
    try {
      redisWrapper = new RedisWrapper(
        new Redis({
          url: redisConfig.upstashRedisRestUrl,
          token: redisConfig.upstashRedisRestToken
        })
      )
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('unauthorized')) {
          console.error(
            'Failed to connect to Upstash Redis: Unauthorized. Check your Upstash Redis token.'
          )
        } else if (error.message.includes('not found')) {
          console.error(
            'Failed to connect to Upstash Redis: URL not found. Check your Upstash Redis URL.'
          )
        } else {
          console.error('Failed to connect to Upstash Redis:', error.message)
        }
      } else {
        console.error(
          'An unexpected error occurred while connecting to Upstash Redis:',
          error
        )
      }
      throw new Error(
        'Failed to connect to Upstash Redis. Check your configuration and credentials.'
      )
    }
  }

  return redisWrapper
}

// Function to close the Redis connection
export async function closeRedisConnection(): Promise<void> {
  if (redisWrapper) {
    await redisWrapper.close()
    redisWrapper = null
  }
  if (localRedisClient) {
    await localRedisClient.quit()
    localRedisClient = null
  }
}

// Proxy-based wrappers (HTTP → Supabase Edge Function)
class ProxyRedisWrapper implements AppRedisClient {
  private proxyUrl: string
  private secret: string | undefined

  constructor(proxyUrl: string) {
    this.proxyUrl = proxyUrl
    this.secret = process.env.UPSTASH_REDIS_PROXY_SECRET
  }

  private async request<T>(body: Record<string, unknown>): Promise<T> {
    const headers: Record<string, string> = {
      'content-type': 'application/json'
    }
    if (this.secret) {
      headers['x-proxy-secret'] = this.secret
    } else {
      // Fallback: try Supabase user bearer token when secret is not provided
      try {
        const token = await getCurrentUserToken()
        if (token) {
          headers['authorization'] = `Bearer ${token}`
        }
      } catch {
        // ignore, will likely 401 if function requires auth
      }
    }
    const res = await fetch(this.proxyUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Proxy request failed: ${res.status} ${text}`)
    }
    const data = (await res.json()) as { result?: T; results?: T; error?: string }
    if ((data as any).error) {
      throw new Error((data as any).error)
    }
    return (data.result ?? data.results) as T
  }

  async zrange(
    key: string,
    start: number,
    stop: number,
    options?: { rev: boolean }
  ): Promise<string[]> {
    return this.request<string[]>({ op: 'zrange', args: { key, start, stop, options } })
  }

  async hgetall<T extends Record<string, unknown>>(key: string): Promise<T | null> {
    return this.request<T | null>({ op: 'hgetall', args: { key } })
  }

  pipeline() {
    return new ProxyPipelineWrapper(this.proxyUrl, this.secret)
  }

  async hmset(key: string, value: Record<string, any>): Promise<'OK' | number> {
    return this.request<'OK' | number>({ op: 'hmset', args: { key, value } })
  }

  async zadd(key: string, score: number, member: string): Promise<number | null> {
    return this.request<number | null>({ op: 'zadd', args: { key, score, member } })
  }

  async del(key: string): Promise<number> {
    return this.request<number>({ op: 'del', args: { key } })
  }

  async zrem(key: string, member: string): Promise<number> {
    return this.request<number>({ op: 'zrem', args: { key, member } })
  }

  async get(key: string): Promise<string | null> {
    return this.request<string | null>({ op: 'get', args: { key } })
  }

  async set(
    key: string,
    value: string,
    options?: { ex?: number; EX?: number }
  ): Promise<string | null> {
    const ex = options?.ex ?? options?.EX
    return this.request<string | null>({ op: 'set', args: { key, value, ex } })
  }

  async keys(pattern: string): Promise<string[]> {
    return this.request<string[]>({ op: 'keys', args: { pattern } })
  }

  async ttl(key: string): Promise<number> {
    return this.request<number>({ op: 'ttl', args: { key } })
  }

  async close(): Promise<void> {
    // no-op for proxy
  }
}

class ProxyPipelineWrapper {
  private proxyUrl: string
  private secret: string | undefined
  private ops: Array<{ op: string; args: Record<string, unknown> }> = []

  constructor(proxyUrl: string, secret?: string) {
    this.proxyUrl = proxyUrl
    this.secret = secret
  }

  hgetall(key: string) {
    this.ops.push({ op: 'hgetall', args: { key } })
    return this
  }

  del(key: string) {
    this.ops.push({ op: 'del', args: { key } })
    return this
  }

  zrem(key: string, member: string) {
    this.ops.push({ op: 'zrem', args: { key, member } })
    return this
  }

  hmset(key: string, value: Record<string, any>) {
    this.ops.push({ op: 'hmset', args: { key, value } })
    return this
  }

  zadd(key: string, score: number, member: string) {
    this.ops.push({ op: 'zadd', args: { key, score, member } })
    return this
  }

  async exec() {
    const headers: Record<string, string> = {
      'content-type': 'application/json'
    }
    if (this.secret) {
      headers['x-proxy-secret'] = this.secret
    } else {
      try {
        const token = await getCurrentUserToken()
        if (token) {
          headers['authorization'] = `Bearer ${token}`
        }
      } catch {
        // ignore
      }
    }

    const res = await fetch(this.proxyUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ops: this.ops })
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Proxy pipeline failed: ${res.status} ${text}`)
    }
    const data = (await res.json()) as { results?: unknown; error?: string }
    if ((data as any).error) {
      throw new Error((data as any).error)
    }
    return data.results
  }
}
