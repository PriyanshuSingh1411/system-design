@lesson lld-parking-lot
@title LLD: Parking Lot

Sabse famous LLD question. Isme lagbhag saare concepts aa jaate hain: enums, inheritance, Strategy, Singleton/Factory, concurrency.

## Requirements

- Multiple floors, har floor par alag size ke spots (SMALL, MEDIUM, LARGE).
- Vehicles: Bike, Car, Truck. Bike -> SMALL, Car -> MEDIUM, Truck -> LARGE.
- Entry par ticket, exit par fee (hourly, vehicle type ke hisaab se).
- Lot full ho to entry mana.
- Multiple entry gates (concurrency!).
- Extensible: naye vehicle types, naye pricing models.

## Entities

`ParkingLot`, `ParkingFloor`, `ParkingSpot`, `Vehicle` (+ subclasses), `Ticket`, `FeeStrategy`, `SpotAllocationStrategy`.

```text
ParkingLot *-- ParkingFloor *-- ParkingSpot
ParkingSpot --> Vehicle (0..1)
Ticket --> Vehicle, ParkingSpot
ParkingLot --> FeeStrategy, SpotAllocationStrategy  (Strategy pattern)
```

## Code (Java)

```java
enum VehicleType { BIKE, CAR, TRUCK }
enum SpotType { SMALL, MEDIUM, LARGE }

abstract class Vehicle {
    private final String number; private final VehicleType type;
    protected Vehicle(String number, VehicleType type) { this.number = number; this.type = type; }
    public String getNumber() { return number; }
    public VehicleType getType() { return type; }
}
class Bike extends Vehicle  { Bike(String n)  { super(n, VehicleType.BIKE); } }
class Car extends Vehicle   { Car(String n)   { super(n, VehicleType.CAR); } }
class Truck extends Vehicle { Truck(String n) { super(n, VehicleType.TRUCK); } }

class ParkingSpot {
    private final String id; private final SpotType type; private Vehicle vehicle;
    ParkingSpot(String id, SpotType type) { this.id = id; this.type = type; }
    boolean isFree() { return vehicle == null; }
    boolean canFit(VehicleType v) {
        return switch (v) { case BIKE -> type == SpotType.SMALL; case CAR -> type == SpotType.MEDIUM; case TRUCK -> type == SpotType.LARGE; };
    }
    void park(Vehicle v) { this.vehicle = v; }
    void free() { this.vehicle = null; }
    String getId() { return id; }
}

class ParkingFloor {
    private final int number; private final List<ParkingSpot> spots;
    ParkingFloor(int number, List<ParkingSpot> spots) { this.number = number; this.spots = spots; }
    // synchronized: do gates ek hi spot na de dein
    synchronized Optional<ParkingSpot> occupyFreeSpot(Vehicle v) {
        for (ParkingSpot s : spots) {
            if (s.isFree() && s.canFit(v.getType())) { s.park(v); return Optional.of(s); }
        }
        return Optional.empty();
    }
    synchronized void release(ParkingSpot s) { s.free(); }
    int getNumber() { return number; }
}

class Ticket {
    final String id; final Vehicle vehicle; final ParkingSpot spot; final ParkingFloor floor; final LocalDateTime entryTime;
    Ticket(String id, Vehicle v, ParkingSpot s, ParkingFloor f, LocalDateTime t) { this.id = id; vehicle = v; spot = s; floor = f; entryTime = t; }
}

interface FeeStrategy { long calculatePaise(Ticket t, LocalDateTime exit); }
class HourlyFeeStrategy implements FeeStrategy {
    private final Map<VehicleType, Long> ratePerHourPaise = Map.of(VehicleType.BIKE, 2000L, VehicleType.CAR, 5000L, VehicleType.TRUCK, 10000L);
    public long calculatePaise(Ticket t, LocalDateTime exit) {
        long minutes = Math.max(1, Duration.between(t.entryTime, exit).toMinutes());
        long hours = (minutes + 59) / 60;                       // shuru ka har ghanta poora
        return hours * ratePerHourPaise.get(t.vehicle.getType());
    }
}

interface SpotAllocationStrategy { Optional<Ticket> allocate(List<ParkingFloor> floors, Vehicle v); }
class LowestFloorFirst implements SpotAllocationStrategy {
    public Optional<Ticket> allocate(List<ParkingFloor> floors, Vehicle v) {
        for (ParkingFloor f : floors) {
            Optional<ParkingSpot> s = f.occupyFreeSpot(v);
            if (s.isPresent()) return Optional.of(new Ticket(UUID.randomUUID().toString(), v, s.get(), f, LocalDateTime.now()));
        }
        return Optional.empty();
    }
}

class ParkingLot {
    private final List<ParkingFloor> floors;
    private final Map<String, Ticket> activeTickets = new ConcurrentHashMap<>();
    private final FeeStrategy fee; private final SpotAllocationStrategy allocator;
    ParkingLot(List<ParkingFloor> floors, FeeStrategy fee, SpotAllocationStrategy allocator) {
        this.floors = floors; this.fee = fee; this.allocator = allocator;
    }
    public Ticket park(Vehicle v) {
        Ticket t = allocator.allocate(floors, v).orElseThrow(() -> new IllegalStateException("Parking full for " + v.getType()));
        activeTickets.put(t.id, t);
        return t;
    }
    public long unpark(String ticketId) {
        Ticket t = activeTickets.remove(ticketId);
        if (t == null) throw new IllegalArgumentException("Invalid ticket");
        long amount = fee.calculatePaise(t, LocalDateTime.now());
        t.floor.release(t.spot);
        return amount;
    }
}
```

## Design ki khoobiyan

- **Strategy** for fee aur allocation: weekend pricing ya "nearest to exit" allocation = nayi class (OCP).
- **Enums** fixed types ke liye.
- **Paise (long)** me paisa, double nahi (rounding errors se bachav).
- **Concurrency**: floor-level `synchronized` taaki do gates ek spot na dein; tickets `ConcurrentHashMap`.
- Extensions: EV charging spots (naya SpotType + charging fee strategy), display board (**Observer**: spot free/occupied par update), payment methods (Strategy), entry/exit gates as classes.

> [!tip] Better performance
> Har allocation par saare spots scan karna O(n) hai. Bade lot me har floor par `SpotType -> Queue<free spots>` rakho: allocation O(1).

:::interview
Q: Parking lot me fee calculation ko extensible kaise banayenge?
A: FeeStrategy interface (calculate(ticket, exitTime)) aur alag implementations: HourlyFee, FlatFee, WeekendFee, EV charging fee. ParkingLot ko strategy constructor se inject. Naya pricing model = nayi class, existing code unchanged (OCP, Strategy pattern).
Q: Multiple entry gates par ek spot do vehicles ko na mile, kaise?
A: Spot allocation aur occupy ek atomic operation hona chahiye: floor-level lock/synchronized, ya per-spot-type concurrent queue se poll (atomic). Distributed setup me DB conditional update ya Redis lock. Ticket store ConcurrentHashMap.
Q: Naya vehicle type (Electric Car) aaye to kya badlega?
A: VehicleType enum me naya value aur Vehicle subclass, spot fitting rules (agar EV spots alag hain to naya SpotType aur canFit mapping), aur pricing strategy me rate. Allocation aur ParkingLot core logic nahi badalta. Fitting rules ko map/config me rakhne se switch bhi nahi badalna padega.
:::

@lesson lld-elevator
@title LLD: Elevator System

## Requirements

- Building me N floors aur M elevators.
- Har floor par **Up/Down** buttons (external request), elevator ke andar floor buttons (internal request).
- Controller tay kare kaunsi elevator kaunsi request le.
- Elevator ek direction me chalte hue raaste ke saare stops le (efficient).
- States: moving up, moving down, idle; door open/close; maintenance.

## Entities

`ElevatorController`, `Elevator`, `Request` (floor + direction), `Direction`, `ElevatorState`, `SchedulingStrategy`, `Display` (Observer, optional).

## Scheduling: SCAN / LOOK algorithm

Disk scheduling jaisa: elevator ek direction me chalta rahe aur raaste ke saare requested floors par ruke; us direction me koi request na bache tab direction palte (**LOOK**). Isse elevator baar-baar upar-neeche nahi bhaagta.

Har elevator do sorted sets rakhta hai: `upStops` (ascending) aur `downStops` (descending).

## Code (Java)

```java
enum Direction { UP, DOWN, IDLE }

class Request {
    final int floor; final Direction direction;          // internal request me direction IDLE
    Request(int floor, Direction direction) { this.floor = floor; this.direction = direction; }
}

class Elevator {
    final int id; private int currentFloor = 0; private Direction direction = Direction.IDLE;
    private final TreeSet<Integer> upStops = new TreeSet<>();
    private final TreeSet<Integer> downStops = new TreeSet<>(Comparator.reverseOrder());
    Elevator(int id) { this.id = id; }

    synchronized void addStop(int floor) {
        if (floor > currentFloor) upStops.add(floor);
        else if (floor < currentFloor) downStops.add(floor);
        if (direction == Direction.IDLE) direction = floor > currentFloor ? Direction.UP : floor < currentFloor ? Direction.DOWN : Direction.IDLE;
    }

    // ek tick = ek floor move (simulation)
    synchronized void step() {
        if (direction == Direction.UP) {
            currentFloor++;
            if (upStops.remove(currentFloor)) openDoors();
            if (upStops.isEmpty()) direction = downStops.isEmpty() ? Direction.IDLE : Direction.DOWN;
        } else if (direction == Direction.DOWN) {
            currentFloor--;
            if (downStops.remove(currentFloor)) openDoors();
            if (downStops.isEmpty()) direction = upStops.isEmpty() ? Direction.IDLE : Direction.UP;
        }
    }
    private void openDoors() { System.out.println("Elevator " + id + " stopped at " + currentFloor); }
    synchronized int getCurrentFloor() { return currentFloor; }
    synchronized Direction getDirection() { return direction; }
    synchronized int pendingStops() { return upStops.size() + downStops.size(); }
}

interface SchedulingStrategy { Elevator select(List<Elevator> elevators, Request r); }

class NearestSuitableStrategy implements SchedulingStrategy {
    public Elevator select(List<Elevator> elevators, Request r) {
        Elevator best = null; int bestCost = Integer.MAX_VALUE;
        for (Elevator e : elevators) {
            int dist = Math.abs(e.getCurrentFloor() - r.floor);
            boolean onTheWay = (e.getDirection() == Direction.UP && r.direction == Direction.UP && r.floor >= e.getCurrentFloor())
                            || (e.getDirection() == Direction.DOWN && r.direction == Direction.DOWN && r.floor <= e.getCurrentFloor());
            int cost = e.getDirection() == Direction.IDLE ? dist : onTheWay ? dist : dist + 2 * e.pendingStops() + 10;
            if (cost < bestCost) { bestCost = cost; best = e; }
        }
        return best;
    }
}

class ElevatorController {
    private final List<Elevator> elevators; private final SchedulingStrategy strategy;
    ElevatorController(List<Elevator> elevators, SchedulingStrategy s) { this.elevators = elevators; this.strategy = s; }
    void externalRequest(int floor, Direction dir) { strategy.select(elevators, new Request(floor, dir)).addStop(floor); }
    void internalRequest(int elevatorId, int floor) { elevators.get(elevatorId).addStop(floor); }
    void tick() { elevators.forEach(Elevator::step); }
}
```

## Discussion points

- **Strategy** se scheduling badal sakte ho (nearest, least busy, zone-based: elevator 1 sirf floors 0–10).
- **State pattern**: Idle, MovingUp, MovingDown, DoorsOpen, Maintenance states.
- **Observer**: floor displays aur elevator display current floor update.
- Capacity/weight limit, emergency stop, VIP mode, peak hour (subah sab neeche se upar) optimizations.
- Concurrency: requests kai threads se aate hain, isliye elevator methods synchronized; controller ek scheduler thread se `tick()` karta hai.

:::interview
Q: Elevator ko kaun si request di jaaye, kaise decide karenge?
A: Cost function: idle elevator ke liye distance; same direction me request raaste me ho to distance; warna distance + penalty (pending stops, direction change). Lowest cost wali elevator. Ye Strategy interface ke peeche hai taaki zone-based ya ML-based scheduling plug kar sakein.
Q: SCAN/LOOK algorithm elevator me kyun?
A: Elevator ek direction me chalta rehta hai aur raaste ke saare stops serve karta hai, us direction me requests khatam hone par hi mudta hai. Isse total movement kam, starvation kam, aur behaviour predictable hota hai, jabki "nearest request pehle" me elevator ulta-seedha bhaag sakta hai aur door wale floors starve ho sakte hain.
:::

@lesson lld-splitwise
@title LLD: Splitwise (expense sharing)

## Requirements

- Users groups me expenses add karein: kisne pay kiya, kitna, kin logon me split.
- Split types: **EQUAL**, **EXACT** (har kisi ka exact amount), **PERCENT**.
- Har user ka balance: kisko kitna dena/lena hai.
- Optional: debts simplify karna (kam se kam transactions).

## Entities

`User`, `Expense`, `Split` (user + amount), `SplitType`, `SplitStrategy` (har type ka validation + calculation), `BalanceSheet`, `ExpenseService`.

## Code (Java)

```java
enum SplitType { EQUAL, EXACT, PERCENT }

record User(String id, String name) {}
record Split(User user, long amountPaise) {}

interface SplitStrategy {
    // values: EXACT me paise, PERCENT me percentage, EQUAL me ignore
    List<Split> split(long totalPaise, List<User> users, List<Double> values);
}

class EqualSplit implements SplitStrategy {
    public List<Split> split(long total, List<User> users, List<Double> values) {
        long share = total / users.size(), remainder = total % users.size();
        List<Split> out = new ArrayList<>();
        for (int i = 0; i < users.size(); i++) out.add(new Split(users.get(i), share + (i < remainder ? 1 : 0)));  // paise ka bacha hissa pehle logon ko
        return out;
    }
}
class ExactSplit implements SplitStrategy {
    public List<Split> split(long total, List<User> users, List<Double> values) {
        long sum = 0; List<Split> out = new ArrayList<>();
        for (int i = 0; i < users.size(); i++) { long v = Math.round(values.get(i)); sum += v; out.add(new Split(users.get(i), v)); }
        if (sum != total) throw new IllegalArgumentException("Exact amounts ka total match nahi karta");
        return out;
    }
}
class PercentSplit implements SplitStrategy {
    public List<Split> split(long total, List<User> users, List<Double> values) {
        double pct = values.stream().mapToDouble(Double::doubleValue).sum();
        if (Math.abs(pct - 100.0) > 1e-6) throw new IllegalArgumentException("Percent ka total 100 hona chahiye");
        List<Split> out = new ArrayList<>(); long assigned = 0;
        for (int i = 0; i < users.size(); i++) {
            long v = (i == users.size() - 1) ? total - assigned : Math.round(total * values.get(i) / 100.0);
            assigned += v; out.add(new Split(users.get(i), v));
        }
        return out;
    }
}

class BalanceSheet {
    // balances.get(a).get(b) > 0 => b ko a ko itne paise dene hain
    private final Map<String, Map<String, Long>> balances = new HashMap<>();
    void add(String creditor, String debtor, long amount) {
        if (creditor.equals(debtor) || amount == 0) return;
        balances.computeIfAbsent(creditor, k -> new HashMap<>()).merge(debtor, amount, Long::sum);
        balances.computeIfAbsent(debtor, k -> new HashMap<>()).merge(creditor, -amount, Long::sum);
    }
    Map<String, Long> of(String userId) { return balances.getOrDefault(userId, Map.of()); }
}

class ExpenseService {
    private final Map<SplitType, SplitStrategy> strategies = Map.of(
        SplitType.EQUAL, new EqualSplit(), SplitType.EXACT, new ExactSplit(), SplitType.PERCENT, new PercentSplit());
    private final BalanceSheet sheet = new BalanceSheet();

    public synchronized void addExpense(User paidBy, long totalPaise, List<User> users, SplitType type, List<Double> values) {
        List<Split> splits = strategies.get(type).split(totalPaise, users, values);
        for (Split s : splits) sheet.add(paidBy.id(), s.user().id(), s.amountPaise());
    }
    public Map<String, Long> balances(User u) { return sheet.of(u.id()); }
}
```

## Simplify debts

A ko B ko ₹100, B ko C ko ₹100 dena hai -> simplify: A seedha C ko ₹100. Har user ka **net balance** nikaalo (lena − dena). Phir greedy: sabse bada creditor aur sabse bada debtor match karo, min amount settle, repeat (do heaps se). Ye transactions bahut kam kar deta hai (optimal minimum NP-hard hai, greedy practically achha).

## Design ki khoobiyan

- **Strategy** per split type: naya type (SHARES: 2:1:1) = nayi class.
- **Paise me long**: ₹100 ko 3 me baantna = 3333 + 3333 + 3334 paise; double se ₹33.33 × 3 = 99.99 ka gadbad nahi.
- Validation strategies ke andar.
- `synchronized` ya per-group locks concurrent expenses ke liye.

:::interview
Q: Money ke liye double kyun nahi use karna chahiye?
A: Floating point binary representation me 0.1 jaise decimals exactly store nahi hote, isliye additions me rounding errors (0.1 + 0.2 != 0.3) aate hain jo ledgers me paise ka farak bana dete hain. Integer smallest unit (paise as long) ya BigDecimal with explicit rounding mode use karo.
Q: Debts simplify kaise karenge?
A: Har user ka net balance (total owed to him minus total he owes) nikaalo. Positive balance wale creditors aur negative wale debtors ko max-heaps me rakho; har step me sabse bade creditor aur debtor ke beech min(credit, debt) settle karo, bacha hua wapas heap me. Ye at most (n-1) transactions deta hai.
:::

@lesson lld-lru-cache
@title LLD: LRU Cache (code ke saath)

Interview me bahut common: "Ek LRU cache implement karo jisme `get` aur `put` dono **O(1)** hon." (Concept Module 4 me demo ke saath dekha tha.)

## Design

- **HashMap<K, Node>**: key se node O(1) me.
- **Doubly linked list**: recency order. Head ke paas most recent, tail ke paas least recent.
- **Sentinel (dummy) head aur tail**: edge cases (empty list) ke if-else khatam.

```text
head <-> [C] <-> [A] <-> [B] <-> tail
          MRU                LRU (next evict)
```

## Code (Java, generic)

```java
public class LRUCache<K, V> {
    private static class Node<K, V> {
        K key; V value; Node<K, V> prev, next;
        Node(K k, V v) { key = k; value = v; }
    }

    private final int capacity;
    private final Map<K, Node<K, V>> map = new HashMap<>();
    private final Node<K, V> head = new Node<>(null, null);   // dummy
    private final Node<K, V> tail = new Node<>(null, null);   // dummy

    public LRUCache(int capacity) {
        if (capacity <= 0) throw new IllegalArgumentException("capacity > 0 chahiye");
        this.capacity = capacity;
        head.next = tail; tail.prev = head;
    }

    public synchronized V get(K key) {
        Node<K, V> n = map.get(key);
        if (n == null) return null;          // miss
        moveToFront(n);                       // ab ye most recent
        return n.value;
    }

    public synchronized void put(K key, V value) {
        Node<K, V> n = map.get(key);
        if (n != null) { n.value = value; moveToFront(n); return; }
        if (map.size() == capacity) {         // evict LRU
            Node<K, V> lru = tail.prev;
            remove(lru);
            map.remove(lru.key);
        }
        Node<K, V> fresh = new Node<>(key, value);
        addAfterHead(fresh);
        map.put(key, fresh);
    }

    private void moveToFront(Node<K, V> n) { remove(n); addAfterHead(n); }
    private void remove(Node<K, V> n) { n.prev.next = n.next; n.next.prev = n.prev; }
    private void addAfterHead(Node<K, V> n) {
        n.next = head.next; n.prev = head;
        head.next.prev = n; head.next = n;
    }
}
```

```java
LRUCache<String, Integer> c = new LRUCache<>(2);
c.put("a", 1); c.put("b", 2);
c.get("a");          // 1, ab order: a, b
c.put("c", 3);       // b evict (least recent)
c.get("b");          // null
```

## Shortcut: LinkedHashMap

Java ka `LinkedHashMap` (accessOrder = true) andar se yahi karta hai:

```java
class LRU<K, V> extends LinkedHashMap<K, V> {
    private final int cap;
    LRU(int cap) { super(16, 0.75f, true); this.cap = cap; }
    @Override protected boolean removeEldestEntry(Map.Entry<K, V> e) { return size() > cap; }
}
```

Interview me pehle khud implement karo (yahi dekhna chahte hain), phir shortcut mention karo.

## Extensions (follow-up questions)

- **Thread safety**: `synchronized` simple hai par contention. Behtar: segments/striped locks (ConcurrentHashMap jaisa), ya read-write locks (par `get` bhi order badalta hai to write lock chahiye).
- **TTL**: har node me expiry; `get` par expired to remove; background cleanup.
- **LFU cache**: `key -> node`, `freq -> doubly linked list`, aur `minFreq` track karke O(1) (LeetCode 460).
- **Eviction policy pluggable**: `EvictionPolicy` interface (Strategy) taaki LRU/LFU/FIFO swap ho.
- **Distributed**: consistent hashing se keys nodes me (Module 3).

:::interview
Q: LRU cache me sentinel head/tail nodes kyun?
A: Dummy head aur tail se list kabhi truly empty nahi hoti, isliye insert/remove me null checks aur special cases (pehla node, aakhri node) nahi likhne padte. Code chhota aur bug-free hota hai, aur LRU hamesha `tail.prev`, MRU `head.next`.
Q: LRU cache ko thread-safe aur scalable kaise banayenge?
A: Simplest: public methods synchronized (correct par single lock contention). Scalable: keys ko hash se N segments me baanto, har segment apna LRU + lock (approximate global LRU). Ya Caffeine jaisi libraries jo concurrent buffers aur batched reordering use karti hain. Read-write lock kaam nahi aata kyunki get bhi order modify karta hai.
Q: LFU cache O(1) me kaise?
A: Teen structures: key -> node (value, freq), freq -> doubly linked list of nodes (us frequency ke, LRU order me), aur minFreq variable. Get par node ko freq list se hata ke freq+1 list me daalo, minFreq update. Put par capacity full ho to minFreq list ki tail evict. Sab O(1).
:::

@lesson lld-vending-machine
@title LLD: Vending Machine (State pattern)

Vending machine **State pattern** ka perfect example hai: machine ka behaviour uski state par depend karta hai. Paise daale bina item dabao to kuch nahi; paise daal ke item chuno to item nikle.

## Requirements

- Items with code, price aur quantity (inventory).
- User coins/notes daale, item select kare.
- Paise kam to error, zyada to **change** wapas.
- Item khatam (sold out) to refund.
- Cancel karne par refund.

## States

```text
IDLE --insertMoney--> HAS_MONEY --selectItem (enough money, in stock)--> DISPENSING --done--> IDLE
HAS_MONEY --cancel--> IDLE (refund)
HAS_MONEY --insertMoney--> HAS_MONEY (balance badhta)
```

## Code (Java)

```java
interface State {
    void insertMoney(VendingMachine m, int amount);
    void selectItem(VendingMachine m, String code);
    void cancel(VendingMachine m);
}

class IdleState implements State {
    public void insertMoney(VendingMachine m, int amount) { m.addBalance(amount); m.setState(new HasMoneyState()); }
    public void selectItem(VendingMachine m, String code) { System.out.println("Pehle paise daaliye"); }
    public void cancel(VendingMachine m) { System.out.println("Cancel karne ko kuch nahi"); }
}

class HasMoneyState implements State {
    public void insertMoney(VendingMachine m, int amount) { m.addBalance(amount); }
    public void selectItem(VendingMachine m, String code) {
        Item item = m.getInventory().get(code);
        if (item == null) { System.out.println("Galat code"); return; }
        if (item.quantity == 0) { System.out.println("Sold out"); return; }
        if (m.getBalance() < item.price) { System.out.println("Aur " + (item.price - m.getBalance()) + " daaliye"); return; }
        m.setState(new DispensingState());
        m.dispense(item);
    }
    public void cancel(VendingMachine m) { m.refund(); m.setState(new IdleState()); }
}

class DispensingState implements State {
    public void insertMoney(VendingMachine m, int a) { System.out.println("Ruko, item nikal raha hai"); }
    public void selectItem(VendingMachine m, String c) { System.out.println("Ruko, item nikal raha hai"); }
    public void cancel(VendingMachine m) { System.out.println("Ab cancel nahi ho sakta"); }
}

class Item { final String code, name; final int price; int quantity;
    Item(String c, String n, int p, int q) { code = c; name = n; price = p; quantity = q; } }

class VendingMachine {
    private State state = new IdleState();
    private int balance = 0;
    private final Map<String, Item> inventory = new HashMap<>();

    public synchronized void insertMoney(int amount) { state.insertMoney(this, amount); }
    public synchronized void selectItem(String code) { state.selectItem(this, code); }
    public synchronized void cancel() { state.cancel(this); }

    void setState(State s) { state = s; }
    void addBalance(int a) { balance += a; }
    int getBalance() { return balance; }
    Map<String, Item> getInventory() { return inventory; }
    void addItem(Item i) { inventory.put(i.code, i); }

    void dispense(Item item) {
        item.quantity--;
        int change = balance - item.price;
        System.out.println("Lijiye: " + item.name + (change > 0 ? ", change: ₹" + change : ""));
        balance = 0;
        setState(new IdleState());
    }
    void refund() { System.out.println("Refund: ₹" + balance); balance = 0; }
}
```

## Discussion points

- **State pattern**: bade `switch(state)` ki jagah har state ki class; naya state (MAINTENANCE) = nayi class.
- **Change dena**: real machine me coins limited hain. Greedy (bade coin pehle) ya DP agar denominations ajeeb hon; change na de sake to sale cancel.
- **Payment methods**: cash, UPI, card -> Strategy pattern.
- **Admin operations**: restock, price update (alag interface, authentication).
- Thread safety: machine ek time ek user, isliye synchronized methods.

:::interview
Q: Vending machine me State pattern kyun?
A: Machine ke har action (insert money, select, cancel) ka behaviour current state par depend karta hai. State pattern me har state apni class me apna behaviour aur transitions rakhti hai, isliye bade nested if/switch nahi, naye states add karna easy (OCP), aur galat transitions naturally reject hote hain.
Q: Change dene ka algorithm kya hoga?
A: Indian denominations (canonical system) me greedy kaam karta hai: sabse bade available coin/note se shuru. Non-canonical ya limited inventory me greedy fail ho sakta hai, tab DP (coin change with limited counts). Change possible na ho to transaction cancel karke refund.
:::

@quiz
Q: BankAccount ka balance private rakhna aur sirf deposit() se badalna kaunsa OOP concept hai?
+ Encapsulation
- Inheritance
- Polymorphism
- Composition
E: Data ko private rakhkar controlled methods se access dena encapsulation hai.

Q: Naya discount type add karne ke liye checkout code badalna pade to kaunsa principle toota?
- Single Responsibility
+ Open/Closed
- Liskov Substitution
- Interface Segregation
E: OCP kehta hai naye behaviour ke liye nayi class jodo, existing code modify mat karo.

Q: Square extends Rectangle se program toot jaata hai. Kaunsa principle?
- DIP
- ISP
+ LSP
- SRP
E: Liskov: subclass ko parent ki jagah use karne par behaviour sahi rehna chahiye. Square width-height alag set nahi kar sakta.

Q: Coffee me milk, caramel jaise add-ons runtime par jodne ke liye pattern?
- Singleton
+ Decorator
- Factory
- State
E: Decorator object ko wrap karke naya behaviour/cost add karta hai, combinations freely ban jaati hain.

Q: Undo/redo feature ke liye best pattern?
- Observer
+ Command
- Adapter
- Builder
E: Har action ek Command object (execute/undo), history stack me rakh ke undo/redo.

Q: Parking lot me fee calculation alag-alag models ke liye?
+ Strategy pattern
- Singleton
- Composite
- Proxy
E: FeeStrategy interface ke alag implementations inject karke pricing badal sakte hain.

Q: LRU cache me get aur put O(1) ke liye?
- TreeMap
+ HashMap + doubly linked list
- ArrayList
- Stack
E: Map se O(1) lookup, doubly linked list se O(1) move-to-front aur tail eviction.

Q: Paise (money) store karne ke liye sabse safe type?
- float
- double
+ long (paise me) ya BigDecimal
- String
E: Floating point rounding errors se paise ka farak aata hai. Smallest unit integer ya BigDecimal.

Q: Vending machine ka behaviour current state par depend karta hai. Pattern?
- Strategy
+ State
- Facade
- Prototype
E: State pattern me har state apni class me behaviour aur transitions rakhti hai.

Q: Thread-safe lazy singleton me double-checked locking ke saath instance variable kaisa hona chahiye?
- static final
+ volatile
- transient
- synchronized field
E: volatile instruction reordering rokta hai, taaki doosra thread half-constructed object na dekhe.
