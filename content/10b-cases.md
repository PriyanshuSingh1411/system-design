@lesson design-payment
@title Design: Payment System (UPI / Stripe jaisa)

E-commerce checkout ke peeche ka payment system: user pay kare, merchant ko paisa mile, aur **kabhi double charge ya paisa gayab** na ho.

## 1. Requirements

**Functional**
- Payment initiate (card, UPI, wallet, netbanking) via external **Payment Service Providers (PSP)** / gateways.
- Payment status track (PENDING -> SUCCESS / FAILED).
- Refunds.
- Merchant settlement aur reconciliation.

**Non-functional**
- **Correctness > speed**: exactly-once *effect* (no double charge), koi paisa lost nahi.
- Highly available, par consistency compromise nahi.
- Audit trail, security (PCI-DSS), compliance.
- Scale moderate (hazaaron TPS), par har transaction critical.

## 2. Key concepts

- **Idempotency**: har payment attempt ka unique key; retry par dobara charge nahi.
- **Double-entry ledger**: har transaction me debit aur credit dono entries; sab entries ka total hamesha zero. Accounting ka 500 saal purana, bulletproof tareeka.
- **State machine**: CREATED -> PENDING -> SUCCESS / FAILED -> (REFUNDED). Galat transitions reject.
- **Reconciliation**: apne records ko PSP/bank ki settlement files se roz match karna; mismatch par alert/fix.

```text
Ledger entries for ₹499 order:
  DEBIT   customer_wallet      499
  CREDIT  merchant_payable     499
(sum = 0 hamesha)
```

## 3. High-level design

[[arch Payment system]]
client:User checkout
svc:Order / Checkout Service ~ payment request with idempotency key
svc:Payment Service ~ payment record, state machine, PSP routing
db:Payments DB (SQL, ACID) ~ payments + idempotency keys
ext:PSP / Gateway (Razorpay / Stripe / NPCI)
svc:Webhook handler ~ PSP se async status (signature verify, idempotent)
svc:Ledger Service, db:Ledger DB (append-only, double-entry)
queue:Payment events (Kafka via outbox) ~ order confirm, notifications, analytics
svc:Reconciliation jobs ~ PSP settlement files vs ledger, daily
[[/arch]]

## 4. Payment flow

1. Checkout: Order Service Payment Service ko call karti hai `(order_id, amount, idempotency_key)`.
2. Payment Service payment row banati hai (status CREATED), **unique constraint** on idempotency key / order_id.
3. PSP ko request (hosted page / UPI collect / redirect). Card data aapke servers par nahi aata (PCI scope kam), PSP tokenize karta hai.
4. User pay karta hai. PSP **webhook** bhejta hai (aur client redirect bhi). Handler signature verify karke **state transition** karta hai (PENDING -> SUCCESS), idempotently.
5. Same DB transaction me ledger entries + **outbox event** "PaymentSucceeded".
6. Outbox relay Kafka me -> Order Service order confirm karti hai, notification jaata hai.
7. Webhook nahi aaya? **Status polling job** PSP se pending payments ka status poochta hai.
8. Roz **reconciliation**: PSP ki settlement report vs apna ledger.

## 5. Deep dive

- **Exactly-once effect**: at-least-once retries (client, webhooks, queues) + idempotency keys + unique constraints + conditional state transitions.
- **Timeouts ka dilemma**: PSP call timeout hua = pata nahi paisa kata ya nahi. **Kabhi blindly retry with new key mat karo**. Status "UNKNOWN/PENDING" rakho, PSP se status check karo (same idempotency key ke saath retry, ya status API).
- **Distributed transaction**: order, payment, inventory alag services -> **Saga** with compensation (refund), outbox for events.
- **Consistency choice**: CP side. Ledger DB strongly consistent (single leader, sync replication within region).
- **Security**: tokenization, encryption, PCI-DSS, HMAC webhooks, fraud checks (risk engine), 2FA (OTP/UPI PIN by bank).
- **Audit**: ledger append-only; corrections bhi nayi entries (reversal), purani entries kabhi edit nahi.

:::interview
Q: Payment system me double charge kaise rokenge?
A: Idempotency keys (client har attempt ke liye unique key; server us key ka result store karke retries par same result de), DB unique constraints (order_id/idempotency_key), conditional state transitions (`WHERE status='PENDING'`), PSP ke saath bhi same idempotency key, aur timeout par naya charge karne ki jagah status check. Webhooks aur queue consumers idempotent.
Q: Double-entry ledger kya hai aur kyun?
A: Har money movement ko kam se kam do entries (debit aur credit) me record karna jinka sum zero ho. Isse paisa kabhi "create ya gayab" nahi ho sakta, balances entries se derive hote hain, errors detect hote hain (sum != 0), aur poora audit trail milta hai. Ledger append-only hota hai; galti sudharne ke liye reversal entries.
Q: PSP ko request bheji aur timeout ho gaya. Kya karenge?
A: Result unknown maan ke payment ko PENDING/UNKNOWN rakhenge, user ko "processing" dikhayenge. PSP ke status API se (ya same idempotency key ke saath safe retry) actual status pata karenge, webhook ka wait, aur reconciliation job final truth confirm karega. Naya charge kabhi nahi bhejenge jab tak pehle wale ka status clear na ho.
:::

@lesson design-web-crawler
@title Design: Web Crawler

Search engine (Google) ya data collection ke liye crawler jo internet ke billions of pages download kare.

## 1. Requirements

**Functional**
- Seed URLs se shuru karke pages download, links nikaal kar aage crawl.
- Content store (search indexing ke liye).
- Pages periodically re-crawl (freshness).

**Non-functional**
- **Scale**: billions of pages (jaise 1B pages/month ≈ ~400 pages/sec).
- **Politeness**: kisi ek website ko overload nahi karna, `robots.txt` follow.
- **Robust**: infinite loops (spider traps), bad HTML, slow servers.
- Duplicate content avoid.

## 2. Components

[[arch Web crawler]]
store:Seed URLs
queue:URL Frontier ~ priority + per-host politeness queues
svc:Fetcher workers (distributed) ~ DNS cache, robots.txt cache, rate limit per host
store:Raw content store (S3 / HDFS)
svc:Parser / Link extractor ~ HTML parse, links normalize
svc:Dedup: URL seen? (Bloom filter / KV), svc:Content dedup (hash / SimHash) ~ duplicates hata do
queue:New URLs -> back to Frontier ~ cycle chalta rehta hai
[[/arch]]

## 3. URL Frontier (dil of the crawler)

- **Priority**: important pages pehle (PageRank, domain authority, update frequency).
- **Politeness**: per-host queues; ek host ko ek time par ek connection, requests ke beech delay. Ek worker ek host ki queue ko own karta hai.
- **Freshness**: news sites ko roz, static pages ko mahine me re-crawl.

## 4. Deep dive

- **URL dedup**: billions of URLs ke liye **Bloom filter** (memory efficient) + persistent KV store. URL normalize karo (lowercase host, trailing slash, tracking params hatao).
- **Content dedup**: same content alag URLs par (mirrors). Checksum (exact) ya **SimHash** (near-duplicate).
- **DNS**: DNS lookup slow ho sakta hai, apna **DNS cache**.
- **robots.txt**: per host cache, rules follow, `Crawl-delay`.
- **Spider traps**: infinite calendar pages, auto-generated URLs. Max depth, URL length limit, per-domain page limits.
- **Distributed**: URLs ko host ke hash se workers me baanto (consistent hashing), taaki ek host ka politeness ek jagah manage ho.
- **Failure**: frontier persistent (Kafka/DB), checkpoints; worker crash par URLs dobara assign.
- **JavaScript pages**: headless browser rendering (mehenga), sirf zaroori sites ke liye.

:::interview
Q: Crawler ko polite kaise banayenge?
A: robots.txt rules aur crawl-delay follow karna, per-host queues jahan ek time par ek host par limited concurrent requests aur requests ke beech delay, host ko ek hi worker se map karna (hash), server errors/slow response par backoff, aur proper User-Agent with contact info.
Q: Billions of URLs me "pehle dekha hai ya nahi" kaise check karenge?
A: URL ko normalize karke uska hash; Bloom filter fast in-memory check (false positive par kuch URLs miss honge, jo acceptable hai) aur zaroorat ho to persistent distributed KV store (RocksDB/Cassandra) me exact check. Partitioned by hash across workers.
Q: Near-duplicate pages kaise detect karenge?
A: Exact duplicates ke liye content hash (MD5/SHA). Near-duplicates ke liye SimHash/MinHash fingerprints: similar documents ke fingerprints ka Hamming distance chhota hota hai, jinhe efficiently index karke compare kar sakte hain.
:::

@lesson design-google-drive
@title Design: File Storage & Sync (Google Drive / Dropbox)

## 1. Requirements

**Functional**
- Files upload/download, folders.
- **Multiple devices me automatic sync** (laptop par file badli, phone par update).
- File sharing (view/edit permissions), version history.

**Non-functional**
- **Data kabhi lost nahi** (high durability).
- Bade files (GBs) efficient upload, weak network par resume.
- Sync fast aur bandwidth-efficient.
- Strong consistency for metadata (ek file ke do conflicting versions na ban jaayein bina pata chale).

## 2. Key idea: Chunking

File ko chhote **chunks** (jaise 4 MB) me todo. Har chunk ka **hash** (SHA-256).

- **Resumable upload**: sirf baaki chunks bhejo.
- **Delta sync**: file ka ek hissa badla to sirf **badle hue chunks** upload. 1 GB file me 1 line change = 4 MB upload, 1 GB nahi.
- **Deduplication**: same chunk (same hash) kai files/users me ek hi baar store (content-addressable storage).

## 3. Data model

```text
files (file_id, owner_id, name, parent_folder_id, latest_version, is_deleted)
file_versions (file_id, version, chunk_hashes[], size, modified_by, created_at)
chunks (chunk_hash PK, storage_location, ref_count)        -> blob store me actual bytes
shares (file_id, user_id, permission)
device_sync_state (device_id, last_seen_change_id)
```

## 4. High-level design

[[arch File sync service]]
client:Desktop client (watcher + chunker), client:Mobile / Web
edge:API Gateway, edge:Notification service (long poll / WebSocket) ~ "kuch badla hai" signal
svc:Metadata Service ~ files, versions, permissions, change log
db:Metadata DB (SQL, sharded by user / namespace), cache:Metadata cache
svc:Block / Chunk Service ~ chunks upload-download, dedup
store:Block storage (S3), edge:CDN for downloads
queue:Change events ~ sab devices ko notify
[[/arch]]

## 5. Sync flow

1. Laptop client file change detect karta hai (filesystem watcher), file ko chunks me todta hai, hashes nikaalta hai.
2. Metadata Service se poochta hai: in hashes me se kaun se server par **nahi** hain?
3. Sirf missing chunks Block Service ko upload (parallel, resumable, pre-signed URLs).
4. Naya **version commit** Metadata Service me (chunk list ke saath), ek transaction me. Change log me entry.
5. Notification service doosre devices (phone) ko signal bhejti hai.
6. Phone change log se naya version leta hai, missing chunks download karke file banata hai.

## 6. Deep dive

- **Conflicts**: do devices ne offline me same file badli. Version check: commit "base version 7 par" hai par server par 8 aa chuka -> conflict. Simple approach: dono rakho ("file (conflicted copy)"). Google Docs jaisa real-time editing alag cheez hai (OT/CRDT).
- **Consistency**: metadata strongly consistent (SQL), chunks immutable (hash se naam, kabhi badalte nahi) to unhe cache/CDN karna safe.
- **Durability**: blob storage multi-AZ replication / erasure coding; metadata backups.
- **Garbage collection**: chunk ka ref_count 0 (koi version use nahi karta, retention khatam) -> delete.
- **Bandwidth**: compression, delta sync, LAN sync (same network ke devices se).
- **Security**: encryption at rest per chunk, sharing links with expiry, permissions check har access par.

:::interview
Q: File ko chunks me todne ke kya fayde hain?
A: Resumable aur parallel uploads/downloads, delta sync (sirf badle hue chunks transfer), content-addressed deduplication (same chunk ek baar store), aur chhote immutable objects jinhe cache/CDN karna easy hai. Chunk size trade-off: chhote chunks = better dedup/delta par zyada metadata.
Q: Devices ke beech sync kaise hota hai?
A: Har change metadata service me versioned commit aur change log entry banata hai. Devices notification channel (long polling/WebSocket) se signal paate hain aur apne last_seen_change_id ke baad ke changes fetch karte hain, missing chunks download karte hain. Offline device online aane par cursor se catch-up.
Q: Do devices se same file ke conflicting edits ko kaise handle karenge?
A: Optimistic concurrency: har commit apna base version batata hai; server par latest version alag ho to conflict detect. Dropbox-style resolution: dono versions save (conflicted copy) aur user decide kare. Collaborative real-time editors me OT/CRDT se automatic merge.
:::

@lesson design-kv-store
@title Design: Distributed Key-Value Store (DynamoDB jaisa)

Ek database jo `put(key, value)` aur `get(key)` kare, par **petabytes** aur **lakhon QPS** par, hamesha available. Ye case study ab tak ke bahut saare concepts ko jodti hai.

## 1. Requirements

- `get(key)`, `put(key, value)`, values chhote (< 1 MB).
- **Highly available** (writes kabhi reject na hon, "always writable" shopping cart).
- **Horizontally scalable**, nodes add/remove bina downtime.
- **Tunable consistency**.
- Low latency (single-digit ms).

## 2. Design decisions (har ek ek pichhla lesson hai)

| Problem | Technique |
|---|---|
| Data ko nodes me baantna | Consistent hashing + virtual nodes |
| High availability, durability | Replication (N=3) on ring |
| Consistency vs latency | Quorum (W, R tunable, W + R > N for strong-ish) |
| Temporary node failure | Sloppy quorum + hinted handoff |
| Permanent failure / divergence | Anti-entropy with Merkle trees |
| Concurrent writes conflict | Vector clocks / last-write-wins |
| Failure detection, membership | Gossip protocol |
| Storage engine | LSM tree (commit log + memtable + SSTables) + Bloom filters |

## 3. Architecture

[[arch Dynamo-style key-value store]]
client:Client (smart client or via coordinator)
svc:Coordinator node ~ key hash karke preference list (N replicas) nikaalta hai
svc:Node A (vnodes), svc:Node B (vnodes), svc:Node C (vnodes), svc:Node D (vnodes) ~ consistent hash ring par
store:Storage engine: commit log -> memtable -> SSTables ~ har node par LSM tree + Bloom filters
[[/arch]]

## 4. Write path

1. Client coordinator ko `put(k, v)`.
2. Coordinator `hash(k)` se ring par N replicas (preference list).
3. N replicas ko write bhejta hai; **W** ACKs aane par client ko success.
4. Har node par: pehle **commit log** (durability) me append, phir **memtable** (memory). Memtable bhar jaye to disk par sorted **SSTable** flush.

## 5. Read path

1. Coordinator N replicas se read; **R** responses ka wait.
2. Versions alag hon to latest (vector clock / timestamp) chuno, aur stale replicas ko **read repair**.
3. Node par: memtable -> Bloom filters se relevant SSTables -> read. Background **compaction** SSTables merge karta hai.

## 6. Failure handling

- **Hinted handoff**: replica down hai to doosra node write "hint" ke saath rakh leta hai, wapas aane par deta hai (sloppy quorum: availability bani rehti hai).
- **Merkle trees**: replicas apne key ranges ke hash trees compare karte hain; sirf alag branches sync (anti-entropy), kam data transfer.
- **Gossip**: har node kuch random nodes se membership aur health share karta hai; failure detection decentralized.

## 7. Trade-offs

- **AP system** by default (Dynamo): writes hamesha accepted, conflicts baad me resolve. W=R=QUORUM se zyada consistent par slow.
- Conflicts: vector clocks se detect, application merge kare (cart: union of items) ya LWW (simple par data loss possible).
- Range queries mushkil (hash partitioning), sirf key lookups ke liye best.

:::interview
Q: Distributed key-value store me data partition aur replicate kaise karenge?
A: Consistent hashing with virtual nodes se keys nodes par map, taaki nodes add/remove par kam data move ho aur load barabar rahe. Har key ko ring par clockwise next N distinct physical nodes (alag racks/AZs) par replicate. Coordinator preference list se requests route karta hai.
Q: Quorum consistency ke saath W aur R kaise tune karenge?
A: N=3 typical. W=2, R=2 (W+R>N) se reads latest write dekhti hain (strong-ish). Write-heavy low latency ke liye W=1 (durability/consistency kam). Read-heavy ke liye R=1, W=3. Ye per-request tunable rakhna flexibility deta hai (Cassandra consistency levels).
Q: Temporary aur permanent replica failures kaise handle karenge?
A: Temporary: sloppy quorum + hinted handoff (doosra node write hold karta hai, replica wapas aane par handoff). Read repair bhi stale replicas ko read ke time theek karta hai. Permanent/long divergence: anti-entropy using Merkle trees, jisse sirf differing key ranges sync hote hain. Membership aur failure detection gossip se.
:::

@quiz
Q: System design interview ka sahi pehla step?
- Database choose karna
+ Functional aur non-functional requirements clarify karna
- Kubernetes diagram banana
- Code likhna
E: Requirements se scope aur scale tay hota hai. Bina iske design galat problem solve kar sakta hai.

Q: URL shortener me 7 character Base62 code se lagbhag kitne unique URLs?
- 62 lakh
- 7 billion
+ ~3.5 trillion
- Unlimited
E: 62^7 ≈ 3.52 × 10^12, billions of URLs ke liye kaafi.

Q: URL shortener me click analytics chahiye. Kaunsa redirect status?
- 301
+ 302
- 404
- 500
E: 302 temporary hai, isliye browser cache nahi karta aur har click server tak aata hai (analytics possible).

Q: WhatsApp me message ki ordering per chat kaise maintain hoti hai?
- Client ke local time se
+ Server-assigned time-sortable message IDs / per-chat sequence
- Random IDs
- Alphabetical order
E: Client clocks par bharosa nahi. Server ek monotonic, sortable ID ya sequence assign karta hai.

Q: Celebrity (5 crore followers) ke post ke liye feed strategy?
- Fan-out on write to sab followers
+ Fan-out on read: feed padhte waqt celebrity posts merge
- Post hi mat dikhao
- Email bhejo
E: Crores writes ek post par mehenge hain. Celebrity posts pull karke follower ke feed me read time par merge karte hain.

Q: Adaptive bitrate streaming ka fayda?
- Video file chhoti hoti hai
+ Network speed ke hisaab se har segment ki quality badalti hai, buffering kam
- Server load zero
- Ads band ho jaate hain
E: Player bandwidth dekh ke segment-by-segment quality choose karta hai.

Q: Uber me ek driver do riders ko assign na ho, iske liye?
- Driver ko 2 phone do
+ Atomic compare-and-set (status AVAILABLE ho tabhi ON_TRIP)
- Eventual consistency
- Cache me status rakho bas
E: Conditional atomic update ya lock ensure karta hai ki sirf ek assignment succeed ho.

Q: Notification system me OTP promo messages ke peeche na atke, iske liye?
- Ek hi queue
+ Priority-based alag queues aur workers
- OTP band karo
- Promo ko pehle bhejo
E: Alag queues aur worker pools se high-priority transactional messages kabhi low-priority bulk se starve nahi hote.

Q: Typeahead me har trie node par kya store karna query fast banata hai?
- Poori dictionary
+ Us prefix ke precomputed top-K suggestions
- User ka password
- Kuch nahi
E: Precomputed top-K se query time par subtree traverse/sort nahi karna padta.

Q: BookMyShow me seat double booking kaise rokte hain?
+ Conditional atomic update (WHERE status='AVAILABLE') ya SETNX hold
- Dono users ko seat de do
- Seat map cache karke
- Bina transaction ke update
E: Atomic conditional write me sirf pehla update succeed hota hai, doosre ko seat unavailable milti hai.

Q: Payment gateway call timeout ho gaya. Sahi kadam?
- Turant naya payment naye key ke saath
+ Status unknown maan ke PSP se status check / same idempotency key se retry
- User ko success dikha do
- Payment delete karo
E: Timeout ka matlab paisa kata ya nahi pata nahi. Naya charge double charge kar sakta hai.

Q: Google Drive me 1 GB file me ek line badli. Efficient sync?
- Poori 1 GB file dobara upload
+ Sirf badle hue chunks upload (delta sync)
- File delete karke naya upload
- Email se bhejo
E: Chunking + hashes se sirf changed chunks transfer hote hain.

Q: Dynamo-style KV store me temporary node failure par writes kaise accept hote rehte hain?
- Writes reject
+ Sloppy quorum + hinted handoff
- 2PC
- Single leader failover
E: Doosra node hint ke saath write rakh leta hai aur original node wapas aane par handoff karta hai.
