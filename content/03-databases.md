@module databases
@title Databases
@level Intermediate
@desc SQL vs NoSQL, ACID, indexing, replication, sharding, consistent hashing aur CAP theorem.

@lesson sql-vs-nosql
@title SQL vs NoSQL

Har application ka dil uska **database** hai. Sabse pehla bada decision: **SQL (relational)** ya **NoSQL (non-relational)**?

## SQL / Relational databases

Data **tables** (rows aur columns) me, fixed **schema** ke saath. Tables **foreign keys** se jude hote hain aur **JOIN** se saath padhe jaate hain. Query language: SQL.

```sql
SELECT u.name, o.total
FROM users u JOIN orders o ON o.user_id = u.id
WHERE o.created_at > '2026-01-01';
```

**Examples**: PostgreSQL, MySQL, Oracle, SQL Server.
**Khoobiyan**: ACID transactions, strong consistency, powerful queries aur joins, mature tools.
**Kamiyan**: horizontal scaling (sharding) mushkil, schema change bade tables par dard deta hai.

## NoSQL databases

Flexible schema, alag-alag data models, **horizontal scaling ke liye bane**. Zyada tar joins nahi karte; data ko waise hi store karte hain jaise padhna hai.

**Examples**: MongoDB (document), Cassandra (wide-column), Redis/DynamoDB (key-value), Neo4j (graph).
**Khoobiyan**: massive scale, high write throughput, flexible schema, low latency.
**Kamiyan**: joins nahi ya limited, aksar **eventual consistency**, complex transactions mushkil (kuch modern NoSQL ab support karte hain).

| | SQL | NoSQL |
|---|---|---|
| Data model | Tables, rows | Document, key-value, column, graph |
| Schema | Fixed (schema-on-write) | Flexible |
| Scaling | Mostly vertical + replicas | Horizontal (sharding built-in) |
| Transactions | Strong ACID | Aksar BASE, limited |
| Joins | Haan | Mostly nahi |
| Best for | Payments, orders, inventory, relations | Huge scale, simple access patterns, fast-changing data |

> [!analogy] Almirah vs bori
> SQL ek almirah jaisa hai: har cheez ka fixed khana, sab neat, dhoondna easy, par naya khana banana mushkil. NoSQL bori jaisa hai: kuch bhi daal do, bahut saari boriyan rakh sakte ho, par cheezon ke beech relation khud yaad rakhna padta hai.

## Kaise choose karein?

**SQL chuniye jab**:
- Data me clear relations hon (users, orders, products).
- Transactions aur correctness critical ho (banking, payments, inventory).
- Complex queries/reports chahiye.

**NoSQL chuniye jab**:
- Scale bahut bada ho (billions of rows, lakhon writes/sec).
- Access pattern simple aur pata ho ("user_id se uske messages laao").
- Schema baar-baar badalta ho ya data semi-structured ho.
- Low latency key-value lookups chahiye.

> [!key] Interview tip
> "SQL scale nahi karta" galat hai. Instagram, Shopify, Uber jaise systems sharded PostgreSQL/MySQL chalate hain. Choice access pattern, consistency need aur team expertise par hoti hai. **Polyglot persistence**: ek hi system me alag kaam ke liye alag databases (orders ke liye Postgres, cache ke liye Redis, search ke liye Elasticsearch).

:::interview
Q: SQL aur NoSQL me se kab kya choose karenge?
A: Strong consistency, transactions, complex relations aur ad-hoc queries chahiye (payments, orders, inventory) to SQL. Massive scale, high write throughput, simple known access patterns, flexible schema chahiye (chat messages, activity logs, IoT, sessions) to NoSQL. Aksar dono use hote hain alag parts ke liye.
Q: Kya SQL databases horizontally scale ho sakte hain?
A: Haan. Read scaling ke liye read replicas, aur write scaling ke liye application-level ya tool-based sharding (Vitess for MySQL, Citus for Postgres). NewSQL databases (CockroachDB, Google Spanner, YugabyteDB) SQL + ACID ke saath built-in horizontal scaling dete hain. Bas NoSQL ki tulna me zyada mehnat lagti hai.
Q: Schema-on-write aur schema-on-read me farak?
A: Schema-on-write (SQL): data likhte waqt hi schema enforce hota hai, galat data andar nahi jaata. Schema-on-read (NoSQL documents): kuch bhi likh sakte ho, padhte waqt application interpret karti hai. Pehla safety deta hai, doosra flexibility.
:::

@lesson acid-base
@title ACID, BASE aur Transactions

Jab aap UPI se ₹500 bhejte ho, do kaam hote hain: aapke account se ₹500 kam aur dost ke account me ₹500 zyada. Agar beech me server crash ho gaya to? Paisa gayab nahi hona chahiye. Yahi guarantee **transactions** dete hain.

## ACID

- **A – Atomicity**: ya to poora transaction hoga ya bilkul nahi. ₹500 kata to pakka jama bhi hoga, warna dono rollback.
- **C – Consistency**: transaction database ko ek valid state se doosri valid state me le jaata hai. Rules (balance negative nahi ho sakta, foreign keys) kabhi nahi tootte.
- **I – Isolation**: ek saath chal rahe transactions ek doosre ko gadbad state me nahi dekhte. Aisa lagta hai jaise ek ke baad ek chale.
- **D – Durability**: commit ho gaya to crash ke baad bhi data rahega (disk/WAL par likha gaya).

```sql
BEGIN;
UPDATE accounts SET balance = balance - 500 WHERE id = 1;
UPDATE accounts SET balance = balance + 500 WHERE id = 2;
COMMIT;  -- dono hue, ya ROLLBACK par koi nahi
```

## Isolation levels aur problems

Full isolation slow hota hai, isliye databases levels dete hain:

| Problem | Kya hota hai |
|---|---|
| Dirty read | Doosre ka uncommitted data padh liya (jo baad me rollback ho gaya) |
| Non-repeatable read | Same row do baar padhi, beech me kisi ne update kar di, value alag |
| Phantom read | Same query do baar chalayi, beech me naye rows insert ho gaye |
| Lost update | Do log ek saath padh ke update karte hain, ek ka update kho jaata hai |

| Isolation level | Dirty | Non-repeatable | Phantom |
|---|---|---|---|
| Read Uncommitted | Ho sakta | Ho sakta | Ho sakta |
| Read Committed (Postgres default) | Nahi | Ho sakta | Ho sakta |
| Repeatable Read (MySQL InnoDB default) | Nahi | Nahi | Ho sakta (InnoDB kaafi had tak rokta hai) |
| Serializable | Nahi | Nahi | Nahi |

> [!example] Lost update aur uska ilaaj
> Do users ek saath last ticket book karte hain. Dono ne padha "1 seat bachi", dono ne book kar di. Ilaaj: `SELECT ... FOR UPDATE` (pessimistic lock), ya **optimistic locking**: `UPDATE seats SET status='BOOKED', version=6 WHERE id=7 AND version=5`. Agar 0 rows update hui to kisi aur ne pehle le liya.

## BASE: NoSQL ki philosophy

Distributed NoSQL systems aksar ACID ki jagah **BASE** follow karte hain:

- **BA – Basically Available**: system hamesha jawab deta hai (shayad purana data).
- **S – Soft state**: data bina input ke bhi badal sakta hai (replicas sync ho rahe hain).
- **E – Eventual consistency**: thodi der me saare replicas same ho jayenge.

> [!analogy] Instagram likes
> Aapne photo like ki. Aapke dost ko like count 1–2 second baad dikhe to chalega. Ye eventual consistency hai. Par bank balance me ye nahi chalega: wahan ACID chahiye.

## Optimistic vs Pessimistic locking

- **Pessimistic**: pehle lock lo, phir kaam karo. Conflict zyada ho to achha, par wait aur deadlocks ho sakte hain.
- **Optimistic**: bina lock kaam karo, likhte waqt version check karo. Conflict kam ho to fast.

:::interview
Q: ACID ke charo properties ek example se samjhaiye.
A: Bank transfer: Atomicity: debit aur credit dono ya koi nahi. Consistency: total paisa aur constraints (balance >= 0) bane rahein. Isolation: transfer ke beech koi doosra transaction aadha-adhoora state na dekhe. Durability: COMMIT ke baad power cut ho to bhi transfer save rahe (write-ahead log).
Q: Optimistic aur pessimistic locking kab use karenge?
A: Jab conflicts rare hon (profile update, wiki edit) to optimistic: version column ke saath conditional update, conflict par retry. Jab conflicts common hon aur retry mehenga ho (hot inventory, seat booking ke last items) to pessimistic: `SELECT FOR UPDATE` ya distributed lock. Pessimistic me lock time chhota rakho aur deadlock se bacho.
Q: Eventual consistency kya hai, ek example dijiye.
A: Write hone ke baad kuch time ke liye alag replicas alag value dikha sakte hain, par naye writes na aaye to aakhir me sab same ho jaate hain. Example: YouTube view count, social media likes, DNS propagation.
Q: Serializable isolation hamesha kyun nahi use karte?
A: Ye sabse safe hai par throughput kam karta hai: zyada locking ya transaction aborts/retries hote hain. Zyada tar apps Read Committed ya Repeatable Read par chalti hain aur zaroori jagah explicit locks/constraints lagati hain.
:::

@lesson nosql-types
@title NoSQL ke types

NoSQL ek database nahi, kai alag data models ka group hai. Har ek kisi khaas kaam ke liye bana hai.

## 1. Key-Value store

Ek bada distributed HashMap: key do, value lo. Sabse simple aur sabse fast.

```text
SET session:9f2a  '{"user_id": 42, "expires": 1760000000}'
GET session:9f2a
```

**Examples**: Redis, DynamoDB, Memcached, etcd.
**Use**: caching, sessions, shopping cart, rate limiter counters, leaderboards (Redis sorted sets).
**Limit**: value ke andar search/filter nahi kar sakte (sirf key se).

## 2. Document store

Data JSON jaise **documents** me. Har document ka structure alag ho sakta hai. Andar ke fields par query aur index ho sakta hai.

```json
{ "_id": "p101", "name": "Running Shoes", "price": 2499,
  "sizes": [7, 8, 9], "specs": { "brand": "Asics", "weight_g": 280 } }
```

**Examples**: MongoDB, Couchbase, Firestore.
**Use**: product catalog (har product ke alag attributes), CMS, user profiles.

## 3. Wide-column store

Rows aur columns hain, par har row me alag columns ho sakte hain, aur data **partition key** ke hisaab se distribute hota hai. Bahut zyada **write throughput** ke liye bane hain (LSM trees).

**Examples**: Cassandra, HBase, ScyllaDB, Bigtable.
**Use**: chat messages, time-series, activity feeds, IoT, logs. (Discord aur Netflix inka use karte hain.)

```text
Partition key: chat_id  |  Clustering key: message_time
chat_42 -> [10:01 "hi"], [10:02 "kaise ho"], [10:05 "theek"]
```

## 4. Graph database

Data **nodes** aur **edges** (relationships) me. "Friend ke friend" jaise multi-hop queries ke liye bana hai.

**Examples**: Neo4j, Amazon Neptune.
**Use**: social network ("People you may know"), recommendation engine, fraud detection (ek hi phone se 50 accounts?).

## 5. Time-series database

Timestamp ke saath aane wala data, compression aur time-range queries par optimized.

**Examples**: InfluxDB, TimescaleDB, Prometheus.
**Use**: server metrics, stock prices, sensor readings.

## 6. Search engine (bonus)

Full-text search ke liye **inverted index** (Module 8). **Examples**: Elasticsearch, OpenSearch, Solr.

| Type | Example | Best use |
|---|---|---|
| Key-Value | Redis, DynamoDB | Cache, sessions, counters |
| Document | MongoDB | Catalogs, profiles |
| Wide-column | Cassandra | Chats, feeds, time-ordered high writes |
| Graph | Neo4j | Social graph, recommendations |
| Time-series | InfluxDB | Metrics, monitoring |
| Search | Elasticsearch | Full-text search, logs |

> [!tip] NoSQL design ka mantra
> SQL me pehle data model banate hain, phir queries likhte hain. NoSQL (especially Cassandra/DynamoDB) me **pehle queries (access patterns) likho**, phir unke hisaab se tables design karo. Ek hi data ko alag queries ke liye do jagah duplicate karna normal hai.

:::interview
Q: Chat messages store karne ke liye kaunsa database choose karenge aur kyun?
A: Wide-column store jaise Cassandra/ScyllaDB (ya HBase). Reasons: bahut zyada write throughput, data naturally `chat_id` se partition hota hai aur `timestamp` se sorted (clustering key), "is chat ke last 50 messages" jaisi query efficient hai, aur horizontally scale hota hai. Discord ne bhi isi tarah Cassandra/ScyllaDB use kiya.
Q: Product catalog ke liye document DB kyun achha hai?
A: Har product category ke attributes alag hote hain (mobile me RAM, shoes me size, books me author). Document DB me flexible schema hai, nested data ek document me aata hai (ek read me poora product), aur fields par index ban sakte hain.
Q: Graph database kab use karenge?
A: Jab queries relationships ke upar multi-hop hon: friends of friends, shortest path, fraud rings (shared devices/cards), recommendation ("jinhone X kharida unhone Y bhi"). SQL me ye kai self-joins se bahut slow ho jaata hai.
:::

@lesson indexing
@title Indexing

Socho ek 1000 page ki kitaab me "Kafka" shabd dhoondhna hai. Har page palto (slow) ya peeche ka **index** dekho jo batata hai "Kafka: page 342" (fast). Database index bilkul yahi hai.

[[anim:index]]

## Index kaise kaam karta hai

Index ek alag data structure hai jo column ki values ko sorted rakhta hai aur har value ke saath row ka pointer. Zyada tar databases **B-Tree** (ya B+ Tree) use karte hain:

- Tree balanced hai, har node me sainkdon keys.
- 10 crore rows me bhi sirf **3–4 levels** -> 3–4 disk reads me row mil jaati hai. Ye **O(log n)** hai.
- Range queries (`price BETWEEN 500 AND 1000`) bhi fast, kyunki leaf nodes sorted aur linked hain.

```sql
CREATE INDEX idx_orders_user ON orders(user_id);
-- ab ye query full scan nahi karegi:
SELECT * FROM orders WHERE user_id = 42;
```

## Index ke types

- **Primary index / clustered**: table ka data khud isi order me store (MySQL InnoDB me primary key).
- **Secondary index**: alag structure jo primary key/row ki taraf point karta hai.
- **Composite index**: multiple columns `(user_id, created_at)`. **Leftmost prefix rule**: ye index `user_id` wali queries aur `user_id + created_at` wali queries me kaam aayega, par sirf `created_at` wali query me nahi.
- **Unique index**: duplicate values allowed nahi (email).
- **Covering index**: query ke saare columns index me hi hain, table tak jaana hi nahi padta.
- **Hash index**: exact match ke liye fast, range ke liye bekaar.
- **Full-text / inverted index**: text search ke liye.

## Index ka nuksaan bhi hai

> [!warn] Har column par index mat lagao
> - Har **write** (INSERT/UPDATE/DELETE) par saare indexes bhi update hote hain -> writes slow.
> - Indexes **extra storage** lete hain.
> - Kam selectivity wale column (jaise `gender` me 2–3 values) par index aksar useless hai.
> Rule: jo columns `WHERE`, `JOIN`, `ORDER BY` me baar-baar aate hain, unpar index.

## B-Tree vs LSM Tree

| | B-Tree | LSM Tree |
|---|---|---|
| Kaise likhta hai | Disk par sahi jagah update (in-place) | Pehle memory (memtable), phir sequential files (SSTables), baad me merge (compaction) |
| Reads | Fast | Thoda slow (kai files check, Bloom filters madad karte hain) |
| Writes | Theek | Bahut fast (sequential) |
| Use | PostgreSQL, MySQL | Cassandra, RocksDB, LevelDB, HBase |

## Query slow ho to

1. `EXPLAIN` / `EXPLAIN ANALYZE` chalao: full table scan ho raha hai?
2. Sahi index lagao (composite order dhyan se).
3. `SELECT *` ki jagah zaroori columns.
4. N+1 queries hatao (loop me query mat chalao, JOIN ya batch).

:::interview
Q: Database index kaise kaam karta hai aur iska trade-off kya hai?
A: Index ek sorted data structure (zyada tar B+ Tree) hai jo column values se row locations map karta hai, jisse lookup O(n) full scan se O(log n) ho jaata hai. Trade-off: extra storage, aur har write par index update hone se writes slow hote hain. Isliye sirf frequently queried columns par index.
Q: Composite index (a, b) kin queries me kaam aayega?
A: Leftmost prefix rule se: `WHERE a = ?` aur `WHERE a = ? AND b = ?` aur `WHERE a = ? ORDER BY b` me. Sirf `WHERE b = ?` me ye index use nahi hoga (ya kam efficient). Isliye column order query patterns ke hisaab se rakhte hain, aam taur par zyada selective / equality wala pehle.
Q: B-Tree aur LSM Tree me farak?
A: B-Tree in-place updates karta hai, reads fast aur predictable, writes me random I/O. LSM Tree writes ko memory me buffer karke disk par sequential sorted files me likhta hai aur background compaction karta hai, isliye writes bahut fast, par reads ko kai levels check karne padte hain (Bloom filters se optimize). Write-heavy (Cassandra) ke liye LSM, read-heavy OLTP ke liye B-Tree.
:::

@lesson normalization
@title Normalization vs Denormalization

## Normalization: duplicate data hatao

Data ko alag tables me todna taaki har fact **ek hi jagah** ho.

**Bina normalization**: har order row me customer ka naam, phone, address bhi. Customer ne phone badla to hazaar rows update karni padengi, aur kahi miss hua to data inconsistent.

**Normalized**: `customers` table me ek baar, `orders` me sirf `customer_id`.

- **1NF**: har cell me ek value (comma-separated list nahi).
- **2NF**: har non-key column poori primary key par depend kare.
- **3NF**: non-key columns ek doosre par depend na karein (sirf key par).

**Fayde**: koi duplicate nahi, updates easy, consistency.
**Nuksaan**: padhne ke liye **JOINs**, jo bade scale par slow aur sharding ke saath mushkil.

## Denormalization: padhne ke liye data duplicate karo

Jaan-boojhkar data copy karna taaki reads fast hon, bina JOIN.

> [!example] Instagram post
> Har post ke saath `like_count` column rakh do, bajaye har baar `SELECT COUNT(*) FROM likes WHERE post_id=?` chalane ke. Ya feed table me post ke saath author ka naam aur photo URL bhi copy kar do.

**Fayde**: reads bahut fast, kam joins, NoSQL aur sharded systems ke liye natural.
**Nuksaan**: writes complex (kai jagah update), data inconsistent hone ka risk, zyada storage.

| | Normalized | Denormalized |
|---|---|---|
| Duplicate data | Nahi | Haan |
| Reads | Joins, slow ho sakte | Fast |
| Writes | Simple | Complex |
| Consistency | Easy | Mehnat lagti hai |
| Best for | Write-heavy, OLTP, correctness | Read-heavy, analytics, feeds |

> [!key] Practical rule
> Pehle normalize karo (correctness). Jab koi read path slow ho aur measure karke pata chale, tab us jagah denormalize karo, aur sync kaise rahega (triggers, events, background jobs) ye plan karo.

## Materialized views

Ek precomputed query result jo table ki tarah store hota hai (jaise "har din ki total sales"). Reads fast, par refresh karna padta hai. Ye controlled denormalization hai.

:::interview
Q: Denormalization kab karenge?
A: Jab read-heavy system me JOINs ya aggregations bottleneck ban jaayein, ya data sharded/NoSQL me ho jahan joins possible nahi. Example: feed me author ka naam/avatar copy karna, post par like_count rakhna. Saath me ye decide karna padta hai ki duplicate data update kaise hoga (sync write, async events, periodic recompute) aur kitni staleness chalegi.
Q: Normalization ke fayde aur nuksaan?
A: Fayde: data ek jagah, update anomalies nahi, storage kam, integrity constraints easy. Nuksaan: reads ke liye joins, bade scale par slow, aur sharding ke baad cross-shard joins mushkil.
:::

@lesson replication
@title Replication

**Replication** matlab same data ki kai copies alag-alag machines (replicas) par rakhna.

**Kyun?**
- **High availability**: ek machine gire to doosri ready.
- **Read scaling**: reads ko kai replicas me baanto.
- **Low latency**: alag regions me copies, user ke paas.
- **Disaster recovery / backups**.

[[anim:replication]]

## 1. Leader-Follower (Master-Slave / Primary-Replica)

- Saare **writes leader** par jaate hain.
- Leader changes ko **followers** tak bhejta hai (replication log).
- **Reads** followers se ho sakte hain.
- Sabse common: MySQL, PostgreSQL, MongoDB replica sets.

**Problem**: replication lag -> follower se purana data padh sakte ho. Leader gira to **failover** karna padta hai.

## 2. Multi-Leader (Master-Master)

Kai leaders, har ek writes leta hai aur doosron ko sync karta hai. Multi-region setups me (har region ka apna leader).

**Problem**: **write conflicts** (do regions me same row alag update). Resolve karne ke tareeke: Last-Write-Wins (timestamp), version vectors, CRDTs, ya application logic.

## 3. Leaderless (Dynamo style)

Koi leader nahi. Client (ya coordinator) **kai replicas par ek saath** likhta aur padhta hai. **Quorum** use hota hai: N replicas, W par write confirm, R se read. Agar **W + R > N** to read me kam se kam ek latest copy zaroor milegi.

Example: N=3, W=2, R=2. Cassandra, DynamoDB, Riak isi model par.

| | Leader-Follower | Multi-Leader | Leaderless |
|---|---|---|---|
| Writes kahan | Sirf leader | Kai leaders | Koi bhi replica |
| Conflicts | Nahi | Haan | Haan (quorum, read repair) |
| Complexity | Kam | Zyada | Zyada |
| Example | MySQL, Postgres | Multi-region active-active | Cassandra, DynamoDB |

## Sync vs Async replication

- **Synchronous**: leader tab tak OK nahi bolta jab tak follower confirm na kare. Data loss nahi, par writes slow, aur follower slow/down to writes ruk jaate.
- **Asynchronous**: leader turant OK, followers baad me. Fast, par leader crash par last kuch writes **lost** ho sakti hain.
- **Semi-synchronous**: kam se kam ek follower sync, baaki async. Beech ka raasta (common production choice).

## Replication lag ki problems aur ilaaj

- **Read-your-own-writes**: user ne profile update kiya, refresh kiya to purana dikha (follower se padha). Ilaaj: user ke apne data ki reads kuch second leader se karo.
- **Monotonic reads**: user ko ek baar naya data dikha, phir purana (alag replicas). Ilaaj: ek user ko hamesha same replica se padhao.

> [!warn] Failover ki mushkilein
> Leader gira, follower promote hua. Par purana leader wapas aaya aur khud ko abhi bhi leader samajhta hai to **split brain**: do leaders, data corrupt. Ilaaj: consensus (Raft) ya fencing tokens. Module 7 me detail.

:::interview
Q: Leader-follower replication me replication lag ki wajah se kya problems aati hain?
A: Stale reads: follower se purana data. Read-your-writes violation: user ko apna hi update nahi dikhta. Monotonic read violation: data aage-peeche hota dikhta hai. Failover par async replication me recent writes lost. Ilaaj: critical reads leader se, session/sticky replica, lag monitoring, semi-sync replication.
Q: Quorum (N, W, R) kya hai?
A: Leaderless replication me N copies hain. Write tab successful jab W replicas confirm karein, read R replicas se. W + R > N ho to read set aur write set overlap karenge, yaani kam se kam ek replica latest value dega. Example N=3, W=2, R=2. W=1, R=3 fast writes deta hai; W=3, R=1 fast reads.
Q: Sync aur async replication me kya choose karenge?
A: Durability critical ho (payments) to sync ya semi-sync, latency cost accept karke. Throughput aur latency zyada important ho aur thoda data loss chal jaye (analytics, feeds) to async. Production me aksar semi-sync: ek replica sync, baaki async.
Q: Multi-leader replication me conflicts kaise resolve hote hain?
A: Last-write-wins (timestamp se; simple par data lose ho sakta hai), version vectors se concurrent writes detect karke application ko merge karne dena, CRDTs (counters, sets jo automatically merge hote hain), ya conflict avoidance: ek record ko hamesha ek hi "home" leader par likhna.
:::

@lesson sharding
@title Sharding (Partitioning)

Jab data itna bada ho jaye ki ek machine me na aaye, ya writes ek machine sambhal na sake, to data ko **tukdon (shards)** me baant kar alag machines par rakhte hain. Ye **sharding** (horizontal partitioning) hai.

> [!analogy] School ka register
> 5000 students ka ek register bahut mota hai aur ek hi teacher sambhalta hai. To A–F naam wale ek register me, G–M doosre me... Har teacher apna register sambhale. Ye range sharding hai.

[[anim:sharding]]

## Vertical vs Horizontal partitioning

- **Vertical partitioning**: columns/tables alag karna (user profile ek DB me, user photos doosre me).
- **Horizontal partitioning (sharding)**: rows alag karna (user 1–1 crore ek shard me, aage doosre me).

## Sharding strategies

### 1. Range-based

`user_id 1–1M -> shard 1, 1M–2M -> shard 2`, ya naam/date ke range se.
- **Fayde**: range queries easy ("is mahine ke orders").
- **Nuksaan**: **hotspots**: naye users sab last shard par, ya ek letter ke naam zyada.

### 2. Hash-based

`shard = hash(user_id) % N`
- **Fayde**: data barabar bantta hai.
- **Nuksaan**: range queries mushkil, aur **N badla to almost saara data move** hota hai. Ilaaj: **consistent hashing** (agla lesson).

### 3. Directory / lookup based

Ek lookup table: `user_id -> shard`. Bilkul flexible, koi bhi data kahin bhi move kar sakte ho.
- **Nuksaan**: lookup service khud bottleneck/SPOF ban sakti hai (cache karo).

### 4. Geo-based

User ke region se: Indian users Mumbai shard, European Frankfurt. Latency aur data residency laws ke liye.

## Shard key kaise chunein

Sabse important decision! Achhi shard key:

- **High cardinality**: bahut saari distinct values (user_id achha, country bura).
- **Even distribution**: koi ek value bahut zyada traffic na laaye.
- **Query alignment**: zyada tar queries ek hi shard par jaayein (user ke saare orders `user_id` shard par).

> [!example] Celebrity problem
> Agar Twitter `user_id` se shard kare, to Virat Kohli ke tweets aur unke followers ki reads ek hi shard par hotspot bana denge. Ilaaj: hot keys ko alag handle karna, extra replicas, caching, ya key me suffix lagakar split karna (`kohli#1`, `kohli#2`).

## Sharding ki mushkilein

- **Cross-shard queries aur joins**: kai shards se data laake merge karna (scatter-gather), slow.
- **Cross-shard transactions**: 2PC ya Saga chahiye (Module 6).
- **Resharding**: naye shards jodne par data move karna, bina downtime.
- **Unique IDs**: auto-increment kaam nahi karta, distributed ID generator chahiye (Module 8).
- **Operational complexity**: backups, monitoring, schema changes har shard par.

> [!key] Sharding last resort hai
> Pehle: query optimization, indexing, caching, read replicas, vertical scaling. Inse kaam na chale tab sharding. Lekin design ke time shard key socho, taaki baad me pain kam ho.

:::interview
Q: Sharding kya hai aur shard key kaise choose karenge?
A: Data ko rows ke hisaab se kai databases me baantna taaki storage aur write load distribute ho. Shard key high cardinality wali, evenly distributed, aur common query patterns se aligned honi chahiye taaki zyada tar queries single shard par jaayein. Example: e-commerce orders ke liye `user_id` (user ke saare orders ek shard par), timestamp nahi (saare naye writes ek shard par hotspot).
Q: Range aur hash sharding me trade-off?
A: Range: range queries aur ordered scans easy, par hotspots (sequential keys, popular ranges). Hash: uniform distribution, par range queries ke liye saare shards scan karne padte hain, aur simple `hash % N` me shards badalne par massive data movement (consistent hashing se kam hota hai).
Q: Hotspot/hot partition ko kaise handle karenge?
A: Better shard key, hot key ke liye key salting (suffix laga ke kai partitions me split, reads par merge), hot data ki caching, us shard ke extra read replicas, ya celebrity users ke liye alag handling (jaise feed me pull model).
Q: Sharded database me resharding bina downtime kaise karenge?
A: Consistent hashing ya pehle se zyada logical shards (jaise 1024 virtual shards jo kam physical machines par map hain) taaki sirf mapping badle. Data copy background me (double-write ya change-data-capture se sync), phir reads/writes switch, phir purana data delete. Directory-based mapping isme madad karti hai.
:::

@lesson consistent-hashing
@title Consistent Hashing

Hash sharding me `server = hash(key) % N` use karte hain. Problem: N=4 se N=5 hua to **lagbhag 80% keys** ka server badal jaata hai. Cache me iska matlab: achanak saare cache misses, database par hamla (thundering herd). **Consistent hashing** isko solve karta hai.

## Idea: hash ring

1. Hash space ko ek **circle (ring)** maano, jaise 0 se 2^32.
2. Har **server** ko hash karke ring par rakho.
3. Har **key** ko bhi hash karke ring par rakho.
4. Key ka owner: key se **clockwise** chalte hue jo pehla server mile.

Ab naya server aaya to sirf uske aur pichhle server ke beech ki keys move hongi. Server hata to sirf uski keys agle server ko jaayengi. **Average sirf K/N keys move** hoti hain (K = total keys, N = servers).

[[anim:consistent-hashing]]

## Problem: uneven distribution

Kam servers hon to ring par woh random jagah aate hain, kisi ke hisse bada arc, kisi ke chhota. Aur ek server gira to uska saara load **sirf ek pados wale** par.

## Solution: Virtual nodes

Har physical server ko ring par **kai jagah** (jaise 100–200 virtual nodes) rakho: `A#1, A#2, A#3...`

- Load zyada **barabar** bantta hai.
- Server gira to uska load **kai servers** me bant jaata hai.
- Bade server ko zyada virtual nodes deke **weighted** distribution.

> [!key] Kahan use hota hai
> Amazon DynamoDB, Apache Cassandra, Riak, Memcached clients, CDN load balancing, Discord, Akamai. Jahan bhi nodes baar-baar add/remove hote hain aur data movement kam chahiye.

## Replication on the ring

Key ko sirf pehle server par nahi, agle N-1 distinct servers par bhi copy karte hain (clockwise). Isse replication bhi ring ke saath natural ho jaata hai (Dynamo/Cassandra).

## Alternative: Rendezvous (HRW) hashing

Har key ke liye har server ka score `hash(key, server)` nikaalo, sabse bada score wala owner. Simple aur barabar, par lookup O(N). Chhote clusters me achha.

:::interview
Q: Consistent hashing kya hai aur kyun zaroori hai?
A: Ek technique jisme servers aur keys dono ek hash ring par map hote hain aur key clockwise next server ko jaati hai. Server add/remove par sirf ~K/N keys move hoti hain, jabki `hash % N` me lagbhag saari. Distributed caches aur databases me resharding ke time data movement aur cache misses ko minimum rakhta hai.
Q: Virtual nodes kyun use karte hain?
A: Kam physical nodes se ring par uneven arcs bante hain aur load imbalance hota hai. Har physical node ko kai virtual positions dene se distribution statistically barabar ho jaata hai, failure ka load kai nodes me bantta hai, aur heterogeneous hardware ko weights diye ja sakte hain.
Q: Consistent hashing me replication kaise hota hai?
A: Key ke owner node ke baad ring par clockwise agle N-1 distinct physical nodes par replicas rakhe jaate hain (preference list). Virtual nodes ke saath ensure karte hain ki replicas alag physical machines (aur ideally alag racks/zones) par hon.
:::

@lesson cap-theorem
@title CAP Theorem, PACELC aur Consistency Models

Distributed system me teen cheezein chahiye hoti hain:

- **C – Consistency**: har read ko latest write dikhe (sab nodes same data dikhayein).
- **A – Availability**: har request ko (non-error) response mile.
- **P – Partition tolerance**: network toot jaye (nodes aapas me baat na kar sakein) tab bhi system chale.

**CAP theorem**: network partition ke time aap **C aur A me se sirf ek** chun sakte ho.

> [!key] Asli matlab
> Distributed system me partitions hote hi hain (cables kat-ti hain, switches fail hote hain). Isliye **P to lena hi padega**. Asli sawaal: partition ke time **CP** (galat data dene se behtar error) ya **AP** (purana data hi sahi, par jawab do)?

[[anim:cap]]

## CP vs AP examples

| Choice | Behaviour on partition | Examples / use |
|---|---|---|
| CP | Kuch requests reject/timeout, par data kabhi galat nahi | Bank balance, inventory count, leader election (ZooKeeper, etcd), HBase |
| AP | Sab jawab denge, kuch purana data | Social likes, product reviews, shopping cart (Dynamo), Cassandra (default), DNS |

> [!tip] Tunable consistency
> Cassandra/DynamoDB me per-query consistency choose kar sakte ho: `QUORUM` (zyada consistent) ya `ONE` (zyada available/fast). Ek hi system kuch operations ke liye CP-ish aur kuch ke liye AP-ish ho sakta hai.

## PACELC: CAP ka better version

CAP sirf partition ki baat karta hai. **PACELC** kehta hai: **P**artition ho to **A** ya **C**; **E**lse (normal time me) **L**atency ya **C**onsistency.

- Normal time me bhi strong consistency ke liye replicas ka wait karna padta hai (latency badhti hai).
- DynamoDB/Cassandra: **PA/EL** (availability aur low latency).
- Spanner/traditional RDBMS cluster: **PC/EC** (hamesha consistency).

## Consistency models (strong se weak)

1. **Strong / Linearizable**: write ke turant baad har reader ko naya value. Jaise ek hi copy ho.
2. **Sequential**: sab operations ek global order me dikhte hain.
3. **Causal**: jo cheezein ek doosre par depend karti hain unka order sabko same dikhe (pehle sawaal, phir jawab).
4. **Read-your-writes**: kam se kam aapko apna likha hua dikhe.
5. **Monotonic reads**: aap time me peeche nahi jaate (ek baar naya dekha to purana nahi).
6. **Eventual**: kabhi na kabhi sab same ho jayenge.

> [!analogy] WhatsApp group
> Agar kisi ko jawab pehle aur sawaal baad me dikhe to ajeeb lagega. **Causal consistency** ye ensure karti hai. Lekin do alag logon ke unrelated messages ka order thoda alag dikhe to chalega.

:::interview
Q: CAP theorem samjhaiye. Kya hum CA system bana sakte hain?
A: CAP kehta hai ki network partition hone par system ya to consistency (sab nodes latest data, warna error) ya availability (har request ka jawab, shayad stale) me se ek hi guarantee kar sakta hai. Distributed system me partitions avoid nahi ho sakte, isliye practically choice CP ya AP hai. "CA" sirf single-node system (jaise ek database server) ke liye meaningful hai, jo distributed hi nahi.
Q: Payment system aur social feed ke liye CP ya AP?
A: Payment/ledger: CP. Galat balance ya double spend se behtar hai ki transaction thodi der fail ho aur retry ho. Social feed/likes: AP. User ko kuch second purana feed dikhe to chalega, par app down nahi dikhni chahiye.
Q: PACELC kya add karta hai CAP me?
A: CAP sirf partition ke time ki baat karta hai. PACELC kehta hai ki partition na ho tab bhi latency aur consistency ka trade-off hai: strong consistency ke liye replicas se coordinate karna padta hai jo latency badhata hai. Isse systems ko better classify kar sakte hain (DynamoDB PA/EL, Spanner PC/EC).
Q: Strong aur eventual consistency me farak ek example se?
A: Strong: bank me ₹500 jama hote hi kisi bhi ATM/app par naya balance. Eventual: YouTube par video like kiya, kisi aur ko count thodi der baad update dikha. Strong me coordination ki wajah se latency/availability cost hai, eventual fast aur highly available hai.
:::

@lesson choosing-db
@title Database kaise choose karein

Interview me aksar poochte hain: "Yahan kaunsa database lagaoge aur kyun?" Is lesson me ek practical decision guide hai.

## Sawaal jo khud se poochhein

1. **Data ka structure**: relational (users-orders-products) ya documents ya graph ya time-series?
2. **Consistency**: paisa/inventory hai (strong) ya likes/views (eventual chalega)?
3. **Read vs write ratio**: read-heavy (caching + replicas) ya write-heavy (LSM/wide-column)?
4. **Query patterns**: key se lookup, range scans, full-text search, aggregations, multi-hop relations?
5. **Scale**: GBs ya PBs? Kitne QPS?
6. **Latency**: microseconds (in-memory) ya milliseconds chalega?
7. **Team expertise aur operations**: managed service (RDS, DynamoDB) ya self-hosted?

## Quick decision guide

| Requirement | Achha choice |
|---|---|
| Transactions, relations, reporting | PostgreSQL / MySQL |
| Global scale + SQL + strong consistency | Spanner, CockroachDB, YugabyteDB |
| Cache, sessions, counters, leaderboards | Redis |
| Simple key-value at huge scale, managed | DynamoDB |
| Huge write volume, time-ordered (chats, logs, IoT) | Cassandra / ScyllaDB / HBase |
| Flexible documents (catalog, CMS) | MongoDB |
| Full-text search, autocomplete, log search | Elasticsearch / OpenSearch |
| Relationships, recommendations, fraud | Neo4j / Neptune |
| Metrics, monitoring | Prometheus, InfluxDB, TimescaleDB |
| Files, images, videos, backups | Object storage (S3, GCS) + CDN |
| Analytics on huge data (OLAP) | BigQuery, Snowflake, Redshift, ClickHouse |

## OLTP vs OLAP

- **OLTP (Online Transaction Processing)**: chhote, fast, bahut saare transactions (order place karna). Row-oriented DB (Postgres, MySQL).
- **OLAP (Online Analytical Processing)**: bade, complex analytical queries ("pichhle saal har state ki sales"). **Column-oriented** DB/data warehouse (BigQuery, Redshift, ClickHouse). Ek column ka saara data saath store hota hai, isliye aggregations bahut fast.

> [!example] E-commerce ka polyglot setup
> Orders aur payments: PostgreSQL. Product catalog: MongoDB. Search: Elasticsearch. Cart aur sessions: Redis. Product images: S3 + CDN. Recommendations: graph/ML store. Analytics: data warehouse. Ye sab events (Kafka) ke through sync rehte hain.

> [!warn] Overkill se bacho
> Interview me har cheez ke liye alag database mat lagao. Har naya database = naya operational bojh. Default se shuru karo (achha relational DB + cache), aur specific requirement par specialized store add karo, reason ke saath.

:::interview
Q: URL shortener ke liye kaunsa database?
A: Data simple key-value hai (short_code -> long_url), relations nahi, reads bahut zyada (100:1), scale billions of rows. Isliye key-value/NoSQL jaise DynamoDB ya Cassandra achhe hain, aage Redis cache. Agar scale moderate hai to sharded MySQL/Postgres bhi bilkul theek hai. Important: short_code par primary key lookup fast hona chahiye.
Q: OLTP aur OLAP me farak?
A: OLTP: bahut saare chhote read/write transactions, low latency, row-oriented storage, normalized data (orders, payments). OLAP: kam par bhaari analytical queries jo crores rows scan/aggregate karti hain, column-oriented storage aur compression, denormalized star schema (data warehouse). Production DB par heavy analytics mat chalao, data ko ETL/CDC se warehouse me bhejo.
Q: Polyglot persistence kya hai, iska risk?
A: Alag-alag kaam ke liye alag databases use karna (Postgres orders, Redis cache, Elasticsearch search). Fayda: har kaam ke liye best tool. Risk: data sync (dual writes inconsistent ho sakte hain, isliye CDC/outbox pattern), operational complexity, aur team ko kai systems seekhne padte hain.
:::

@quiz
Q: Bank ke money transfer ke liye kaunsa database property sabse zaroori hai?
- Eventual consistency
+ ACID transactions
- Flexible schema
- Full-text search
E: Paisa transfer me atomicity aur consistency zaroori hai: debit aur credit dono ya koi nahi.

Q: Do users ek saath last seat book karte hain aur dono ko mil jaati hai. Ye kaunsi problem hai?
- Dirty read
+ Lost update / race condition
- Phantom read
- Replication lag
E: Dono ne "1 seat bachi" padha aur dono ne update kiya. Isse locking (SELECT FOR UPDATE) ya optimistic versioning se rokte hain.

Q: Chat messages (bahut zyada writes, chat_id + time se padhna) ke liye best fit?
- Graph database
+ Wide-column store (Cassandra)
- Spreadsheet
- Single MySQL server
E: Wide-column stores high write throughput aur partition key + clustering key (time) ke hisaab se sorted reads ke liye bane hain.

Q: Composite index (user_id, created_at) kis query me kaam NAHI aayega (efficiently)?
- WHERE user_id = 5
- WHERE user_id = 5 AND created_at > X
+ WHERE created_at > X
- WHERE user_id = 5 ORDER BY created_at
E: Leftmost prefix rule: index pehle user_id se sorted hai, isliye sirf created_at par filter efficiently use nahi kar sakta.

Q: Async replication ka sabse bada risk?
- Writes slow ho jaate hain
+ Leader crash par recent writes lost ho sakti hain
- Reads band ho jaati hain
- Data double ho jaata hai
E: Leader ne OK bol diya par followers tak data pahuncha nahi, aur leader gir gaya to woh writes kho jaati hain.

Q: Quorum me N=3. Kaunsa setting strong-ish reads guarantee karega?
- W=1, R=1
+ W=2, R=2
- W=1, R=2
- W=0, R=3
E: W + R > N (2+2 > 3) hone par read aur write sets overlap karte hain, to read me latest copy milti hai.

Q: hash(key) % N me ek server add karne par kya hota hai?
- Koi key move nahi hoti
- Sirf naye server ki keys move hoti hain
+ Lagbhag saari keys ka server badal jaata hai
- Database delete ho jaata hai
E: N badalte hi modulo result badal jaata hai, isliye zyada tar keys move hoti hain. Consistent hashing ise ~K/N tak le aata hai.

Q: Virtual nodes kya improve karte hain?
- Encryption
+ Load distribution aur failure ke time load spreading
- SQL joins
- Network bandwidth
E: Har physical node ke kai ring positions hone se load barabar bantta hai aur ek node gire to uska load kai nodes me bantta hai.

Q: Network partition ke time bank balance system ko kya choose karna chahiye?
+ CP: galat data dene se behtar error
- AP: purana balance dikhado
- Dono chhod do
- CA
E: Financial data me galat/stale balance se double spend ho sakta hai. Thodi der unavailable rehna behtar hai.

Q: Kaunsi shard key sabse kharab hai social media posts ke liye?
- post_id (hashed)
- user_id
+ country (sirf ~200 values, India par bhaari load)
- (user_id, post_id)
E: Low cardinality aur uneven distribution: kuch countries ka traffic bahut zyada, unke shards hotspot ban jayenge.

Q: "Pichhle saal har state ki total sales" jaisi query ke liye kaunsa system best?
- OLTP row-store production DB
+ Column-oriented data warehouse (OLAP)
- Redis
- Graph DB
E: Analytical aggregations column-oriented OLAP systems me bahut fast hoti hain aur production DB par load nahi padta.
