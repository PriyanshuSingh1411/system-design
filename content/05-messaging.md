@module messaging
@title Communication aur Messaging
@level Intermediate
@desc Sync vs async, message queues, Kafka, pub/sub, WebSockets, SSE, polling aur webhooks.

@lesson sync-async
@title Sync vs Async communication

Services aapas me do tareeke se baat karti hain.

## Synchronous (sync)

Caller request bhejta hai aur **jawab aane tak rukta** hai. HTTP/REST, gRPC calls.

> [!analogy] Phone call
> Aapne call kiya, saamne wala uthayega tabhi baat hogi. Woh busy hai to aap wait karte ho. Turant jawab milta hai, par dono ko ek saath free hona padta hai.

- **Fayde**: simple, turant result, debugging easy.
- **Nuksaan**: **tight coupling**: ek service slow/down to caller bhi atak jaata hai. Chain lambi ho (A -> B -> C -> D) to latency jud jaati hai aur ek ki failure sab gira deti hai (**cascading failure**).

## Asynchronous (async)

Caller message **bhej ke aage badh jaata hai**. Message ek **queue/broker** me rakha jaata hai aur receiver apni speed se process karta hai.

> [!analogy] WhatsApp message / courier
> Aapne message bhej diya aur apna kaam karne lage. Saamne wala jab free hoga tab padhega aur jawab dega. Dono ko ek saath free hone ki zaroorat nahi.

- **Fayde**: **loose coupling**, receiver down ho to bhi message safe (queue me), traffic spikes absorb (queue buffer), independent scaling.
- **Nuksaan**: complexity (broker chalana), **eventual consistency**, debugging mushkil, duplicate/out-of-order messages handle karne padte hain.

## Example: order place karna

[[arch Order place: sync aur async ka mix]]
client:User app
svc:Order Service ~ sync: payment confirm karna zaroori hai user ko batane se pehle
svc:Payment Service (sync call)
queue:Kafka topic: order-placed ~ async: in kaamon ke liye user ko rokne ki zaroorat nahi
svc:Email/SMS, svc:Inventory update, svc:Analytics, svc:Recommendation
[[/arch]]

User ko "Order placed" dikhane ke liye sirf order save aur payment zaroori hai. Email bhejna, analytics, recommendations update karna **background** me ho sakta hai. Isse response fast aur system resilient.

> [!key] Rule of thumb
> Jo kaam user ke **turant response ke liye zaroori** hai, woh sync. Baaki sab (notifications, reports, image processing, analytics) async queue me daalo.

:::interview
Q: Sync aur async communication me trade-offs?
A: Sync: simple, immediate response, strong consistency easy, par services tightly coupled hoti hain, latency chain me judti hai, aur ek service down hone se caller fail (cascading). Async: loose coupling, spikes buffer, failure isolation, independent scaling, par eventual consistency, broker ki operational complexity, duplicate/ordering issues, aur debugging/tracing mushkil.
Q: Image upload ke baad thumbnails generate karne ka flow kaise design karenge?
A: Upload service original image S3 me save karke turant user ko success de, aur ek message ("image uploaded: id, path") queue me daale. Thumbnail workers queue se message lekar alag sizes banaayein, S3 me save karein, DB update karein. Workers ko load ke hisaab se scale kar sakte hain; failure par retry aur dead letter queue.
:::

@lesson message-queues
@title Message Queues

**Message queue** ek beech ka buffer hai jahan **producer** messages daalta hai aur **consumer** nikaal kar process karta hai. Producer ko consumer ka wait nahi karna padta.

[[anim:queue]]

## Main concepts

- **Producer**: message bhejne wala (Order service).
- **Consumer**: message process karne wala (Email worker).
- **Broker**: queue chalane wala system (RabbitMQ, AWS SQS, Kafka).
- **Acknowledgement (ACK)**: consumer process karke batata hai "ho gaya, delete kar do". ACK na aaye (consumer crash) to message wapas queue me, kisi aur ko milega.
- **Visibility timeout** (SQS): message uthaya to itni der doosron ko nahi dikhega. Time par ACK nahi hua to phir dikhne lagega.

## Point-to-point vs Pub/Sub

- **Point-to-point (queue)**: har message **sirf ek consumer** ko. Kaam baantne ke liye (work queue). Example: 10 workers orders process kar rahe.
- **Pub/Sub (topic)**: har message **har subscriber** ko apni copy. Example: "order placed" event -> email, SMS, analytics sabko.

## Queue ke fayde

- **Decoupling**: producer ko consumer ke baare me pata nahi hona chahiye.
- **Load leveling / buffering**: Big Billion Day par 1 lakh orders/min aaye, workers apni speed (10K/min) se process karte rahenge, queue buffer kar legi.
- **Reliability**: consumer down hai to message safe.
- **Scalability**: backlog badha to consumers badhao (competing consumers).
- **Retries**: fail hue messages dobara try.

## Dead Letter Queue (DLQ)

Koi message baar-baar fail ho raha hai (jaise galat format), to use hamesha retry karte rehna queue ko jam kar dega (**poison message**). N retries ke baad use **DLQ** me daal do, aur alert bhejo. Engineers baad me dekh lenge.

## Delivery guarantees

| Guarantee | Matlab | Trade-off |
|---|---|---|
| At-most-once | Message ek baar ya kabhi nahi (loss possible) | Fast, simple. Metrics jaise data |
| At-least-once | Kabhi lost nahi, par duplicate ho sakta | Sabse common. Consumer ko **idempotent** banao |
| Exactly-once | Na loss na duplicate | Bahut mushkil/mehenga. Kafka transactions, ya idempotency se "effectively once" |

> [!key] Practical sach
> Distributed systems me true exactly-once delivery lagbhag impossible hai. Industry ka standard: **at-least-once delivery + idempotent consumers** = effectively exactly-once processing. (Module 7 me idempotency detail.)

## Ordering

Ek simple queue me multiple consumers hon to order guarantee nahi. Agar order zaroori hai (ek user ke events), to **partition/group key** use karo taaki ek user ke saare messages ek hi consumer ko order me milein (SQS FIFO message group, Kafka partition key).

## Backpressure

Agar producer hamesha consumer se tez hai, to queue anant tak badhti rahegi. Ilaaj: consumers scale karo, producer ko slow karo (rate limit), queue size limit, ya kam important messages drop karo.

## Popular message brokers

| Broker | Khaas baat |
|---|---|
| RabbitMQ | Traditional queue, flexible routing (exchanges), per-message ACK |
| AWS SQS | Fully managed, simple, standard (at-least-once) aur FIFO queues |
| Kafka | Distributed log, bahut high throughput, replay possible (agla lesson) |
| Redis Streams | Lightweight, Redis ke andar |
| Google Pub/Sub, AWS SNS | Managed pub/sub fan-out |

:::interview
Q: Message queue kyun use karte hain?
A: Services ko decouple karne, traffic spikes ko buffer karne (load leveling), slow kaam ko background me karne, failure ke time messages safe rakhne, aur consumers ko independently scale karne ke liye. Example: order ke baad email/SMS/invoice async workers karte hain.
Q: At-least-once delivery me duplicate messages kaise handle karenge?
A: Consumer ko idempotent banao: har message me unique ID ho, consumer processed IDs ko store kare (DB table/Redis with TTL) aur duplicate aaye to skip kare. Ya operation khud idempotent ho (upsert, "status = PAID" set karna rather than "balance += 100"). Database unique constraints bhi duplicate rokte hain.
Q: Dead letter queue kya hai?
A: Ek alag queue jahan woh messages bheje jaate hain jo N baar retry ke baad bhi process nahi ho paaye (poison messages). Isse main queue block nahi hoti, failed messages lost nahi hote, aur engineers inspect karke fix/replay kar sakte hain. Iska monitoring aur alerting zaroori hai.
Q: Queue me message ordering kaise maintain karenge?
A: Global ordering scale ke saath mehenga hai, isliye per-key ordering: ek entity (user/order) ke saare messages ek partition/message group me jaayein jise ek time par ek hi consumer process kare (Kafka partition key, SQS FIFO message group id). Consumer side par sequence numbers se out-of-order detect karke handle karna bhi ek tareeka hai.
:::

@lesson kafka-pubsub
@title Pub/Sub aur Apache Kafka

**Kafka** aaj ka sabse popular event streaming platform hai. LinkedIn ne banaya; Uber, Netflix, Swiggy, Flipkart sab use karte hain. Ye simple queue nahi, ek **distributed, append-only commit log** hai.

> [!analogy] Railway platform ka register
> Kafka ek lambe register jaisa hai jisme har event ek line me likha jaata hai, kabhi mitaaya nahi jaata (retention period tak). Har reader (consumer group) ka apna bookmark (offset) hai ki usne kahan tak padha. Koi reader chahe to peeche jaake dobara padh sakta hai.

## Kafka ke concepts

- **Topic**: events ki category (`orders`, `payments`, `clicks`).
- **Partition**: topic ko kai partitions me baanta jaata hai, har partition ek ordered log. **Parallelism ki unit**.
- **Offset**: partition me har message ka number (0, 1, 2...).
- **Producer**: topic me likhta hai. **Key** di to `hash(key) % partitions` se partition tay: same key ke saare messages same partition me, **order me**.
- **Consumer group**: consumers ka group jo ek topic ko milke padhta hai. **Har partition group ke sirf ek consumer** ko milta hai.
- **Broker**: Kafka server. Cluster me kai brokers.
- **Replication**: har partition ke replicas alag brokers par; ek **leader**, baaki followers. `acks=all` se durability.
- **Retention**: messages padhne ke baad bhi rehte hain (jaise 7 din), isliye **replay** possible.

[[arch Kafka topic with partitions and consumer groups]]
svc:Producer (Order Service) ~ key = order_id
queue:orders P0, queue:orders P1, queue:orders P2 ~ har partition ek ordered, append-only log
svc:Group A: Email consumer 1, svc:Group A: Email consumer 2 ~ group A ke andar partitions bant jaate hain
svc:Group B: Analytics consumer ~ group B ko bhi saare messages milte hain (pub/sub)
[[/arch]]

> [!key] Ek line me Kafka
> **Ek consumer group ke andar = queue** (kaam baant-ta hai). **Alag-alag consumer groups = pub/sub** (sabko poora data). Ye dono ek saath deta hai.

## Kafka itna fast kyun hai

- **Sequential disk writes** (append-only), jo random writes se bahut fast.
- **OS page cache** aur **zero-copy** (disk se seedha network).
- **Batching** aur **compression**.
- Partitions se **horizontal scaling**.

## Kafka vs traditional queue (RabbitMQ/SQS)

| | Kafka | RabbitMQ / SQS |
|---|---|---|
| Model | Distributed log | Queue (message delete after ACK) |
| Replay | Haan (offset peeche karo) | Nahi (ek baar consume) |
| Throughput | Bahut zyada (millions/sec) | Achha |
| Ordering | Per partition | Limited (FIFO queues) |
| Consumer tracking | Consumer khud offset rakhta | Broker track karta |
| Best for | Event streaming, logs, analytics, event sourcing | Task queues, job processing, complex routing |

## Use cases

- **Event-driven microservices**: "order_placed" event, kai services react karein.
- **Activity tracking**: clicks, page views (LinkedIn ka original use).
- **Log aggregation**: saare servers ke logs ek jagah.
- **Stream processing**: real-time fraud detection, live dashboards (Kafka Streams, Flink).
- **CDC (Change Data Capture)**: database changes ko stream karna (Debezium).

> [!warn] Partitions ki limit
> Consumer group me consumers > partitions ho to extra consumers khaali baithenge. Isliye partitions pehle se soch ke rakho (future parallelism). Aur ordering sirf ek partition ke andar hai, poore topic me nahi.

:::interview
Q: Kafka me partition aur consumer group kaise kaam karte hain?
A: Topic kai partitions me bata hai; har partition ordered log hai. Producer key ke hash se partition chunta hai, isliye same key ke messages same partition me order me. Consumer group ke andar har partition sirf ek consumer ko assign hota hai, isliye group me max parallelism = partitions count. Alag consumer groups independently poora topic padhte hain (pub/sub).
Q: Kafka aur RabbitMQ me kab kya choose karenge?
A: High-throughput event streaming, replay, multiple independent consumers, event sourcing, log/analytics pipelines ke liye Kafka. Task/job queues, per-message routing rules, priority queues, simple work distribution ke liye RabbitMQ ya SQS.
Q: Kafka me ordering kaise guarantee karte hain?
A: Ordering sirf partition ke andar guaranteed hai. Jin events ka order zaroori hai (ek order ke status updates), unhe same key (order_id) do taaki same partition me jaayein. Producer side par idempotent producer aur `max.in.flight` settings retries me reordering rokti hain.
Q: Kafka me consumer crash ho jaye to kya hota hai?
A: Consumer group rebalance hota hai aur uske partitions doosre consumers ko mil jaate hain. Woh last committed offset se padhna shuru karte hain. Agar consumer ne process kiya par offset commit nahi kiya tha to kuch messages dobara aayenge (at-least-once), isliye processing idempotent honi chahiye.
:::

@lesson realtime
@title Real-time: Polling, Long Polling, WebSockets, SSE

Chat, live score, stock prices, Uber driver location: inme server ko client tak **turant** update pahunchana hai. Par HTTP me to client hi request bhejta hai. To server khud se kaise bataye? Chaar tareeke hain.

[[anim:realtime]]

## 1. Short polling

Client har X second me poochta hai: "Kuch naya hai?"

- **Fayde**: simplest, har jagah chalta hai.
- **Nuksaan**: zyada tar responses khaali (wasted requests aur server load), aur update milne me delay (poll interval tak).
- **Use**: kam important, kam frequency updates (har 30s order status).

## 2. Long polling

Client request bhejta hai, server **connection khula rakhta** hai jab tak naya data na aaye (ya timeout, jaise 30s). Data aate hi response, aur client turant nayi request bhejta hai.

- **Fayde**: near real-time, khaali responses kam, normal HTTP par chalta hai.
- **Nuksaan**: har message ke baad naya request (overhead), server par bahut saare open connections.

## 3. WebSockets

Ek baar HTTP **Upgrade** handshake (`101 Switching Protocols`), phir ek **persistent, full-duplex (two-way)** TCP connection. Server aur client dono kabhi bhi message bhej sakte hain.

- **Fayde**: sabse low latency, two-way, har message par header overhead nahi.
- **Nuksaan**: stateful connections (scaling mushkil, load balancer support chahiye), connection drop handle karna (reconnect, heartbeats), kuch proxies/firewalls problem karte hain.
- **Use**: chat (WhatsApp Web), multiplayer games, collaborative editing (Google Docs), live trading.

## 4. Server-Sent Events (SSE)

Client ek HTTP request karta hai, server response ko **khula stream** rakhta hai (`Content-Type: text/event-stream`) aur jab chahe events bhejta hai. **Sirf server -> client**.

- **Fayde**: simple, normal HTTP, browser me automatic reconnect built-in, HTTP/2 par efficient.
- **Nuksaan**: one-way; client ko kuch bhejna ho to alag HTTP request. Binary data support nahi.
- **Use**: live score, news feed updates, notifications, stock ticker, AI chat responses ka streaming (token by token).

| | Short polling | Long polling | WebSocket | SSE |
|---|---|---|---|---|
| Direction | Client -> server (pull) | Pull (held) | Two-way | Server -> client |
| Latency | Poll interval tak | Low | Lowest | Low |
| Server load | Zyada (wasted requests) | Medium | Kam per message | Kam |
| Complexity | Sabse kam | Kam | Zyada | Kam |
| Best for | Rare updates | Fallback, simple notifications | Chat, games | Feeds, notifications, live data |

## WebSocket servers ko scale kaise karein

[[arch Chat system me WebSocket scaling]]
client:User A, client:User B
edge:Load Balancer (sticky / L4)
svc:WS Server 1 (A connected), svc:WS Server 2 (B connected) ~ har connection ek specific server par
cache:Connection registry (Redis: user -> server), queue:Pub/Sub (Redis / Kafka) ~ A ka message B ke server tak route hota hai
[[/arch]]

- Ek server ~ lakhs connections sambhal sakta hai (memory aur file descriptors limit).
- **Registry**: kaun sa user kis server par connected hai (Redis).
- **Pub/Sub** se servers ke beech messages route.
- **Heartbeats (ping/pong)** se dead connections detect.
- Deploy ke time connections gracefully drain karo; clients ko **exponential backoff** ke saath reconnect.

:::interview
Q: Chat application ke liye real-time communication kaise karenge?
A: WebSockets, kyunki two-way, low latency aur persistent connection chahiye. Clients WebSocket gateway servers se connect hote hain; ek registry (Redis) me user -> server mapping; message aane par recipient ka server dhoondh ke pub/sub ya direct RPC se deliver; recipient offline ho to message DB me store aur push notification. Fallback ke liye long polling.
Q: WebSocket aur SSE me kab kya?
A: Agar sirf server se client ko updates chahiye (live score, notifications, LLM response streaming) to SSE: simpler, plain HTTP, auto-reconnect. Agar dono taraf frequent messages chahiye (chat, gaming, collaborative editing) to WebSocket.
Q: Long polling kaise kaam karta hai aur short polling se behtar kyun?
A: Client request karta hai aur server use tab tak hold karta hai jab tak naya data na aaye ya timeout ho. Data aate hi turant response, client phir request karta hai. Short polling me fixed interval ki wajah se delay aur bahut saare khaali responses hote hain; long polling me latency kam aur wasted requests kam.
:::

@lesson webhooks
@title Webhooks

**Webhook** ek "reverse API" hai: aap kisi service ko apna URL de dete ho, aur jab koi event hota hai to **woh service aapke URL par HTTP POST** karti hai.

> [!analogy] Courier ka SMS
> Aap baar-baar courier office phone karke nahi poochte "parcel aaya?" (polling). Courier company khud SMS bhejti hai jab parcel deliver hota hai. Webhook wahi SMS hai.

## Example: Payment gateway

1. Aapki app Razorpay/Stripe par payment shuru karti hai.
2. User payment karta hai (aapka server beech me nahi).
3. Payment success hone par gateway aapke `https://api.myshop.com/webhooks/payment` par POST karta hai:

```json
{ "event": "payment.captured", "payment_id": "pay_29QQ", "order_id": "ord_981", "amount": 49900 }
```

4. Aapka server order ko "PAID" mark karta hai.

## Webhook receive karne ke best practices

- **Signature verify karo**: gateway HMAC signature header bhejta hai (`X-Signature`). Shared secret se verify karo, warna koi bhi fake "payment success" bhej dega.
- **Jaldi 200 OK do**: heavy kaam queue me daal do, webhook handler 1–2 second me respond kare, warna sender timeout maan ke retry karega.
- **Idempotent bano**: sender retries karta hai, same event 2–3 baar aa sakta hai. `event_id` store karke duplicate skip karo.
- **Order par bharosa mat karo**: "refunded" pehle aur "captured" baad me aa sakta hai. State machine se handle karo.
- **Reconciliation**: webhook miss ho sakta hai. Periodically gateway ki API se status check karo.

## Webhook bhejne wale (provider) ke liye

- **Retries with exponential backoff** (1 min, 5 min, 30 min...) aur max attempts.
- **Signing** har request ko.
- **Delivery logs** aur manual "resend" button.
- Webhooks ko **queue** se bhejo, taaki slow customer endpoints aapka system na rokein.

> [!warn] Sirf webhook par depend mat raho
> Network failures, aapka server down, ya provider ka bug: webhook kabhi bhi miss ho sakta hai. Payment jaise critical flows me webhook + polling/reconciliation dono rakho.

:::interview
Q: Webhook kya hai aur polling se kaise behtar?
A: Webhook me event hone par provider khud aapke registered URL par HTTP callback karta hai. Polling me aap baar-baar poochte ho, jisme wasted requests aur delay hota hai. Webhook real-time aur efficient hai, par aapko public endpoint, security (signature verification), retries aur duplicates handle karne padte hain.
Q: Payment webhook ko securely aur reliably kaise handle karenge?
A: HMAC signature verify karo (aur timestamp check se replay attacks roko), event_id se idempotency, turant 200 return karke processing queue me, state transitions validate karo (out-of-order events), aur reconciliation job jo periodically gateway API se pending payments ka status confirm kare.
:::

@quiz
Q: Order ke baad confirmation email bhejna kaise karna chahiye?
- Order API ke andar synchronously, email bhejne ke baad response
+ Event/queue ke through async background worker se
- User ko khud email bhejne bolo
- Cron job jo har ghante chale
E: Email user ke turant response ke liye zaroori nahi. Queue me daalne se API fast rehti hai aur email service down ho to bhi order fail nahi hota.

Q: At-least-once delivery me consumer ko kya hona chahiye?
- Fast
+ Idempotent
- Stateless
- Single-threaded
E: Duplicate messages aa sakte hain, isliye same message dobara process karne par result same rehna chahiye.

Q: Baar-baar fail hone wale message ko kahan bhejte hain?
- Wapas producer ko
+ Dead Letter Queue (DLQ)
- Delete kar dete hain bina bataye
- Cache me
E: DLQ me bhejne se main queue block nahi hoti aur failed message baad me inspect/replay ho sakta hai.

Q: Kafka consumer group me 3 partitions aur 5 consumers hain. Kya hoga?
- Sab 5 kaam karenge
+ 3 consumers kaam karenge, 2 idle rahenge
- Error aayega
- Partitions apne aap 5 ho jayenge
E: Group me ek partition sirf ek consumer ko milta hai, isliye max parallelism = partitions ki sankhya.

Q: Kafka me ek order ke saare events order me chahiye. Kya karein?
- Ek hi partition wala topic banao
+ order_id ko message key banao
- Consumers badhao
- Random partition chuno
E: Same key ke messages same partition me jaate hain, aur partition ke andar order guaranteed hai.

Q: Kafka ko RabbitMQ se alag kya banata hai?
- Kafka messages ACK ke baad delete karta hai
+ Kafka ek distributed log hai jisme messages retention tak rehte hain aur replay ho sakte hain
- Kafka sirf ek consumer support karta hai
- Kafka sync hai
E: Kafka messages ko retention period tak rakhta hai, consumers apna offset khud manage karte hain aur peeche jaakar replay kar sakte hain.

Q: Live cricket score page, sirf server se updates. Sabse simple suitable choice?
- Short polling har 100 ms
+ Server-Sent Events (SSE)
- WebSocket hi zaroori hai
- Email
E: One-way server -> client updates ke liye SSE simple, HTTP-based aur auto-reconnect ke saath aata hai.

Q: Payment webhook receive karte waqt sabse zaroori security step?
- Response me HTML bhejna
+ Signature (HMAC) verify karna
- Har request ko log na karna
- IP ko ignore karna
E: Bina signature verify kiye koi bhi fake "payment success" request bhej kar free order le sakta hai.
