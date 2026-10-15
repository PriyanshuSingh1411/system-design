@module data-storage
@title Data aur Storage
@level Advanced
@desc Object storage, search engines, Bloom filters, geospatial indexing, big data processing aur unique IDs.

@lesson storage-types
@title Storage types: Block, File, Object

Data sirf databases me nahi rehta. Photos, videos, backups, logs ke liye alag storage hota hai. Teen main types:

## Block storage

Disk ko fixed-size **blocks** me baanta jaata hai, aur ek machine use apni hard disk ki tarah use karti hai (filesystem banake). Bahut fast, low latency.

- Examples: AWS EBS, local SSD, SAN.
- Use: databases ki disk, VM ka OS disk.
- Limit: aam taur par ek time par ek machine se attach.

## File storage

Folders aur files ka familiar structure (`/home/reports/2026/q1.pdf`), network par kai machines share kar sakti hain (NFS/SMB).

- Examples: AWS EFS, NAS, Google Filestore.
- Use: shared files, legacy apps, home directories, CMS uploads.

## Object storage

Har cheez ek **object** hai: data + metadata + unique key, ek flat namespace (**bucket**) me. HTTP API se access (`PUT`, `GET`). Lagbhag **unlimited scale**, bahut **durable** (S3 ka design 99.999999999% (11 nines) durability), aur **sasta**.

```text
PUT  https://my-bucket.s3.amazonaws.com/videos/2026/ipl-final.mp4
GET  https://my-bucket.s3.amazonaws.com/videos/2026/ipl-final.mp4
```

- Examples: AWS S3, Google Cloud Storage, Azure Blob, MinIO.
- Use: images, videos, backups, logs, data lake, static website files.
- Limit: file ke beech me edit nahi (poora object replace), latency block se zyada.

| | Block | File | Object |
|---|---|---|---|
| Structure | Raw blocks | Folders/files | Flat bucket + keys |
| Access | Mounted disk | Network file system | HTTP API |
| Speed | Sabse fast | Medium | Zyada latency, high throughput |
| Scale | Limited | Medium | Practically unlimited |
| Cost | Mehenga | Medium | Sasta |
| Use | Databases, VMs | Shared files | Media, backups, data lakes |

## System design me object storage ka pattern

> [!key] Database me photos mat daalo
> Images/videos ko DB me BLOB ki tarah rakhna DB ko bhaari aur slow bana deta hai. Sahi tareeka: file **object storage** me, aur DB me sirf uska **URL/key aur metadata**. Users ko file **CDN** se serve karo.

[[arch Image upload with pre-signed URL]]
client:Mobile app
svc:Upload API ~ 1. auth check, pre-signed URL generate (5 min valid)
store:S3 bucket ~ 2. app seedha S3 par upload karti hai, server ka bandwidth bachta hai
queue:Upload event ~ 3. S3 event se processing trigger
svc:Thumbnail / virus-scan workers, db:Metadata DB (URL, size, owner) ~ 4. sizes banao, metadata save
edge:CDN ~ 5. users ko CDN se fast download
[[/arch]]

**Pre-signed URL**: server ek temporary, signed URL deta hai jisse client bina AWS credentials ke seedha S3 par upload/download kar sake. Bade files ke liye **multipart upload** (tukdon me, parallel, resume possible).

## Storage tiers

Data ki umar ke hisaab se sasta storage: **Hot** (roz use, S3 Standard) -> **Warm** (kabhi-kabhi, Infrequent Access) -> **Cold/Archive** (saalon me ek baar, Glacier, bahut sasta par nikaalne me ghante). **Lifecycle rules** se automatic move.

:::interview
Q: Block, file aur object storage me farak?
A: Block: raw blocks, ek server par disk ki tarah mount, lowest latency, databases/VMs ke liye. File: hierarchical files/folders jo network par kai machines share karein (NFS). Object: flat namespace me objects (data + metadata) HTTP API se, massively scalable, durable aur sasta, media/backups/data lakes ke liye; in-place edits nahi.
Q: Users ke photo uploads kaise design karenge?
A: Client server se pre-signed URL le, seedha object storage par (multipart for big files) upload kare. Upload complete event se async workers thumbnails/compression/moderation karein. Metadata (owner, key, sizes) DB me. Delivery CDN se, private content ke liye signed CDN URLs. Lifecycle policies se purana data sasti tier me.
Q: Pre-signed URL kya hai aur kyun use karte hain?
A: Ek time-limited URL jisme signature embedded hai jo specific object par specific operation (PUT/GET) allow karta hai. Isse client seedha storage se baat karta hai, app servers ka bandwidth aur CPU bachta hai, aur credentials expose nahi hote.
:::

@lesson search
@title Search: Inverted Index aur Elasticsearch

Amazon par "red running shoes" search kiya, 50 crore products me se milliseconds me results. SQL ka `WHERE name LIKE '%running%'` har row scan karega: bahut slow. Search engines **inverted index** use karte hain.

## Inverted index

Kitaab ke peeche wale index jaisa: **har shabd -> kin documents me hai**.

```text
Documents:
  D1: "red running shoes"
  D2: "blue running jacket"
  D3: "red cotton shirt"

Inverted index:
  red     -> [D1, D3]
  running -> [D1, D2]
  shoes   -> [D1]
  blue    -> [D2]
  jacket  -> [D2]
  cotton  -> [D3]
  shirt   -> [D3]

Query "red running" -> [D1, D3] ∩ [D1, D2] = [D1]
```

## Text processing (analysis)

Index banane se pehle text ko saaf kiya jaata hai:
- **Tokenization**: sentence ko words me todna.
- **Lowercasing**: "Shoes" = "shoes".
- **Stop words hatana**: "the", "is", "a".
- **Stemming/Lemmatization**: "running", "runs" -> "run".
- **Synonyms**: "mobile" = "phone".
- **N-grams**: autocomplete aur typo tolerance ke liye ("sho", "hoe", "oes").

## Ranking: kaunsa result upar?

- **TF-IDF**: shabd document me kitni baar (term frequency) × poore collection me kitna rare (inverse document frequency).
- **BM25**: TF-IDF ka improved version, Elasticsearch ka default.
- Business signals: popularity, rating, sales, personalization, freshness.
- Aaj kal **semantic/vector search**: text ko embeddings me badal ke meaning se match ("sasta phone" -> "budget smartphone").

## Elasticsearch / OpenSearch

Distributed search engine (Lucene par bana).
- **Index** ko **shards** me baanta jaata hai, har shard ke **replicas**.
- Query sab shards par parallel (scatter), results merge (gather).
- Near real-time: document index hone ke ~1 second baad searchable.
- Full-text search, filters, aggregations (facets: "Brand: Nike (120)"), autocomplete, geo search, log analytics (ELK stack).

## System design me search ka pattern

> [!key] Search index source of truth nahi hai
> Primary data DB (Postgres/Mongo) me. Search index ek **copy** hai jo search ke liye optimize hai. Sync kaise? DB changes -> **CDC / events (Kafka)** -> indexer -> Elasticsearch. Index kabhi corrupt ho to DB se dobara bana sakte ho.

[[flow:db:Products DB -> queue:CDC / Kafka -> svc:Indexer -> store:Elasticsearch -> svc:Search API]]

> [!warn] Elasticsearch ko primary DB mat banao
> ES transactions aur strong consistency ke liye nahi bana. Writes ko DB me, search ko ES me.

:::interview
Q: Inverted index kya hai?
A: Ek mapping jo har term (shabd) ko un documents ki list (postings list, positions ke saath) se jodti hai jinme woh aata hai. Query ke terms ki postings lists ko intersect/union karke matching documents milliseconds me milte hain, bina saare documents scan kiye. Full-text search engines (Lucene/Elasticsearch) ka core.
Q: E-commerce product search kaise design karenge?
A: Source of truth products DB; changes CDC/Kafka ke through indexer tak, jo Elasticsearch me denormalized product documents index kare (title, brand, category, price, rating, stock). Analyzers: tokenization, stemming, synonyms, n-grams for autocomplete. Query: BM25 relevance + filters (price, brand) + facets + business boosts (popularity, stock) + personalization. Hot queries cache, sharding/replicas for scale.
Q: Search index ko database se sync kaise rakhenge?
A: Dual writes avoid karo (inconsistency). CDC (Debezium jaisa) ya outbox pattern se DB changes events me, indexer consume karke index update kare (idempotent, version check ke saath). Periodic full reindex/reconciliation, aur alias swap se zero-downtime reindexing.
:::

@lesson bloom-filter
@title Bloom Filter aur probabilistic data structures

Kabhi exact answer zaroori nahi, "lagbhag" sahi answer bahut kam memory me chal jaata hai. **Probabilistic data structures** yahi karte hain.

## Bloom filter

Sawaal: "Kya ye item set me hai?" Bloom filter ka jawab:
- **"Pakka nahi hai"** (100% sahi), ya
- **"Shayad hai"** (false positive possible).

**False negative kabhi nahi** hota.

### Kaise kaam karta hai

1. M bits ka array, sab 0.
2. K hash functions.
3. **Add**: item ke K hashes nikaalo, un positions par bit = 1.
4. **Check**: K positions dekho. Koi bhi 0 -> pakka nahi hai. Sab 1 -> shayad hai (ho sakta hai doosre items ne woh bits set ki hon).

[[anim:bloom]]

### Kahan use hota hai

- **Cassandra/HBase/RocksDB**: disk par SSTable padhne se pehle check: "kya ye key is file me ho sakti hai?" Bekaar disk reads bachte hain.
- **Cache penetration** rokna: non-existent keys DB tak na jaayein.
- **Username already taken?** quick check (exact check baad me DB me).
- **Web crawler**: ye URL pehle crawl hua? (billions of URLs).
- **Malicious URL check** (browsers), "ye article user ko pehle dikha diya?" (Medium).

### Trade-offs

- Zyada bits (M) aur sahi K se false positive rate kam.
- 1% false positive ke liye lagbhag **~10 bits per item**. 1 billion items ≈ 1.2 GB, jabki actual strings store karte to kai GB.
- Normal Bloom filter se **delete nahi** kar sakte (bit doosre items ki bhi ho sakti hai). **Counting Bloom filter** bits ki jagah counters rakhta hai, delete possible.

## HyperLogLog: unique count

"Aaj kitne **unique** users aaye?" Exact ke liye saare user IDs ka set chahiye (bahut memory). **HyperLogLog** sirf ~12 KB me billions of unique items ka count ~0.8% error ke saath deta hai.
- Redis: `PFADD visitors:2026-10-15 user42` aur `PFCOUNT visitors:2026-10-15`.
- Use: unique visitors, unique search queries, distinct counts in analytics.

## Count-Min Sketch: frequency estimate

"Ye item kitni baar aaya?" (approx). Ek 2D counter table aur kai hash functions; answer kabhi kam nahi, thoda zyada ho sakta hai.
- Use: **trending hashtags**, top-K frequent items, heavy hitters detect karna (DDoS IPs).

| Structure | Sawaal | Error type |
|---|---|---|
| Bloom filter | Set me hai? | False positive (no false negative) |
| HyperLogLog | Kitne unique? | ~1% count error |
| Count-Min Sketch | Kitni baar aaya? | Overestimate |

:::interview
Q: Bloom filter kya hai aur iski guarantee kya hai?
A: Bit array aur kai hash functions wala space-efficient structure jo membership test karta hai. Agar koi hash position 0 hai to item definitely set me nahi; sab 1 hain to item probably set me hai. False negatives nahi hote, false positives controlled rate par hote hain (bits aur hash count se). Standard version me delete nahi hota.
Q: Bloom filter LSM-tree databases me kaise madad karta hai?
A: Har SSTable ke saath ek Bloom filter rakha jaata hai. Read par pehle filter check: key "definitely not present" ho to us file ko disk se padhte hi nahi. Isse non-existent keys ki reads me kai disk I/O bachte hain.
Q: Billions of page views me unique visitors kaise count karenge kam memory me?
A: HyperLogLog: har visitor ID ka hash leke registers update karta hai aur bahut kam memory (~KBs) me ~1% error ke saath cardinality estimate deta hai. HLLs merge bhi ho sakte hain (daily HLL se weekly unique). Redis PFADD/PFCOUNT/PFMERGE.
:::

@lesson geospatial
@title Geospatial: Geohash aur Quadtree

Uber/Ola: "mere 2 km ke andar available drivers". Zomato: "paas ke restaurants". Lakhon points me se nearby kaise dhoondhein, bina har ek ki distance calculate kiye?

Naive SQL: `WHERE lat BETWEEN ... AND lng BETWEEN ...` do alag indexes se slow hai. Hume ek aisa index chahiye jo **2D space** ko samjhe.

## Geohash

Duniya ko baar-baar 4 (asal me 32) hisson me baanto aur har cell ko ek **string** do. Jitni lambi string, utna chhota area.

| Geohash length | Cell size (approx) |
|---|---|
| 4 | ~39 km × 20 km |
| 5 | ~4.9 km × 4.9 km |
| 6 | ~1.2 km × 0.6 km |
| 7 | ~153 m × 153 m |

- Mumbai ke paas ka point: `te7u...`. Paas-paas ke points ka **common prefix** hota hai.
- Nearby search = apne cell aur uske **8 padosi cells** ke points lo (kyunki point cell ke kinare par ho sakta hai).
- Geohash ek string hai, to normal DB index/Redis me store ho sakta hai. Redis `GEOADD`/`GEOSEARCH` andar se geohash use karta hai.
- Limitation: cell boundaries par paas ke points ka prefix alag ho sakta hai (isliye padosi cells bhi check), aur sab cells fixed size ke, chahe wahan 1 driver ho ya 10,000.

## Quadtree

Ek tree jisme har node ek square area hai. Agar area me **K se zyada points** hon to use **4 children** me baanto. Bheed wale area (South Mumbai) me chhote cells, khaali area (jungle) me bade.

[[anim:quadtree]]

- Nearby search: sirf woh cells check karo jo search circle se touch karte hain.
- **Dynamic density** ke hisaab se adjust: crowded area me bhi har leaf me kam points.
- Aam taur par **memory me** bana ke rakha jaata hai (server start par build).
- Moving objects (drivers) ke liye baar-baar update mehenga ho sakta hai.

## Google S2 aur Uber H3

- **S2** (Google): sphere ko cells me baant-ta hai (Hilbert curve), Google Maps, Foursquare.
- **H3** (Uber): **hexagons**. Hexagon ke saare padosi barabar doori par hote hain, jisse surge pricing zones aur nearby search achha hota hai.

| | Geohash | Quadtree | H3 / S2 |
|---|---|---|---|
| Structure | Fixed grid string | Adaptive tree | Hierarchical cells (hex / square) |
| Density adapt | Nahi | Haan | Resolution choose karke |
| Storage | DB/Redis easy | Mostly in-memory | Library + DB |
| Use | Simple nearby search | Varying density | Ride-hailing, maps at scale |

> [!example] Driver location updates
> Har driver har 4 second me location bhejta hai. Lakhon drivers = lakhon writes/sec. Isliye current locations ko **in-memory** (Redis geo / custom quadtree service) me rakhte hain, aur location history ko alag (Cassandra/Kafka) me. Module 10 me Uber design dekhenge.

:::interview
Q: Nearby restaurants/drivers dhoondhne ka efficient tareeka?
A: Spatial index: geohash (point ko prefix-searchable string me encode; apna aur 8 neighbor cells query karo) ya quadtree (adaptive subdivision; sirf search radius se intersect karne wale cells traverse). Bade systems Uber H3/Google S2 cells use karte hain. Candidates milne ke baad exact distance (haversine) se filter aur sort.
Q: Geohash me boundary problem kya hai?
A: Do points bilkul paas hokar bhi alag cells me ho sakte hain jinke prefix alag hain (cell boundary ke dono taraf). Isliye sirf apna cell query karna kaafi nahi, 8 padosi cells bhi query karne padte hain.
Q: Geohash aur quadtree me kab kya?
A: Geohash simple hai, DB/Redis me string index se store ho jaata hai, fixed precision. Quadtree density ke hisaab se adapt karta hai (dense areas me fine cells), isliye uneven data me efficient, par mostly in-memory structure aur frequent updates me rebalancing cost. Static places (restaurants) ke liye geohash/quadtree dono, fast-moving drivers ke liye in-memory grid (geohash/H3) with frequent updates.
:::

@lesson big-data
@title Big Data: Batch vs Stream Processing

Jab data terabytes/petabytes me ho aur use process karke insights nikaalne hon (reports, ML, recommendations), to ek machine kaafi nahi. **Distributed data processing** chahiye.

## Batch processing

Data ko jama karo aur **ek saath bade tukdon me** process karo (har raat, har ghanta).

- **MapReduce**: kaam ko do steps me: **Map** (har machine apne data hisse par kaam karke key-value nikaale) aur **Reduce** (same key ki values ko jodo).

```text
Word count:
Map:    "red shoes red" -> (red,1) (shoes,1) (red,1)
Shuffle: red -> [1,1], shoes -> [1]
Reduce: red -> 2, shoes -> 1
```

- **Apache Spark**: MapReduce ka fast successor (memory me processing, SQL, ML libraries).
- **Use**: daily sales reports, monthly billing, ML model training, data warehouse loading.
- **Fayde**: high throughput, simple, poora data dekh sakte ho. **Nuksaan**: results ghanton purane.

## Stream processing

Data **aate hi** (event by event ya chhote windows me) process karo.

- Tools: **Apache Flink**, **Kafka Streams**, **Spark Structured Streaming**, AWS Kinesis.
- **Windows**: tumbling (har 1 minute alag), sliding (pichhle 5 minute har 1 minute), session windows.
- **Use**: real-time fraud detection (card swipe ke milliseconds me), live dashboards, surge pricing, trending topics, alerts.
- **Mushkilein**: late/out-of-order events (**event time vs processing time**, watermarks), state management, exactly-once.

| | Batch | Stream |
|---|---|---|
| Data | Bounded (fixed set) | Unbounded (lagaatar) |
| Latency | Minutes–ghante | Milliseconds–seconds |
| Tools | Spark, Hadoop MapReduce, Hive | Flink, Kafka Streams |
| Use | Reports, training, billing | Fraud, monitoring, real-time features |

## Lambda vs Kappa architecture

- **Lambda**: do raaste: **batch layer** (accurate, slow) + **speed layer** (stream, fast approx). Results merge. Nuksaan: same logic do jagah likhna.
- **Kappa**: sirf **stream**. Reprocessing chahiye to Kafka se events replay karo. Simple, aaj kal zyada popular.

## Data Lake vs Data Warehouse

- **Data Lake**: raw data (logs, JSON, images, CSV) jaisa hai waisa sasta object storage (S3) me. Schema-on-read. Data scientists ke liye.
- **Data Warehouse**: saaf, structured, query-ready data, column-oriented. Schema-on-write. Business reports aur BI ke liye (BigQuery, Snowflake, Redshift).
- **Lakehouse**: dono ka mix (Delta Lake, Apache Iceberg): lake par warehouse jaise tables aur transactions.

## ETL vs ELT

- **ETL**: Extract -> Transform -> Load (pehle saaf karo, phir warehouse me).
- **ELT**: Extract -> Load -> Transform (raw load karo, warehouse ki power se andar transform). Modern cloud warehouses me ELT common (dbt jaise tools).

[[arch Typical modern data platform]]
svc:App DBs, svc:Event logs, ext:Third-party APIs
queue:Kafka / CDC ~ ingestion
store:Data lake (S3 raw) ~ sab kuch sasta store
svc:Spark / Flink jobs ~ clean, join, aggregate
db:Data warehouse (BigQuery / Snowflake) ~ query-ready tables
client:Dashboards (BI), client:ML models, client:Reverse ETL to apps
[[/arch]]

:::interview
Q: Batch aur stream processing me farak, aur kab kya?
A: Batch bounded data ko periodically bade jobs me process karta hai (high throughput, high latency): reports, billing, model training. Stream unbounded events ko continuously process karta hai (low latency): fraud detection, alerts, live metrics. Bahut systems dono use karte hain; modern trend Kappa: stream-first with replay from Kafka.
Q: MapReduce kaise kaam karta hai?
A: Input splits par parallel Map tasks key-value pairs emit karte hain, framework Shuffle/Sort karke same key ki values ek Reducer tak bhejta hai, Reduce aggregate karta hai. Data locality (computation data ke paas), fault tolerance (failed task dobara) aur horizontal scale iske fayde hain. Spark ne isse in-memory DAG execution se fast banaya.
Q: Stream processing me late events kaise handle karte hain?
A: Event time (event kab hua) aur processing time (kab pahuncha) alag hote hain. Watermarks batate hain ki "itne time tak ke events aa chuke maano"; windows watermark ke baad close hoti hain. Allowed lateness ke andar aaye late events window update karte hain, usse zyada late ko side output/drop. Flink isko natively support karta hai.
:::

@lesson unique-ids
@title Unique ID generation

Har order, tweet, message ko ek **unique ID** chahiye. Single DB me `AUTO_INCREMENT` chal jaata hai. Par sharded/distributed system me 10 database servers apne-apne `1, 2, 3` denge: **duplicates**! Kaise banayein globally unique IDs?

## Requirements jo aksar chahiye

- **Unique** (kabhi duplicate nahi).
- **Sortable by time** (naye IDs bade): feeds, pagination aur DB index ke liye achha.
- **Compact** (64-bit number index me achha).
- **High throughput, low latency**, koi central bottleneck nahi.

## 1. UUID (v4)

128-bit random: `3f6c1a2e-8b44-4d0e-9a1f-77c2c0b9d1aa`.
- **Fayde**: koi coordination nahi, kahin bhi generate.
- **Nuksaan**: 128 bit bada, time-sorted nahi, B-tree index me random inserts se performance kharab.
- **UUID v7**: time-ordered UUID (shuru me timestamp). Sortable bhi, coordination-free bhi. Modern choice.

## 2. Database ticket server / ranges

- Ek central DB sirf IDs deta hai (Flickr ka ticket server). Simple, par SPOF aur bottleneck.
- **Range allocation**: har server ko ek baar me 1000 IDs ka block de do (1–1000 server A, 1001–2000 server B). Kam DB calls.
- **Multi-master offset**: server 1 odd numbers, server 2 even (auto_increment_increment). Servers badhana mushkil.

## 3. Twitter Snowflake (sabse popular interview answer)

64-bit ID ko hisson me baanto:

| Bits | Hissa | Kaam |
|---|---|---|
| 1 | Sign | Hamesha 0 |
| 41 | Timestamp (ms, custom epoch se) | ~69 saal chalega, time-sortable |
| 10 | Machine ID (datacenter 5 + worker 5) | 1024 machines |
| 12 | Sequence | Ek ms me ek machine 4096 IDs |

```python
def next_id(self):
    ts = now_ms()
    if ts == self.last_ts:
        self.seq = (self.seq + 1) & 4095
        if self.seq == 0:                 # is ms ke 4096 khatam
            while ts <= self.last_ts: ts = now_ms()
    else:
        self.seq = 0
    self.last_ts = ts
    return ((ts - EPOCH) << 22) | (self.machine_id << 12) | self.seq
```

- **Fayde**: 64-bit, time-sorted, har machine independently generate (no network), har machine 4 million IDs/sec.
- **Nuksaan**: machine IDs assign karne padte hain (ZooKeeper/config), **clock peeche gayi** (NTP adjust) to duplicates ka risk: generator ko clock regression detect karke wait/refuse karna chahiye.

Instagram, Discord, Sony (Sonyflake) isi tarah ke IDs use karte hain.

| Approach | Sortable | Size | Coordination | Notes |
|---|---|---|---|---|
| Auto-increment | Haan | 64 bit | Single DB | Sharding me nahi chalta |
| UUID v4 | Nahi | 128 bit | Nahi | Index unfriendly |
| UUID v7 / ULID | Haan | 128 bit | Nahi | Modern default |
| Ticket server | Haan | 64 bit | Central | SPOF |
| Snowflake | Haan (roughly) | 64 bit | Machine IDs | Bade scale ka favourite |

:::interview
Q: Distributed system me unique ID generator design kijiye.
A: Snowflake-style 64-bit IDs: 41-bit millisecond timestamp (custom epoch), 10-bit machine/worker ID, 12-bit per-ms sequence. Har node locally generate karta hai (no coordination per ID), IDs roughly time-ordered aur compact hain. Worker IDs ZooKeeper/etcd ya config se unique assign. Clock skew/backward jumps detect karke wait ya error. Agar 128-bit chalta hai to UUIDv7/ULID simpler alternative.
Q: UUID v4 ko primary key banane ka nuksaan?
A: 128-bit hone se index bada, aur random hone se B-tree me inserts har jagah hote hain (page splits, cache misses), write performance aur storage dono kharab. Time-ordered IDs (UUIDv7, Snowflake) inserts ko end me rakhte hain.
Q: Snowflake me clock peeche chali jaye to?
A: Same machine ID par purane timestamps se duplicate IDs ban sakte hain. Generator last timestamp yaad rakhta hai; current time usse kam ho to chhota drift ho to wait karo, bada ho to IDs dena band karke alert. NTP ko slew mode me rakhna (jhatke se peeche nahi) bhi madad karta hai.
:::

@quiz
Q: User ki profile photos kahan store karni chahiye?
- Database me BLOB column
+ Object storage (S3), DB me sirf URL/metadata, delivery CDN se
- App server ki local disk
- Redis
E: Object storage sasta, durable aur scalable hai. DB me sirf reference rakho aur CDN se serve karo.

Q: Pre-signed URL ka main fayda?
- File encrypt ho jaati hai
+ Client seedha storage par upload/download kar sakta hai bina app server se file guzare
- File compress hoti hai
- File permanent public ho jaati hai
E: Temporary signed URL se app servers ka bandwidth bachta hai aur credentials expose nahi hote.

Q: Full-text search ka core data structure?
- B-Tree
+ Inverted index
- Linked list
- Bloom filter
E: Inverted index har term ko uske documents se map karta hai, isliye search bina full scan ke hota hai.

Q: Bloom filter ne kaha "shayad hai". Iska matlab?
- Item pakka set me hai
+ Item set me ho sakta hai, false positive bhi ho sakta hai
- Item pakka nahi hai
- Filter kharab hai
E: Sab bits 1 hone par item probably present hai. "Definitely not" sirf tab jab koi bit 0 ho.

Q: Billions of visitors ke unique count ke liye kam memory me?
- Bloom filter
+ HyperLogLog
- Quadtree
- Sorted set
E: HyperLogLog ~12 KB me billions of unique items ka ~1% error ke saath count deta hai.

Q: Geohash me nearby search karte waqt 8 padosi cells kyun check karte hain?
- Speed badhane ke liye
+ Kyunki point cell ki boundary ke paas ho to paas ke points padosi cell me ho sakte hain
- Database ki requirement hai
- Accuracy kam karne ke liye
E: Boundary ke dono taraf ke points ka prefix alag hota hai, isliye sirf apna cell kaafi nahi.

Q: Card swipe ke milliseconds me fraud detect karna hai. Kya chahiye?
- Nightly batch job
+ Stream processing (Flink / Kafka Streams)
- Data warehouse report
- Manual review
E: Real-time decisions ke liye events aate hi process karne padte hain, batch ghanton late hoga.

Q: Snowflake ID ke 41 bits kis cheez ke liye hain?
- Machine ID
- Sequence
+ Timestamp (milliseconds)
- Random
E: Timestamp pehle hone se IDs time ke saath badhte hain (sortable). Phir 10 bit machine, 12 bit sequence.
