@module security-ops
@title Security, Observability aur Deployment
@level Advanced
@desc Authentication, authorization, OAuth, JWT, security basics, logging-metrics-tracing aur safe deployments.

@lesson auth
@title Authentication vs Authorization: Sessions, JWT, OAuth

- **Authentication (AuthN)**: "Aap kaun ho?" Login, OTP, fingerprint.
- **Authorization (AuthZ)**: "Aapko kya karne ki permission hai?" Admin panel, doosre ka order dekhna.

> [!analogy] Airport
> Gate par ID card dikhana = **authentication** (aap wahi ho jo ticket par likha hai). Boarding pass dekh ke batana ki aap business lounge me ja sakte ho ya nahi = **authorization**.

## Password store kaise karein

Kabhi **plain text** nahi. Kabhi simple hash (MD5/SHA-1) bhi nahi. Use karo **slow, salted hash**: **bcrypt, scrypt, Argon2**.
- **Salt**: har user ka random string, taaki same password ka hash alag ho aur rainbow tables bekaar.
- **Slow**: attacker ke liye crore guesses mehenge.

## Session-based authentication

1. User login karta hai, server password verify karta hai.
2. Server ek random **session ID** banata hai, session data server side (Redis) me store, aur cookie me ID bhejta hai (`HttpOnly; Secure; SameSite`).
3. Har request ke saath cookie aati hai, server Redis me lookup karta hai.

- **Fayde**: logout/revoke turant (session delete), server control.
- **Nuksaan**: har request par store lookup, shared session store chahiye.

## Token-based: JWT (JSON Web Token)

Server login ke baad ek **signed token** deta hai jisme user info (claims) hoti hai:

```text
header.payload.signature
{"alg":"HS256"} . {"sub":"42","role":"user","exp":1760003600} . <signature>
```

Server har request par **signature verify** karta hai, koi DB lookup nahi (**stateless**).

- **Fayde**: stateless, scalable, microservices me har service khud verify kar sakti hai.
- **Nuksaan**: expiry se pehle **revoke karna mushkil**, payload encrypted nahi (sirf signed, sensitive data mat daalo), token bada.
- **Best practice**: chhota **access token** (5–15 min) + lamba **refresh token** (server side tracked, revoke-able). Revoke ke liye denylist (Redis) agar zaroori.

| | Session | JWT |
|---|---|---|
| State | Server side | Client side (stateless) |
| Revoke | Easy | Mushkil (short expiry + refresh) |
| Scale | Shared store chahiye | Easy |
| Size | Chhota cookie | Bada token |

## OAuth 2.0 aur OpenID Connect

**"Login with Google"** ke peeche **OAuth 2.0** (authorization delegation) aur **OpenID Connect** (OIDC, authentication layer) hai.

**Authorization Code flow (PKCE ke saath)**:
1. App user ko Google ke login page par bhejti hai.
2. User Google par login karke permission deta hai ("email aur profile share karo").
3. Google app ko ek **authorization code** deta hai (redirect se).
4. App ka backend code ko **access token** (aur OIDC me **ID token**) se exchange karta hai.
5. App token se Google API se user info leti hai.

App ko user ka Google password kabhi nahi milta. Yahi OAuth ka point hai.

- **SSO (Single Sign-On)**: ek baar login, kai apps me access (company me Okta/Google Workspace se). Protocols: OIDC, SAML.

## Authorization models

- **RBAC (Role-Based)**: roles ko permissions (admin, editor, viewer). Simple, common.
- **ABAC (Attribute-Based)**: attributes par rules ("manager apni team ke expense approve kare, ₹50,000 tak"). Flexible.
- **ReBAC (Relationship-Based)**: relationships se (Google Drive: "ye file is folder me hai, folder ka owner X"). Google Zanzibar.

> [!warn] IDOR: sabse common bug
> `GET /orders/981` me server ne sirf login check kiya, ye nahi ki order 981 isi user ka hai. User URL me 982 likh ke doosre ka order dekh leta hai. Har resource access par **ownership/permission check** server par.

:::interview
Q: Authentication aur authorization me farak?
A: Authentication identity verify karta hai (kaun ho: password, OTP, SSO). Authorization decide karta hai ki authenticated user kya kar sakta hai (permissions, roles, resource ownership). Pehle authN, phir har action par authZ.
Q: JWT vs session: kab kya?
A: Server-rendered web apps, jahan instant logout/revoke chahiye aur ek domain hai, wahan sessions (Redis store) simple aur safe. Distributed microservices, mobile/API clients, jahan har service bina central lookup verify kare, wahan short-lived JWT access tokens + revocable refresh tokens. JWT me sensitive data na daalo aur expiry chhoti rakho.
Q: OAuth 2.0 authorization code flow samjhaiye.
A: Client user ko authorization server par redirect karta hai (client_id, scopes, redirect_uri, PKCE challenge). User login/consent karta hai. Auth server authorization code ke saath redirect karta hai. Client backend code + PKCE verifier se token endpoint par access token (aur OIDC me ID token, refresh token) leta hai. Access token se resource server APIs call hoti hain. Client ko user ke credentials kabhi nahi milte.
Q: Passwords ko securely kaise store karenge?
A: Har password ke saath unique random salt, aur deliberately slow adaptive hashing (Argon2id, bcrypt, scrypt) with tuned cost. Plain text ya fast hashes (MD5/SHA) kabhi nahi. Login par rate limiting, breached password checks aur MFA bhi.
:::

@lesson security-basics
@title Security essentials

System design me security baad me jodne wali cheez nahi, shuru se sochne wali cheez hai. Interview me ek-do security points zaroor bolein.

## Encryption

- **In transit**: TLS (HTTPS) har jagah, internal services ke beech bhi (mTLS).
- **At rest**: disk/DB/S3 encryption (AES-256). Keys **KMS** (Key Management Service) me, code me nahi.
- **Symmetric** (ek key, fast: AES) vs **asymmetric** (public/private key, slow: RSA, ECC). TLS dono use karta hai.
- **Hashing** (one-way: passwords, integrity) vs **encryption** (two-way: wapas padh sakte ho).

## OWASP ke common attacks

| Attack | Kya hota hai | Bachav |
|---|---|---|
| SQL Injection | Input me SQL ghusa ke DB se data churana | Parameterized queries / ORM, kabhi string concat nahi |
| XSS | Website me malicious JS inject jo doosre users ke browser me chale | Output escaping, Content-Security-Policy, HttpOnly cookies |
| CSRF | Doosri site user ke logged-in session se request bhejti hai | CSRF tokens, SameSite cookies |
| Broken access control / IDOR | Doosre ka data access | Har request par authorization check |
| SSRF | Server ko internal URLs fetch karwana | URL allowlists, internal network block |
| Brute force | Password guessing | Rate limiting, lockout, MFA, CAPTCHA |

```python
# Galat: SQL injection
cursor.execute("SELECT * FROM users WHERE email = '" + email + "'")
# Sahi: parameterized
cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
```

## DDoS protection

Bahut saare machines se traffic ki baarish. Bachav: CDN/edge (Cloudflare, AWS Shield) jo traffic absorb kare, rate limiting, WAF rules, autoscaling, aur Anycast se traffic bahut saare data centers me bant jaaye.

## Secrets management

- Passwords/API keys **code ya git me kabhi nahi**.
- Vault, AWS Secrets Manager, Kubernetes Secrets; **rotation** regularly.
- **Least privilege**: har service ko sirf utni permission jitni zaroori.

## Network security

- **VPC / private subnets**: databases internet se directly reachable nahi.
- **Security groups / firewalls**: sirf zaroori ports.
- **Zero trust**: network ke andar bhi har request authenticate (mTLS, service identity).

## Data privacy

- **PII** (naam, phone, Aadhaar, card numbers) ko minimize, encrypt, mask (logs me `98XXXXXX21`).
- **Compliance**: India me DPDP Act 2023, payments ke liye PCI-DSS (card data), RBI data localization; Europe me GDPR (right to be forgotten).
- **Audit logs**: kisne kab kya access kiya.

> [!tip] Interview me security ka ek line
> "Har jagah TLS, data at rest encrypted with KMS, API gateway par auth aur rate limiting, least-privilege service accounts, PII masking in logs, aur sensitive tables par audit logging." Ye ek sentence achha impression deta hai.

:::interview
Q: SQL injection kya hai aur kaise rokte hain?
A: Jab user input ko seedha SQL string me jodte hain to attacker input me SQL code daal kar query ka matlab badal sakta hai (data churana, delete). Bachav: parameterized queries/prepared statements ya safe ORM, input validation, least-privilege DB user, aur kabhi dynamic SQL string concatenation nahi.
Q: Encryption at rest aur in transit me farak?
A: In transit: data jab network par ja raha hai tab TLS se encrypted (eavesdropping/tampering se bachav). At rest: disk/DB/backup me stored data encrypted (AES-256), keys KMS me, taaki disk ya backup chori hone par data padha na ja sake. Dono zaroori hain.
Q: System ko DDoS se kaise bachayenge?
A: Layered approach: CDN/edge network aur managed DDoS protection (Cloudflare, AWS Shield) jo volumetric attacks absorb kare, Anycast distribution, WAF rules aur bot detection, L7 rate limiting per IP/user/API key, autoscaling with limits, expensive endpoints par caching/CAPTCHA, aur origin IPs ko hide karna.
:::

@lesson observability
@title Observability: Logs, Metrics, Traces

Production me system "chal raha hai" ye kaise pata? Aur kuch toota to **kya, kahan, kyun** kaise pata? Iske liye **observability** ke teen pillars:

## 1. Logs

Har event ka text record: "12:01:03 ERROR payment failed order=981 reason=timeout".
- **Structured logs** (JSON) use karo, taaki search aur filter easy ho.
- **Correlation/request ID** har log me, taaki ek request ke saare logs jod sakein.
- **Log levels**: DEBUG, INFO, WARN, ERROR.
- Centralized: ELK (Elasticsearch, Logstash, Kibana), Loki, Splunk, CloudWatch.
- PII mat log karo.

```json
{"ts":"2026-10-15T12:01:03Z","level":"ERROR","service":"payment","trace_id":"a1b2c3","order_id":981,"msg":"gateway timeout","latency_ms":2003}
```

## 2. Metrics

Numbers jo time ke saath track hote hain: QPS, error rate, latency percentiles, CPU, memory, queue depth.
- Sasta store, dashboards aur alerts ke liye perfect.
- Tools: **Prometheus + Grafana**, Datadog, CloudWatch.
- Types: counter (sirf badhta: total requests), gauge (upar-neeche: memory), histogram (latency distribution).

### Kya monitor karein?

- **Four Golden Signals** (Google SRE): **Latency**, **Traffic**, **Errors**, **Saturation**.
- **RED method** (services ke liye): **R**ate, **E**rrors, **D**uration.
- **USE method** (resources ke liye): **U**tilization, **S**aturation, **E**rrors.

## 3. Distributed tracing

Ek user request 10 services se guzri. Kaunsi slow thi? **Trace** poore safar ko dikhata hai: har service ka ek **span** (start time, duration), sab ek **trace ID** se jude.

[[flow:client:Request (trace_id=a1b2) -> edge:Gateway 5 ms -> svc:Order 40 ms -> svc:Payment 1800 ms -> db:DB 12 ms]]

Turant dikh gaya: Payment service slow hai.
- Tools: **OpenTelemetry** (standard), Jaeger, Zipkin, Datadog APM, Tempo.
- Trace ID headers ke through har service me aage pass hota hai (W3C `traceparent`).

| Pillar | Sawaal jiska jawab deta hai | Example |
|---|---|---|
| Metrics | Kya kuch galat hai? Kitna? | Error rate 0.1% se 5% |
| Traces | Kahan galat hai? | Payment service ka span 1.8 s |
| Logs | Kyun galat hai? | "gateway timeout from bank X" |

## Alerting

- **Symptoms par alert karo** (user-facing: error rate, latency SLO), causes par nahi (CPU 80%: shayad sab theek ho).
- **Actionable** alerts: har alert ka **runbook** (kya karna hai).
- **Alert fatigue** se bacho: bahut saare noisy alerts = log ignore karne lagte hain.
- On-call rotation, incident response, **blameless postmortems**.

## Health checks

- **Liveness**: process zinda hai? (nahi to restart)
- **Readiness**: traffic lene ko ready hai? (DB connected, warmup done; nahi to LB traffic na bheje)

:::interview
Q: Observability ke teen pillars kya hain?
A: Logs (discrete events ka detail, "kyun hua"), metrics (aggregated numeric time series, dashboards aur alerting, "kya aur kitna"), traces (ek request ka services ke across end-to-end path aur timing, "kahan"). Teeno ko trace/correlation IDs se jodna sabse powerful hai.
Q: Ek service ke liye kaun se metrics monitor karenge?
A: Golden signals/RED: request rate, error rate (5xx, timeouts), latency (p50/p95/p99), saturation (CPU, memory, thread/connection pool usage, queue depth). Plus dependencies (DB query latency, cache hit ratio) aur business metrics (orders/min, payment success rate). SLO-based alerts on error rate aur latency.
Q: Distributed tracing kaise kaam karta hai?
A: Entry point par ek trace ID banta hai; har service apne kaam ke liye span banati hai (parent span ID ke saath) aur outgoing calls ke headers me trace context pass karti hai. Spans ek collector (OpenTelemetry) ko bheje jaate hain jo unhe trace tree me jodta hai. Sampling se cost control (head ya tail-based sampling).
:::

@lesson deployment
@title Deployment strategies aur CI/CD

Code likhna aadha kaam hai. Use **bina downtime aur bina dar** ke production me pahunchana baaki aadha.

## CI/CD

- **Continuous Integration (CI)**: har commit par automatic build + tests (unit, integration, lint, security scan).
- **Continuous Delivery**: har passing build deploy hone ke liye ready; production me ek click.
- **Continuous Deployment**: tests pass to automatic production me.
- Tools: GitHub Actions, GitLab CI, Jenkins, ArgoCD (GitOps).

## Deployment strategies

### 1. Recreate
Purana band, naya chalu. **Downtime** hota hai. Sirf dev/internal tools ke liye.

### 2. Rolling update
Servers ko ek-ek (ya batch me) naye version par update. Kubernetes ka default.
- Downtime nahi, extra infra nahi.
- Kuch time dono versions ek saath chalte hain (backward compatibility zaroori), rollback slow.

### 3. Blue-Green
Do identical environments: **Blue** (live) aur **Green** (naya version). Green test karo, phir load balancer ek jhatke me Green par switch.
- **Instant rollback** (wapas Blue par switch).
- Double infrastructure cost (thodi der ke liye). Database migrations dhyan se.

### 4. Canary
Naya version pehle **chhote % users** (1%, phir 5%, 25%, 100%) ko. Metrics (errors, latency) theek to aage badhao, kharab to rollback.
- Sabse safe for big user bases, real traffic par test.
- Automated analysis aur traffic splitting chahiye.

> [!analogy] Koyla khaan ka canary
> Purane zamaane me miners khaan me ek canary chidiya le jaate the. Zehreeli gas hoti to chidiya pehle behosh hoti aur miners bach jaate. Canary deployment me thode users "chidiya" hain jo problem pehle dikhaate hain, sab users ke prabhavit hone se pehle.

### 5. Feature flags
Code deploy ho chuka par feature **flag se band**. Flag on karke dheere-dheere users ko (internal -> 1% -> sab). Deploy aur release alag ho jaate hain. Kill switch bhi. Tools: LaunchDarkly, Unleash, apna config service.

### 6. Shadow / dark launch
Naye version ko production traffic ki **copy** bhejo, par response user ko purane se do. Naye system ko real load par test karna, bina risk.

| Strategy | Downtime | Rollback | Extra cost | Risk |
|---|---|---|---|---|
| Recreate | Haan | Slow | Nahi | Zyada |
| Rolling | Nahi | Medium | Nahi | Medium |
| Blue-Green | Nahi | Instant | 2× infra | Kam |
| Canary | Nahi | Fast | Thoda | Sabse kam |

## Database migrations bina downtime: expand-contract

Column rename karna hai (`name` -> `full_name`)?
1. **Expand**: naya column add, code dono me likhe.
2. **Migrate**: purana data backfill.
3. Code naye column se padhe.
4. **Contract**: purana column hatao (sab instances update hone ke baad).

Har step backward compatible, taaki rolling deploy aur rollback safe rahein.

:::interview
Q: Blue-green aur canary deployment me farak?
A: Blue-green me do poore environments; naya (green) test karke traffic ek saath switch, rollback instant, par double infra. Canary me naya version pehle chhote % traffic par, metrics dekh kar dheere-dheere badhate hain; problem ka blast radius chhota, par traffic splitting aur automated monitoring chahiye. Bade consumer apps canary + feature flags prefer karte hain.
Q: Zero-downtime deployment kaise ensure karenge?
A: Multiple instances behind load balancer, rolling/blue-green/canary, readiness probes (naya instance ready hone par hi traffic), graceful shutdown (in-flight requests aur connections drain), backward-compatible APIs aur DB migrations (expand-contract), feature flags, aur automated rollback on SLO breach.
Q: Feature flags ke fayde aur risks?
A: Fayde: deploy aur release alag, gradual rollout, A/B testing, instant kill switch bina redeploy. Risks: flags ka dher (technical debt), combinations ki testing mushkil, flag service khud dependency ban jaati hai (defaults aur caching zaroori). Purane flags regularly hatao.
:::

@quiz
Q: User login karta hai par doosre user ka order URL badal kar dekh leta hai. Ye kaunsi problem hai?
- Authentication failure
+ Broken authorization (IDOR)
- XSS
- DDoS
E: User authenticated hai par har resource par ownership/permission check nahi hua. Ye IDOR (broken access control) hai.

Q: Passwords store karne ka sahi tareeka?
- Plain text, DB secure hai
- MD5 hash
+ Salted slow hash (bcrypt / Argon2)
- Base64 encode
E: Slow, salted hashes brute force aur rainbow tables ko mehenga bana dete hain. MD5/SHA bahut fast hain.

Q: JWT ki sabse badi kami?
- Har request par DB lookup
+ Expiry se pehle revoke karna mushkil
- Microservices me kaam nahi karta
- Sirf cookies me chalta hai
E: JWT stateless hai, isliye issue hone ke baad expiry tak valid rehta hai. Isliye short access tokens + refresh tokens.

Q: "Login with Google" me app ko user ka Google password milta hai?
- Haan, OAuth me
+ Nahi, app ko sirf token milta hai
- Sirf pehli baar
- Encrypted form me
E: OAuth/OIDC ka poora point yahi hai: credentials sirf Google ke paas, app ko scoped access/ID token milta hai.

Q: SQL injection rokne ka best tareeka?
- Input ko uppercase karna
+ Parameterized queries / prepared statements
- Database ko hide karna
- HTTPS
E: Parameterized queries data ko code se alag rakhti hain, input kabhi SQL ki tarah execute nahi hota.

Q: Ek request 10 services se guzri aur slow hai. Kaunsi slow hai, kaise pata karein?
- Sirf logs grep karke
+ Distributed tracing (trace ID ke saath spans)
- CPU metric dekh ke
- Server restart karke
E: Tracing har service ka span aur uska time dikhata hai, turant pata chalta hai bottleneck kahan hai.

Q: Naya version pehle 1% users ko, metrics theek to aage. Ye kya hai?
- Blue-green
+ Canary deployment
- Recreate
- Shadow launch
E: Canary me naya version chhote hisse par test hota hai aur dheere-dheere badhaya jaata hai.

Q: Four golden signals me kaunsa NAHI hai?
- Latency
- Traffic
- Errors
+ Code coverage
E: Golden signals: latency, traffic, errors, saturation. Code coverage testing metric hai, production health signal nahi.
