@module interview-prep
@title Interview Prep
@level Pro
@desc Interview strategy, rapid-fire Q&A, trade-offs cheat sheet, glossary aur 30 din ka revision plan.

@lesson interview-day
@title Interview day: kya dekhte hain, kya galtiyan hoti hain

Aapne saare concepts padh liye. Ab sabse zaroori hai unhe **interview me present** karna. Is lesson me level-wise expectations aur common galtiyan hain.

## Level ke hisaab se expectations

| Level | Interviewer kya expect karta hai |
|---|---|
| Fresher / SDE-1 | Basics clear (client-server, DB, caching, LB), simple design end-to-end, LLD/OOP strong |
| SDE-2 (2–5 saal) | Poora HLD with estimation, sahi DB/cache/queue choices with reasons, scaling bottlenecks, 1–2 deep dives |
| Senior / SDE-3+ | Trade-offs gehraai se, failure modes, consistency models, cost, operability, multiple alternatives compare, interviewer ko drive karna |

## Interviewer kin cheezon par score karta hai

1. **Problem navigation**: requirements nikaale, scope sahi rakha, ambiguity handle ki.
2. **Solution design**: working, logical, scalable architecture.
3. **Technical depth**: kam se kam ek-do jagah gehraai (DB internals, consistency, caching strategy).
4. **Trade-offs**: alternatives aur unke pros/cons.
5. **Communication**: clear, structured, collaborative; feedback ko accept karke adjust.

## Common galtiyan

> [!warn] Ye mat karo
> - Requirements bina poochhe design shuru karna.
> - 15 minute estimation me laga dena.
> - Har box me "microservice" aur har arrow par "Kafka" bina reason.
> - Sirf happy path; failures (server down, network partition, duplicate requests) ignore karna.
> - Interviewer ke hint ko ignore karke apni hi line par chalte rehna.
> - "Ye best hai" bolna, "ye trade-off hai" ki jagah.
> - Chup-chaap sochna. Interviewer aapki soch sunna chahta hai.
> - Ek hi component me itna gehra jaana ki baaki design adhoora reh jaye.

## Achhe phrases jo kaam aate hain

- "Shuru karne se pehle main kuch requirements clarify karna chahunga..."
- "Main ek simple version se shuru karta hoon, phir scale karte hain."
- "Yahan do options hain: A aur B. A me ye fayda hai par ye cost hai. Hamari requirement X hai, isliye main A chunta hoon."
- "Ye single point of failure hai, isliye yahan replica/failover rakhenge."
- "Agar is hisse ka load 10× ho jaye to bottleneck yahan aayega..."
- "Kya aap chahenge main is component me deep dive karun?"

## Whiteboard / virtual tools

Excalidraw, draw.io, Miro ya interviewer ka tool pehle se practice karo. Boxes ke naam saaf, arrows par direction aur kya flow ho raha hai ("write", "async event").

## Taiyari ka tareeka

- Har case study ko **khud se bolkar** 45 minute me solve karo (timer lagao).
- Doston ke saath **mock interviews**: ek interviewer, ek candidate.
- Real systems ke engineering blogs padho (aakhri lesson me list).
- Apne current/college project ka design achhe se samjhao: "Aapne kya banaya, scale kitna tha, kya galat gaya" bhi poocha jaata hai.

:::interview
Q: Agar interviewer bole "ye design 10 guna traffic par kaise chalega?" to kya karenge?
A: Pehle numbers dobara nikaalo (QPS, storage, bandwidth 10×), phir har layer check karo ki pehla bottleneck kahan aayega: app servers (horizontal scale + autoscaling), cache (cluster/sharding, hit ratio), DB (read replicas, sharding, write batching), queues (partitions, consumers), external dependencies (rate limits). Sabse kamzor kadi pehle batao aur uska fix.
Q: Design me koi galti interviewer ne pakdi, kaise react karenge?
A: Defensive mat bano. Accept karo, samjho ki problem kya hai, aur design ko adjust karo: "Achha point, is case me duplicate writes ho sakte hain; isse handle karne ke liye idempotency key add karta hoon." Interviewer collaboration aur learning ability dekhta hai.
:::

@lesson rapid-fire
@title Rapid-fire Q&A: 30 important sawaal

Revision ke liye chhote, crisp answers. Har sawaal pehle khud bolkar answer karo, phir model answer kholo.

## Kaise use karein

- Roz 10 sawaal, khud bolkar.
- Jo atka, us lesson par wapas jaao (search box se topic dhoondho).
- Answer 30–60 second me bolne layak hona chahiye.

> [!tip] Answer ka formula
> **Definition (1 line) -> kaise kaam karta hai (1–2 lines) -> kab use / trade-off (1 line) -> real example.**

:::interview
Q: Horizontal vs vertical scaling?
A: Vertical: ek machine ko bada karna (simple, limit aur SPOF). Horizontal: zyada machines + load balancer (unlimited scale, fault tolerant, par stateless design aur complexity). App tier horizontal, DB pehle vertical phir replicas/sharding.
Q: Load balancer ke algorithms?
A: Round robin, weighted round robin, least connections, least response time, IP hash (sticky), random. Requests uniform ho to round robin, variable duration ho to least connections, session affinity ho to IP hash.
Q: L4 vs L7 load balancer?
A: L4 IP/port par forward karta hai (fast, content-blind). L7 HTTP padhta hai (path/header routing, TLS termination, smart features, thoda slow).
Q: Caching strategies?
A: Cache-aside (app manages, most common), read-through, write-through (sync dono jagah), write-back (cache first, DB later, fast par loss risk), write-around (DB only, cache on read).
Q: Cache stampede kaise rokein?
A: Single-flight/mutex lock, refresh-ahead, stale-while-revalidate, TTL jitter.
Q: CAP theorem?
A: Partition ke time consistency ya availability me se ek. P mandatory, isliye CP (error > stale) ya AP (stale > error). Bank CP, social feed AP.
Q: SQL vs NoSQL kab?
A: Transactions, relations, complex queries -> SQL. Massive scale, simple access patterns, flexible schema, high writes -> NoSQL. Aksar dono (polyglot).
Q: Database indexing ka trade-off?
A: Reads fast (O(log n) B-tree), par writes slow aur extra storage. Sirf frequently filtered/joined/sorted columns par.
Q: Replication vs sharding?
A: Replication: same data ki copies (availability, read scaling). Sharding: data ko tukdon me baantna (storage aur write scaling). Production me dono saath.
Q: Consistent hashing kyun?
A: Nodes add/remove par sirf ~K/N keys move hoti hain (mod N me lagbhag sab). Virtual nodes se load barabar.
Q: Leader-follower replication me read-your-writes kaise?
A: User ke apne recent writes ke baad uski reads leader se (ya timestamp-aware replica), ya client side update.
Q: Message queue vs Kafka?
A: Queue (SQS/RabbitMQ) message consume hone par delete, task distribution. Kafka distributed log: retention, replay, multiple consumer groups, high throughput event streaming.
Q: At-least-once delivery me duplicates?
A: Idempotent consumers: message ID dedup, upserts, conditional updates, unique constraints.
Q: WebSocket vs SSE vs long polling?
A: WebSocket two-way persistent (chat, games). SSE server-to-client stream over HTTP (notifications, live score). Long polling fallback, HTTP request hold till data.
Q: Rate limiting algorithms?
A: Token bucket (bursts ok, popular), leaky bucket (smooth output), fixed window (simple, boundary burst), sliding log (accurate, memory), sliding counter (balanced).
Q: Circuit breaker?
A: Failures threshold par OPEN: calls fail-fast/fallback; cooldown ke baad HALF-OPEN trial; success par CLOSED. Cascading failures rokta hai.
Q: Idempotency kaise implement?
A: Client idempotency key; server key + result store (unique constraint), duplicate par stored response. Plus state-based conditional updates.
Q: Saga vs 2PC?
A: 2PC atomic par blocking aur low availability. Saga local transactions + compensations, eventually consistent, microservices ke liye practical.
Q: Transactional outbox?
A: Event ko business data ke saath same DB transaction me outbox table me likho; relay/CDC broker tak publish kare. Dual-write problem solve.
Q: CQRS?
A: Writes aur reads ke alag models/stores; read side events se async update, query-optimized. Read-heavy complex queries ke liye.
Q: Microservices ke nuksaan?
A: Network failures, eventual consistency, distributed transactions, observability, deployment/ops overhead, galat boundaries se distributed monolith.
Q: API Gateway kya karta hai?
A: Single entry: routing, auth, rate limiting, TLS, aggregation, logging. Business logic nahi.
Q: CDN kaise kaam karta hai?
A: Edge servers user ke paas content cache karte hain; miss par origin se laake TTL tak cache. Latency, origin load, bandwidth kam.
Q: Unique IDs distributed system me?
A: Snowflake (timestamp + machine + sequence, 64-bit, sortable), UUIDv7/ULID, ya DB ranges.
Q: Bloom filter?
A: Bit array + k hashes; "definitely not" ya "probably yes". False positives, no false negatives. LSM reads, cache penetration, crawler URL dedup.
Q: Geohash vs quadtree?
A: Geohash fixed grid string (DB friendly, neighbors check). Quadtree adaptive tree (dense areas finer), mostly in-memory.
Q: SLA, SLO, SLI?
A: SLI metric, SLO internal target, SLA customer contract with penalties.
Q: Observability ke teen pillars?
A: Metrics (kya/kitna), traces (kahan), logs (kyun). Trace IDs se jode.
Q: Blue-green vs canary?
A: Blue-green: do environments, instant switch/rollback. Canary: chhote % traffic par naya version, gradually badhao.
Q: Strong vs eventual consistency?
A: Strong: write ke turant baad sab latest dekhein (coordination cost). Eventual: thodi der me sab same (fast, available). Bank vs likes.
:::

@lesson tradeoffs-cheatsheet
@title Trade-offs cheat sheet: kab kya use karein

Interview se ek raat pehle ye page padhiye. Har row ek decision hai jo design me baar-baar aata hai.

## Data storage

| Situation | Choice | Kyun |
|---|---|---|
| Money, orders, inventory | PostgreSQL / MySQL (ACID) | Transactions, constraints |
| Bahut zyada writes, time-ordered | Cassandra / ScyllaDB | LSM, partition by key |
| Simple key lookup at scale | DynamoDB / Redis | O(1) lookups |
| Flexible product attributes | MongoDB | Documents |
| Full-text search | Elasticsearch | Inverted index |
| Images, videos, backups | S3 + CDN | Cheap, durable, scalable |
| Analytics | BigQuery / Snowflake / ClickHouse | Columnar OLAP |
| Social graph | Neo4j / graph store | Multi-hop queries |

## Performance

| Problem | Ilaaj |
|---|---|
| Read-heavy, same data baar-baar | Cache (Redis) + read replicas |
| Static content slow globally | CDN |
| Slow query | Index, query rewrite, denormalize |
| Write-heavy | Sharding, LSM store, batching, async queue |
| Slow non-critical work in API | Queue + background workers |
| Hot key | Local cache, key replication, salting |

## Reliability

| Problem | Ilaaj |
|---|---|
| Single server failure | Multiple instances + LB + health checks |
| DB failure | Replication + automatic failover |
| Downstream service flaky | Timeout + retry (backoff, jitter) + circuit breaker |
| Duplicate requests | Idempotency keys |
| Traffic spikes | Autoscaling + queues + rate limiting |
| Region outage | Multi-region, DR plan |
| Abuse / DDoS | Rate limiting, WAF, CDN |

## Consistency choices

| Use case | Consistency |
|---|---|
| Payments, bank balance, seat booking | Strong (CP), transactions/locks |
| Social likes, views, feeds | Eventual (AP) |
| User's own profile edit | Read-your-writes |
| Chat messages in a conversation | Causal / per-chat ordering |
| Leader election, config | Consensus (Raft: etcd, ZooKeeper) |

## Communication

| Need | Choice |
|---|---|
| Public API | REST (ya GraphQL) |
| Internal low-latency service calls | gRPC |
| Fire-and-forget background work | Message queue (SQS / RabbitMQ) |
| Event streaming, multiple consumers, replay | Kafka |
| Two-way real-time | WebSocket |
| Server push only | SSE |
| Third-party event callback | Webhook |

## Classic pairs (ek line me)

- **Latency vs consistency**: strong consistency = coordination = latency.
- **Normalization vs denormalization**: write simplicity vs read speed.
- **Push vs pull** (feeds): fast reads vs cheap writes.
- **Sync vs async**: simple & immediate vs decoupled & resilient.
- **Monolith vs microservices**: simplicity vs independent scale/teams.
- **SQL vs NoSQL**: flexibility of queries vs scale of simple access.
- **Cache freshness vs hit ratio**: chhota TTL fresh par zyada misses.
- **Accuracy vs memory**: exact counts vs HyperLogLog/Bloom filters.

:::interview
Q: Ek system me cache lagane se pehle kya-kya sochenge?
A: Kya data read-heavy aur reuse hone wala hai, kitni staleness acceptable hai, invalidation strategy kya hogi (TTL, delete on write, CDC), cache failure par fallback (DB bach payega?), stampede/penetration protection, memory size aur eviction policy, aur hit ratio monitor karna.
Q: Har jagah strong consistency kyun nahi rakhte?
A: Strong consistency ke liye replicas/nodes ke beech coordination chahiye (sync replication, consensus, locks), jo latency badhata hai, throughput ghatata hai, aur partition ke time availability gira deta hai. Isliye sirf jahan correctness critical hai (money, inventory) wahan strong, baaki eventual.
:::

@lesson glossary
@title Glossary: A se Z tak important terms

Jaldi revision ke liye saare important shabd ek jagah. Kisi term par shak ho to search box me dhoondh ke poora lesson padhiye.

| Term | Matlab (simple) |
|---|---|
| ACID | Atomicity, Consistency, Isolation, Durability: reliable transactions |
| API Gateway | Microservices ke aage single entry point (auth, routing, rate limit) |
| Availability | System kitne % time chal raha hai (nines) |
| Backpressure | Consumer slow ho to producer ko dheema karna |
| BASE | Basically Available, Soft state, Eventual consistency |
| Bloom filter | "Pakka nahi" ya "shayad hai" batane wala bit array |
| CAP theorem | Partition me Consistency ya Availability me se ek |
| CDN | Edge servers jo content user ke paas cache karte hain |
| CDC | Change Data Capture: DB changes ko stream karna |
| Circuit breaker | Lagataar fail ho rahi service ki calls rok dena |
| Consistent hashing | Ring par hashing, node change par kam keys move |
| CQRS | Read aur write models alag |
| DDD | Domain-Driven Design: business domain ke hisaab se boundaries |
| Denormalization | Reads fast karne ke liye data duplicate karna |
| DLQ | Dead Letter Queue: fail hue messages ki jagah |
| Event sourcing | State ki jagah events ka log store karna |
| Eventual consistency | Thodi der me sab replicas same ho jaate hain |
| Failover | Primary gire to standby ka kaam sambhalna |
| Fan-out | Ek event/post ko kai jagah bhejna |
| Gossip protocol | Random peers ke saath info share karke cluster me phailana |
| Hinted handoff | Down replica ke liye write temporarily doosre node par |
| Hot partition / key | Ek shard/key par zaroorat se zyada load |
| Idempotency | Baar-baar karne par bhi same result |
| Inverted index | Shabd -> documents mapping (search) |
| Latency | Ek request ka time |
| Leader election | Cluster me ek leader chunna (Raft, Paxos) |
| Load balancer | Traffic ko servers me baantna |
| LSM tree | Write-optimized storage (memtable + SSTables) |
| Microservices | Chhoti independent services |
| Outbox pattern | Event ko DB transaction ke saath reliably publish karna |
| p99 latency | 99% requests isse fast; tail latency |
| Partition (network) | Nodes aapas me baat na kar paayein |
| Partition (data) | Data ka tukda / shard |
| Pub/Sub | Publisher topic par, sab subscribers ko copy |
| QPS | Queries per second |
| Quorum | Majority / W+R>N wali agreement |
| Rate limiting | Ek client ki requests ki limit |
| Read replica | Sirf reads ke liye DB copy |
| Replication lag | Follower ka leader se peeche hona |
| Reverse proxy | Servers ki taraf ka proxy (Nginx) |
| RPO / RTO | Kitna data loss / kitna downtime acceptable |
| Saga | Local transactions + compensations |
| Sharding | Data ko kai DBs me baantna |
| SLA / SLO / SLI | Contract / target / metric |
| Snowflake ID | Timestamp + machine + sequence wala 64-bit ID |
| SPOF | Single point of failure |
| Split brain | Do nodes khud ko leader samjhein |
| Stateless | Server request ke beech state yaad nahi rakhta |
| Sticky session | User ko hamesha same server par bhejna |
| Throughput | Per second kitna kaam |
| TTL | Kitni der tak valid (cache/DNS) |
| Vector clock | Concurrent events detect karne wala logical clock |
| WebSocket | Persistent two-way connection |
| Write-ahead log (WAL) | Change pehle log me, phir data me (durability) |

:::interview
Q: Latency aur throughput ko ek line me alag kaise samjhayenge?
A: Latency: ek request ko kitna time laga (ms). Throughput: per second kitni requests poori hui (QPS). Highway par ek car ka safar time vs ek ghante me kitni cars guzri.
Q: Partition shabd ke do matlab kya hain system design me?
A: Network partition: network failure ki wajah se nodes ke groups ek doosre se baat nahi kar paate (CAP wala P). Data partition: data ka ek tukda/shard (Kafka partition, DB partition). Context se samjho kaunsa matlab hai.
:::

@lesson roadmap-resources
@title 30 din ka plan aur aage kya padhein

Aapne poora course complete kar liya (ya karne wale ho). Ab job-ready banne ke liye **practice** chahiye. Ye 30 din ka plan follow karo.

## 30-day plan

| Din | Kya karna hai |
|---|---|
| 1–3 | Module 1–2 revise, latency numbers aur estimation daily 2 problems |
| 4–7 | Module 3 (databases) gehraai se: indexing, replication, sharding, CAP. Har topic khud se 2 minute me samjhao |
| 8–10 | Caching + messaging (Modules 4–5). Kafka aur Redis ke real use-cases likho |
| 11–13 | Architecture + reliability (Modules 6–7): Saga, outbox, circuit breaker, idempotency |
| 14–15 | Data, security, observability (Modules 8–9) |
| 16–22 | Har din 1 case study, timer ke saath 45 minute, bolkar. Phir lesson se compare |
| 23–26 | LLD: Parking Lot, Elevator, Splitwise, LRU, Vending Machine khud code karo (60–90 min each) |
| 27–28 | 2 mock interviews (dost ke saath ya online platforms) |
| 29 | Cheat sheet + glossary + rapid-fire revise |
| 30 | Apne project ka design ek page par likho aur 10 minute me present karna practice |

## Practice ke liye aur case studies (khud try karo)

- Design **Zomato/Swiggy** (restaurant search, order, delivery partner tracking).
- Design **Instagram Stories** (24 ghante expiry).
- Design **Google Docs** (real-time collaborative editing: OT/CRDT).
- Design **Leaderboard** (IPL fantasy: Redis sorted sets).
- Design **Flash sale** (Big Billion Days: inventory, queue, rate limit).
- Design **Distributed job scheduler** (cron at scale).
- Design **Metrics/monitoring system** (Prometheus jaisa).
- Design **Ad click aggregator** (stream processing).
- Design **Stock exchange / order matching**.
- Design **Search engine** (crawler + indexer + ranking).

## Books aur resources

- **Designing Data-Intensive Applications**, Martin Kleppmann. Distributed systems ki bible. Zaroor padhiye (dheere-dheere).
- **System Design Interview Vol 1 & 2**, Alex Xu. Interview-focused case studies.
- **Head First Design Patterns**: LLD aur patterns ke liye easy book.
- **Clean Code / Clean Architecture**, Robert C. Martin.
- Engineering blogs: [Netflix TechBlog](https://netflixtechblog.com), [Uber Engineering](https://www.uber.com/blog/engineering/), [Discord Blog](https://discord.com/blog), [Meta Engineering](https://engineering.fb.com), [AWS Architecture Blog](https://aws.amazon.com/blogs/architecture/), [Flipkart Tech](https://blog.flipkart.tech), [Swiggy Bytes](https://bytes.swiggy.com).
- Papers (advanced): Amazon Dynamo, Google Bigtable, Google Spanner, Raft ("In Search of an Understandable Consensus Algorithm").

> [!key] Last advice
> System design rata maarne ki cheez nahi. Har concept ka **"kyun"** samjho aur **trade-off** bolna seekho. Real apps (UPI, Swiggy, Hotstar) use karte waqt socho: "Ye andar se kaise bana hoga?" Yahi aadat aapko interview me alag dikhayegi. All the best!

:::interview
Q: Apne kisi project ka system design kaise present karenge?
A: Problem aur users (1 line), scale (numbers), architecture diagram ke saath main flow, key decisions aur unke reasons (DB choice, caching, async), kya challenge aaya aur kaise solve kiya (incident/bottleneck), aur aaj dobara banate to kya alag karte. Ye 5–10 minute me crisp hona chahiye.
Q: Interview se pehle aakhri din kya revise karenge?
A: Framework (requirements -> estimation -> API -> data -> HLD -> deep dive), trade-offs cheat sheet, latency numbers aur estimation tricks, top case studies ke diagrams (URL shortener, chat, feed, rate limiter), aur rapid-fire Q&A. Naya topic shuru nahi karna.
:::

@quiz
Q: Interview me 45 minute hain. Requirements par kitna time sahi hai?
- 0, seedha design
+ Lagbhag 5 minute
- 25 minute
- Poora interview
E: Requirements clear karna zaroori hai par itna lamba nahi ki design ka time na bache.

Q: "Kafka lagayenge" bolne ke saath kya zaroor bolna chahiye?
- Kafka ka version
+ Kyun (requirement) aur trade-off (complexity, eventual consistency)
- Kafka ka founder
- Kuch nahi
E: Interviewer reasoning dekhta hai. Bina reason ke buzzword negative signal hai.

Q: Payment confirmation aur social media likes ke liye consistency?
+ Payment strong, likes eventual
- Dono eventual
- Dono strong
- Payment eventual, likes strong
E: Paisa correctness critical hai; likes thodi der baad update hon to chalega.

Q: Read-heavy system jahan same data baar-baar padha jaata hai, pehla optimization?
- Sharding
+ Caching (Redis) + read replicas
- Microservices
- Blockchain
E: Cache aur read replicas read load ko sabse sasta aur effectively kam karte hain.

Q: Downstream service flaky hai. Sahi combination?
- Infinite retries
+ Timeout + limited retries with backoff/jitter + circuit breaker
- Kabhi call mat karo
- Bada server
E: Ye combination temporary failures sambhalta hai aur cascading failure rokta hai.

Q: Ek post ko 5 crore followers tak pahunchana hai. Ye kaunsa concept?
- Sharding
+ Fan-out
- Indexing
- Normalization
E: Ek event ko kai recipients tak pahunchana fan-out hai (write ya read time par).

Q: Interviewer ne design me galti pakdi. Best response?
- Bahas karo ki aap sahi ho
+ Accept karke reason samjho aur design adjust karo
- Topic badal do
- Chup ho jao
E: Collaboration aur feedback se seekhne ki ability interview ka important signal hai.

Q: Third-party payment provider ko aapke server ko event batana hai. Kya use hota hai?
- WebSocket
- Short polling
+ Webhook
- CDN
E: Webhook me provider event hone par aapke registered URL par HTTP callback karta hai.

Q: "Pakka nahi hai" ya "shayad hai" kaunsa data structure batata hai?
- HyperLogLog
+ Bloom filter
- Trie
- B-Tree
E: Bloom filter membership test me false positives deta hai par false negatives kabhi nahi.

Q: Monolith se microservices par dheere-dheere jaane ka pattern?
- Big bang rewrite
+ Strangler fig
- Singleton
- Saga
E: Strangler fig me naye features/modules ek-ek karke nayi services me nikaale jaate hain jab tak monolith khatam na ho.
