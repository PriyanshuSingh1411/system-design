@module architecture
@title Architecture Patterns
@level Advanced
@desc Monolith vs microservices, API gateway, service discovery, event-driven design, CQRS, Saga aur serverless.

@lesson monolith-microservices
@title Monolith vs Microservices

## Monolith

Poori application **ek hi codebase aur ek hi deployable unit**: user management, orders, payments, notifications sab ek saath. Ek database.

> [!analogy] Sanyukt parivaar ka ghar
> Ek bada ghar, ek kitchen, sab saath. Shuru me bahut convenient. Par parivaar 50 logon ka ho gaya to ek kitchen me jhagde, ek kamre ki repair me poore ghar ki pareshani.

**Fayde**:
- Simple development, testing, deployment (ek app).
- Function call fast (network nahi).
- Transactions easy (ek DB).
- Chhoti team ke liye perfect.

**Nuksaan**:
- Codebase bada hone par samajhna aur change karna mushkil.
- Chhota change bhi poori app deploy.
- Ek module ki memory leak/crash poori app gira deti hai.
- Poori app ek saath scale (sirf search ko scale karna ho tab bhi).
- Ek hi tech stack me bandh jaate ho.

## Microservices

Application ko chhoti, **independent services** me todna, har service ek business capability ke liye (Order Service, Payment Service, User Service). Har service ka **apna database**, apni team, apna deploy.

[[arch Microservices architecture]]
client:Mobile, client:Web
edge:API Gateway ~ auth, rate limit, routing
svc:User Service, svc:Order Service, svc:Payment Service, svc:Catalog Service
db:Users DB, db:Orders DB, db:Payments DB, db:Catalog DB ~ database per service
queue:Event bus (Kafka) ~ services events ke through sync rehti hain
[[/arch]]

**Fayde**:
- **Independent deployment**: payment team roz deploy kare, order team ko farak nahi.
- **Independent scaling**: sirf search service ko 50 instances.
- **Fault isolation**: recommendation service down, checkout chalta rahe.
- **Tech freedom**: ek service Go me, ek Java, ek Python.
- **Team autonomy**: chhoti teams apni service own karein (Conway's law).

**Nuksaan**:
- **Distributed system ki saari mushkilein**: network failures, latency, partial failures.
- **Data consistency**: transactions services ke beech nahi chalte (Saga chahiye).
- **Operational overhead**: monitoring, tracing, CI/CD, service discovery, har service ka infra.
- **Debugging mushkil**: ek request 10 services se guzarti hai.
- Galat boundaries se **distributed monolith**: services alag par itni coupled ki saath deploy karni padein. Sabse bura dono duniya ka.

| | Monolith | Microservices |
|---|---|---|
| Deploy | Ek unit | Har service alag |
| Scaling | Poora ek saath | Per service |
| Data | Shared DB | Database per service |
| Consistency | ACID easy | Eventual, Saga |
| Team size fit | Chhoti | Badi, kai teams |
| Complexity | Code me | Infra/network me |

## Kab kya?

> [!key] Monolith first
> Naya product ya chhoti team: **modular monolith** se shuru karo (code ke andar clear modules, saaf boundaries). Jab team badhe, modules ki scaling needs alag hon, ya deploy speed atakne lage, tab sabse painful module ko pehle service banao. Amazon, Netflix, Uber sab monolith se hi microservices par gaye.

## Service boundaries kaise tay karein

- **Business capability** ke hisaab se (orders, payments, inventory), technical layers ke hisaab se nahi (database service, UI service galat).
- **Domain-Driven Design (DDD)**: har **bounded context** ek service.
- Services ke beech **kam communication**, andar **zyada cohesion**.
- **Database per service**: doosri service ka DB seedha mat padho; API ya events se data lo.

## Strangler fig pattern

Monolith ko ek jhatke me rewrite mat karo. Naya feature naye service me banao, purane features ek-ek karke bahar nikaalo, aage proxy/gateway traffic ko naye service par route kare. Dheere-dheere monolith "sookh" jaata hai.

:::interview
Q: Monolith aur microservices ke trade-offs batayiye. Aap kya choose karenge?
A: Monolith: simple dev/deploy/testing, fast in-process calls, ACID easy; par bade codebase me slow development, coupled deploys, poora scale karna, ek bug sab gira de. Microservices: independent deploy/scale, fault isolation, team autonomy; par network failures, eventual consistency, observability aur ops overhead. Naye product ke liye modular monolith, aur scale/team growth par gradually microservices (strangler fig).
Q: Database per service kyun, aur cross-service data kaise milega?
A: Taaki services loosely coupled rahein: schema change ek service ka internal mamla ho, aur ek service ka DB load doosri ko na gira de. Doosri service ka data uski API se (sync) ya uske events subscribe karke apni local copy/read model banake (async) milta hai. Cross-service transactions ke liye Saga.
Q: Distributed monolith kya hai?
A: Jab code microservices me bata ho par services itni tightly coupled hon ki ek ko change karne ke liye kai saath deploy karni padein, shared database ho, ya lambi synchronous call chains hon. Isme microservices ki saari complexity hai par fayde nahi. Galat service boundaries ka nateeja.
:::

@lesson api-gateway
@title API Gateway, Service Discovery aur Service Mesh

## API Gateway

Microservices me clients ko 20 services ke address nahi pata hone chahiye. **API Gateway** ek single entry point hai jo saari requests leta hai aur sahi service tak route karta hai.

**Gateway ke kaam**:
- **Routing**: `/orders/*` -> Order Service, `/users/*` -> User Service.
- **Authentication**: JWT/token verify ek jagah, services ko user identity header me.
- **Rate limiting** aur throttling.
- **SSL/TLS termination**.
- **Request aggregation**: ek client request ke liye kai services call karke combined response.
- **Protocol translation**: bahar REST, andar gRPC.
- **Caching, logging, metrics**.

Examples: Kong, AWS API Gateway, Apigee, Nginx, Envoy, Spring Cloud Gateway.

> [!warn] Gateway par business logic mat daalo
> Gateway "smart router" hai, business logic ka ghar nahi. Logic daaloge to woh naya monolith ban jayega. Aur gateway ko highly available rakho, warna sab kuch iske saath gir jayega.

## Backend for Frontend (BFF)

Mobile app ko kam data chahiye, web ko zyada, smart TV ko alag. Ek generic API sabko please nahi karti. **BFF**: har client type ka apna chhota gateway/backend jo uske liye data shape kare.

## Service Discovery

Cloud me service instances aate-jaate rehte hain (auto-scaling, crashes), unke IP badalte rehte hain. Order Service ko Payment Service ka current address kaise pata chale?

**Service registry**: har instance start hone par apna address register karta hai (aur heartbeat bhejta hai). Examples: Consul, etcd, ZooKeeper, Eureka, Kubernetes DNS.

- **Client-side discovery**: client registry se instances ki list leta hai aur khud load balance karta hai (Netflix Eureka + Ribbon).
- **Server-side discovery**: client ek load balancer/DNS name ko call karta hai, woh registry se dekh ke forward karta hai (Kubernetes Service, AWS ALB).

## Service Mesh

Jab sainkdon services hon, to har service me retries, timeouts, mTLS, metrics, tracing ka code likhna mushkil. **Service mesh** ye sab **sidecar proxy** me nikaal deta hai: har service ke saath ek chhota proxy (Envoy) chalta hai, aur saara network traffic usi se guzarta hai.

[[flow:svc:Order Service -> edge:Sidecar proxy -> edge:Sidecar proxy -> svc:Payment Service]]

**Mesh deta hai**: mTLS encryption, retries/timeouts/circuit breaking, traffic splitting (canary), observability (metrics, traces) **bina app code change**.
Examples: Istio, Linkerd, Consul Connect.

> [!tip] Kab chahiye
> 5–10 services ke liye service mesh overkill hai. Sainkdon services aur kai teams hon tab iska fayda lagat se zyada.

:::interview
Q: API Gateway kya karta hai?
A: Microservices ke aage single entry point: routing, authentication/authorization, rate limiting, TLS termination, request/response transformation, aggregation, caching, logging/metrics. Clients ko internal service topology se decouple karta hai. Isse highly available rakhna aur business logic se door rakhna zaroori hai.
Q: Service discovery kyun zaroori hai, aur client-side vs server-side?
A: Dynamic environments me instances ke IP badalte rehte hain, isliye hardcode nahi kar sakte. Registry me instances register/heartbeat karte hain. Client-side: caller registry se list lekar khud LB karta hai (kam hops, par har client me logic). Server-side: caller ek stable endpoint (LB/DNS) ko call karta hai jo registry se route karta hai (client simple, ek extra hop).
Q: Service mesh kya hai?
A: Infrastructure layer jo service-to-service communication ko sidecar proxies (jaise Envoy) ke through manage karti hai. Ye mTLS, retries, timeouts, circuit breaking, traffic shifting aur telemetry deti hai bina application code change kiye. Control plane (Istio) config deta hai, data plane (sidecars) traffic handle karta hai. Cost: extra latency, resources aur operational complexity.
:::

@lesson event-driven
@title Event-Driven Architecture, Event Sourcing aur CQRS

## Event-Driven Architecture (EDA)

Services ek doosre ko **command** dene ki jagah **events** publish karti hain: "ye ho gaya". Jise interest hai woh react kare.

- Command (sync): "Inventory Service, stock kam karo."
- Event (async): "OrderPlaced {order_id: 981, items: [...]}". Inventory, Email, Analytics sab apna kaam karein.

**Fayde**: producer ko consumers ke baare me pata nahi hona chahiye (loose coupling), naya consumer add karna easy (producer change nahi), spikes buffer.
**Nuksaan**: flow samajhna mushkil (kaun kis event par kya karta hai), eventual consistency, event schema versioning.

### Choreography vs Orchestration

- **Choreography**: koi central controller nahi; har service events sunke apna kaam karti hai aur naya event publish karti hai. Decoupled, par bade flows me "kaun kya kar raha" dikhna mushkil.
- **Orchestration**: ek central **orchestrator** steps chalata hai aur services ko batata hai kya karna hai. Flow ek jagah dikh jaata hai, par orchestrator central dependency hai.

## Event Sourcing

Normal DB me hum **current state** store karte hain (balance = ₹700). Event sourcing me hum **saare events** store karte hain jo hue, aur state unhe replay karke nikaalte hain.

```text
AccountOpened  {id: 1}
MoneyDeposited {amount: 1000}
MoneyWithdrawn {amount: 500}
MoneyDeposited {amount: 200}
=> current balance = 700
```

> [!analogy] Bank passbook
> Passbook me sirf aakhri balance nahi, har entry likhi hoti hai. Kabhi bhi peeche jaake dekh sakte ho ki balance kaise bana. Yahi event sourcing hai.

**Fayde**: poora **audit trail**, kisi bhi time ki state rebuild (time travel debugging), naye read models baad me events se bana sakte ho, events naturally doosre systems ko stream ho jaate hain.
**Nuksaan**: complexity, event schema evolve karna mushkil, replay slow (isliye **snapshots** lete hain), querying ke liye alag read models chahiye.
**Use**: banking ledgers, accounting, order lifecycle, audit-heavy systems.

## CQRS (Command Query Responsibility Segregation)

**Write model** (commands) aur **read model** (queries) ko alag karo, alag databases tak.

[[arch CQRS]]
client:User
svc:Command side (create/update) ~ validation, business rules, normalized
db:Write DB (Postgres)
queue:Events / CDC ~ changes read side tak async jaate hain
svc:Read side / Projections ~ query ke hisaab se denormalized views
cache:Read DB (Elasticsearch / Redis / Mongo)
[[/arch]]

**Kyun**: reads aur writes ki needs alag hoti hain. Writes ko consistency aur rules chahiye; reads ko speed aur alag shapes (search, dashboards). Dono ko alag optimize aur scale kar sakte ho.
**Nuksaan**: read model thoda **peeche** (eventual consistency), do models maintain karna.

> [!key] Event sourcing aur CQRS aksar saath
> Event sourcing me state events ka log hai, jise query karna mushkil hai. Isliye events se read-optimized projections (CQRS read side) banaye jaate hain. Par dono alag-alag bhi use ho sakte hain.

:::interview
Q: Event-driven architecture ke fayde aur challenges?
A: Fayde: loose coupling, naye consumers easily add, async processing se resilience aur spike handling, real-time reactions. Challenges: eventual consistency, end-to-end flow ki visibility, debugging/tracing, event ordering aur duplicates, schema evolution (schema registry, backward compatible changes).
Q: Event sourcing kya hai, kab use karenge?
A: State ko mutable row ki jagah immutable events ke append-only log ki tarah store karna; current state = events replay. Jab audit trail, history, temporal queries ya "kis wajah se ye state bani" zaroori ho (ledgers, order workflows, compliance). Simple CRUD apps me overkill.
Q: CQRS kya hai?
A: Write path (commands) aur read path (queries) ke liye alag models (aur aksar alag stores). Writes normalized aur rule-enforced, reads denormalized aur query-optimized (search index, cache, materialized views). Read side events/CDC se async update hoti hai, isliye thoda stale ho sakti hai. Read-heavy systems jahan read shapes complex hon, wahan useful.
Q: Choreography aur orchestration me kya choose karenge?
A: Chhote, simple flows (2–3 steps) me choreography: events se decoupled. Bade, multi-step business processes jahan visibility, timeouts aur compensation logic important ho (order fulfillment, loan approval), wahan orchestration (Temporal, AWS Step Functions, ya ek orchestrator service).
:::

@lesson distributed-transactions
@title Distributed Transactions: 2PC, Saga, Outbox

Monolith me ek DB transaction se order aur payment saath commit ho jaate the. Microservices me Order DB alag, Payment DB alag. **Kai databases me ek atomic transaction kaise?**

## Two-Phase Commit (2PC)

Ek **coordinator** do phases me kaam karata hai:

1. **Prepare phase**: coordinator sab participants se poochta hai "commit kar sakte ho?" Har participant kaam karke locks pakad ke "Yes/No" bolta hai.
2. **Commit phase**: sab ne Yes bola to "COMMIT", warna "ROLLBACK".

- **Fayde**: strong consistency, atomic.
- **Nuksaan**: **blocking**: coordinator prepare ke baad crash hua to participants locks pakde intezaar karte rahte hain. Slow (kai round trips), saare participants available hone chahiye, scale nahi karta.
- **Use**: same organization ke andar kuch databases (XA transactions), jahan strong consistency must ho. Microservices me rarely.

## Saga pattern

Ek bade transaction ko **chhote local transactions ki sequence** me todo. Har step apne DB me commit hota hai. Koi step fail hua to pichhle steps ke **compensating transactions** (ulta kaam) chalao.

[[anim:saga]]

| Step | Action | Compensation |
|---|---|---|
| 1 | Order create (PENDING) | Order cancel |
| 2 | Payment ₹499 deduct | Refund ₹499 |
| 3 | Inventory reserve | Stock release |
| 4 | Delivery assign | Rider unassign |

- **Choreography saga**: har service event sunke agla step karti hai.
- **Orchestration saga**: orchestrator steps chalata hai (zyada visibility).

> [!warn] Saga ki khaas baatein
> - Saga **ACID ka I (isolation) nahi deta**: beech me doosre log aadhi state dekh sakte hain (order PENDING). Isliye "pending" states aur semantic locks use karo.
> - Compensation hamesha perfect undo nahi: email bhej diya to "unsend" nahi hota, "sorry" email bhejo.
> - Har step aur compensation **idempotent** hona chahiye (retries hote hain).

## Transactional Outbox pattern

Common bug: Order service ne DB me order save kiya, phir Kafka me event bhejne se pehle crash. Ab order hai par event kabhi nahi gaya (**dual write problem**). Ya ulta: event gaya par DB rollback ho gaya.

**Outbox**: event ko usi DB transaction me ek `outbox` table me likho. Ek alag **relay process** (ya CDC tool jaise Debezium) outbox table padh ke events Kafka me publish karta hai aur sent mark karta hai.

```sql
BEGIN;
INSERT INTO orders (id, user_id, status) VALUES (981, 42, 'PENDING');
INSERT INTO outbox (event_type, payload) VALUES ('OrderPlaced', '{"order_id":981}');
COMMIT;   -- dono ek saath, ya koi nahi
```

Ab DB aur event kabhi out of sync nahi. Relay at-least-once bhejta hai, isliye consumers idempotent.

| | 2PC | Saga |
|---|---|---|
| Consistency | Strong (atomic) | Eventual |
| Locks | Lambe time tak | Har step ke local, chhote |
| Availability | Kam (sab participants chahiye) | Zyada |
| Failure handling | Rollback | Compensating actions |
| Scale | Kam | Achha |
| Use | Kam participants, same org DBs | Microservices, long-running business flows |

:::interview
Q: Microservices me distributed transaction kaise handle karenge?
A: 2PC usually avoid karte hain (blocking, availability kam). Saga pattern use karte hain: transaction ko local transactions ki chain me todte hain, failure par compensating actions reverse order me. Orchestration (central coordinator) ya choreography (events) se implement. Events ko reliably publish karne ke liye transactional outbox, aur har step idempotent.
Q: 2PC ki problems kya hain?
A: Blocking protocol: prepare ke baad coordinator crash ho to participants locks hold karke uncertain state me atke rehte hain. Latency (multiple round trips), throughput kam (lambe locks), sab participants available chahiye (availability ghatati hai), aur heterogeneous systems (Kafka, external APIs) me support nahi hota.
Q: Transactional outbox pattern kis problem ko solve karta hai?
A: Dual write problem: DB update aur message publish ko atomic banana. Event ko business data ke saath same DB transaction me outbox table me likhte hain; ek relay/CDC process outbox se events broker tak publish karta hai. Isse "DB me hai par event nahi gaya" ya ulta situation nahi aati.
Q: Saga me compensating transaction kya hai, example?
A: Ek business-level "undo" action jo pehle commit ho chuke step ke effect ko semantically reverse kare. Example: payment debit ka compensation refund, seat reserve ka compensation release, order create ka compensation cancel. Ye exact rollback nahi, naya forward action hai, aur idempotent hona chahiye.
:::

@lesson containers-serverless
@title Containers, Kubernetes aur Serverless

Aaj kal services deploy kaise hoti hain? Teen bade concepts: **containers**, **orchestration (Kubernetes)**, aur **serverless**.

## Virtual Machines vs Containers

- **VM**: poora operating system virtualize. Bhaari (GBs), boot me minutes.
- **Container (Docker)**: app + uski dependencies ek package me, host OS ka kernel share karta hai. Halka (MBs), seconds me start.

> [!analogy] Tiffin box
> Container ek tiffin box hai: khana (app) aur uske saath ki cheezein (dependencies) ek band dabbe me. Kisi bhi office (server) me le jao, same chalega. "Mere laptop par to chal raha tha" wali problem khatam.

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 8080
CMD ["node", "server.js"]
```

## Kubernetes (K8s)

Sainkdon containers ko sainkdon machines par chalana, restart karna, scale karna, update karna: ye kaam **container orchestrator** karta hai. Kubernetes sabse popular.

| Concept | Matlab |
|---|---|
| Pod | Sabse chhoti unit: ek ya kuch containers saath |
| Deployment | "Is app ke 5 pods hamesha chalne chahiye", rolling updates |
| Service | Pods ke aage stable naam/IP aur load balancing (service discovery) |
| Ingress | Bahar se HTTP traffic andar route karna |
| HPA | Horizontal Pod Autoscaler: CPU/metrics par pods badhana-ghatana |
| ConfigMap / Secret | Config aur passwords bahar rakhna |
| Node | Machine jis par pods chalte hain |

**K8s deta hai**: self-healing (crash hua pod restart), auto-scaling, rolling deploys aur rollback, service discovery, resource limits.

## Serverless (FaaS)

Aap sirf **function** likhte ho, server, scaling, patching sab cloud provider ka kaam. Function **event par** chalta hai aur **jitna chala utna paisa**. Examples: AWS Lambda, Google Cloud Functions, Azure Functions, Cloudflare Workers.

```python
def handler(event, context):          # S3 me image aayi -> ye chala
    key = event["Records"][0]["s3"]["object"]["key"]
    make_thumbnail(key)
    return {"status": "ok"}
```

**Fayde**: koi server management nahi, automatic scaling (0 se hazaaron), idle par zero cost, fast development.
**Nuksaan**:
- **Cold start**: kaafi der baad call hua to start hone me 100 ms – kuch seconds.
- **Execution time limits** (Lambda max 15 min).
- **Stateless**: state bahar rakhna padta hai.
- Bahut zyada steady traffic par **mehenga** pad sakta hai.
- **Vendor lock-in**, local debugging mushkil.

**Use**: event processing (file upload, webhooks), cron jobs, low/spiky traffic APIs, glue code.

| | VMs | Containers + K8s | Serverless |
|---|---|---|---|
| Control | Poora | Zyada | Kam |
| Ops effort | Zyada | Medium | Sabse kam |
| Scaling | Slow | Fast (seconds) | Instant, automatic |
| Cost model | Hamesha chalu | Hamesha chalu (nodes) | Per invocation |
| Best for | Legacy, special needs | Microservices, long-running | Events, spiky traffic |

:::interview
Q: Containers VMs se kaise alag hain?
A: VM poora guest OS chalata hai (hypervisor par), isliye heavy aur slow boot. Container host kernel share karta hai aur sirf app + dependencies package karta hai (namespaces/cgroups se isolation), isliye lightweight, fast start, aur ek machine par zyada density. Isolation VMs me zyada strong hai.
Q: Serverless kab use karenge aur kab nahi?
A: Use: event-driven ya spiky/unpredictable traffic, background jobs, webhooks, scheduled tasks, prototypes, jahan ops team chhoti ho. Avoid: consistently high steady traffic (cost), long-running ya stateful workloads, ultra-low latency jahan cold start problem ho, ya strict portability needs.
Q: Kubernetes me ek service ko auto-scale kaise karte hain?
A: Horizontal Pod Autoscaler (HPA) CPU/memory ya custom metrics (QPS, queue length via KEDA) dekh ke Deployment ke replicas badhata-ghatata hai. Pods ko schedule karne ke liye nodes kam padein to Cluster Autoscaler naye nodes jodta hai. Resource requests/limits sahi set karna zaroori hai.
:::

@quiz
Q: Naya startup, 4 developers, product abhi validate ho raha hai. Best starting architecture?
+ Modular monolith
- 30 microservices with service mesh
- Har function ke liye alag serverless app aur alag DB
- Distributed monolith
E: Chhoti team aur badalte requirements me modular monolith fast aur simple hai. Zarurat padne par baad me services nikaal sakte ho.

Q: Microservices me "database per service" ka main reason?
- Storage sasta hota hai
+ Services loosely coupled rahein aur independently badal/scale ho sakein
- Joins fast hote hain
- Transactions easy hote hain
E: Shared DB se services schema aur load ke through coupled ho jaati hain. Apna DB rakhne se har service independent rehti hai.

Q: JWT verification, rate limiting aur routing ek jagah karne ke liye kya lagayenge?
- Service mesh sidecar har client par
+ API Gateway
- Message queue
- CDN
E: API Gateway microservices ka single entry point hai jo auth, rate limiting, routing jaise cross-cutting kaam karta hai.

Q: Bank passbook ki tarah har change ko event ke roop me store karna kya kehlata hai?
- CQRS
+ Event sourcing
- Sharding
- Caching
E: Event sourcing me state ki jagah saare events ka append-only log store hota hai; current state replay se nikalti hai.

Q: Saga me Inventory step fail hua. Kya hoga?
- Poore system ka DB rollback
+ Pichhle steps ke compensating actions (refund, order cancel) reverse order me
- Kuch nahi, order complete
- 2PC shuru ho jayega
E: Saga me har step local commit hota hai, isliye failure par pichhle steps ko compensating transactions se semantically undo karte hain.

Q: Order DB me save hua par Kafka event bhejne se pehle service crash ho gayi. Ye problem kaunsa pattern solve karta hai?
- Circuit breaker
+ Transactional outbox
- Sticky sessions
- Write-back cache
E: Outbox me event ko order ke saath same DB transaction me likhte hain, phir relay publish karta hai. Dual write problem khatam.

Q: 2PC ka sabse bada nuksaan?
- Eventual consistency
+ Blocking: coordinator fail ho to participants locks pakde atke reh sakte hain
- Data duplicate hota hai
- Sirf NoSQL me chalta hai
E: Prepare ke baad coordinator crash ho to participants ko commit/abort pata nahi, aur locks hold rehte hain.

Q: Serverless function ki kaunsi problem hai jab woh kaafi der baad call hota hai?
- Memory leak
+ Cold start latency
- Data loss
- Deadlock
E: Idle function ka container hat jaata hai; agli call par naya start hone me extra time lagta hai (cold start).
