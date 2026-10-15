@module caching
@title Caching
@level Intermediate
@desc Cache kahan lagayein, strategies, eviction policies, Redis aur cache ki common problems.

@lesson caching-basics
@title Caching basics: kahan aur kyun

**Cache** ek chhoti, fast storage hai (aksar memory/RAM) jisme frequently use hone wala data rakhte hain, taaki har baar slow source (database, disk, doosri service) tak na jaana pade.

> [!analogy] Kitchen ka masala dabba
> Saare masale store room me hain (database). Par roz use hone wale haldi, mirch, namak aap stove ke paas masala dabbe me rakhte ho (cache). Har baar store room nahi jaana padta. Dabba chhota hai, isliye sirf zaroori cheezein usme.

[[anim:cache]]

## Cache kyun?

- **Latency kam**: Redis se read ~1 ms, DB query 10–100 ms.
- **Database ka load kam**: 90% reads cache se, DB bach gaya.
- **Throughput zyada**: memory se lakhon reads/sec.
- **Cost kam**: chhota DB chal jaata hai.

## Cache hit aur miss

- **Hit**: data cache me mil gaya. Fast.
- **Miss**: nahi mila, source se laana pada (aur cache me rakh diya).
- **Hit ratio** = hits / total requests. 80–99% achha maana jaata hai.

> [!key] Kab cache karein
> Data jo **baar-baar padha** jaata hai, **kam badalta** hai, aur **compute karna mehenga** hai. Jaise product details, user profile, home page feed, config. Jo har second badalta ho ya ek hi baar padha jaye, use cache karne ka kam fayda.

## Caching ki layers

Request ke safar me har jagah cache ho sakta hai:

[[arch Caching kahan-kahan hoti hai]]
client:Browser cache ~ HTTP headers: Cache-Control, ETag
edge:CDN edge cache ~ static files, images, videos
edge:Load balancer / Reverse proxy cache ~ poore HTTP responses
svc:Application cache (in-memory) ~ har server ki apni memory, super fast par chhoti
cache:Distributed cache (Redis / Memcached) ~ sab servers share karte hain
db:Database cache (buffer pool) ~ DB khud hot pages memory me rakhta hai
[[/arch]]

## Local vs Distributed cache

| | Local (in-process) | Distributed (Redis) |
|---|---|---|
| Speed | Sabse fast (nanoseconds) | Fast (~1 ms, network) |
| Size | Ek server ki RAM | Bahut bada, scale ho sakta |
| Sharing | Har server ka alag copy | Sab servers ek hi data dekhte |
| Consistency | Servers me alag-alag values ho sakti | Ek source |
| Use | Config, chhoti lookup tables | Sessions, user data, counters |

Kai systems dono use karte hain: **L1 local cache** (chhota, few seconds TTL) + **L2 Redis**.

## TTL (Time To Live)

Har cache entry ki expiry. `SET product:101 {...} EX 300` = 5 minute baad apne aap hat jayega. TTL ek safety net hai: data galti se stale ho bhi gaya to zyada der nahi rahega.

:::interview
Q: Caching se kya fayde hain aur kya risks?
A: Fayde: latency kam, DB load kam, throughput zyada, cost kam. Risks: stale data (cache aur DB out of sync), cache failure par DB par achanak load (thundering herd), memory cost, aur complexity (invalidation, consistency). Isliye TTL, invalidation strategy aur fallback plan zaroori hain.
Q: Local cache aur distributed cache me kya choose karenge?
A: Chhota, rarely-changing, har server ko chahiye aisa data (feature flags, config) local cache me. Bada, shared, ya user-specific data (sessions, profiles) jise sab servers consistent dekhein, distributed cache (Redis) me. Bahut hot keys ke liye dono: chhota local L1 short TTL ke saath, peeche Redis L2.
Q: Achha cache hit ratio kitna hota hai aur use kaise badhayenge?
A: Use-case par depend karta hai, aam taur par 80%+ achha, read-heavy systems me 95–99%. Badhane ke liye: sahi data cache karo (popular items), cache size badhao, sahi eviction policy (LRU/LFU), TTL tune karo, aur cache warming (deploy ke baad popular keys pehle se load).
:::

@lesson cache-strategies
@title Cache strategies (patterns)

Cache aur database ko saath kaise chalayein? Padhne aur likhne ke alag-alag patterns hain.

## 1. Cache-aside (Lazy loading)

Sabse common. **Application** khud cache sambhalti hai.

1. App pehle cache dekhti hai.
2. Hit to return.
3. Miss to DB se padho, cache me SET karo, return.
4. Write par: DB update karo aur cache entry **delete** (invalidate) karo.

```python
def get_user(uid):
    u = redis.get(f"user:{uid}")
    if u: return u                      # hit
    u = db.query("SELECT * FROM users WHERE id=%s", uid)   # miss
    redis.set(f"user:{uid}", u, ex=600)
    return u

def update_user(uid, data):
    db.update(uid, data)
    redis.delete(f"user:{uid}")          # agli read fresh data laayegi
```

- **Fayde**: sirf zaroori data cache hota hai, cache gira to bhi app chalti (slow).
- **Nuksaan**: har miss par 3 trips, pehli request slow, stale data ka chhota risk.

> [!tip] Update par delete kyun, set kyun nahi?
> Do concurrent writes me set karne se purani value cache me reh sakti hai. Delete karna safe hai: agli read DB se fresh value laayegi.

## 2. Read-through

Cache khud DB se data laata hai. App sirf cache se baat karti hai. Logic cache library/provider me hota hai. Cache-aside jaisa, par code saaf.

## 3. Write-through

Har write **pehle cache me, phir turant DB me** (dono synchronously).

- **Fayde**: cache hamesha fresh, reads fast.
- **Nuksaan**: writes slow (do jagah), aur aisa data bhi cache me jo kabhi padha nahi jayega.

## 4. Write-back (Write-behind)

Write sirf **cache me**, aur cache baad me (batch me) DB me likhta hai.

- **Fayde**: writes bahut fast, DB par batch writes.
- **Nuksaan**: cache crash hua to **data loss**. Sirf tab jab thoda loss chal jaye (view counters, analytics, likes counter).

## 5. Write-around

Write seedha DB me, cache ko bypass. Cache sirf read par bharta hai.

- **Fayde**: cache me woh data nahi bharta jo kabhi padha nahi jayega (logs, bulk imports).
- **Nuksaan**: haal hi me likha data padhne par pehli baar miss.

| Pattern | Write latency | Read freshness | Data loss risk | Best for |
|---|---|---|---|---|
| Cache-aside | Normal | Achha (TTL + invalidate) | Nahi | General purpose, read-heavy |
| Read-through | Normal | Achha | Nahi | Cleaner code |
| Write-through | Zyada | Sabse achha | Nahi | Read-after-write zaroori |
| Write-back | Sabse kam | Achha | Haan | Write-heavy counters |
| Write-around | Normal | Pehli read miss | Nahi | Rarely re-read data |

## Refresh-ahead

Popular keys ka TTL khatam hone se **pehle** background me refresh kar do, taaki users ko kabhi miss na mile. Home page, trending list jaise hot data ke liye.

:::interview
Q: Cache-aside pattern samjhaiye.
A: Application read par pehle cache check karti hai; miss par DB se padh ke cache me (TTL ke saath) daalti hai. Write par DB update karke cache key delete karti hai. Isme sirf requested data cache hota hai aur cache down ho to bhi system DB se chal sakta hai. Nuksaan: miss penalty aur race conditions se thoda stale data possible (TTL bachata hai).
Q: Write-through aur write-back me farak?
A: Write-through: har write cache aur DB dono me synchronously, data safe aur cache fresh, par write latency zyada. Write-back: write sirf cache me, DB me baad me async/batch, writes bahut fast par cache failure par data loss. Write-back counters/analytics ke liye, write-through jahan read-after-write consistency chahiye.
Q: Cache aur database ko consistent kaise rakhenge?
A: Perfect consistency mushkil hai, practical tareeke: write par cache invalidate (delete) karna; TTL as safety net; CDC (database change stream, jaise Debezium) se cache invalidate karna; versioned keys; aur jahan strong consistency chahiye wahan critical reads seedha DB se. Delete-after-update ke race ke liye "delayed double delete" bhi use hota hai.
:::

@lesson eviction
@title Eviction policies: LRU, LFU, FIFO

Cache chhoti hoti hai. Jab bhar jaaye aur naya item aaye to kisi purane ko nikalna padta hai. Kise nikaalein? Ye **eviction policy** tay karti hai.

[[anim:lru]]

## Policies

- **LRU (Least Recently Used)**: jo sabse lambe time se use nahi hua, use nikalo. Idea: jo haal me use hua woh phir use hoga. Sabse popular.
- **LFU (Least Frequently Used)**: jo sabse kam baar use hua, use nikalo. Popular items lambe time bache rehte hain. Problem: purana popular item (kal ka trending) bhi chipka reh sakta hai, isliye counts ko time ke saath decay karte hain.
- **FIFO (First In First Out)**: jo pehle aaya pehle gaya. Simple, par popularity ignore karta hai.
- **Random**: random item nikalo. Surprisingly decent aur sasta.
- **TTL-based**: expire hue items pehle.

| Policy | Kise nikalta hai | Achha jab |
|---|---|---|
| LRU | Sabse purana use | Recent access future predict karta hai (most apps) |
| LFU | Sabse kam use | Kuch items hamesha popular (CDN, static) |
| FIFO | Sabse pehle aaya | Simple queues, data jo ek baar use hota |
| Random | Koi bhi | Bahut simple implementation chahiye |

## LRU kaise implement hota hai (interview favourite)

**HashMap + Doubly Linked List**, dono operations **O(1)**:

- HashMap: `key -> list node` (fast lookup).
- Doubly linked list: front = most recent, back = least recent.
- `get(key)`: map se node lo, use list ke front par le aao.
- `put(key, val)`: naya node front par. Capacity cross hui to back wala node hatao aur map se bhi delete.

Poora code Module 11 (LRU Cache LLD) me hai.

## Redis eviction policies

Redis me `maxmemory-policy` setting:
- `allkeys-lru`: kisi bhi key par LRU (cache ke liye common).
- `volatile-lru`: sirf jin keys par TTL hai unpar LRU.
- `allkeys-lfu`, `volatile-ttl`, `noeviction` (memory full to write error).

> [!pro] Approximate LRU
> Redis exact LRU nahi karta (har access par list update karna mehenga). Woh kuch random keys sample karke unme se sabse purani nikaalta hai. Kam memory me lagbhag LRU jaisa result.

:::interview
Q: LRU cache ko O(1) me kaise implement karenge?
A: HashMap aur doubly linked list combine karke. Map key se node deta hai O(1) me. List recency order rakhti hai: access par node ko head par move karna O(1) (prev/next pointers se), eviction tail se O(1). Put par naya node head par, capacity exceed ho to tail node hatao aur map se delete.
Q: LRU aur LFU me kab kya choose karenge?
A: LRU general workloads ke liye achha hai jahan recently used data phir use hota hai (sessions, feeds). LFU tab jab kuch items consistently popular hon aur occasional scans/one-time accesses cache ko pollute na karein (CDN popular assets). LFU me aging/decay chahiye taaki purane popular items hamesha na chipke rahein.
Q: Cache full hone par Redis kya karta hai?
A: `maxmemory-policy` ke hisaab se: allkeys-lru/lfu kisi bhi key ko evict karta hai, volatile-* sirf TTL wali keys ko, aur noeviction me naye writes error dete hain. Pure cache use ke liye allkeys-lru ya allkeys-lfu common hai.
:::

@lesson cache-problems
@title Cache ki problems aur Redis vs Memcached

Caching powerful hai, par saath me kuch khatarnak problems laati hai. Interview me ye bahut poochi jaati hain.

## 1. Cache invalidation (sabse mushkil)

> [!note]
> "Computer science me sirf do mushkil cheezein hain: cache invalidation aur cheezon ke naam rakhna." — Phil Karlton

DB me data badla par cache me purana raha -> users ko stale data. Ilaaj:
- Write par cache key **delete**.
- **TTL** as safety net.
- **Event-based invalidation**: DB change -> event (CDC/Kafka) -> cache delete.
- **Versioned keys**: `product:101:v7`.

## 2. Cache stampede / Thundering herd

Ek bahut popular key (jaise IPL score page) expire hui, aur usi second **hazaaron requests** ko miss mila. Sab DB par toot pade -> DB down.

Ilaaj:
- **Locking / request coalescing**: sirf ek request DB se laaye (mutex lock), baaki thoda wait karke cache se padhein.
- **Refresh-ahead**: expire hone se pehle background refresh.
- **Probabilistic early expiration**: TTL ke paas pahunchte hi kuch requests random early refresh karein.
- **Stale-while-revalidate**: purana data serve karte raho jab tak naya aa raha hai.

## 3. Cache penetration

Aisi keys ki requests jo **DB me hain hi nahi** (jaise `user:-1` ya attacker random IDs bhej raha). Har baar miss, har baar DB hit.

Ilaaj:
- **Negative caching**: "not found" ko bhi chhote TTL ke saath cache karo.
- **Bloom filter**: pehle check karo ki key exist kar sakti hai ya nahi (Module 8).
- Input validation.

## 4. Cache avalanche

Bahut saari keys **ek saath expire** ho gayi (sab ko same TTL diya tha), ya cache server hi gir gaya. DB par achanak bhaari load.

Ilaaj:
- TTL me **random jitter** (300s ± 60s).
- Cache cluster ko highly available rakho (replicas, Redis Sentinel/Cluster).
- **Circuit breaker** aur rate limiting DB ke aage.
- Cache warming.

## 5. Hot key

Ek hi key par itna traffic ki ek Redis node sambhal na sake (celebrity profile, flash sale product).

Ilaaj: **local cache** (L1) us key ke liye, key ko **replicate** karke kai nodes par (`hot:key#1..#10`), read replicas.

| Problem | Wajah | Ilaaj |
|---|---|---|
| Stampede | Ek hot key expire | Lock, refresh-ahead, stale-while-revalidate |
| Penetration | Non-existent keys | Negative cache, Bloom filter |
| Avalanche | Bahut keys ek saath expire / cache down | TTL jitter, HA cache, circuit breaker |
| Hot key | Ek key par bhaari load | Local cache, key replication |

## Redis vs Memcached

| | Redis | Memcached |
|---|---|---|
| Data types | Strings, lists, sets, sorted sets, hashes, streams, bitmaps, HyperLogLog | Sirf strings |
| Persistence | Haan (RDB snapshots, AOF) | Nahi |
| Replication / HA | Haan (replicas, Sentinel, Cluster) | Nahi (client side sharding) |
| Threading | Mostly single-threaded command execution | Multi-threaded |
| Extra | Pub/Sub, Lua scripts, transactions, geo | Simple, very fast |
| Use | Cache + leaderboards, rate limiters, queues, sessions | Pure simple cache |

> [!tip] Redis ke extra super-powers
> - **Sorted sets**: leaderboard (`ZADD`, `ZREVRANGE`).
> - **INCR + EXPIRE**: rate limiter counters.
> - **SETNX / SET NX PX**: simple distributed lock.
> - **Geo**: nearby search (`GEOADD`, `GEOSEARCH`).
> - **Streams / Pub-Sub**: lightweight messaging.

:::interview
Q: Thundering herd / cache stampede kya hai aur kaise rokenge?
A: Jab ek bahut popular cache key expire hoti hai aur ek saath bahut saari requests miss hokar database par jaati hain. Rokne ke liye: mutex/single-flight (sirf ek request recompute kare, baaki wait ya stale serve), refresh-ahead ya probabilistic early expiration, stale-while-revalidate, aur TTL jitter.
Q: Cache penetration aur avalanche me farak?
A: Penetration: aisi keys ki requests jo exist hi nahi karti, isliye cache kabhi kaam nahi aata aur har request DB par (ilaaj: negative caching, Bloom filter). Avalanche: bahut saari valid keys ek saath expire ho jaati hain ya cache cluster down ho jaata hai, isliye DB par achanak flood (ilaaj: TTL jitter, highly available cache, circuit breaker, warming).
Q: Redis aur Memcached me kya choose karenge?
A: Simple string caching, multi-threaded raw throughput chahiye aur persistence nahi to Memcached. Rich data structures (sorted sets, hashes), persistence, replication/failover, pub/sub, Lua, locks chahiye to Redis. Aaj kal zyada tar systems Redis choose karte hain kyunki ek tool kai kaam karta hai.
Q: Redis single-threaded hokar bhi itna fast kaise hai?
A: Saara data memory me, efficient data structures, non-blocking I/O multiplexing (epoll), aur single thread hone se locks/context switching ka overhead nahi. Bottleneck aam taur par network hota hai, CPU nahi. Naye versions me I/O threads bhi hain.
:::

@quiz
Q: Cache-aside pattern me data update hone par cache ke saath kya karte hain?
- Kuch nahi
+ Cache key delete (invalidate) karte hain
- Poora cache flush
- Cache band karte hain
E: Key delete karne se agli read DB se fresh data laakar cache me daalti hai. Ye race conditions me set karne se safe hai.

Q: View counter jahan thoda data loss chal jaye, writes bahut zyada hon. Kaunsa pattern?
- Write-through
+ Write-back
- Write-around
- No cache
E: Write-back me write sirf cache me aur DB me baad me batch me, isliye bahut fast. Thoda loss acceptable ho tab hi.

Q: LRU cache O(1) ke liye kaunsa data structure combination?
- Array + binary search
+ HashMap + doubly linked list
- Stack + queue
- B-Tree
E: Map se O(1) lookup, doubly linked list se O(1) move-to-front aur tail eviction.

Q: IPL score page ki cache key expire hui aur 50,000 requests ek saath DB par gayi. Ye kya hai?
- Cache penetration
+ Cache stampede (thundering herd)
- Hot partition
- Replication lag
E: Ek hot key ke expire hone par ek saath bahut saare misses DB par jaana stampede hai. Lock/single-flight ya refresh-ahead se bachte hain.

Q: Attacker random non-existent user IDs bhej raha hai, har request DB tak ja rahi hai. Ilaaj?
- TTL badhao
+ Negative caching ya Bloom filter
- Write-back cache
- Zyada app servers
E: Cache penetration ka ilaaj: "not found" ko bhi cache karo, ya Bloom filter se pehle hi pata karo ki key exist nahi karti.

Q: Saari keys ko same TTL (exactly 1 hour) dene se kya risk hai?
- Kuch nahi
+ Cache avalanche: sab ek saath expire honge
- Memory leak
- Data corruption
E: Sab ek saath expire hongi to DB par achanak flood. TTL me random jitter daalna chahiye.

Q: Leaderboard (top 10 players by score) ke liye Redis ka kaunsa data type?
- String
- List
+ Sorted Set
- Bitmap
E: Sorted set score ke hisaab se sorted rehta hai; ZREVRANGE se top N turant milta hai.

Q: Distributed cache (Redis) ka local in-memory cache par mukhya fayda?
- Zyada fast hai
+ Sab servers ek hi shared data dekhte hain aur size bada ho sakta hai
- Network ki zaroorat nahi
- Free hai
E: Local cache fastest hai par har server ka alag copy aur chhota. Redis shared aur scalable hai.
