@module scaling
@title Scaling Basics
@level Beginner
@desc Vertical vs horizontal scaling, load balancers, proxies, stateless design aur CDN.

@lesson scalability
@title Scalability: Vertical vs Horizontal

**Scalability** ka matlab: load badhne par system ki capacity badhana, bina performance gire. Do tareeke hain: server ko **bada** karo (vertical) ya **zyada** servers lagao (horizontal).

> [!analogy] Dabbawala aur truck
> Mumbai ke dabbawale lakhon tiffin pahunchate hain. Agar woh ek bahut bada truck lete (vertical), to traffic me phas jaate aur truck kharab hua to sab ruk jaata. Woh hazaaron log aur cycles use karte hain (horizontal): ek beemar ho to baaki kaam sambhal lete hain, aur zaroorat ho to aur log jod lo.

[[anim:scaling]]

## Vertical scaling (Scale up)

Usi machine me zyada CPU, RAM, faster disk daalna.

- **Fayde**: simple, code change nahi, koi distributed complexity nahi, data ek jagah.
- **Nuksaan**: hardware ki limit hai, bahut mehenga hota jaata hai, **single point of failure (SPOF)**, upgrade ke time downtime.
- **Kab**: shuruaati startup, databases (jinhe distribute karna mushkil hai), jab tak sasta pade.

## Horizontal scaling (Scale out)

Same jaise kai machines jodna aur load baantna (load balancer se).

- **Fayde**: lagbhag unlimited scale, fault tolerance (ek gira to baaki chalte), commodity hardware sasta, zarurat ke hisaab se badhao/ghatao (**auto-scaling**).
- **Nuksaan**: complexity: load balancing, data consistency, network calls, distributed debugging. App ko **stateless** banana padta hai.

| | Vertical | Horizontal |
|---|---|---|
| Kaise | Bada server | Zyada servers |
| Limit | Hardware limit | Practically unlimited |
| Failure | SPOF | Fault tolerant |
| Complexity | Kam | Zyada |
| Cost curve | Tezi se mehenga | Linear |
| Example | DB server ko 64 GB se 512 GB RAM | 3 app servers se 30 |

> [!key] Real world me dono
> Asli systems dono mix karte hain. App servers horizontally scale hote hain (stateless hain, easy). Database pehle vertically scale hota hai, phir read replicas aur sharding se horizontally.

## Auto-scaling

Cloud (AWS, GCP, Azure) me aap rule bana sakte ho: "CPU 70% se upar 5 minute rahe to 2 servers aur jodo, 30% se neeche ho to hatao." Isse festival sale (Big Billion Days) ke time capacity badhti hai aur raat ko paisa bachta hai.

- **Reactive**: metrics (CPU, QPS, queue length) dekh kar.
- **Scheduled / Predictive**: pata hai ki 8 PM IPL ke time traffic aayega, pehle se scale kar do.

> [!warn] Scale karne se pehle bottleneck dhoondo
> 10 app servers jod diye par sab ek hi database par bhaag rahe hain to database hi gir jayega. System utna hi scale hota hai jitna uska sabse kamzor hissa.

:::interview
Q: Vertical aur horizontal scaling me farak aur trade-offs batayiye.
A: Vertical: ek server ko bada karna. Simple aur consistent, par hardware limit, mehenga, aur SPOF. Horizontal: zyada servers jodna aur load balancer se baantna. Unlimited scale aur fault tolerance, par stateless design, data consistency aur operational complexity ki zaroorat. Practically app tier horizontal, database pehle vertical phir replicas/sharding.
Q: Horizontal scaling ke liye app ko stateless kyun hona chahiye?
A: Agar user ka session ya data kisi ek server ki memory me hai, to agli request doosre server par gayi to woh data nahi milega. Stateless app me state bahar (Redis, DB, JWT token) rakha jaata hai, taaki koi bhi server koi bhi request handle kar sake aur servers freely add/remove ho sakein.
Q: Auto-scaling kaise kaam karta hai aur iske risks kya hain?
A: Monitoring metrics (CPU, memory, QPS, queue depth) par rules ya predictive models se instances add/remove hote hain. Risks: naye instance ko start hone me time (cold start) lagta hai, isliye sudden spike me late ho sakta hai; galat thresholds se baar-baar scale up/down (flapping); aur downstream (DB) scale nahi hua to bottleneck wahan shift ho jaata hai.
:::

@lesson load-balancer
@title Load Balancer

Jab aapke paas kai servers hain, to koi chahiye jo decide kare ki agli request kis server par jaaye. Ye kaam **Load Balancer (LB)** karta hai. Ye clients aur servers ke beech baithta hai aur traffic ko barabar baantta hai.

> [!analogy] Toll plaza ka manager
> Toll plaza par ek aadmi gaadiyon ko khaali booth ki taraf bhejta hai. Agar ek booth band ho gaya, to usme gaadi nahi bhejta. Yahi load balancer karta hai.

[[anim:load-balancer]]

## Load balancer ke kaam

- **Traffic distribution**: koi ek server overload na ho.
- **Health checks**: har kuch second me server ko ping (`GET /health`). Fail hua to us server ko rotation se hata do.
- **High availability**: ek server gira to user ko pata bhi nahi chalta.
- **TLS termination**: HTTPS yahi decrypt ho jaata hai.
- **Scaling**: naye servers piche jodo, LB unhe traffic dene lagta hai.

## Algorithms

| Algorithm | Kaise | Kab use karein |
|---|---|---|
| Round Robin | Baari-baari se: S1, S2, S3, S1... | Sab servers same, requests similar |
| Weighted Round Robin | Bade server ko zyada share | Servers alag capacity ke |
| Least Connections | Jis par sabse kam active connections | Requests ka time alag-alag (long connections) |
| Least Response Time | Jo sabse fast respond kar raha | Latency sensitive |
| IP Hash | Client IP ka hash -> fixed server | Sticky sessions chahiye |
| Random | Random server | Simple, bade scale par achha chalta hai |

## L4 vs L7 load balancer

- **L4 (Transport layer)**: sirf IP aur port dekhta hai, packet ke andar nahi. Bahut fast. Example: AWS NLB.
- **L7 (Application layer)**: HTTP ko samajhta hai: URL, headers, cookies. Smart routing kar sakta hai: `/api/*` -> API servers, `/images/*` -> image servers. Thoda slow. Example: AWS ALB, Nginx, HAProxy, Envoy.

[[arch L7 load balancer path-based routing]]
client:Users
edge:L7 Load Balancer ~ URL dekh ke route karta hai
svc:/api/* -> API servers, svc:/search/* -> Search servers, store:/static/* -> Static servers
[[/arch]]

## Sticky sessions

Kabhi app server memory me session rakhta hai, to same user ko same server par bhejna padta hai (cookie ya IP hash se). Ye **sticky session** hai. Problem: woh server gira to session gaya, aur load barabar nahi bantta. Behtar: session ko Redis me rakho aur app ko stateless banao.

## Load balancer khud SPOF na bane

Agar ek hi LB hai aur woh gira, to sab gaya. Isliye:

- **Active-passive pair**: ek kaam karta hai, doosra standby. Heartbeat fail hua to standby **floating IP** le leta hai.
- **Active-active**: dono kaam karte hain, DNS dono par traffic bhejta hai.
- Cloud LBs (AWS ELB) andar se already highly available hote hain.

> [!pro] Global load balancing
> Bade systems me pehle **DNS/GeoDNS** ya **Anycast** user ko nazdeeki region (Mumbai, Singapore) bhejta hai, phir us region ka LB servers me baantta hai. Isse multi-region setup banta hai.

:::interview
Q: L4 aur L7 load balancer me kya farak hai?
A: L4 transport layer par kaam karta hai: sirf IP/port dekh ke TCP/UDP connections forward karta hai, content nahi padhta, isliye bahut fast aur kam CPU. L7 application layer par HTTP request padhta hai (path, headers, cookies), isliye path-based routing, header-based routing, caching, auth jaisi smart cheezein kar sakta hai, par thoda zyada overhead.
Q: Least connections algorithm round robin se kab behtar hai?
A: Jab requests ka processing time bahut alag-alag ho (kuch 10 ms, kuch 10 s), ya long-lived connections hon (WebSocket). Round robin sirf ginti barabar karta hai, isliye ek server par bhaari requests jama ho sakti hain. Least connections actual load dekhta hai.
Q: Load balancer health check kaise karta hai?
A: Periodically (jaise har 5 s) har server ke health endpoint ko call karta hai ya TCP connect karta hai. Lagataar N baar fail hua to server ko unhealthy mark karke rotation se hata deta hai, aur M baar pass hone par wapas jodta hai. Health endpoint ko dependencies (DB connectivity) bhi check karni chahiye, par itna heavy nahi ki khud load ban jaye.
Q: Load balancer ko single point of failure banne se kaise bachayenge?
A: Redundant LBs: active-passive (heartbeat + floating/virtual IP failover) ya active-active (DNS dono IPs return kare). Cloud managed LBs multiple availability zones me run hote hain. Global level par GeoDNS/Anycast se multiple regions.
:::

@lesson proxies
@title Proxy: Forward vs Reverse

**Proxy** ek beech wala server hai jo kisi aur ki taraf se request bhejta ya receive karta hai. Do type hain, aur fark sirf itna hai ki proxy **kiski taraf** se kaam kar raha hai.

## Forward proxy: client ka pratinidhi

Client ki taraf baithta hai. Server ko lagta hai request proxy ne bheji, asli client chhupa rehta hai.

[[flow:client:Aapka laptop -> edge:Forward Proxy -> ext:Internet ki websites]]

**Use**: office me internet filter karna (social media block), caching, user ki identity chhupana (VPN jaisa), geo-restrictions.

## Reverse proxy: server ka pratinidhi

Server ki taraf baithta hai. Client ko lagta hai woh asli server se baat kar raha hai, piche ke servers chhupe rehte hain.

[[flow:client:Users -> edge:Reverse Proxy (Nginx) -> svc:App servers]]

**Use**:
- **Load balancing** (load balancer ek tarah ka reverse proxy hi hai)
- **TLS termination**
- **Caching** static content aur responses
- **Compression** (gzip, brotli)
- **Security**: asli server IPs chhupana, DDoS protection, WAF (Web Application Firewall)
- **Rate limiting**

| | Forward proxy | Reverse proxy |
|---|---|---|
| Kiski taraf | Client | Server |
| Kya chhupata hai | Client ki identity | Servers ki identity |
| Kaun configure karta hai | Client/office network | Website owner |
| Example | Corporate proxy, VPN | Nginx, HAProxy, Cloudflare |

> [!tip] Load balancer vs reverse proxy
> Har load balancer reverse proxy hai, par har reverse proxy load balancer nahi. Agar piche sirf ek server hai, tab bhi reverse proxy (Nginx) lagana useful hai: TLS, caching, compression, security ke liye.

## API Gateway: smart reverse proxy

Microservices me ek **API Gateway** hota hai jo reverse proxy ka advanced roop hai: authentication, rate limiting, request routing, response aggregation. Detail Module 6 me.

:::interview
Q: Forward proxy aur reverse proxy me farak samjhaiye.
A: Forward proxy client ki taraf hota hai aur client ki requests ko internet par bhejta hai, client ki identity chhupata hai (corporate filtering, VPN). Reverse proxy server ki taraf hota hai aur bahar ki requests ko andar ke servers tak pahunchata hai, servers ko chhupata hai, aur load balancing, TLS termination, caching, security deta hai.
Q: Agar sirf ek app server hai to bhi Nginx kyun lagayen?
A: TLS termination, static files serve karna, gzip compression, request buffering (slow clients se app ko bachana), rate limiting, caching, aur aage chal kar servers badhe to load balancing turant add ho jayega. App server sirf business logic par focus kare.
:::

@lesson stateless
@title Stateless vs Stateful Services

**State** matlab woh data jo ek request se agli request tak yaad rakhna padta hai, jaise user ka login session, shopping cart.

- **Stateful service**: state apni memory me rakhta hai. User ki agli request usi server par aani chahiye.
- **Stateless service**: koi state memory me nahi. Har request me zaroori info (token) aati hai ya state bahar ke store (Redis/DB) se padhi jaati hai.

> [!analogy] Bank ka counter
> Stateful: sirf ek clerk ko aapka case pata hai, woh chhutti par gaya to aapka kaam ruk gaya. Stateless: aapki file central system me hai, kisi bhi counter par jao, kaam ho jayega.

## Stateless kyun better hai scaling ke liye

- Koi bhi server koi bhi request handle kar sakta hai -> load balancing simple (round robin bhi chalega).
- Server crash ho to user ka data nahi khota.
- Auto-scaling easy: servers add/remove karo bina tension.
- Deploy easy: rolling restart me sessions nahi tootte.

## State kahan rakhein?

[[arch Stateless app servers, state bahar]]
client:Users
edge:Load Balancer
svc:App Server 1, svc:App Server 2, svc:App Server 3 ~ koi local state nahi
cache:Redis (sessions / cart), db:Database (permanent data), store:S3 (files)
[[/arch]]

- **Sessions**: Redis jaisa shared cache, ya client side **JWT token** (signed, server ko store nahi karna padta).
- **Files/uploads**: local disk par nahi, object storage (S3) me.
- **Permanent data**: database me.

## Kahan stateful hona zaroori hai

Kuch cheezein naturally stateful hain: **databases**, **caches**, **WebSocket servers** (live connection ek server se juda hai), **game servers**. Inhe scale karne ke liye alag techniques chahiye: sharding, replication, consistent hashing, connection registry.

> [!key] Rule of thumb
> Compute (app servers) ko stateless rakho, state ko specialized systems (DB, cache, queue) me daalo jo replication aur persistence sambhalte hain.

:::interview
Q: Stateless service kya hai aur scaling me kyun madad karti hai?
A: Stateless service kisi request ka data apni local memory me agli request ke liye nahi rakhti. Har request self-contained hoti hai (token ke saath) ya state shared store se aata hai. Isse koi bhi instance koi bhi request handle kar sakta hai, load balancer simple ho jaata hai, auto-scaling aur failover easy ho jaata hai.
Q: User sessions ko distributed system me kaise manage karenge?
A: Options: (1) Sticky sessions (simple par failover aur load balance kharab), (2) centralized session store jaise Redis (fast, shared, TTL ke saath), (3) stateless JWT tokens jo client ke paas hain aur server signature verify karta hai (scalable, par revoke karna mushkil, isliye short expiry + refresh token). Zyada tar systems Redis ya JWT use karte hain.
Q: WebSocket servers stateful kyun hain aur unhe kaise scale karte hain?
A: Har WebSocket ek specific server se persistent TCP connection hai, isliye us user ko message bhejne ke liye wahi server chahiye. Scale karne ke liye: users ko consistent hashing se servers par baanto, ek registry (Redis) rakho ki kaun sa user kis server par connected hai, aur servers ke beech pub/sub (Redis/Kafka) se messages route karo.
:::

@lesson cdn
@title CDN (Content Delivery Network)

Agar aapka server USA me hai aur user Mumbai me, to har request ko samundar paar jaake aana padega: 200+ ms. **CDN** duniya bhar me faile servers (**edge servers / PoPs**) ka network hai jo aapka content user ke **nazdeek** cache karke rakhta hai.

> [!analogy] Amul ke distributors
> Amul har ghar tak Anand (Gujarat) se doodh nahi bhejta. Har shahar me distributor/godown hai. Aap paas ki dukaan se lete ho. CDN edge server wahi paas ki dukaan hai.

[[anim:cdn]]

## CDN kya serve karta hai

- **Static content**: images, videos, CSS, JS, fonts. Sabse common.
- **Video streaming**: Netflix, Hotstar ke video segments.
- **Dynamic content acceleration**: edge se origin tak optimized network routes.
- **Edge computing**: chhota code edge par chalana (Cloudflare Workers).

## Push vs Pull CDN

| | Pull CDN | Push CDN |
|---|---|---|
| Kaise | Pehli request par edge origin se khud le aata hai | Aap khud content CDN par upload karte ho |
| Pehli request | Slow (miss) | Fast |
| Effort | Kam, automatic | Zyada, aapko manage karna |
| Best for | Zyada traffic wali websites | Kam badalne wala bada content (video library) |

## Cache control

- **TTL** (`Cache-Control: max-age=86400`): kitni der edge par rahe.
- **Cache invalidation / purge**: content badla to CDN se purana hatao.
- **Versioned URLs**: `app.v42.js` ya `logo.png?v=7`. File badli to naam badal do, purane cache ki tension khatam. Sabse reliable tareeka.

## CDN ke fayde

- **Latency kam**: content paas se.
- **Origin load kam**: 90%+ requests edge se hi serve.
- **Bandwidth cost kam**.
- **Availability**: origin down ho to bhi cached content mil sakta hai.
- **DDoS protection**: bada distributed network attack absorb kar leta hai.

> [!warn] CDN par kya mat daalo
> Personalized ya private data (bank balance, cart) public CDN cache me nahi jaana chahiye. `Cache-Control: private, no-store` use karein. Galat caching se ek user ka data doosre ko dikh sakta hai.

Popular CDNs: Cloudflare, Akamai, AWS CloudFront, Fastly, Google Cloud CDN.

:::interview
Q: CDN kaise kaam karta hai?
A: CDN duniya bhar me edge servers (PoPs) rakhta hai. DNS/Anycast user ko nazdeeki edge par bhejta hai. Edge par content cached hai (hit) to turant serve, nahi hai (miss) to origin se laake cache karta hai (TTL tak) aur serve karta hai. Isse latency, origin load aur bandwidth cost kam hoti hai.
Q: Push aur Pull CDN me farak?
A: Pull CDN pehli request par lazy tareeke se origin se content laata hai (setup easy, pehli request slow). Push CDN me aap pehle se content upload karte ho (pehli request bhi fast, par storage aur updates aapko manage karne padte hain). High-traffic sites pull, rarely-changing bade files push.
Q: CDN par cached file update karni ho to kya karenge?
A: Best: versioned/fingerprinted file names (`main.3f9a.js`) taaki naya version naya URL ho aur purana apne aap expire ho. Alternative: CDN purge/invalidation API call karna, ya chhota TTL rakhna (par isse hit ratio ghatta hai).
:::

@quiz
Q: Vertical scaling ka sabse bada nuksaan kya hai?
- Code change karna padta hai
+ Hardware limit aur single point of failure
- Load balancer zaroori hai
- Data consistency mushkil hoti hai
E: Ek machine ko ek hadd tak hi bada kar sakte ho, aur woh ek hi machine gire to poora system gir jaata hai.

Q: Requests ka processing time bahut alag-alag hai. Kaunsa LB algorithm behtar hai?
- Round Robin
+ Least Connections
- Random
- Static mapping
E: Least Connections actual load (active connections) dekhta hai, isliye bhaari requests ek server par jama nahi hoti.

Q: `/api/*` ko API servers aur `/images/*` ko image servers par bhejna hai. Kaunsa load balancer chahiye?
- L4
+ L7
- DNS round robin
- Forward proxy
E: Path-based routing ke liye HTTP request padhni padti hai, jo sirf L7 (application layer) load balancer karta hai.

Q: Nginx website ke aage lagakar TLS termination aur caching karna kya kehlata hai?
- Forward proxy
+ Reverse proxy
- VPN
- NAT
E: Reverse proxy server ki taraf baithta hai aur servers ki taraf se TLS, caching, compression, security sambhalta hai.

Q: App servers ko horizontally scale karne ke liye sabse zaroori kya hai?
- Har server par alag database
+ App ko stateless banana
- Sticky sessions lagana
- Bada CPU
E: Stateless app me koi bhi server koi bhi request handle kar sakta hai, isliye servers freely add/remove ho sakte hain.

Q: Sticky sessions ka nuksaan kya hai?
- Latency badhti hai
+ Server gira to session gaya, aur load barabar nahi bantta
- HTTPS kaam nahi karta
- Cache disable ho jaata hai
E: User ek server se bandh jaata hai. Woh server down hua to session khatam, aur kuch servers par zyada load ho sakta hai.

Q: CDN par cached JS file update karne ka sabse reliable tareeka?
- User ko cache clear karne bolna
- TTL 1 saal rakhna
+ File ka naam version ke saath badalna (main.v43.js)
- CDN band karna
E: Naya version naya URL hota hai, to purana cache apne aap irrelevant ho jaata hai. Koi stale content nahi.

Q: Pull CDN me pehli request ke saath kya hota hai?
+ Edge par miss hota hai, edge origin se content laake cache karta hai
- Request fail hoti hai
- Content pehle se push hota hai
- Request seedha database par jaati hai
E: Pull CDN lazy hai: pehli request miss hoti hai, uske baad TTL tak edge se hi serve hota hai.

Q: Load balancer khud SPOF na bane, iske liye kya karte hain?
- Ek bada LB lagate hain
+ Active-passive ya active-active LB pair with failover
- LB hata dete hain
- Sticky sessions lagate hain
E: Redundant LBs (heartbeat aur floating IP ke saath) ya multiple LBs DNS ke through, taaki ek gire to doosra sambhal le.
