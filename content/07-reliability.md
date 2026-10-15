@module reliability
@title Reliability aur Distributed Systems
@level Advanced
@desc Availability, SLA, rate limiting, circuit breaker, retries, idempotency, consensus (Raft), clocks aur disaster recovery.

@lesson availability
@title Availability, SLA/SLO aur Redundancy

**Availability** = system kitne time kaam kar raha hai. Percent me "nines" se naapte hain.

| Availability | Saal me downtime | Mahine me downtime |
|---|---|---|
| 99% (two nines) | ~3.65 din | ~7.3 ghante |
| 99.9% (three nines) | ~8.77 ghante | ~43.8 minute |
| 99.99% (four nines) | ~52.6 minute | ~4.4 minute |
| 99.999% (five nines) | ~5.26 minute | ~26 second |

Har extra "9" bahut mehenga hai: redundancy, multi-region, automation, on-call teams.

## SLI, SLO, SLA

- **SLI (Service Level Indicator)**: jo naap rahe ho. "Successful requests ka %", "p99 latency".
- **SLO (Service Level Objective)**: internal target. "99.9% requests successful, p99 < 300 ms, 30 din me."
- **SLA (Service Level Agreement)**: customer ke saath legal vaada, toota to paise wapas (credits). SLA aam taur par SLO se dheela hota hai.
- **Error budget**: 99.9% SLO = 0.1% failure allowed. Budget bacha hai to naye features tezi se ship karo; khatam ho gaya to reliability par focus.

## Availability ka hisaab: series vs parallel

**Series (sab zaroori)**: A -> B -> C. Total = A × B × C. Teen 99.9% components = 99.7%. Zyada dependencies = kam availability.

**Parallel (koi ek chahiye)**: do redundant 99.9% servers. Total = 1 − (0.001 × 0.001) = 99.9999%. Redundancy availability badhati hai.

> [!key] Isliye
> Critical path par dependencies kam rakho, aur har important component ki **redundant copies** rakho.

## Single Point of Failure (SPOF)

Woh component jiske girne se poora system gire. SPOF dhoondo aur hatao: ek LB, ek DB, ek region, ek DNS provider, ek engineer jise hi deploy aata hai!

## Redundancy aur Failover

- **Active-passive**: ek kaam karta hai, doosra standby. Primary gira to standby le leta hai (failover me kuch second/minute).
  - *Hot standby*: data sync, turant ready. *Warm*: chalu par thoda peeche. *Cold*: band, start karna padega.
- **Active-active**: sab kaam karte hain, load baant-te hain. Ek gira to baaki sambhal lete hain. Better utilization, par data sync aur conflicts complex.

## Availability Zones aur Regions

- **Availability Zone (AZ)**: ek region ke andar alag data center (alag power, network). Ek AZ gira to doosre AZ chalte rahein.
- **Region**: alag geographical area (Mumbai, Singapore). Region-level disasters ke liye multi-region.

> [!tip] Common practice
> App servers aur DB replicas ko kam se kam **3 AZs** me failao. Multi-region tab jab SLA bahut sakht ho ya users globally hon.

## Graceful degradation

Sab kuch ek saath perfect na chale tab bhi core kaam chale. Recommendation service down? Home page "popular items" dikha de. Reviews service down? Product page bina reviews ke khule. **Partial functionality > complete outage.**

:::interview
Q: 99.99% availability ka matlab kya hai aur use achieve kaise karenge?
A: Saal me ~52 minute downtime allowed. Achieve karne ke liye: har tier par redundancy (multiple instances across AZs), load balancers with health checks, DB replication with automatic failover, SPOFs hatana, multi-AZ (ya multi-region) deployment, graceful degradation, safe deploys (canary, rollback), aur strong monitoring/alerting with on-call.
Q: SLI, SLO, SLA me farak?
A: SLI measure kiya jaane wala metric (success rate, latency). SLO us metric ka internal target (99.9% success over 30 days). SLA customer ke saath contract jisme target miss hone par penalty/credits. SLO ko SLA se sakht rakhte hain taaki buffer rahe.
Q: Teen services series me hain, har ek 99.9% available. Total availability?
A: 0.999 × 0.999 × 0.999 ≈ 0.997, yaani ~99.7%. Isliye critical path par dependencies kam rakhni chahiye aur non-critical calls ko async ya optional (graceful degradation) banana chahiye.
:::

@lesson rate-limiting
@title Rate Limiting

**Rate limiting** = ek client ko ek time window me kitni requests allow hain, uski limit. Limit cross to `429 Too Many Requests`.

**Kyun?**
- **Abuse/DDoS se bachav**: bots, brute-force login attempts.
- **Fair usage**: ek client sab resources na kha jaye.
- **Cost control**: paid APIs (SMS, LLM) ka bill.
- **Downstream protection**: database ya third-party API overload na ho.

[[anim:rate-limiter]]

## Algorithms

### 1. Token Bucket
Bucket me max N tokens, fixed rate se refill. Har request ek token leti hai. Token nahi to reject.
- **Burst allow** karta hai (bucket bhara ho to N requests ek saath).
- Memory kam (sirf token count + last refill time). **Sabse popular** (AWS, Stripe).

### 2. Leaky Bucket
Requests ek queue me, aur **fixed rate** se process hoti hain. Queue full to drop.
- Output **smooth/constant**, bursts ko smooth kar deta hai.
- Burst me requests ko wait karna padta hai.

### 3. Fixed Window Counter
Har window (jaise har minute) ka counter. Limit cross to reject; window badli to reset.
- Simple aur sasta.
- **Boundary problem**: 12:00:59 par 100 aur 12:01:00 par 100 = 1 second me 200 requests.

### 4. Sliding Window Log
Har request ka timestamp store karo; pichhle 60 second ke timestamps gino.
- Bilkul accurate.
- Memory zyada (har request ka timestamp).

### 5. Sliding Window Counter
Current aur pichhli window ke counts ka weighted average: `count = curr + prev × (overlap %)`.
- Accurate-ish aur memory kam. Achha balance.

| Algorithm | Burst | Memory | Accuracy |
|---|---|---|---|
| Token bucket | Allow (controlled) | Kam | Achhi |
| Leaky bucket | Smooth kar deta | Kam | Achhi |
| Fixed window | Boundary par double | Sabse kam | Kam |
| Sliding log | Nahi | Zyada | Sabse achhi |
| Sliding counter | Thoda | Kam | Achhi |

## Distributed rate limiter

Kai API servers hain, to counter **shared** hona chahiye (Redis):

```lua
-- Redis Lua script (atomic): fixed window
local c = redis.call('INCR', KEYS[1])
if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
if c > tonumber(ARGV[2]) then return 0 end
return 1
```

- **Atomicity**: read-check-write ek saath (Lua script ya `INCR`), warna race condition.
- **Key**: `rate:{user_id}:{window}` ya IP ya API key.
- **Response headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`.
- Redis down ho to? **Fail open** (allow karo, availability) ya **fail closed** (block, safety). Use-case ke hisaab se.

> [!tip] Kahan lagayein
> API gateway / load balancer par (sabse pehle, sasta), aur zaroorat ho to service ke andar specific operations par (jaise OTP send: 3 per 10 minute per phone).

:::interview
Q: Distributed rate limiter design kijiye.
A: Rate limiter API gateway ya middleware me. Algorithm: token bucket ya sliding window counter. State shared Redis me per key (user_id/API key/IP); check-and-update atomic Lua script se. Rules config service se (per plan limits). Limit cross par 429 + Retry-After. Redis cluster for scale, local in-memory cache for very hot keys (thoda inaccuracy accept), Redis failure par fail-open/closed policy. Monitoring: rejected requests ka dashboard.
Q: Token bucket aur leaky bucket me farak?
A: Token bucket bursts allow karta hai (jitne tokens jama hain utni requests turant), average rate refill rate se control. Leaky bucket requests ko queue karke fixed rate par nikaalta hai, isliye output smooth par bursts delay hote hain. API rate limits me token bucket common, traffic shaping me leaky bucket.
Q: Fixed window counter ki problem kya hai?
A: Window boundary par burst: limit 100/min ho to 12:00:59 par 100 aur 12:01:00 par 100, yaani 2 second me 200 requests allow. Sliding window log ya sliding window counter isko theek karte hain.
:::

@lesson resilience-patterns
@title Circuit Breaker, Retries, Timeouts, Bulkhead

Distributed system me kuch na kuch hamesha fail hota hai. Sawaal ye nahi ki failure aayega ya nahi, sawaal ye hai ki failure **phailega** ya **ruk jayega**.

## Timeouts

Har network call par **timeout** zaroori hai. Bina timeout ke ek slow service aapke saare threads/connections pakad ke baith jayegi aur aap bhi gir jaoge.

- Timeout = upstream ke p99 se thoda zyada.
- Chain me: bahar ki request ka timeout andar wali calls ke total se zyada (deadline propagation).

## Retries with exponential backoff aur jitter

Temporary failure (network blip, 503) par dobara try karna samajhdaari hai. Par **turant aur baar-baar** retry karna khatarnak: pehle se pareshaan service par aur load (**retry storm**).

- **Exponential backoff**: 100 ms, 200 ms, 400 ms, 800 ms...
- **Jitter**: har wait me random hissa, taaki hazaar clients ek saath retry na karein.
- **Max retries** (jaise 3) aur sirf **retryable errors** par (timeout, 503, 429), 400/404 par nahi.
- Sirf **idempotent** operations retry karo (ya idempotency key ke saath).

```python
for attempt in range(4):
    try:
        return call_payment_service(req, timeout=2.0)
    except (Timeout, ServiceUnavailable):
        sleep(min(2 ** attempt * 0.1, 2.0) * random.uniform(0.5, 1.5))
raise PaymentUnavailable()
```

> [!warn] Retry amplification
> Agar 4 layers hain aur har layer 3 retry karti hai, to neeche wali service par 3^4 = 81 guna load! Retries ek hi layer par (aksar sabse bahar ya client par) rakho, ya retry budget use karo.

## Circuit Breaker

Ghar ki bijli ke MCB jaisa: zyada fault hua to circuit "trip" ho jaata hai taaki aur nuksaan na ho.

[[anim:circuit-breaker]]

- **CLOSED**: normal, requests jaati hain, failures gine jaate hain.
- **OPEN**: failure threshold cross (jaise 50% errors ya 5 lagataar failures) -> requests **turant fail** (fallback), downstream ko saans lene ka time.
- **HALF-OPEN**: cooldown ke baad kuch trial requests. Pass to CLOSED, fail to wapas OPEN.

**Fayda**: fail fast (threads waste nahi), downstream ko recover hone ka mauka, cascading failure rukta hai.
Libraries: Resilience4j (Java), Polly (.NET), Hystrix (purana), service mesh (Istio/Envoy) me built-in.

## Fallbacks

Failure par kuch sensible do: cached data, default value, "recommendations abhi available nahi", ya queue me daal ke baad me process.

## Bulkhead pattern

Jahaaz ke alag-alag compartments jaisa: ek me paani bhara to poora jahaaz nahi doobta. Har downstream dependency ke liye **alag thread pool / connection pool** rakho. Slow recommendation service sirf apne 10 threads le, checkout ke threads safe rahein.

## Load shedding

Overload ke time kam important requests ko jaan-boojh kar reject karo (pehle analytics, phir browse, checkout last tak bachao). Thoda reject karna poora girne se behtar.

| Pattern | Kis problem ke liye |
|---|---|
| Timeout | Slow dependency resources na pakde |
| Retry + backoff + jitter | Temporary failures |
| Circuit breaker | Lagataar failing dependency, cascading failure |
| Fallback | User ko kuch useful dena |
| Bulkhead | Ek dependency ki problem doosron tak na phaile |
| Load shedding | Overload me core features bachana |

:::interview
Q: Circuit breaker kaise kaam karta hai?
A: Ye downstream calls ko wrap karta hai aur failures track karta hai. CLOSED state me calls normal; failure rate threshold cross ho to OPEN: calls turant fail/fallback bina downstream ko hit kiye. Cooldown ke baad HALF-OPEN: limited trial calls; success par CLOSED, failure par OPEN. Isse cascading failures rukte hain aur failing service ko recover hone ka time milta hai.
Q: Retries me exponential backoff aur jitter kyun?
A: Exponential backoff har retry ke beech wait badhata hai taaki struggling service par load kam ho. Jitter randomness add karta hai taaki bahut saare clients synchronized waves me retry na karein (thundering herd). Saath me max attempts, sirf retryable errors aur idempotent operations par retry.
Q: Cascading failure kya hai aur kaise rokenge?
A: Ek service slow/down hone se uske callers ke threads/connections atak jaate hain, woh bhi slow ho jaate hain, aur failure upar tak phail jaata hai. Rokne ke liye: har call par timeouts, circuit breakers, bulkheads (alag pools), limited retries with backoff, load shedding, aur non-critical dependencies ke liye fallbacks/async.
:::

@lesson idempotency
@title Idempotency aur Delivery Guarantees

Aapne Swiggy par "Pay" dabaya, network atak gaya, phir dabaya. **Do baar paisa nahi katna chahiye.** Ye guarantee **idempotency** deti hai.

**Idempotent operation**: ek baar karo ya das baar, **result same**.

| Operation | Idempotent? |
|---|---|
| `SET status = 'PAID'` | Haan |
| `balance = balance - 100` | Nahi |
| `DELETE FROM carts WHERE id = 7` | Haan |
| `INSERT INTO orders ...` (bina unique key) | Nahi |
| `UPSERT user (id=42, name='Ravi')` | Haan |

## Kyun zaroori hai?

Distributed systems me **retries normal hain**: client timeout par retry, message queue at-least-once delivery, webhook providers retry karte hain. Agar operation idempotent nahi to duplicate orders, double charges, double emails.

## Idempotency kaise banayein

### 1. Idempotency key
Client har logical operation ke liye unique key (UUID) bhejta hai.

```http
POST /payments
Idempotency-Key: 3f6c1a2e-8b44-4d0e-9a1f-77c2c0b9d1aa
{ "order_id": 981, "amount": 49900 }
```

Server:
1. Key pehle dekhi hai? Haan -> purana saved response lauta do (dobara charge mat karo).
2. Nahi -> key ko "in-progress" mark karo (unique constraint ke saath), kaam karo, result key ke saath save karo.
3. Keys ko TTL (jaise 24 ghante) ke baad hata sakte ho.

### 2. Natural unique constraints
`UNIQUE(order_id)` payments table me. Duplicate insert DB khud rok dega.

### 3. Conditional / state-based updates
`UPDATE orders SET status='PAID' WHERE id=981 AND status='PENDING'`. Doosri baar 0 rows update hongi.

### 4. Deduplication table (consumers ke liye)
Message consumer `processed_message_ids` table me ID check kare; mila to skip.

## Delivery guarantees (recap)

- **At-most-once**: bhejo aur bhool jao. Loss possible, duplicate nahi.
- **At-least-once**: ACK tak retry. Loss nahi, **duplicate possible**.
- **Exactly-once**: na loss na duplicate. Network level par practically impossible.

> [!key] Golden rule
> **At-least-once delivery + idempotent processing = effectively exactly-once.** Ye industry ka standard formula hai. Kafka ka "exactly-once" bhi andar se idempotent producers aur transactions hi hai.

> [!example] UPI ka example
> UPI har transaction ko ek unique transaction ID deta hai. Bank ka server same ID dobara aaye to dobara debit nahi karta, sirf status lautata hai. Isliye "payment pending" ke baad dobara try karne par bhi double debit (aam taur par) nahi hota, aur atke hue paise reconciliation se wapas aate hain.

:::interview
Q: Payment API ko idempotent kaise banayenge?
A: Client har payment attempt ke liye Idempotency-Key bhejta hai. Server ek table me key ko unique constraint ke saath "processing" state me insert karta hai (doosra concurrent request yahin fail/wait karega), payment process karta hai, phir response key ke saath store karta hai. Same key dobara aane par stored response return. Iske alawa order_id par unique payment constraint aur status-based conditional updates.
Q: At-least-once aur exactly-once delivery me kya farak hai, aur exactly-once kaise achieve karte hain?
A: At-least-once me message kabhi lost nahi hota par duplicates aa sakte hain. Exactly-once me na loss na duplicate. Network failures ki wajah se pure exactly-once delivery mushkil hai, isliye at-least-once delivery ke saath idempotent consumers (dedup IDs, upserts, conditional writes) se effectively exactly-once processing achieve karte hain. Kafka transactions read-process-write ko Kafka ke andar atomic banate hain.
Q: Kya GET hamesha safe aur idempotent hai?
A: HTTP semantics ke hisaab se GET safe (state change nahi) aur idempotent hona chahiye. Agar koi GET side effects karta hai (counter badhana, email bhejna) to woh design galti hai, kyunki browsers, crawlers aur proxies GET ko freely retry/prefetch karte hain.
:::

@lesson consensus
@title Consensus aur Leader Election (Raft)

Distributed system me kai nodes ko kisi baat par **ek mat** hona padta hai: "Leader kaun hai?", "Ye config value kya hai?", "Ye log entry commit hui ya nahi?" Network delay, crashes aur partitions ke beech ye sahmati banana **consensus** problem hai.

## Leader election kyun?

Bahut systems me ek leader chahiye: DB primary, Kafka partition leader, scheduler jo cron job sirf ek baar chalaye. Do leaders ho gaye (**split brain**) to data corrupt.

## Raft (samajhne me aasaan consensus algorithm)

[[anim:raft]]

1. Har node teen me se ek role me: **Follower**, **Candidate**, **Leader**.
2. Leader har thodi der me **heartbeat** bhejta hai.
3. Follower ko **election timeout** (random, jaise 150–300 ms) tak heartbeat na mile to woh **candidate** banta hai, apna **term** number badhata hai aur sabse vote maangta hai.
4. Har node ek term me **ek hi vote** deta hai. **Majority (quorum)** mili to naya leader.
5. Random timeouts ki wajah se aksar ek hi candidate pehle uthta hai, split votes kam.
6. **Log replication**: client ke writes leader ke log me jaate hain, leader followers ko bhejta hai, **majority** ne save kar liya to entry **committed**.

> [!key] Majority kyun?
> 5 nodes me majority = 3. Do alag groups dono ek saath majority nahi bana sakte (3 + 3 > 5). Isliye ek time par ek term me ek hi leader. Isi wajah se clusters **odd number** (3, 5, 7) ke rakhe jaate hain. 5 nodes 2 failures jhel sakte hain.

## Paxos

Raft se pehle ka, mathematically famous par samajhne me mushkil. Google Chubby, Spanner isi family par. Concept same: proposals, majority acceptance.

## Kahan use hota hai

- **etcd** (Raft): Kubernetes ka saara state.
- **ZooKeeper** (ZAB protocol): Kafka (purane versions) ka metadata, distributed locks, config.
- **Consul** (Raft): service discovery.
- **Kafka KRaft**, **CockroachDB**, **TiDB**: Raft-based replication.

## Distributed lock

Kai servers me se sirf ek ko koi kaam karne do (jaise "invoice generate karo").

- **Redis**: `SET lock:invoice-981 <owner> NX PX 30000` (exists na ho to set, 30s expiry). Release tabhi jab owner same ho (Lua script).
- **ZooKeeper/etcd**: ephemeral nodes / leases, zyada safe.

> [!warn] Lock ke saath fencing token
> Process A ne lock liya, phir lambi GC pause me atak gaya, lock expire hua, B ne lock le liya. A jaag ke ab bhi likh raha hai! Ilaaj: har lock ke saath badhta hua **fencing token** (number). Storage purane token wale writes reject kare.

:::interview
Q: Raft leader election kaise kaam karta hai?
A: Nodes follower state me start hote hain. Leader periodic heartbeats bhejta hai. Agar follower ko election timeout (randomized) tak heartbeat nahi milta to woh term badhakar candidate banta hai aur RequestVote bhejta hai. Har node ek term me ek vote deta hai (aur sirf up-to-date log wale candidate ko). Majority votes milne par candidate leader ban jaata hai aur heartbeats bhejne lagta hai. Randomized timeouts split votes ko kam karte hain.
Q: Consensus clusters me odd number of nodes kyun rakhte hain?
A: Quorum majority par chalta hai. 3 nodes 1 failure, 5 nodes 2 failures tolerate karte hain. 4 nodes bhi sirf 1 failure tolerate karte hain (majority 3), to even number extra cost deta hai par fault tolerance nahi badhata. Odd number se split-brain impossible aur cost-efficient.
Q: Split brain kya hai aur kaise rokenge?
A: Network partition ke baad do nodes khud ko leader samajh ke writes accept karne lagein, jisse data diverge/corrupt ho. Rokne ke liye: majority quorum (minority side leader nahi chun sakti), leases with expiry, fencing tokens (storage purane leader ke writes reject kare), aur STONITH (purane node ko forcefully band karna).
Q: Distributed lock Redis se kaise banayenge aur risk kya hai?
A: `SET key owner NX PX ttl` se acquire, release Lua script se (sirf owner delete kare). Risks: lock holder GC pause/network delay me TTL ke baad bhi kaam karta reh sakta hai, Redis failover me lock lost ho sakta hai. Correctness critical ho to fencing tokens aur consensus-based store (etcd/ZooKeeper) use karo.
:::

@lesson distributed-basics
@title Distributed systems ke building blocks: Quorum, Gossip, Clocks

Kuch chhote concepts jo bade systems (Cassandra, DynamoDB, Kafka) me baar-baar aate hain.

## Heartbeats

Har node periodically "main zinda hoon" signal bhejta hai. N heartbeats miss = node dead maana jaata hai. Trade-off: chhota timeout = jaldi detection par galti se zinda node ko dead maanna (false positive); bada timeout = slow detection.

## Gossip protocol

Bade cluster (sainkdon nodes) me har node har node ko heartbeat bheje to messages N² ho jaate hain. **Gossip**: har node har second **kuch random nodes** ko apni jaankari bata deta hai, woh aage kuch aur ko. Rumour ki tarah, kuch rounds me poore cluster ko pata chal jaata hai.

- Scalable, decentralized, fault tolerant.
- Use: Cassandra membership aur failure detection, Consul, DynamoDB.

## Quorum (recap)

N replicas, W write acks, R read responses. **W + R > N** to read me latest value guaranteed. Saath me:
- **Read repair**: read ke time stale replica mila to use update kar do.
- **Hinted handoff**: replica down hai to doosra node uske liye write "hint" rakh leta hai, wapas aane par de deta hai.
- **Anti-entropy with Merkle trees**: replicas apne data ka hash tree compare karke sirf alag hisse sync karte hain.

## Time aur clocks: distributed systems ki sabse ajeeb problem

Har machine ki ghadi thodi alag chalti hai (**clock skew**). NTP sync karta hai par milliseconds ka farak rehta hai. Isliye "kaunsa event pehle hua" timestamps se reliably nahi bata sakte.

### Lamport clock
Har node ek counter rakhta hai. Har event par +1. Message bhejte waqt counter saath bhejo; receive karne par `max(apna, aaya) + 1`. Isse **causal order** ka ek consistent order milta hai (agar A ne B ko cause kiya to `L(A) < L(B)`).

### Vector clock
Har node ke liye ek counter ka vector `[A:2, B:1, C:0]`. Isse pata chalta hai ki do events **causally related** hain ya **concurrent** (conflict). DynamoDB (original), Riak conflicts detect karne ke liye use karte the.

### Hybrid / TrueTime
Google Spanner **TrueTime** API (GPS + atomic clocks) se time ka uncertainty interval deta hai aur commit ke time thoda wait karke global ordering guarantee karta hai.

> [!warn] Last-Write-Wins ka khatra
> Conflict me "jiska timestamp bada woh jeeta" (LWW) simple hai, par clock skew ki wajah se asal me baad wala write haar sakta hai aur data chupchaap lost ho sakta hai.

## Unique IDs

Distributed system me auto-increment nahi chalta. Options (Module 8 me detail): UUID, Snowflake IDs (timestamp + machine id + sequence).

## Fallacies of distributed computing

Naye engineers ye maan lete hain (sab galat hai):
1. Network reliable hai.
2. Latency zero hai.
3. Bandwidth infinite hai.
4. Network secure hai.
5. Topology badalti nahi.
6. Ek hi administrator hai.
7. Transport cost zero hai.
8. Network homogeneous hai.

:::interview
Q: Gossip protocol kya hai aur kahan use hota hai?
A: Peer-to-peer information spreading: har node periodically kuch random peers ke saath apna state (membership, heartbeats) exchange karta hai, aur info exponentially poore cluster me phail jaati hai. Scalable (har node ka constant kaam), decentralized aur failure-tolerant. Cassandra, Consul, Redis Cluster jaise systems membership/failure detection ke liye use karte hain.
Q: Distributed systems me physical timestamps par bharosa kyun nahi kar sakte?
A: Clocks drift karte hain aur NTP sync ke baad bhi skew rehta hai (ms ya zyada), clocks peeche bhi ja sakte hain. Isliye do machines ke events ka sahi order timestamps se tay nahi hota. Logical clocks (Lamport, vector), hybrid logical clocks ya TrueTime jaise bounded-uncertainty clocks use karte hain.
Q: Vector clock Lamport clock se zyada kya batata hai?
A: Lamport clock sirf ek consistent total order deta hai (causality ka zaroori par sufficient nahi). Vector clock se pata chal sakta hai ki do events me se ek ne doosre ko cause kiya ya woh concurrent hain, jo conflict detection (multi-leader/leaderless replication) ke liye zaroori hai.
:::

@lesson disaster-recovery
@title Disaster Recovery aur Multi-region

Data center me aag, region-wide outage, galti se production DB delete, ransomware. **Disaster Recovery (DR)** plan batata hai ki aise me system kaise wapas aayega.

## Do important numbers

- **RPO (Recovery Point Objective)**: kitna data loss chalega? "RPO 5 minute" = disaster ke time ke pichhle 5 minute tak ka data kho sakte hain. Backup/replication frequency isse tay hoti hai.
- **RTO (Recovery Time Objective)**: system kitni der me wapas chalu ho? "RTO 1 ghanta".

> [!analogy] Phone kho gaya
> Phone kho gaya. Pichhla backup kal raat ka tha, to aaj ki photos gayi: woh RPO hai. Naya phone lekar sab restore karne me 3 ghante lage: woh RTO hai.

## DR strategies (sasta se mehenga)

| Strategy | Kaise | RTO | RPO | Cost |
|---|---|---|---|---|
| Backup & restore | Regular backups doosre region me; disaster par naya infra banao aur restore | Ghante–din | Ghante | Sabse kam |
| Pilot light | Doosre region me sirf core (DB replica) chalu; baaki disaster par start | 10 minute – ghante | Minutes | Kam |
| Warm standby | Doosre region me chhota poora system chalu, disaster par scale up | Minutes | Seconds–minutes | Medium |
| Multi-site active-active | Dono regions full traffic lete hain | Near zero | Near zero | Sabse zyada |

## Backups ke rules

- **3-2-1 rule**: 3 copies, 2 alag media/storage types, 1 offsite (alag region).
- **Restore test karo**: jo backup kabhi restore test nahi hua, woh backup nahi, umeed hai.
- **Point-in-time recovery (PITR)**: full backup + transaction logs se kisi bhi second par wapas.
- **Immutable backups**: ransomware/galat delete se bachav.

## Multi-region architecture ke challenges

- **Data replication across regions**: latency (Mumbai–Virginia ~200 ms). Sync replication slow, async me data loss risk.
- **Conflicts**: active-active me dono regions same data likhein.
- **Routing**: GeoDNS/Anycast se user ko nazdeeki healthy region.
- **Data residency laws**: kuch data (jaise Indian payment data, RBI guidelines) desh ke bahar store nahi ho sakta.
- **Cost**: sab kuch double.

> [!pro] Chaos engineering
> Netflix ka **Chaos Monkey** production me jaan-boojh kar random servers band karta hai, taaki team ko pata ho ki system sach me failures jhel leta hai. "GameDays" me teams region failover practice karti hain. Jo failover kabhi practice nahi hua, woh zaroorat ke time kaam nahi karega.

:::interview
Q: RPO aur RTO me farak?
A: RPO: maximum acceptable data loss, time me (last recoverable point kitna purana). RTO: maximum acceptable downtime, yaani recover hone me kitna time. Low RPO ke liye frequent backups/continuous replication, low RTO ke liye standby infrastructure aur automated failover chahiye; dono ko kam karna cost badhata hai.
Q: Ek critical payment system ke liye DR plan kya hoga?
A: Multi-AZ primary with synchronous/semi-sync replicas (RPO ~0 within region), doosre region me warm standby with async replication aur regular PITR backups, automated health-based failover with runbooks, idempotent processing taaki failover par retries safe hon, reconciliation jobs, aur regular DR drills. Data residency compliance (India me data) bhi dhyan me.
Q: Active-active multi-region ke challenges?
A: Cross-region write conflicts (conflict resolution, ya har user ka "home region"), replication latency aur eventual consistency, globally unique IDs, routing aur failover, cache aur session consistency, data residency, aur double infrastructure cost.
:::

@quiz
Q: 99.99% availability me saal me lagbhag kitna downtime allowed hai?
- 8.7 ghante
+ 52 minute
- 5 minute
- 3.6 din
E: 0.01% of 365 din ≈ 52.6 minute. Five nines (99.999%) me ~5 minute.

Q: Do redundant servers parallel me, har ek 99% available. Combined availability?
- 98%
- 99%
+ 99.99%
- 100%
E: Dono ek saath down hone ki probability 0.01 × 0.01 = 0.0001, isliye availability 99.99%.

Q: Kaunsa rate limiting algorithm controlled bursts allow karta hai aur sabse popular hai?
+ Token bucket
- Fixed window
- Sliding window log
- Round robin
E: Token bucket me jama tokens tak burst allowed hai aur average rate refill se control hota hai.

Q: Fixed window counter ki khaas problem?
- Bahut memory leta hai
+ Window boundary par double burst ho sakta hai
- Distributed nahi ho sakta
- Bursts bilkul allow nahi
E: 12:00:59 aur 12:01:00 par alag windows hone se 2 second me limit ka double nikal sakta hai.

Q: Circuit breaker OPEN state me kya karta hai?
- Requests ko double speed se bhejta hai
+ Requests ko turant fail/fallback karta hai, downstream ko call nahi karta
- Server restart karta hai
- Cache clear karta hai
E: OPEN state me fail-fast hota hai taaki failing service ko recover hone ka time mile aur caller ke resources bachein.

Q: Retries me jitter kyun add karte hain?
- Retries fast karne ke liye
+ Taaki saare clients ek saath synchronized retry na karein
- Security ke liye
- Logging ke liye
E: Randomness se retries time me phail jaati hain, thundering herd/retry storm nahi banta.

Q: Kaunsa operation idempotent hai?
- balance = balance - 100
- INSERT bina unique key
+ UPDATE orders SET status='PAID' WHERE id=9
- counter++
E: Status ko fixed value par set karna kitni baar bhi karo, result same rehta hai.

Q: 5-node Raft cluster kitne node failures tolerate kar sakta hai?
- 1
+ 2
- 3
- 4
E: Majority (3) zinda rehni chahiye, isliye 2 failures tak chalega.

Q: RPO kya batata hai?
- System kitni der me wapas aayega
+ Kitna data loss acceptable hai (time me)
- Kitne servers chahiye
- Response time
E: RPO = Recovery Point Objective: disaster ke baad kitne purane point tak ka data recover hona chahiye. RTO downtime batata hai.

Q: Split brain rokne ka sabse sahi tareeka?
- Dono leaders ko likhne do
+ Majority quorum aur fencing tokens
- Clocks sync karna
- Zyada RAM
E: Quorum ensure karta hai ki ek hi side leader chune; fencing tokens purane leader ke writes reject karwate hain.
