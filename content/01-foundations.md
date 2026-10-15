@module foundations
@title Foundations
@level Beginner
@desc System design kya hai, internet kaise chalta hai, APIs, latency aur estimation. Yahi neev hai.

@lesson what-is-system-design
@title System Design kya hai?

Socho aapne ek chhota sa chai ka stall khola. Shuru me 20 customers aate hain, aap akele sab sambhal lete ho. Phir aapki chai famous ho gayi aur roz 2,000 log aane lage. Ab kya karoge? Zyada stove, zyada helpers, alag counter for billing, raw material ka stock, aur agar ek helper bimaar ho jaye to backup. **Yahi soch system design hai**: ek system ko is tarah banana ki woh zyada load, failures aur badlaav sab jhel sake.

Software me system design ka matlab hai: kisi application (jaise WhatsApp, Swiggy, YouTube) ke **components** kaun se honge, woh **aapas me kaise baat karenge**, data **kahan aur kaise store** hoga, aur system **lakho users** ke saath bhi **fast, reliable aur sasta** kaise chalega.

> [!analogy] Ghar banana vs system banana
> Ek architect ghar banane se pehle naksha (blueprint) banata hai: kitne kamre, kahan pillar, pani ki line kahan se. Software me bhi coding se pehle "naksha" banta hai: kaun sa server, kaun sa database, cache kahan. Ye naksha hi system design hai.

## System design ke do levels

| Level | Kya decide hota hai | Example |
|---|---|---|
| HLD (High Level Design) | Bade components aur unka connection: servers, databases, cache, queues, load balancer | "WhatsApp me messages ke liye Cassandra, real-time ke liye WebSocket servers" |
| LLD (Low Level Design) | Code ke andar ka design: classes, interfaces, design patterns, relationships | "Parking lot me `ParkingSpot`, `Vehicle`, `Ticket` classes aur unke methods" |

Is course me dono cover hain: Modules 1–10 me HLD aur Module 11 me LLD.

## Ek achhe system ki khoobiyan

- **Scalability**: users 100 se 10 crore ho jayein, tab bhi system chale.
- **Availability**: system hamesha (ya lagbhag hamesha) up rahe. 99.99% matlab saal me sirf ~52 minute downtime.
- **Reliability**: system sahi kaam kare, data galat ya lost na ho.
- **Performance / Latency**: response fast aaye. User 2 second se zyada wait nahi karta.
- **Maintainability**: naye developers samajh sakein, features asaani se add hon.
- **Cost efficiency**: kam paise me zyada kaam.

> [!key] Trade-offs hi asli game hai
> System design me koi ek "perfect" answer nahi hota. Har decision ek **trade-off** hai: speed vs consistency, cost vs availability, simplicity vs flexibility. Interviewer dekhta hai ki aap trade-offs samajhte ho ya nahi.

## Functional vs Non-functional requirements

Koi bhi design shuru karne se pehle requirements clear karo:

- **Functional requirements**: system *kya* karega. Example (Instagram): photo upload, follow, feed dekhna, like, comment.
- **Non-functional requirements**: system *kaisa* hoga. Example: feed 200 ms me load ho, 99.99% available, 50 crore daily users handle kare, photos kabhi lost na hon.

> [!tip] Interview ka pehla 5 minute
> Hamesha requirements poochhkar shuru karein: "Kitne users? Read heavy ya write heavy? Kaun se features must-have hain?" Seedha diagram banana sabse common galti hai.

## Ek typical web system ka naksha

[[arch Ek typical scalable web application]]
client:Mobile App, client:Web Browser
edge:DNS, edge:CDN
edge:Load Balancer
svc:App Server 1, svc:App Server 2, svc:App Server 3 ~ stateless servers, zarurat ke hisaab se badhte/ghatte hain
cache:Redis Cache, queue:Message Queue, store:Object Storage (S3)
db:Primary DB, db:Read Replica
[[/arch]]

Is course me hum in sab boxes ko ek-ek karke samjhenge. Jab aap Module 10 tak pahunchoge, to aap aise diagrams khud bana paoge aur har box ka "kyun" bata paoge.

## Interview me kya check hota hai?

1. **Requirement clarity**: sahi sawaal pooche ya nahi.
2. **High-level structure**: components aur data flow logical hai ya nahi.
3. **Depth**: kisi ek component (jaise database choice ya caching) me gehraai tak ja sakte ho ya nahi.
4. **Trade-offs**: har choice ka reason aur uska nuksaan bata sakte ho ya nahi.
5. **Communication**: soch ko clearly bol ke samjha sakte ho ya nahi.

:::interview
Q: System design kya hai, ek line me samjhaiye.
A: System design ek process hai jisme hum decide karte hain ki ek software system ke components (servers, databases, caches, queues) kya honge, woh aapas me kaise communicate karenge, aur system scalability, availability, performance aur cost ki requirements kaise poori karega.
Q: HLD aur LLD me kya farak hai?
A: **HLD** (High Level Design) system ka bird's-eye view hai: kaun se services, databases, caches, load balancers, aur unke beech data flow. **LLD** (Low Level Design) ek component ke andar ka detail hai: classes, interfaces, methods, design patterns aur unke relationships. HLD "kya-kya bana hai" batata hai, LLD "kaise code hoga" batata hai.
Q: Functional aur non-functional requirements ka ek example dijiye.
A: Uber ke liye:
- Functional: rider ride book kar sake, driver ride accept kar sake, live location dikhe, payment ho.
- Non-functional: matching 1–2 second me ho, system 99.99% available ho, lakhon concurrent drivers ki location updates handle kare, payment data kabhi lost na ho.
Q: System design interview me sabse common galti kya hai?
A: Requirements clarify kiye bina seedha architecture banana. Isse aap galat problem solve kar dete ho. Doosri common galti hai trade-offs na batana: sirf "Kafka use karenge" bolna, bina ye bataye ki kyun aur iska nuksaan kya hai.
:::

@lesson client-server
@title Client-Server Model

Internet par lagbhag har cheez **client-server model** par chalti hai. **Client** woh hai jo kuch maangta hai (aapka browser, mobile app). **Server** woh computer hai jo maangi hui cheez deta hai (website ka data, video, API response).

> [!analogy] Restaurant
> Aap (client) waiter ko order dete ho: "Ek masala dosa." Kitchen (server) dosa banata hai aur waiter wapas laata hai. Aapko nahi pata kitchen me kitne cook hain ya gas kahan se aata hai. Bas order diya, cheez mili. Client ko server ki andar ki details se matlab nahi.

[[anim:client-server]]

## Request aur Response

Har baat-cheet do hisson me hoti hai:

1. **Request**: client bhejta hai. Isme hota hai: kya chahiye (URL/path), kaise (method: GET, POST...), aur extra info (headers, body).
2. **Response**: server lautata hai. Isme hota hai: status code (200 OK, 404 Not Found...), headers, aur data (HTML, JSON, image).

```http
GET /products?category=shoes HTTP/1.1
Host: api.shop.com
Authorization: Bearer eyJhbGciOi...

HTTP/1.1 200 OK
Content-Type: application/json

[{"id": 101, "name": "Running Shoes", "price": 2499}]
```

## Client types

- **Thin client**: browser jo mostly server se HTML leke dikhata hai.
- **Thick/Rich client**: mobile app ya React app jo khud bahut logic chalata hai aur server se sirf data (JSON) leta hai.

## Server ke andar kya hota hai?

Ek "server" asal me ek computer hai jis par ek program chal raha hai jo network par requests sunta hai (jaise port 443 par). Bade systems me ek server nahi, **hazaaron servers** hote hain, alag-alag kaam ke liye:

- **Web/App server**: business logic chalata hai (order place karna, login).
- **Database server**: data store karta hai.
- **File/Media server**: images, videos serve karta hai.
- **Cache server**: frequently used data memory me rakhta hai.

## Peer-to-Peer (P2P): ek alternative

Client-server me ek central server hota hai. **P2P** me har computer client bhi hai aur server bhi (jaise BitTorrent). Isme central server ka load nahi, par control, security aur consistency mushkil. Zyada tar apps client-server hi use karti hain.

> [!key] Yaad rakhein
> Client kabhi trusted nahi hota. User app ko modify kar sakta hai. Isliye price calculation, permissions, validation jaise important checks hamesha **server par** hone chahiye.

:::interview
Q: Client-server model kya hai?
A: Ek architecture jisme client (browser/app) request bhejta hai aur server us request ko process karke response lautata hai. Server centralized hota hai aur data, logic aur security sambhalta hai, jabki client UI aur user interaction sambhalta hai.
Q: Validation client par karein ya server par?
A: Dono par, par **server par zaroori hai**. Client-side validation sirf user experience ke liye hai (turant error dikhana). Client ko bypass kiya ja sakta hai (Postman, modified app), isliye security aur data correctness ke liye server-side validation mandatory hai.
Q: Client-server vs Peer-to-peer ka trade-off batayiye.
A: Client-server: simple control, security aur consistency easy, par central server bottleneck aur cost ka source hai. P2P: load sab peers me bant jaata hai, central cost kam, par peers unreliable hote hain, security aur data consistency mushkil hai. Isliye file-sharing (BitTorrent) jaisi cheezon me P2P, baaki zyada tar apps me client-server.
:::

@lesson how-internet-works
@title Internet kaise kaam karta hai: IP, Ports, DNS

Jab aap browser me `www.flipkart.com` likhte ho aur Enter dabate ho, to 1 second se kam me kai cheezein hoti hain. Is lesson me hum us safar ko samjhenge.

## IP address: computer ka ghar ka pata

Internet par har device ka ek **IP address** hota hai, jaise ghar ka pata.

- **IPv4**: `142.250.183.14` jaisa, 32-bit. Lagbhag 4.3 billion addresses, jo kam pad gaye.
- **IPv6**: `2404:6800:4009:82b::200e` jaisa, 128-bit. Practically unlimited addresses.
- **Public IP**: internet par dikhne wala. **Private IP**: ghar/office ke andar (jaise `192.168.1.5`). Router **NAT** se private ko public me badalta hai.

## Port: building ke andar flat number

Ek server par kai programs chal sakte hain. **Port** batata hai ki request kis program ke liye hai. IP = building ka address, Port = flat number.

| Port | Service |
|---|---|
| 80 | HTTP |
| 443 | HTTPS |
| 22 | SSH |
| 5432 | PostgreSQL |
| 6379 | Redis |
| 3306 | MySQL |

## DNS: internet ki phonebook

Insaan naam yaad rakhte hain (`google.com`), computer numbers (IP) samajhte hain. **DNS (Domain Name System)** naam ko IP me badalta hai.

[[anim:dns]]

### DNS resolution ke steps

1. Browser apna cache dekhta hai, phir OS ka cache.
2. Nahi mila to query **Recursive Resolver** ko jaati hai (ISP ka, ya 8.8.8.8, 1.1.1.1).
3. Resolver **Root server** se poochta hai -> root batata hai ".com" ka **TLD server** kaun hai.
4. TLD server batata hai domain ka **Authoritative name server** kaun hai.
5. Authoritative server asli **IP address** deta hai.
6. Resolver answer ko **TTL** (time to live) tak cache karta hai, taaki agli baar fast ho.

### Important DNS records

| Record | Kaam |
|---|---|
| A | Domain -> IPv4 address |
| AAAA | Domain -> IPv6 address |
| CNAME | Ek naam ko doosre naam par point karna (alias) |
| MX | Email kis server par jaaye |
| NS | Domain ka authoritative name server |
| TXT | Verification, SPF jaisi text info |

> [!pro] DNS bhi load balancing karta hai
> Ek domain ke multiple A records ho sakte hain. DNS alag users ko alag IP de sakta hai (round-robin DNS), ya user ke location ke hisaab se nazdeeki data center ka IP (GeoDNS). Netflix, Google yahi karte hain.

## Poora safar: URL se page tak

[[flow:client:Browser -> edge:DNS lookup -> svc:TCP connect -> svc:TLS handshake -> svc:HTTP request -> svc:Server response -> client:Page render]]

1. **DNS lookup**: naam se IP mila.
2. **TCP connection**: 3-way handshake se connection bana (agle lesson me).
3. **TLS handshake**: HTTPS ke liye encryption keys tay hui.
4. **HTTP request** gayi, server ne process kiya.
5. **Response** aaya, browser ne HTML, CSS, JS download karke page dikhaya.

> [!warn] TTL ka trade-off
> TTL zyada (jaise 1 din) = kam DNS queries, fast lookups. Par agar server ka IP badla to users 1 din tak purane IP par jaate rahenge. Migration se pehle TTL chhota kar dena achha practice hai.

:::interview
Q: Browser me URL type karne se page load hone tak kya hota hai?
A: Ye classic question hai. Steps:
1. Browser/OS cache me DNS check, nahi mila to recursive resolver -> root -> TLD -> authoritative se IP milta hai.
2. Us IP ke port 443 par TCP 3-way handshake.
3. TLS handshake (certificate verify, session keys).
4. HTTP GET request; beech me load balancer/CDN ho sakte hain.
5. Server request process karta hai (app server, cache, DB) aur response bhejta hai.
6. Browser HTML parse karta hai, CSS/JS/images ke liye aur requests, phir page render.
Q: DNS caching kahan-kahan hoti hai?
A: Browser cache, OS cache, router, ISP ka recursive resolver, aur kabhi-kabhi application level par. Har jagah TTL ke hisaab se entry expire hoti hai.
Q: A record aur CNAME me kya farak hai?
A: A record domain ko seedha IPv4 address par map karta hai. CNAME ek domain ko doosre domain naam par point karta hai (alias), jaise `www.shop.com` -> `shop.azurefd.net`. CNAME ke baad us naam ka A record resolve hota hai.
Q: GeoDNS kya hai?
A: DNS jo user ke location ke hisaab se alag IP lautata hai, taaki user nazdeeki data center ya CDN edge par jaaye. Isse latency kam aur load distribute hota hai.
:::

@lesson tcp-udp
@title TCP vs UDP

Data internet par chhote-chhote **packets** me jaata hai. Ye packets kaise bheje jaayein, iske do main tareeke (transport layer protocols) hain: **TCP** aur **UDP**.

> [!analogy] Registered post vs pamphlet
> **TCP** registered post jaisa hai: delivery confirm hoti hai, kho gaya to dobara bheja jaata hai, sab order me pahunchta hai. **UDP** pamphlet baantne jaisa hai: fenk diya, pahuncha ya nahi koi check nahi, par bahut fast aur sasta.

[[anim:tcp]]

## TCP (Transmission Control Protocol)

- **Connection-oriented**: data bhejne se pehle **3-way handshake** (SYN -> SYN-ACK -> ACK).
- **Reliable**: har packet ka acknowledgement (ACK). Lost packet **retransmit** hota hai.
- **Ordered**: packets sequence number se sahi order me jode jaate hain.
- **Flow control & congestion control**: receiver ya network overload na ho, isliye speed adjust karta hai.
- Thoda **slow** aur zyada overhead.

**Use**: web (HTTP/1.1, HTTP/2), email, file transfer, database connections, payments, SSH.

## UDP (User Datagram Protocol)

- **Connectionless**: koi handshake nahi, seedha bhejo.
- **Unreliable**: ACK nahi, retransmit nahi. Packet kho gaya to kho gaya.
- **Unordered**: packets kisi bhi order me aa sakte hain.
- Bahut **fast**, kam overhead.

**Use**: video/voice calls, live streaming, online gaming, DNS queries, IoT sensors.

| Feature | TCP | UDP |
|---|---|---|
| Connection | Handshake zaroori | Nahi |
| Reliability | Guaranteed delivery | Koi guarantee nahi |
| Order | Ordered | Unordered |
| Speed | Thoda slow | Fast |
| Header size | 20+ bytes | 8 bytes |
| Example | HTTP, SMTP, SSH | DNS, VoIP, gaming |

> [!tip] Video call UDP kyun?
> Video call me agar 1 frame kho gaya to use 2 second baad dobara dikhane ka koi matlab nahi. Live baat me "fresh" data zyada important hai, "complete" data nahi. Isliye UDP.

> [!pro] HTTP/3 aur QUIC
> Naya **HTTP/3** protocol **QUIC** par chalta hai, jo UDP ke upar bana hai par reliability khud handle karta hai. Isse connection setup fast hota hai aur ek packet lost hone par baaki streams nahi rukti (head-of-line blocking kam). Google, YouTube, Cloudflare isse use karte hain.

## OSI model ka chhota sa idea

Interview me kabhi-kabhi poochte hain. Simple yaad rakhne layak layers:

| Layer | Kya | Example |
|---|---|---|
| 7 Application | App ka protocol | HTTP, DNS, SMTP |
| 4 Transport | End-to-end delivery | TCP, UDP |
| 3 Network | Routing, addressing | IP |
| 2 Data link | Ek hop par delivery | Ethernet, Wi-Fi |
| 1 Physical | Signals | Cable, radio |

Load balancers bhi isi hisaab se L4 (transport level) aur L7 (application level) kehlate hain. Ye Module 2 me aayega.

:::interview
Q: TCP 3-way handshake samjhaiye.
A: Client server ko **SYN** bhejta hai (apna starting sequence number). Server **SYN-ACK** bhejta hai (apna sequence number + client ka acknowledgement). Client **ACK** bhejta hai. Ab dono taraf ka connection established hai aur data transfer shuru ho sakta hai. Isse dono sides sequence numbers sync karte hain.
Q: Live cricket streaming ke liye TCP use karenge ya UDP?
A: Live, low-latency streaming (jaise video call ya real-time broadcast) ke liye UDP-based protocols (WebRTC, QUIC) better hain kyunki thoda data loss chalega par delay nahi. Lekin Hotstar/YouTube jaisi normal streaming HLS/DASH par hoti hai jo HTTP (TCP ya QUIC) par chalti hai, kyunki woh kuch seconds ka buffer rakhte hain aur reliability chahte hain. Isliye answer use-case par depend karta hai.
Q: DNS UDP kyun use karta hai?
A: DNS queries chhoti hoti hain aur ek request-response me kaam ho jaata hai. TCP handshake ka overhead DNS ki latency badha deta. Agar response bahut bada ho (512 bytes se zyada, jaise DNSSEC) ya zone transfer ho, tab DNS TCP use karta hai.
:::

@lesson http-https
@title HTTP, HTTPS aur Status Codes

**HTTP (HyperText Transfer Protocol)** woh "bhasha" hai jisme browser aur server baat karte hain. Ye **stateless** hai: har request apne aap me complete hai, server ko pichhli request yaad nahi rehti.

## HTTP methods

| Method | Kaam | Idempotent? | Example |
|---|---|---|---|
| GET | Data padhna | Haan | `GET /users/42` |
| POST | Naya resource banana | Nahi | `POST /orders` |
| PUT | Poora resource replace | Haan | `PUT /users/42` |
| PATCH | Thoda sa update | Usually nahi | `PATCH /users/42` |
| DELETE | Hatana | Haan | `DELETE /users/42` |

> [!key] Idempotent ka matlab
> Ek hi request ko 1 baar bhejo ya 10 baar, result same rahe. `DELETE /users/42` das baar bhejo, user ek hi baar delete hoga. Lekin `POST /orders` das baar bheja to 10 orders ban sakte hain! Isliye retry karte waqt idempotency bahut important hai (Module 7 me detail).

## Status codes

| Range | Matlab | Common codes |
|---|---|---|
| 1xx | Info | 101 Switching Protocols (WebSocket) |
| 2xx | Success | 200 OK, 201 Created, 204 No Content |
| 3xx | Redirect | 301 Moved Permanently, 302 Found, 304 Not Modified |
| 4xx | Client ki galti | 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 429 Too Many Requests |
| 5xx | Server ki galti | 500 Internal Error, 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout |

> [!tip] 401 vs 403
> **401**: "Aap kaun ho, pata nahi" (login nahi kiya / token galat). **403**: "Pata hai aap kaun ho, par aapko permission nahi."

## Headers: request ke saath extra info

- `Content-Type: application/json`: body kis format me hai.
- `Authorization: Bearer <token>`: kaun request kar raha hai.
- `Cache-Control: max-age=3600`: kitni der cache kar sakte ho.
- `Cookie` / `Set-Cookie`: chhota data browser me store karna (session id).
- `User-Agent`: kaun sa browser/app.

## HTTP stateless hai, to login kaise yaad rehta hai?

Server login ke baad ek **session id** (cookie me) ya **token** (JWT) deta hai. Har agli request ke saath client ye bhejta hai, aur server pehchaan leta hai. Detail Module 9 me.

## HTTPS: HTTP + encryption

**HTTPS = HTTP + TLS**. Beech me koi (jaise public Wi-Fi par hacker) data padh ya badal nahi sakta.

1. Browser server se uska **certificate** leta hai (jisme public key hai, kisi trusted Certificate Authority ne sign kiya hai).
2. Browser certificate verify karta hai (sahi domain, expire nahi, trusted CA).
3. **Asymmetric encryption** (public/private key) se dono ek **shared session key** tay karte hain.
4. Uske baad saara data **symmetric encryption** (fast) se jaata hai.

> [!pro] TLS termination
> Bade systems me HTTPS ko load balancer par hi "khol" diya jaata hai (**TLS termination**), aur andar ke network me plain HTTP ya internal TLS chalta hai. Isse app servers ka CPU bachta hai aur certificates ek jagah manage hote hain.

## HTTP versions ek nazar me

| Version | Khaas baat |
|---|---|
| HTTP/1.1 | Ek connection par ek time ek request (keep-alive se connection reuse) |
| HTTP/2 | Ek connection par kai requests saath (multiplexing), header compression |
| HTTP/3 | QUIC (UDP) par, fast setup, packet loss me kam rukawat |

:::interview
Q: PUT aur PATCH me kya farak hai?
A: PUT poore resource ko replace karta hai (jo field nahi bheja woh hat sakta hai) aur idempotent hai. PATCH sirf diye gaye fields update karta hai (partial update). PATCH idempotent ho bhi sakta hai aur nahi bhi, depend karta hai operation par (jaise "counter +1" idempotent nahi).
Q: 502, 503 aur 504 me farak batayiye.
A: **502 Bad Gateway**: proxy/load balancer ko upstream server se galat ya invalid response mila. **503 Service Unavailable**: server abhi request handle nahi kar sakta (overload ya maintenance). **504 Gateway Timeout**: proxy ne upstream server ka wait kiya par time par response nahi aaya.
Q: HTTPS kaise kaam karta hai?
A: TLS handshake me server apna certificate bhejta hai, client use trusted CA se verify karta hai. Phir asymmetric cryptography (jaise ECDHE key exchange) se ek shared symmetric session key banti hai. Uske baad saara HTTP data us symmetric key se encrypt hota hai. Isse confidentiality, integrity aur server authentication milti hai.
Q: HTTP stateless kyun hai aur ye design ke liye achha kyun hai?
A: Har request independent hai, server ko pichhli request ka state yaad nahi rakhna padta. Isse koi bhi server kisi bhi request ko handle kar sakta hai, jo horizontal scaling aur load balancing ko easy banata hai. State (session) ko token ya shared store (Redis) me rakha jaata hai.
:::

@lesson apis
@title APIs: REST, GraphQL, gRPC

**API (Application Programming Interface)** do software ke beech ka contract hai: "Mujhe ye do, main tumhe ye dunga." Jab Zomato app restaurant list dikhata hai, to woh Zomato ke server ki API call karta hai.

> [!analogy] Menu card
> API restaurant ke menu jaisi hai. Menu batata hai kya order kar sakte ho aur kaise. Kitchen ke andar kya hota hai, aapko nahi pata hona chahiye. Kitchen badal jaye, menu same raha to customer ko farak nahi padta.

## REST (Representational State Transfer)

Sabse popular style. Har cheez ek **resource** hai jise URL se pehchana jaata hai, aur HTTP methods se action hota hai.

```http
GET    /users/42            -> user 42 ki details
GET    /users/42/orders     -> user 42 ke orders
POST   /orders              -> naya order
PATCH  /orders/981          -> order update
DELETE /orders/981          -> order cancel
```

**REST ke rules**: stateless, resource-based URLs (noun, verb nahi: `/orders` sahi, `/createOrder` galat), standard methods aur status codes, aksar JSON.

**Fayde**: simple, har jagah support, HTTP caching kaam karti hai.
**Nuksaan**: **over-fetching** (zaroorat se zyada data aana) aur **under-fetching** (ek screen ke liye kai API calls).

## GraphQL

Facebook ka banaya. Client **khud batata hai** ki use kaun se fields chahiye, ek hi endpoint par.

```graphql
query {
  user(id: 42) {
    name
    orders(last: 3) { id total }
  }
}
```

**Fayde**: na over-fetching na under-fetching, ek request me nested data, mobile apps ke liye badhiya.
**Nuksaan**: HTTP caching mushkil, complex queries server ko slow kar sakti hain (query cost limit lagani padti hai), learning curve.

## gRPC

Google ka banaya. **Protocol Buffers** (binary format) aur **HTTP/2** use karta hai. Aap function call jaisa likhte ho, network call ho jaati hai.

```proto
service PaymentService {
  rpc Charge (ChargeRequest) returns (ChargeResponse);
}
message ChargeRequest { string order_id = 1; int64 amount_paise = 2; }
```

**Fayde**: bahut fast aur compact, strict typed contract, streaming support.
**Nuksaan**: browser me direct support kam, human-readable nahi (debug mushkil).
**Use**: microservices ke **andar** service-to-service communication.

| | REST | GraphQL | gRPC |
|---|---|---|---|
| Format | JSON (text) | JSON | Protobuf (binary) |
| Transport | HTTP/1.1 ya 2 | HTTP | HTTP/2 |
| Best for | Public APIs, CRUD | Complex UIs, mobile | Internal microservices |
| Caching | Easy (HTTP) | Mushkil | Custom |
| Speed | Achha | Achha | Sabse fast |

## Achhi API design ke rules

- **Versioning**: `/v1/orders`, taaki purane clients na tootein.
- **Pagination**: lakhon records ek saath mat bhejo. `?limit=20&cursor=abc` (cursor-based) ya `?page=3` (offset-based).
- **Filtering & sorting**: `GET /products?category=shoes&sort=-price`.
- **Idempotency key**: payment jaisi POST requests me `Idempotency-Key` header, taaki retry par double charge na ho.
- **Rate limiting**: har client ki limit (429 status).
- **Clear errors**: `{"error": "INSUFFICIENT_BALANCE", "message": "..."}`.

> [!tip] Cursor vs offset pagination
> Offset (`page=1000`) me database ko pehle 20,000 rows skip karni padti hain, slow. Aur beech me naya data aaya to items repeat ho sakte hain. Cursor (`after=last_seen_id`) fast aur stable hai. Infinite scroll feeds cursor use karte hain.

:::interview
Q: REST, GraphQL aur gRPC me se kab kya choose karenge?
A: **Public API** ya simple CRUD ke liye REST (simple, cacheable, sab samajhte hain). **Complex frontend** jahan alag screens ko alag fields chahiye, mobile par bandwidth bachani ho, wahan GraphQL. **Internal microservices** jahan low latency, strict contracts aur streaming chahiye, wahan gRPC. Bahut companies teeno use karti hain: bahar REST/GraphQL, andar gRPC.
Q: Over-fetching aur under-fetching kya hai?
A: Over-fetching: API zaroorat se zyada fields bhejti hai (sirf naam chahiye tha, poora profile aaya). Under-fetching: ek screen ke liye kai APIs call karni padti hain (user, phir orders, phir har order ka item). GraphQL dono solve karta hai kyunki client exact fields maangta hai.
Q: API me pagination kaise design karenge?
A: Chhote, stable datasets ke liye offset/limit chal jaata hai. Bade ya tezi se badalte data (feeds, logs) ke liye **cursor-based pagination**: response me `next_cursor` (jaise last item ka id/timestamp) do, client agli request me bheje. Ye index use karta hai, fast hai, aur naye items aane par duplicate/miss nahi hota.
Q: Idempotency key kya hai?
A: Client ek unique key (UUID) ke saath request bhejta hai. Server us key ka result store karta hai. Agar network fail hone par client same key ke saath retry kare, to server dobara kaam nahi karta, purana result lauta deta hai. Payments me double charge rokne ke liye zaroori.
:::

@lesson latency-throughput
@title Latency, Throughput aur Latency Numbers

Performance ki baat karte waqt do shabd sabse zyada aate hain: **latency** aur **throughput**.

> [!analogy] Mumbai local train
> **Latency** = ek yatri ko Virar se Churchgate pahunchne me kitna time laga (jaise 90 minute). **Throughput** = ek ghante me kitne yatri pahunche (jaise 50,000). Train fast karo to latency ghategi. Zyada trains ya lambi trains chalao to throughput badhega, latency same reh sakti hai.

## Definitions

- **Latency**: ek request ko poora hone me laga time (ms me). Kam = achha.
- **Throughput**: per second kitni requests/data handle hua (QPS, RPS, MB/s). Zyada = achha.
- **Bandwidth**: network ki maximum capacity (pipe kitna mota hai). Throughput asal me kitna use hua.
- **QPS (Queries per second)** / **RPS**: load naapne ki unit.

## Percentiles: average jhooth bolta hai

Agar 99 requests 10 ms me aur 1 request 5 second me aayi, to average ~60 ms dikhega, jo sach nahi batata. Isliye **percentiles** use hote hain:

- **p50 (median)**: aadhi requests isse fast.
- **p95**: 95% requests isse fast.
- **p99**: 99% requests isse fast. **Tail latency** isi ko kehte hain.

> [!pro] Tail latency kyun matter karti hai
> Ek page load me agar 100 backend calls lagti hain aur har call ka p99 = 1 second, to lagbhag har page load me koi na koi call slow hogi. Bade systems p99 aur p99.9 par optimize karte hain.

## Latency numbers har engineer ko pata hone chahiye

Ye numbers aapko intuition dete hain ki kya fast hai aur kya slow. Exact yaad karne ki zaroorat nahi, **order of magnitude** yaad rakhiye.

[[anim:latency]]

> [!key] Is chart se 4 sabak
> 1. **Memory disk se bahut fast hai.** RAM ~100 ns, SSD read ~100+ µs, HDD seek ~10 ms. Isliye caching (memory me rakhna) itna powerful hai.
> 2. **Sequential read random read se fast hai.** Isliye databases log-structured writes use karte hain.
> 3. **Network round trip mehenga hai**, especially continents ke beech. Isliye CDN aur data centers user ke paas rakhe jaate hain.
> 4. **Data compress karke bhejna** aksar sasta padta hai (CPU sasta, network mehenga).

## Latency kam karne ke tareeke

- **Caching**: frequently used data memory me.
- **CDN**: static content user ke nazdeek.
- **Database indexing**: full scan se bachna.
- **Async processing**: jo kaam turant zaroori nahi (email bhejna), use queue me daal do.
- **Connection pooling**: har request par naya DB connection mat banao.
- **Fewer round trips**: batching, HTTP/2, GraphQL.

## Throughput badhane ke tareeke

- **Horizontal scaling**: aur servers.
- **Batching**: ek-ek ki jagah 100 records ek saath likho.
- **Parallelism**: kaam ko tukdon me baant kar saath chalao.
- **Bottleneck dhoondo**: system utna hi fast hai jitna uska sabse slow hissa.

:::interview
Q: Latency aur throughput me kya farak hai? Kya dono saath improve hote hain?
A: Latency ek request ka time hai, throughput per second kitni requests complete hoti hain. Hamesha saath nahi badhte: batching throughput badhati hai par har item ki latency thodi badha sakti hai (wait karna padta hai batch bharne ka). Aur ek server ko overload karke throughput badhane ki koshish karo to queueing ki wajah se latency bahut badh jaati hai.
Q: Average latency ke bajaye p99 kyun monitor karte hain?
A: Average outliers ko chhupa deta hai. p99 batata hai ki sabse slow 1% users ka experience kaisa hai. High-traffic systems me 1% bhi lakhon users hote hain, aur fan-out wali requests me tail latency poore page ko slow kar deti hai.
Q: Agar API slow hai to aap kaise debug karenge?
A: Pehle measure karo: p50/p95/p99 dekho, kab se slow hua. Distributed tracing se dekho time kahan ja raha hai (DB query, external API, serialization). Phir common causes check karo: missing index, N+1 queries, cache miss rate, connection pool exhaustion, GC pauses, network calls in a loop. Fix ke baad dobara measure karo.
:::

@lesson estimation
@title Back-of-the-envelope Estimation

Interview me aksar poocha jaata hai: "Kitna storage chahiye? Kitne servers?" Ye **back-of-the-envelope estimation** hai: rough calculation jo batati hai ki design kis scale ka hai. Exact answer nahi chahiye, **sahi order of magnitude** chahiye (10 GB hai ya 10 TB?).

## Zaroori numbers yaad rakhiye

| Cheez | Value |
|---|---|
| 1 din | 86,400 sec ≈ **10^5 sec** |
| 1 mahina | ≈ 2.5 million sec |
| 1 saal | ≈ 3 × 10^7 sec |
| 1 million / day | ≈ **12 per second** |
| 1 billion / day | ≈ 12,000 per second |
| 1 KB | 10^3 bytes |
| 1 MB / GB / TB / PB | 10^6 / 10^9 / 10^12 / 10^15 bytes |
| 1 character (ASCII) | 1 byte |
| Ek tweet/text message | ~100–300 bytes |
| Ek photo (compressed) | ~200 KB – 2 MB |
| 1 min video (HD) | ~50–100 MB |

> [!tip] Powers of 2 aur 10
> 2^10 ≈ 1 thousand (KB), 2^20 ≈ 1 million (MB), 2^30 ≈ 1 billion (GB), 2^40 ≈ 1 trillion (TB). Estimation me 1024 ko 1000 maan lo, chalega.

## Step-by-step formula

1. **Users**: DAU (daily active users) assume karo.
2. **QPS**: `DAU × requests per user per day / 86,400`
3. **Peak QPS**: average × 2 ya 3 (shaam ko traffic zyada).
4. **Read vs Write**: read:write ratio (social media me 100:1 tak).
5. **Storage**: `writes per day × size per item × days × years`, phir replication (×3).
6. **Bandwidth**: `QPS × size per request`.
7. **Servers**: `peak QPS / ek server ki capacity` (jaise 1 server ≈ 1,000–10,000 simple requests/sec).

## Example: Twitter jaisa system

Assume: 200 million DAU, har user din me 2 tweet likhta hai, 100 tweets padhta hai, ek tweet ~1 KB (text + metadata), 5 saal data rakhna hai.

- Writes/day = 200M × 2 = **400M tweets/day**
- Write QPS = 400M / 10^5 ≈ **4,000/sec** (peak ~12,000)
- Read QPS = 4,000 × 100 ≈ **400,000/sec** -> read-heavy! Caching aur read replicas zaroori.
- Storage/day = 400M × 1 KB = **400 GB/day**
- 5 saal = 400 GB × 365 × 5 ≈ **730 TB**, replication ke saath ~**2 PB**
- Media (photos) alag se calculate karo, woh text se kahi zyada hoga.

Ab khud try kariye:

[[anim:estimation]]

> [!warn] Estimation me galtiyan
> - Calculation me itna kho jaana ki design ka time hi na bache. 3–5 minute kaafi hain.
> - Assumptions bina bole calculate karna. Hamesha bolo: "Main assume kar raha hoon ki..."
> - Peak traffic aur replication bhool jaana.

## Estimation se design decisions kaise nikalte hain

- Write QPS ~4K: ek achha SQL primary bhi sambhal sakta hai, par growth ke liye sharding plan rakho.
- Read QPS ~400K: **cache layer** (Redis) aur **CDN** must hain.
- 2 PB data: ek machine me nahi aayega -> **distributed storage / sharding**.
- Bandwidth zyada: **compression** aur **CDN**.

:::interview
Q: 1 million requests per day ka QPS kitna hai?
A: 1,000,000 / 86,400 ≈ 11.6, yaani lagbhag **12 requests/sec** average. Peak ke liye 2–3× maan kar ~25–35 QPS.
Q: Instagram jaisi app ki photo storage estimate kijiye.
A: Assume 500M DAU, 10% users din me 1 photo upload karte hain = 50M photos/day. Average photo 500 KB (alag sizes/thumbnails ke saath ~1 MB maan lo). Storage/day = 50M × 1 MB = 50 TB/day. Saal ka ≈ 18 PB, 3× replication ke saath ~55 PB. Isse clear hai ki object storage (S3 jaisa) aur CDN zaroori hain.
Q: Estimation interview me kyun important hai?
A: Isse design ka scale tay hota hai: ek database chalega ya sharding chahiye, cache zaroori hai ya nahi, kitne servers, kitna bandwidth. Bina numbers ke design ya to over-engineered hoga ya under-engineered. Interviewer ye bhi dekhta hai ki aap assumptions clearly bolte ho ya nahi.
:::

@quiz
Q: HLD me kya decide hota hai?
- Classes aur unke methods
+ Bade components (servers, DB, cache) aur unka data flow
- Variable names aur code style
- Unit tests
E: HLD system ka high-level naksha hai: services, databases, caches, queues aur unke beech flow. Classes aur methods LLD ka hissa hain.

Q: "Feed 200 ms me load honi chahiye" kis type ki requirement hai?
- Functional
+ Non-functional
- Business
- Optional
E: Ye batata hai system *kaisa* perform kare (latency), isliye non-functional requirement hai. Functional batata hai system *kya* kare.

Q: DNS ka main kaam kya hai?
- Data encrypt karna
+ Domain naam ko IP address me badalna
- Load ko servers me baantna
- Packets ko order me lagana
E: DNS internet ki phonebook hai: `google.com` jaise naam ko IP address me resolve karta hai.

Q: Video call ke liye kaunsa transport protocol zyada suitable hai?
- TCP, kyunki reliable hai
+ UDP, kyunki low latency zaroori hai aur thoda loss chal jaata hai
- FTP
- SMTP
E: Live baat me purana lost frame dobara bhejne ka fayda nahi. Fresh data aur kam delay zaroori hai, isliye UDP-based protocols.

Q: Kaunsa HTTP method idempotent NAHI hai?
- GET
- PUT
- DELETE
+ POST
E: POST ko baar-baar bhejne par naye resources ban sakte hain (jaise duplicate orders). GET, PUT, DELETE baar-baar karne par result same rehta hai.

Q: User login hai par admin page kholne ki permission nahi. Server kaunsa status code dega?
- 401
+ 403
- 404
- 500
E: 403 Forbidden ka matlab: server jaanta hai aap kaun ho, par aapko permission nahi. 401 tab jab identity hi pata nahi.

Q: Internal microservices ke beech fast, typed communication ke liye best choice?
- REST with XML
- GraphQL
+ gRPC
- SOAP
E: gRPC Protobuf (binary) aur HTTP/2 use karta hai: fast, compact, strict contracts. Internal service-to-service calls ke liye ideal.

Q: Lagbhag kitne seconds hote hain ek din me (estimation ke liye)?
- 10^3
- 10^4
+ 10^5
- 10^7
E: 1 din = 86,400 seconds ≈ 10^5. Estimation me ye trick bahut kaam aati hai.

Q: 99 requests 10 ms me aur 1 request 5 s me aayi. Kaunsa metric asli problem dikhayega?
- Average latency
- p50
+ p99
- Throughput
E: Average aur median slow request ko chhupa dete hain. p99 (tail latency) sabse slow requests ka experience dikhata hai.

Q: RAM read aur HDD disk seek me lagbhag kitna farak hai?
- 2 guna
- 100 guna
+ Lagbhag 1 lakh (10^5) guna
- Koi farak nahi
E: RAM reference ~100 ns, HDD seek ~10 ms = 10,000,000 ns. Farak ~10^5 guna. Isliye memory caching itna powerful hai.
