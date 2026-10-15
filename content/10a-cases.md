@module case-studies
@title HLD Case Studies
@level Pro
@desc Interview framework aur 13 real systems: URL shortener, WhatsApp, Instagram feed, YouTube, Uber, BookMyShow, payments aur aur bhi.

@lesson interview-framework
@title Case study kaise solve karein (interview framework)

System design interview 45–60 minute ka hota hai aur question bahut khula hota hai: "Design WhatsApp." Bina structure ke aap kho jaoge. Ye **6-step framework** har case study me use karo. Is module ki saari case studies isi order me hain.

## Step 1: Requirements clarify karo (5 minute)

**Functional requirements**: core features kya hain? 3–5 must-have features chuno, baaki ko "out of scope" bolo.
**Non-functional requirements**: scale (DAU), latency, availability, consistency, durability.

Achhe sawaal:
- "Kitne daily active users? Read-heavy ya write-heavy?"
- "Global users hain ya ek country?"
- "Consistency kitni zaroori hai: payments jaisi ya likes jaisi?"
- "Media (photos/videos) bhi hai?"

## Step 2: Estimation (3–5 minute)

QPS (average aur peak), storage, bandwidth. Sirf utna jitna design decisions me kaam aaye. (Module 1 ka calculator yaad karo.)

## Step 3: API design (5 minute)

Main endpoints likho: method, path, request, response. Isse interviewer ko scope clear ho jaata hai.

```http
POST /v1/messages        {to, text, client_msg_id}
GET  /v1/chats/{id}/messages?before=cursor&limit=50
```

## Step 4: Data model (5 minute)

Main entities, fields, aur **kaunsa database kyun**. Access patterns ke hisaab se primary key / partition key.

## Step 5: High-level design (10–15 minute)

Boxes aur arrows: clients, LB/gateway, services, caches, queues, databases, storage, CDN. **Ek main flow** (jaise "message bhejna") ko diagram par chal ke samjhao.

## Step 6: Deep dive aur trade-offs (10–15 minute)

Interviewer jis hisse me ruchi dikhaye, ya sabse mushkil hissa: scaling the DB, hot keys, consistency, failure handling. Har decision ke saath **"kyun"** aur **"kya nuksaan"**.

## Wrap-up (2–3 minute)

Bottlenecks aur aage ke improvements: monitoring, multi-region, rate limiting, security.

> [!key] Golden rules
> - **Sochte hue bolo**. Silence me design mat karo.
> - **Simple se shuru**, phir scale karo. Pehle working design, phir optimize.
> - **Trade-offs bolo**: "Main X choose kar raha hoon kyunki..., iska cost ye hai..."
> - Interviewer ke hints suno; woh aapko sahi direction me le jaana chahta hai.
> - Buzzwords mat phenko (Kafka, Kubernetes) bina reason ke.

| Step | Time | Output |
|---|---|---|
| Requirements | 5 min | Feature list + NFRs |
| Estimation | 3–5 min | QPS, storage |
| API | 5 min | Endpoints |
| Data model | 5 min | Tables/DB choice |
| High-level design | 10–15 min | Diagram + main flow |
| Deep dive | 10–15 min | Bottlenecks, trade-offs |
| Wrap-up | 2–3 min | Improvements |

:::interview
Q: System design interview me shuru kaise karenge?
A: Seedha diagram nahi. Pehle problem restate karke functional requirements (core 3–5 features) aur non-functional requirements (scale, latency, availability, consistency) clarify karta hoon, scope ke bahar kya hai woh bolta hoon. Phir quick estimation, APIs, data model, high-level design, aur phir deep dive. Har step par interviewer se confirm karta rehta hoon.
Q: Agar interviewer kisi component par bahut gehra sawaal poochhe jo aapko nahi pata?
A: Imaandaari se bolo kya pata hai aur kya nahi, phir first principles se reason karo: "Exact implementation nahi pata, par main ise aise approach karunga kyunki..." Interviewer reasoning dekhta hai, rata hua answer nahi.
:::

@lesson design-url-shortener
@title Design: URL Shortener (TinyURL / bit.ly)

Lamba URL do, chhota link milo: `https://sho.rt/aZ3kQ9`. Click karo to original par redirect.

## 1. Requirements

**Functional**
- Long URL se short URL banana.
- Short URL kholne par original URL par redirect.
- Optional: custom alias (`sho.rt/diwali-sale`), expiry, click analytics.

**Non-functional**
- Bahut **read-heavy** (redirects >> creates, ~100:1).
- Redirect **fast** (< 50 ms) aur **highly available**.
- Short codes **unique** aur guessable nahi (ideally).

## 2. Estimation

- 100M naye URLs/month ≈ 3.3M/day ≈ **~40 writes/sec**.
- Reads 100× ≈ **~4,000 redirects/sec** (peak ~10K).
- 10 saal: 100M × 12 × 10 = **12 billion URLs**. Ek record ~500 bytes -> **~6 TB**.

**Short code length**: Base62 (a–z, A–Z, 0–9). 62^6 ≈ 56.8 billion, 62^7 ≈ 3.5 trillion. **7 characters** kaafi hain.

## 3. API

```http
POST /v1/urls      {"long_url": "...", "custom_alias": null, "expires_at": null}
-> 201 {"short_url": "https://sho.rt/aZ3kQ9"}

GET /aZ3kQ9   -> 301/302 Location: <long_url>
```

> [!tip] 301 vs 302
> **301 (permanent)**: browser cache kar leta hai, server load kam, par analytics miss (agli baar browser seedha original par). **302 (temporary)**: har click server se guzarta hai, analytics possible. Analytics chahiye to 302.

## 4. Data model

```text
urls: short_code (PK) | long_url | user_id | created_at | expires_at
```

Simple key-value access, billions of rows -> **DynamoDB/Cassandra** jaisa NoSQL, ya sharded MySQL/Postgres (short_code par shard). Aage **Redis cache**.

## 5. Short code kaise banayein?

### Option A: Hash + truncate
`base62(md5(long_url))[:7]`. Collisions ho sakti hain -> DB check, collision par salt badal ke dobara. Same URL ka same code (dedup) bonus.

### Option B: Unique ID + Base62 encode (recommended)
Distributed ID generator (Snowflake ya ranges) se unique number, phir Base62.

```python
ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
def base62(n):
    s = ""
    while n: n, r = divmod(n, 62); s = ALPHABET[r] + s
    return s or "0"
```

Koi collision nahi. Sequential IDs se codes guessable ho sakte hain; ilaaj: ID ko bijective shuffle/encrypt karke encode karo.

### Option C: Pre-generated key service (KGS)
Ek service pehle se random unique 7-char keys bana ke DB me rakhti hai. App servers keys ka batch memory me le lete hain. Fast, collision-free; KGS ko HA rakhna padta hai, aur crash par batch ki kuch keys waste (chalta hai).

## 6. High-level design

[[arch URL shortener]]
client:Browser / App
edge:Load Balancer
svc:Shortener API (create), svc:Redirect Service (read) ~ reads aur writes alag scale
cache:Redis cache (short_code -> long_url) ~ 80/20: popular links cache me
svc:ID generator / KGS, db:URL DB (Cassandra / sharded SQL)
queue:Click events (Kafka) ~ async analytics, redirect slow nahi hota
svc:Analytics workers -> warehouse
[[/arch]]

**Redirect flow**: request -> Redis lookup -> hit to 302 -> miss to DB -> cache me set -> 302. Click event Kafka me async.

## 7. Deep dive aur trade-offs

- **Caching**: 20% links 80% traffic laate hain. LRU cache, TTL; non-existent codes ke liye negative cache/Bloom filter (cache penetration).
- **Expiry**: lazy delete (read par expired dekha to 404) + background cleanup job.
- **Custom alias**: same table, unique constraint; conflict par error.
- **Abuse**: rate limit creation per user/IP, malicious URL scanning.
- **Analytics**: Kafka -> stream aggregation (clicks per code per hour) -> OLAP store.
- **Global**: GeoDNS + multi-region read replicas/caches; writes ek region ya ID ranges per region.

:::interview
Q: Short code generation ke options aur unke trade-offs?
A: Hash+truncate: stateless, same URL same code, par collisions handle karni padti hain (DB check + retry). Counter/Snowflake ID + Base62: no collisions, simple, par codes predictable ho sakte hain (shuffle/encrypt se fix) aur ID generator chahiye. Pre-generated key service: fast aur collision-free, par extra service aur unused keys ka waste. Interview me ID + Base62 ya KGS achha default hai.
Q: Redirect ke liye 301 ya 302?
A: Analytics aur control (link disable/edit) chahiye to 302, kyunki har click server tak aata hai. Sirf load kam karna ho aur link kabhi badalna nahi to 301 (browser cache karta hai). Zyada tar shorteners analytics ke liye 302/307 use karte hain.
Q: System read-heavy hai, kaise scale karenge?
A: Redirect path ko alag service banao, aage Redis cache (high hit ratio), CDN/edge par bhi popular redirects cache ho sakte hain, DB me read replicas ya NoSQL partitions short_code se. Analytics ko async (Kafka) rakho taaki redirect latency par asar na ho.
:::

@lesson design-rate-limiter
@title Design: Distributed Rate Limiter

Ek API platform (jaise Stripe ya aapki company ka public API) ke liye rate limiter jo har user/API key ki limits enforce kare, kai servers aur regions me.

## 1. Requirements

**Functional**
- Rules: "Free plan: 100 req/min, Pro: 1000 req/min", per endpoint limits (login: 5/min per IP).
- Limit cross to `429` + `Retry-After`.
- Rules bina deploy ke change ho sakein.

**Non-functional**
- **Low latency**: har request par check, overhead < 1–2 ms.
- **Highly available**: limiter down ho to API down nahi honi chahiye.
- **Accurate enough** across servers (thoda error chalega).

## 2. Kahan lagayein?

- **Client side**: bharosa nahi (bypass ho jaata hai).
- **API gateway / middleware**: best. Requests services tak pahunchne se pehle.
- **Service ke andar**: specific business limits (OTP per phone).

## 3. Algorithm

**Token bucket** (bursts allowed, memory kam) ya **sliding window counter** (accurate-ish, memory kam). (Module 7 me demo dekha tha.)

## 4. Data model (Redis)

```text
key:   rl:{api_key}:{endpoint}
value: tokens, last_refill_ts      (token bucket, Redis hash)
TTL:   kuch minute (inactive keys apne aap hatein)
```

## 5. High-level design

[[arch Distributed rate limiter]]
client:API clients
edge:API Gateway + Rate limit middleware ~ har request par check
cache:Redis Cluster (counters) ~ atomic Lua script: refill + consume ek saath
svc:Rules service, db:Rules DB ~ rules local memory me cache, periodic refresh
svc:Backend services ~ sirf allowed requests yahan tak
[[/arch]]

**Flow**: request aayi -> middleware ne API key aur endpoint se rule nikaala (local cache) -> Redis Lua script (atomic) -> allowed to forward + headers (`X-RateLimit-Remaining`), warna 429.

```lua
-- token bucket in Redis (atomic)
local t = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local cap, rate, now = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3])
local tokens = tonumber(t[1]) or cap
local ts = tonumber(t[2]) or now
tokens = math.min(cap, tokens + (now - ts) * rate)
local allowed = 0
if tokens >= 1 then tokens = tokens - 1; allowed = 1 end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', KEYS[1], 60000)
return allowed
```

## 6. Deep dive

- **Race conditions**: read-modify-write ek saath karne ke liye Lua script / `INCR`. Do servers ek saath check kare to bhi sahi.
- **Performance**: Redis call har request par ~0.5 ms. Bahut hot keys ke liye **local token bucket** with periodic sync (thoda inaccurate, bahut fast).
- **Redis failure**: **fail open** (allow karo, log/alert) zyada tar APIs ke liye; security-sensitive (login) ke liye fail closed.
- **Multi-region**: har region ki local limit (global limit / regions) ya async sync. Exact global limit mehenga hai.
- **Clock**: Redis server ka time (`TIME`) use karo, app servers ke clocks par bharosa mat karo.
- **Client experience**: `Retry-After`, `X-RateLimit-Limit/Remaining/Reset` headers, documentation.

:::interview
Q: Rate limiter ko high-throughput aur low-latency kaise banayenge?
A: Gateway par in-path check, Redis cluster me per-key state, ek network round trip me atomic Lua script, rules local memory me cached. Extreme hot keys ke liye local in-memory buckets jo periodically Redis se reconcile hon. Redis ko shard karo (consistent hashing on key), replicas for HA, aur Redis unavailability par fail-open policy.
Q: Multiple data centers me global rate limit kaise?
A: Options: (1) har region ko limit ka hissa de do (simple, approximate), (2) central Redis (accurate par cross-region latency), (3) local counting + async gossip/sync of counts (eventually accurate). Zyada tar systems approximate per-region limits accept karte hain kyunki latency zyada important hai.
:::

@lesson design-chat
@title Design: Chat App (WhatsApp)

## 1. Requirements

**Functional**
- 1-to-1 chat aur group chat (max ~1000 members).
- Online/offline status, last seen.
- Message status: **sent ✓, delivered ✓✓, read** (blue ticks).
- Media (photos, videos) sharing.
- Offline user ko baad me messages milein + push notification.

**Non-functional**
- **Real-time**: low latency delivery (< 200 ms jab dono online).
- **Messages kabhi lost nahi** (durability), aur ek chat me **order sahi**.
- Massive scale: ~2B users, ~100B messages/day.
- End-to-end encryption (server message padh nahi sakta).

## 2. Estimation

- 100B messages/day ≈ **~1.2M messages/sec** average.
- Message ~100 bytes -> 10 TB/day (text only). Media alag (object storage).
- Concurrent connections: ~hundreds of millions -> ek server ~1M connections -> **sainkdon gateway servers**.

## 3. API / Protocol

Real-time ke liye **WebSocket** (persistent, two-way). Media upload ke liye HTTP + object storage.

```text
-> {type: "send", client_msg_id, chat_id, to, ciphertext, ts}
<- {type: "ack", client_msg_id, server_msg_id}          (sent ✓)
<- {type: "message", server_msg_id, chat_id, from, ciphertext}
-> {type: "delivered", server_msg_id}                     (✓✓)
-> {type: "read", chat_id, upto_msg_id}                   (blue)
```

## 4. Data model

```text
messages (Cassandra / HBase):
  partition key: chat_id
  clustering key: message_id (time-sortable, Snowflake)
  columns: sender_id, ciphertext, media_url, created_at

user_inbox / undelivered (per user queue)
chat_members: chat_id -> [user_ids]          (groups)
user_sessions (Redis): user_id -> gateway_server_id, last_seen
```

Wide-column store kyunki: bahut zyada writes, "chat ke last 50 messages" query, horizontal scale.

## 5. High-level design

[[arch Chat system (WhatsApp jaisa)]]
client:User A (phone), client:User B (phone)
edge:Load Balancer (L4, long-lived connections)
svc:Chat Gateway servers (WebSocket) ~ har user ek gateway se connected
cache:Session registry (Redis: user -> gateway), svc:Chat Service (routing, ordering, persistence)
db:Message store (Cassandra), queue:Kafka (fan-out, offline delivery)
svc:Push Notification Service, store:Media store (S3 + CDN), svc:Presence Service
[[/arch]]

**1-to-1 message flow**:
1. A ka phone WebSocket par message bhejta hai (`client_msg_id` ke saath).
2. Gateway -> Chat Service: message ko ID dekar **DB me persist**. A ko **ACK (sent ✓)**.
3. Chat Service registry me dekhta hai B kis gateway par hai.
4. B online: us gateway ko route -> B ko deliver -> B ka phone "delivered" bhejta hai -> A ko ✓✓.
5. B offline: message undelivered queue me + **push notification** (FCM/APNs). B online aate hi pending messages sync.

## 6. Deep dive

- **Ordering**: per chat ordering ke liye server-assigned time-sortable IDs (ya per-chat sequence number). Client `client_msg_id` se **dedup** (retry par duplicate nahi).
- **Delivery guarantee**: at-least-once + idempotent (client_msg_id). Message tab tak "pending" jab tak ACK na aaye.
- **Group chat**: chhote groups me **fan-out on write**: har member ke liye deliver. Group ke saare members ke gateways tak message bhejna (Kafka se). Bahut bade groups/channels me fan-out on read.
- **Presence (online/last seen)**: heartbeats se Redis me `last_seen`. Har status change sab contacts ko push karna mehenga, isliye lazily (jab chat khule) ya sirf active contacts ko.
- **Media**: client pehle media S3 par upload (pre-signed URL, encrypted), message me sirf URL + key. Receiver CDN se download.
- **End-to-end encryption**: Signal protocol; server ke paas sirf ciphertext. Isliye server-side search nahi hota.
- **Storage**: WhatsApp delivered messages server se hata deta hai (phone par backup). Telegram jaise apps cloud me rakhte hain.
- **Gateway failure**: client reconnect (backoff) kisi aur gateway par; pending messages DB/queue me safe.

:::interview
Q: Message "delivered" aur "read" status kaise implement karenge?
A: Server message persist karke sender ko ACK deta hai (sent). Recipient device message receive karke delivered ACK bhejta hai; server use sender tak forward karta hai aur message state update karta hai (✓✓). Chat kholne par client "read upto message_id X" bhejta hai (har message ke liye alag nahi, batching), jo sender ko blue ticks ke liye forward hota hai. Group me per-member state ya aggregated counts.
Q: User offline ho to messages kaise milenge?
A: Message durable store me persist hota hai aur recipient ki undelivered/inbox queue me jaata hai. Push notification service (FCM/APNs) device ko wake karta hai. App reconnect par last synced message ID ke baad ke saare pending messages fetch karta hai (cursor-based sync), aur delivered ACKs bhejta hai.
Q: Lakhon WebSocket connections ko kaise scale karenge?
A: Dedicated stateless-logic gateway servers jo sirf connections hold karein (event-driven I/O, epoll; ~1M connections per server tuning ke saath). L4 load balancer, connection registry (user -> gateway) Redis me, gateways ke beech routing ke liye internal RPC ya pub/sub. Heartbeats se dead connections cleanup, deploys me graceful draining aur client-side reconnect with jitter.
:::

@lesson design-news-feed
@title Design: News Feed (Instagram / Twitter)

## 1. Requirements

**Functional**
- User post kare (text, photos).
- User doosron ko follow kare.
- **Home feed**: jinko follow karte ho unke posts (latest/ranked), infinite scroll.
- Like, comment (basic).

**Non-functional**
- Feed load **fast** (< 200 ms), bahut **read-heavy**.
- Highly available; eventual consistency chalegi (post 5 second baad dikhe to theek).
- Scale: 500M DAU, average 200 follows, kuch celebrities ke **crores followers**.

## 2. Estimation

- Posts: 500M × 0.2 posts/day = 100M posts/day ≈ 1,200 writes/sec.
- Feed reads: 500M × 10 refresh/day = 5B/day ≈ **~60K reads/sec** (peak 150K+).

## 3. API

```http
POST /v1/posts                {text, media_ids}
GET  /v1/feed?cursor=...&limit=20
POST /v1/users/{id}/follow
```

## 4. Data model

```text
users, posts (post_id, author_id, text, media_urls, created_at)   -> sharded by post_id/author_id
follows (follower_id, followee_id)                                -> graph / sharded table, dono directions index
feed_cache (Redis): user_id -> list of post_ids (latest ~500)
```

## 5. Feed kaise banayein: Push vs Pull

### Fan-out on write (Push)
Post karte hi uske **saare followers ke feed cache** me post_id daal do.
- Feed padhna super fast (pehle se ready list).
- Celebrity (5 crore followers) post kare to 5 crore writes! Slow aur mehenga. Aur inactive followers ke liye waste.

### Fan-out on read (Pull)
Feed kholne par jinko follow karte ho unke recent posts **us waqt** laao aur merge karo.
- Post karna sasta.
- Feed padhna slow (200 logon ke posts laake merge).

### Hybrid (real systems)
- Normal users ke posts: **push** (followers ke feed cache me).
- **Celebrities** ke posts: **pull** (feed padhte waqt celebrity ke recent posts alag se laake merge).
- Inactive users ke liye precompute mat karo; jab aayein tab build.

[[arch News feed (hybrid fan-out)]]
client:Mobile / Web
edge:API Gateway + LB
svc:Post Service, svc:Feed Service, svc:Follow (Graph) Service
queue:Kafka (new post events) ~ post service event publish karta hai
svc:Fan-out workers ~ normal authors: followers ke feed cache me post_id push
cache:Feed cache (Redis lists per user), cache:Post cache (post objects)
db:Posts DB (sharded), db:Follow graph DB, store:Media (S3 + CDN)
[[/arch]]

**Feed read flow**: Feed Service -> Redis se user ka precomputed list -> followed celebrities ke recent posts (pull, cached) -> merge + rank -> post objects post cache se hydrate -> media URLs CDN ke -> cursor ke saath return.

## 6. Deep dive

- **Ranking**: chronological se shuru; phir ML ranking (engagement prediction, recency, relationship strength). Candidate generation (~500) -> ranking -> top 20.
- **Pagination**: cursor-based (last seen post_id/score), duplicates nahi.
- **Media**: upload pre-signed URL se S3, async processing (sizes, compression), CDN delivery.
- **Counters (likes)**: Redis me increment, periodically DB me flush (write-back); exact real-time count zaroori nahi.
- **Hot posts**: viral post ke liye post cache + CDN; like counter sharded counters.
- **Consistency**: post karne wale ko apna post turant dikhna chahiye (read-your-writes): client side insert ya author ke feed me sync write.

:::interview
Q: Fan-out on write aur fan-out on read me kab kya?
A: Fan-out on write: reads fast (precomputed feed), writes mehenge; normal users (kam followers) ke liye achha. Fan-out on read: writes sasti, reads slow (merge time par); celebrities aur inactive users ke liye. Production me hybrid: normal authors push, high-follower authors pull + merge at read time.
Q: Celebrity problem kaise solve karenge?
A: Celebrities (threshold se zyada followers) ke posts fan-out nahi karte; unke posts ek alag cache me rehte hain. Follower ka feed padhte waqt Feed Service unke followed celebrities ke recent posts laakar precomputed feed ke saath merge karti hai. Post objects aur media heavy caching + CDN.
Q: Feed ka infinite scroll aur pagination kaise?
A: Cursor-based pagination: response me next_cursor (last item ka score/timestamp/post_id). Next request usse aage ke items laati hai. Offset pagination new posts aane par duplicates/miss karta hai aur deep pages slow hote hain. Ranked feeds me ek feed "session snapshot" bhi rakha ja sakta hai taaki scroll ke beech ranking change se items na hilein.
:::

@lesson design-youtube
@title Design: Video Streaming (YouTube / Netflix)

## 1. Requirements

**Functional**
- Video upload (creators).
- Video watch (streaming), search, recommendations (high-level).
- Views, likes, comments.

**Non-functional**
- Smooth playback, kam buffering, alag networks (2G se fiber) par.
- Uploads kabhi lost nahi.
- Global scale, highly available. Bahut zyada read (watch) vs upload.

## 2. Estimation

- 5M uploads/day, average 300 MB raw -> **1.5 PB/day raw** (transcoded versions alag).
- Watch: 1B videos/day. Bandwidth bahut zyada: isliye **CDN par sab depend**.

## 3. Upload flow

1. Creator app **pre-signed URL** leti hai, raw video **chunks me** (multipart, resumable) object storage me upload.
2. Upload complete -> event queue me.
3. **Transcoding pipeline**: video ko alag resolutions (144p ... 1080p, 4K) aur codecs (H.264, VP9, AV1) me convert, chhote **segments** (2–10 sec) me todna, thumbnails, audio tracks.
4. Ye kaam **DAG of tasks** hai jo parallel workers par chalta hai (har segment alag worker par).
5. Output segments + manifest file storage me -> CDN par distribute.
6. Metadata DB update: "video ready".

## 4. Streaming: Adaptive Bitrate (ABR)

Video **HLS** ya **MPEG-DASH** format me: ek **manifest** (playlist) jisme har quality ke segments ki list. Player network speed dekh ke **har segment ke liye quality** chunta hai. Network slow hua to 480p, achha hua to 1080p. Isliye buffering kam.

```text
master.m3u8
  ├── 1080p/playlist.m3u8 -> seg001.ts, seg002.ts, ...
  ├── 720p/playlist.m3u8
  └── 360p/playlist.m3u8
```

## 5. High-level design

[[arch Video platform]]
client:Creator app, client:Viewer app (player)
edge:API Gateway, edge:CDN (edge caches) ~ 95%+ video bytes CDN se
svc:Upload Service, svc:Video Metadata Service, svc:Search / Recommendation
store:Raw video storage (S3), queue:Transcode job queue ~ upload event se jobs
svc:Transcoding workers (parallel, per segment) ~ resolutions, codecs, thumbnails
store:Processed segments storage (S3) ~ origin for CDN
db:Metadata DB (sharded SQL / Cassandra), cache:Metadata cache, queue:View events (Kafka) -> analytics
[[/arch]]

## 6. Deep dive

- **CDN strategy**: popular videos pehle se edges par (push/pre-warm), long tail pull. Netflix apne CDN boxes (Open Connect) ISPs ke andar rakhta hai.
- **Cost**: storage (kai versions), transcoding compute, egress bandwidth: teen bade kharche. Kam dekhe videos ke kam versions, cold storage.
- **View counts**: har view par DB write nahi; Kafka -> stream aggregation -> periodic update. Approximate real-time count chalega.
- **Resumable uploads**: chunk-level ACKs, failure par sirf bacha hua upload.
- **Search**: metadata + transcripts Elasticsearch me.
- **Recommendations**: offline ML (watch history) + online ranking; homepage rows precompute.
- **Copyright/moderation**: async pipeline (Content ID fingerprinting).

:::interview
Q: Adaptive bitrate streaming kaise kaam karta hai?
A: Video ko kai bitrates/resolutions me transcode karke chhote segments me toda jaata hai, aur manifest (HLS/DASH) me sab variants list hote hain. Player bandwidth aur buffer level measure karke har agle segment ke liye appropriate quality download karta hai, isliye network badalne par bina rukawat quality upar-neeche hoti hai.
Q: Video transcoding pipeline ko scale kaise karenge?
A: Upload complete hone par job queue me. Video ko segments me split karke parallel workers (autoscaling, spot instances) har segment ko har target format me transcode karein; DAG orchestrator dependencies sambhale (split -> transcode -> merge/package -> thumbnails). Idempotent tasks, retries, priority queues (popular creators), aur progress tracking.
Q: YouTube par view count kaise maintain karenge?
A: Har view event Kafka me; stream processor dedup/fraud filter karke per-video counts window me aggregate kare aur periodically DB/cache me increment kare. Display count Redis se. Exactness ke liye baad me batch reconciliation. Synchronous DB increment per view scale nahi karega.
:::

@lesson design-uber
@title Design: Ride Sharing (Uber / Ola)

## 1. Requirements

**Functional**
- Rider pickup aur drop location deke ride request kare, fare estimate dekhe.
- Nazdeeki available driver ko request jaaye, driver accept kare.
- Ride ke time dono ki **live location**.
- Ride complete, payment, rating.

**Non-functional**
- **Matching fast** (kuch seconds).
- Driver location updates bahut zyada (har 4 sec).
- Highly available; ek ride do drivers ko assign na ho (**consistency in matching**).

## 2. Estimation

- 5M active drivers, har 4 sec location -> **~1.25M location writes/sec**. Ye sabse bada load hai.
- Ride requests: 20M rides/day ≈ ~250/sec (peak 1–2K).

## 3. Main components

[[arch Ride-hailing system]]
client:Rider app, client:Driver app
edge:API Gateway, edge:WebSocket gateway (live updates)
svc:Location Service ~ driver locations ingest (in-memory geo index)
cache:Geo index (Redis Geo / H3 cells in memory), queue:Location stream (Kafka) -> history, ETA ML
svc:Matching / Dispatch Service ~ nearby drivers dhoondo, offer bhejo, lock lo
svc:Trip Service, db:Trips DB (SQL), svc:Pricing (surge) Service, svc:Payment Service, svc:Maps / ETA Service
[[/arch]]

## 4. Driver location tracking

- Driver app har ~4 sec location bhejta hai (WebSocket/HTTP).
- Location Service **in-memory geo index** update karti hai: driver ka current cell (geohash / H3) aur status (available/on-trip).
- Har update DB me likhne ki zaroorat nahi; **Kafka** me stream (history, analytics, ETA models).
- Geo index ko **city/region ke hisaab se shard** karo (Mumbai ka data Mumbai ke servers par).

## 5. Matching flow

1. Rider request: pickup location.
2. Matching Service: pickup ka cell + padosi cells (expanding radius) me **available drivers** nikaalo.
3. **ETA** (road distance, traffic) se rank karo, sirf seedhi distance se nahi.
4. Top driver ko offer (push via WebSocket), ~10–15 sec timeout. Reject/timeout to agla.
5. Driver accept -> **atomic assignment**: driver ka status "available" se "on-trip" (conditional update / distributed lock), taaki do riders ko same driver na mile.
6. Trip create, dono ko details; live location share.

> [!key] Double booking se bachna
> `UPDATE drivers SET status='ON_TRIP', trip_id=X WHERE id=D AND status='AVAILABLE'` (compare-and-set). 0 rows updated = driver already liya ja chuka. Ya Redis lock with TTL.

## 6. Deep dive

- **Geospatial index**: H3 hexagons (Uber) ya geohash; quadtree in-memory. Dense areas me chhoti cells.
- **Surge pricing**: har area (cell) me demand (requests) vs supply (available drivers) stream processing se, multiplier compute.
- **ETA**: road graph (map data) + live traffic + ML.
- **Trip state machine**: REQUESTED -> ACCEPTED -> ARRIVED -> IN_PROGRESS -> COMPLETED / CANCELLED. Har transition validate.
- **Payments**: trip complete par async, idempotent (Payment design dekhein).
- **Failure**: Location Service node gira to drivers agle update (4 sec) me re-register ho jaate hain, isliye in-memory state acceptable.
- **Multi-region**: city-level isolation; ek city ka outage doosri city ko na gire.

:::interview
Q: Nearby drivers efficiently kaise dhoondhenge?
A: Driver locations in-memory geospatial index me (geohash/H3 cells -> driver set), city ke hisaab se sharded. Rider ke pickup cell aur padosi rings ke cells se candidate drivers, status available filter, phir road-network ETA se rank. Har 4 sec ke updates se index fresh; har update DB me nahi, stream me.
Q: Ek driver do riders ko assign na ho, kaise ensure karenge?
A: Assignment ek atomic compare-and-set operation se: driver status AVAILABLE ho tabhi ON_TRIP set ho (DB conditional update ya Redis lock/Lua). Offers sequential (ek time ek rider ko) ya short reservation lock with TTL. Fail hone par next candidate driver.
Q: Lakhon location updates/sec kaise handle karenge?
A: Lightweight ingestion (UDP/WebSocket batched), in-memory geo index sharded by region, sirf latest location rakho (overwrite), history Kafka -> cold storage async. Updates ka rate adaptive (gaadi ruki ho to kam). Stateless ingestion servers horizontally scale.
:::

@lesson design-notification
@title Design: Notification System

Ek central service jo **push (mobile), SMS, email, in-app** notifications bheje: OTP, order updates, offers.

## 1. Requirements

**Functional**
- Channels: push (FCM/APNs), SMS, email, in-app.
- Types: transactional (OTP, order shipped: turant aur zaroori), promotional (sale: bulk, kam priority).
- User preferences (opt-out, quiet hours), templates, multiple languages.
- Scheduling ("kal 9 baje bhejo").

**Non-functional**
- **Reliable**: important notifications lost na hon; at-least-once.
- **No duplicates** jahan tak possible (ek OTP 3 baar na aaye).
- Scale: crores per day, sale ke time spikes.
- Low latency for OTPs (seconds me).

## 2. High-level design

[[arch Notification system]]
svc:Order Service, svc:Auth (OTP), svc:Marketing campaigns ~ producers
edge:Notification API ~ validate, idempotency key, rate limit
svc:Notification Service ~ preferences check, template render, priority decide
db:User prefs + device tokens, db:Templates
queue:Priority queues: high (OTP), medium, low (promo) ~ alag queues taaki promo OTP ko na roke
svc:Push workers, svc:SMS workers, svc:Email workers ~ per channel, retries + backoff
ext:FCM / APNs, ext:SMS providers (2+), ext:Email provider (SES / SendGrid)
db:Notification log (status, delivery receipts)
[[/arch]]

## 3. Flow

1. Service API call karti hai: `{user_id, type: "ORDER_SHIPPED", data, idempotency_key}`.
2. Notification Service: **dedup** (idempotency key), user preferences/opt-out, quiet hours, **rate limit per user** (spam nahi).
3. Template render (language), channel decide.
4. **Priority queue** me daalo (OTP high, promo low).
5. Channel workers third-party providers ko bhejte hain; failure par **retry with backoff**, phir **fallback provider** (SMS provider A down -> B).
6. Delivery status/receipts (webhooks) se log update; analytics (opened/clicked).

## 4. Deep dive

- **Priority isolation**: alag queues aur worker pools. 1 crore promo messages queue me hon tab bhi OTP turant jaaye.
- **Bulk campaigns**: user segment ko batches me expand karo, throttle karo (providers ki limits), time zones ka dhyan.
- **Device tokens**: user ke kai devices; invalid token (app uninstall) par cleanup.
- **Idempotency**: same event dobara aaye to dobara notification nahi (key + TTL store).
- **Third-party failures**: circuit breaker per provider, multi-provider failover.
- **Scheduling**: scheduled notifications DB me, scheduler service due items queue me daale (time-bucketed polling).
- **Compliance**: promotional SMS ke liye DND/TRAI rules (India), unsubscribe links in email.

:::interview
Q: OTP aur promotional notifications ek hi system me ho to OTP delay kaise rokenge?
A: Priority-based separate queues aur dedicated worker pools/rate limits: high-priority (OTP, transactional) queue ke workers kabhi promo traffic se starve nahi hote. Promo ke liye throttling aur batch sending. Provider-level bhi transactional aur promotional routes alag.
Q: Duplicate notifications kaise rokenge?
A: Producers idempotency key bhejein (event id); Notification Service key ko TTL ke saath store kare aur duplicate requests drop kare. Workers at-least-once process karte hain, isliye send se pehle status check (already SENT?) aur provider-level dedup jahan available. Retries sirf retryable errors par.
Q: Third-party SMS provider down ho jaye to?
A: Circuit breaker per provider, failure par secondary provider par automatic failover (routing rules by cost/latency/success rate), retries with backoff, aur critical OTP ke liye alternate channel (voice call/WhatsApp/email). Delivery receipts monitor karke provider health track.
:::

@lesson design-typeahead
@title Design: Typeahead / Autocomplete

Google search box me "how to" type karte hi suggestions: "how to make tea", "how to tie a tie". Har keystroke par **~100 ms ke andar** top suggestions.

## 1. Requirements

**Functional**
- Prefix type karne par top 5–10 suggestions (popularity ke hisaab se).
- Trending queries jaldi suggestions me aayein.

**Non-functional**
- **Bahut low latency** (< 100 ms, kyunki har keystroke).
- Bahut zyada QPS (har user kai keystrokes).
- Suggestions thode purane (minutes/hours) ho to chalega.

## 2. Estimation

- 500M searches/day, average 10 keystrokes -> **5B suggestion requests/day ≈ 60K QPS** (peak 150K+).

## 3. Data structure: Trie

Har node ek character; root se node tak ka path = prefix. Har node par us prefix ke **top K completions precompute** karke rakh do.

```text
(root)
  └─ t
     └─ e  [top: "tea", "tesla", "test"]
        └─ a  [top: "tea", "team india", "teacher"]
```

- Lookup = prefix tak chalna (O(length of prefix)) + top K ready. Bahut fast.
- Top K har node par store karna memory leta hai par query time par sort ki zaroorat nahi.

## 4. Design

[[arch Typeahead system]]
client:Search box (debounce ~100-150 ms) ~ client side bhi har character par call nahi, chhota pause
edge:CDN / edge cache ~ popular prefixes ("a", "ip", "how") cache
svc:Suggestion Service ~ in-memory trie (sharded by prefix range), read-only snapshots
queue:Search logs (Kafka) ~ har search query log
svc:Aggregation pipeline (batch / streaming) ~ query frequencies, trending
svc:Trie builder ~ naya trie banake suggestion servers par deploy (har ghanta / din)
[[/arch]]

**Read path**: client debounce -> CDN/browser cache -> Suggestion Service in-memory trie -> top K return.
**Write path (offline)**: search logs -> frequency count (with time decay) -> naya trie build -> serialize -> servers load karke swap.

## 5. Deep dive

- **Sharding**: trie bada hai to prefix range se shard (a–c, d–h...), ya first 2 chars ke hash se. Uneven distribution ("s" se bahut words) ke liye weighted ranges.
- **Trending**: daily rebuild slow hai. Streaming counts (pichhle 1 ghanta) ke saath merge, ya chhota "trending" trie alag.
- **Personalization**: user ki history ke suggestions upar (client side ya chhoti per-user list).
- **Filtering**: offensive/illegal suggestions blocklist.
- **Typos/fuzzy**: edit distance, n-grams (Elasticsearch completion suggester).
- **Caching**: chhote prefixes (1–2 characters) bahut common, inhe CDN/browser par cache (Cache-Control).
- **Multi-language**: Hinglish/Hindi ke liye alag tries ya transliteration.

:::interview
Q: Autocomplete ke liye trie kyun aur use fast kaise banayenge?
A: Trie prefix lookup ko prefix length ke proportional banata hai. Har node par us prefix ke precomputed top-K suggestions store karne se query time par subtree traverse/sort nahi karna padta. Trie memory me, sharded by prefix, read-only snapshots periodically rebuild. Client debounce + CDN caching se load aur latency aur kam.
Q: Suggestions ko trending searches ke saath fresh kaise rakhenge?
A: Search logs Kafka me; stream processing pichhle kuch minute/ghante ke frequencies (time-decayed) compute kare. Periodic trie rebuild + ek chhota real-time trending index jise query time par merge karein. Atomic swap se naye trie ko bina downtime load.
:::

@lesson design-bookmyshow
@title Design: Ticket Booking (BookMyShow)

Movie/concert ke liye seat select karke booking. Mushkil hissa: **ek hi seat do logon ko na bik jaye**, aur bade shows (Coldplay concert, first day first show) ke time **massive traffic**.

## 1. Requirements

**Functional**
- City, movie, theatre, show search.
- Seat map dekhna, seats select karke **temporarily hold** (jaise 10 minute).
- Payment ke baad booking confirm, ticket.
- Hold expire to seats wapas available.

**Non-functional**
- **Strong consistency** for seat booking: double booking bilkul nahi.
- High availability for browsing; flash sales me spike handle.
- Payment failures handle, atka paisa refund.

## 2. Data model (SQL, kyunki transactions chahiye)

```text
movies, theatres, screens, shows (show_id, screen_id, movie_id, start_time)
show_seats (show_id, seat_id, status [AVAILABLE|HELD|BOOKED], hold_expires_at, booking_id, version)
bookings (booking_id, user_id, show_id, seat_ids, amount, status [PENDING|CONFIRMED|CANCELLED])
payments (payment_id, booking_id, status, idempotency_key)
```

## 3. Seat hold flow (core logic)

```sql
BEGIN;
UPDATE show_seats
   SET status = 'HELD', hold_expires_at = now() + interval '10 minutes', booking_id = :bid
 WHERE show_id = :show AND seat_id IN (:seats)
   AND (status = 'AVAILABLE' OR (status = 'HELD' AND hold_expires_at < now()));
-- updated rows == requested seats ? COMMIT : ROLLBACK (seat koi aur le gaya)
COMMIT;
```

- Conditional update atomic hai: do users ek saath same seat lein to sirf ek ka update succeed hoga.
- Alternative: Redis me `SET seat:{show}:{seat} {user} NX EX 600` (fast hold), DB me final booking.

## 4. Booking confirm

1. Seats HELD -> booking PENDING -> payment page.
2. Payment success (webhook, idempotent) -> seats BOOKED, booking CONFIRMED (ek transaction me, hold abhi bhi user ka ho tabhi).
3. Payment fail/timeout -> hold expire -> seats wapas AVAILABLE (background job ya lazy check).
4. Edge case: paisa kata par hold expire ho chuka aur seat kisi aur ne le li -> **auto refund** (reconciliation).

## 5. High-level design

[[arch Ticket booking]]
client:User app / web
edge:CDN (static, posters), edge:API Gateway + rate limit
svc:Catalog / Search Service (movies, shows), svc:Booking Service, svc:Payment Service
cache:Catalog cache (Redis), cache:Seat holds (Redis optional), queue:Virtual waiting room (hot events)
db:Booking DB (SQL, sharded by show_id / city), db:Catalog DB, ext:Payment gateway
queue:Events (Kafka): booking confirmed -> tickets, email/SMS, analytics
[[/arch]]

## 6. Deep dive: flash sale (Coldplay India tour)

- **Virtual waiting room / queue**: lakhon users ko ek saath booking page par mat aane do. Queue me token do, batches me andar bhejo. Server bachta hai aur fairness aati hai.
- **Rate limiting per user**, bot detection, CAPTCHA.
- **Seat map caching**: availability ka thoda stale view cache se, par final hold DB/Redis atomic check se.
- **Sharding by show_id**: ek show ka saara seat data ek shard par, transactions local.
- **Hot show**: us show ke liye dedicated capacity, pre-warming.

:::interview
Q: Do users same seat ek saath book karein to kya hoga? Double booking kaise rokenge?
A: Seat status update atomic conditional write se: `UPDATE ... WHERE status='AVAILABLE'` (ya optimistic version check) ek transaction me; jiska update pehle commit hua usko seat, doosre ko 0 rows aur "seat unavailable". Alternatively Redis SETNX hold with TTL fast path, aur DB unique/conditional constraint final source of truth.
Q: Seat hold expire kaise handle karenge?
A: Hold ke saath expiry timestamp. Availability check me expired holds ko available maano (lazy), aur background job periodically expired holds release kare. Redis TTL use karein to apne aap expire. Payment confirm ke time verify karo ki hold abhi bhi usi booking ka hai; nahi to refund flow.
Q: Bade concert ki ticket sale me lakhon users ko kaise sambhalenge?
A: Virtual waiting room (queue tokens, controlled admission rate), CDN for static content, aggressive caching of catalog, rate limiting aur bot protection, booking service ko us show ke shard par scale, short holds, idempotent payments, aur graceful degradation (seat map ki jagah "best available" allocation).
:::
