@module lld
@title Low Level Design (LLD)
@level Pro
@desc OOP, SOLID, design patterns aur classic LLD problems: Parking Lot, Elevator, Splitwise, LRU Cache, Vending Machine.

@lesson lld-oop
@title LLD kya hai aur OOP ke 4 pillars

**Low Level Design** me hum ek component ke **andar** ka design karte hain: kaun si classes, unke fields aur methods, interfaces, relationships, aur kaun se design patterns. Indian product companies (Flipkart, Amazon, Swiggy, PhonePe) me alag **LLD/machine coding round** hota hai jisme 60–90 minute me working, clean code likhna hota hai.

> [!key] LLD me kya check hota hai
> Clean, extensible code: naya feature aaye to purana code kam se kam badle. OOP principles, SOLID, sahi design patterns, readable naming, aur edge cases.

Code examples **Java** me hain (interviews me sabse common), par concepts har OOP language me same hain.

## 1. Encapsulation

Data aur us par kaam karne wale methods ko ek class me band karna, aur data ko bahar se seedha badalne na dena (`private` fields, controlled methods).

```java
public class BankAccount {
    private double balance;                 // bahar se seedha access nahi
    public void deposit(double amt) {
        if (amt <= 0) throw new IllegalArgumentException("Amount positive hona chahiye");
        balance += amt;
    }
    public double getBalance() { return balance; }
}
```

**Fayda**: invalid state (negative deposit) se bachav, andar ka implementation badal sakte ho bina callers ko todhe.

## 2. Abstraction

Sirf zaroori cheezein dikhana, complexity chhupana. **Interface/abstract class** se "kya karna hai" batao, "kaise" chhupa do.

```java
public interface PaymentMethod {
    boolean pay(double amount);             // kaise hota hai, caller ko farak nahi
}
```

> [!analogy] Car ka steering
> Aap steering ghumaate ho, car mud jaati hai. Andar gears, rack-pinion kaise kaam karte hain, driver ko jaanne ki zaroorat nahi. Steering abstraction hai.

## 3. Inheritance

Ek class doosri class ke properties aur methods le leti hai ("is-a" relationship). Code reuse.

```java
abstract class Vehicle { String number; abstract int wheels(); }
class Car extends Vehicle  { int wheels() { return 4; } }
class Bike extends Vehicle { int wheels() { return 2; } }
```

## 4. Polymorphism

Ek interface, kai roop. Same method call alag objects par alag kaam.

- **Compile-time (overloading)**: same naam, alag parameters.
- **Runtime (overriding)**: parent reference, child ka method chalta hai.

```java
List<PaymentMethod> methods = List.of(new UpiPayment(), new CardPayment());
for (PaymentMethod m : methods) m.pay(499);   // har ek apne tareeke se pay karega
```

> [!tip] Polymorphism se if-else hatao
> `if (type == "UPI") ... else if (type == "CARD") ...` ki jagah har type ki apni class jo interface implement kare. Naya payment type = nayi class, purana code nahi chhoona. Yahi Open/Closed principle hai.

## Interface vs Abstract class

| | Interface | Abstract class |
|---|---|---|
| Kya define karta hai | Contract (kya karna hai) | Partial implementation + contract |
| Multiple | Ek class kai interfaces implement kar sakti | Sirf ek class extend |
| State (fields) | Nahi (sirf constants) | Haan |
| Kab | Capability batana (`Payable`, `Comparable`) | Common code share karna related classes me |

:::interview
Q: OOP ke 4 pillars ek-ek example ke saath batayiye.
A: Encapsulation: BankAccount ka balance private, sirf deposit/withdraw methods se change. Abstraction: PaymentMethod interface jo `pay()` expose kare, implementation chhupaye. Inheritance: Car aur Bike, Vehicle se common fields/behaviour lein. Polymorphism: `PaymentMethod m` reference par `m.pay()` call, runtime par UPI ya Card ka apna implementation chale.
Q: Interface aur abstract class me kab kya use karenge?
A: Jab sirf contract chahiye aur unrelated classes bhi implement kar sakein (multiple capabilities), tab interface. Jab closely related classes me common state/code share karna ho aur partial implementation dena ho, tab abstract class. Modern Java me interfaces default methods bhi rakh sakte hain, par state nahi.
Q: Method overloading aur overriding me farak?
A: Overloading: same class me same naam, alag parameter list; compile time par decide (static polymorphism). Overriding: subclass parent ke method ko same signature ke saath redefine kare; runtime par object ke actual type se decide (dynamic polymorphism).
:::

@lesson lld-relationships
@title Class relationships aur UML basics

LLD interview me aksar pehle **class diagram** banate hain. Classes ke beech relationships samajhna zaroori hai.

## Relationships

| Relationship | Matlab | Example | Strength |
|---|---|---|---|
| Association | Ek class doosri ko use/jaanti hai | Teacher – Student | Loose |
| Aggregation | "Has-a", part independently reh sakta hai | Team has Players (team tooti, players rahe) | Medium |
| Composition | "Owns-a", part owner ke bina nahi reh sakta | House has Rooms (house gira, rooms gaye) | Strong |
| Inheritance | "Is-a" | Car is a Vehicle | — |
| Dependency | Method me temporarily use | Order.checkout(PaymentService) | Weakest |

```java
// Composition: ParkingLot ke floors uske bina exist nahi karte
class ParkingLot {
    private final List<ParkingFloor> floors = new ArrayList<>();
    ParkingLot(int n) { for (int i = 0; i < n; i++) floors.add(new ParkingFloor(i)); }
}

// Aggregation: Team ko bahar se players diye, team ke bina bhi players hain
class Team {
    private final List<Player> players;
    Team(List<Player> players) { this.players = players; }
}
```

## UML class diagram notation (basic)

```text
+------------------+
|    ParkingSpot   |       + public   - private   # protected
+------------------+
| - id: String     |
| - type: SpotType |
| - vehicle: Vehicle|
+------------------+
| + park(v): bool  |
| + free(): void   |
+------------------+

Vehicle <|-- Car          (inheritance: khaali triangle)
ParkingLot *-- Floor      (composition: bhara diamond)
Team o-- Player           (aggregation: khaali diamond)
Order --> Payment         (association: arrow)
```

## Multiplicity

`1`, `0..1`, `*` (kai), `1..*`. Jaise ek `ParkingFloor` me `1..*` spots, ek `Ticket` ke liye `1` vehicle.

> [!tip] Interview me kitna UML?
> Perfect UML symbols ki zaroorat nahi. Classes ke naam, main fields/methods, aur relationships (has-a / is-a, 1-to-many) clearly dikhao. Phir code par jao.

:::interview
Q: Aggregation aur composition me farak?
A: Dono "has-a" hain. Composition me part ka lifecycle owner se bandha hai: owner delete to parts bhi (Order aur uske OrderItems, House aur Rooms). Aggregation me part independently exist karta hai aur share bhi ho sakta hai (Team aur Players, Department aur Professors).
Q: "Is-a" aur "has-a" kab use karein?
A: Is-a (inheritance) tab jab subclass sach me parent ka specialized type ho aur parent ka contract poori tarah follow kare (Liskov). Zyada tar cases me has-a (composition) prefer karo kyunki woh flexible hai, runtime par behaviour badal sakte ho, aur fragile base class problem nahi aati.
:::

@lesson solid
@title SOLID principles

Robert C. Martin (Uncle Bob) ke 5 principles jo code ko **maintainable aur extensible** banate hain. LLD interview me naam lekar inka use dikhana bahut achha impression deta hai.

## S: Single Responsibility Principle

**Ek class ka badalne ka sirf ek reason ho.**

```java
// Galat: ek class teen kaam kar rahi hai
class Invoice {
    double calculateTotal() { ... }
    void saveToDatabase() { ... }
    void sendEmail() { ... }
}
// Sahi
class Invoice           { double calculateTotal() { ... } }
class InvoiceRepository { void save(Invoice i) { ... } }
class InvoiceNotifier   { void email(Invoice i) { ... } }
```

## O: Open/Closed Principle

**Extension ke liye open, modification ke liye closed.** Naya behaviour add karne ke liye purana code na badalna pade.

```java
interface DiscountRule { double apply(double amount); }
class FestivalDiscount implements DiscountRule { public double apply(double a) { return a * 0.9; } }
class NewUserDiscount  implements DiscountRule { public double apply(double a) { return a - 100; } }
// Naya discount = nayi class. Checkout ka code nahi chhoona.
```

## L: Liskov Substitution Principle

**Subclass ko parent ki jagah use karo to program sahi chale.** Subclass parent ke vaade na tode.

> [!example] Classic galti: Square extends Rectangle
> Rectangle me `setWidth` aur `setHeight` alag hain. Square me dono saath badalte hain. Koi code jo rectangle ki width badal ke expect kare ki height same rahegi, Square ke saath toot jayega. Isliye Square ko Rectangle se inherit karna LSP violation hai.

Doosra example: `Bird` class me `fly()`, aur `Penguin extends Bird` jo `fly()` par exception phenke. Behtar: `FlyingBird` alag interface.

## I: Interface Segregation Principle

**Bade "mota" interface ki jagah chhote, specific interfaces.** Client ko woh methods implement karne par majboor mat karo jo use nahi chahiye.

```java
// Galat: har printer ko fax karna padega
interface Machine { void print(); void scan(); void fax(); }
// Sahi
interface Printer { void print(); }
interface Scanner { void scan(); }
class SimplePrinter implements Printer { public void print() { ... } }
class OfficeMachine implements Printer, Scanner { ... }
```

## D: Dependency Inversion Principle

**High-level modules low-level modules par depend na karein; dono abstractions (interfaces) par depend karein.** Dependencies bahar se inject karo.

```java
interface NotificationSender { void send(String to, String msg); }
class SmsSender implements NotificationSender { ... }
class EmailSender implements NotificationSender { ... }

class OrderService {
    private final NotificationSender sender;            // interface par depend
    OrderService(NotificationSender sender) { this.sender = sender; }   // injection
    void placeOrder(Order o) { /* ... */ sender.send(o.userPhone(), "Order placed"); }
}
```

Testing me fake sender inject kar sakte ho, aur SMS se WhatsApp par shift karna = nayi class.

| Principle | Ek line |
|---|---|
| SRP | Ek class, ek kaam |
| OCP | Nayi class jodo, purani mat todo |
| LSP | Child parent ki jagah fit ho |
| ISP | Chhote focused interfaces |
| DIP | Interfaces par depend, dependencies inject |

:::interview
Q: SOLID principles ek-ek line me aur ek example?
A: SRP: class ka ek hi responsibility (Invoice calculation alag, persistence alag). OCP: naye discount types nayi classes se add, checkout code unchanged. LSP: subclass parent ke contract ko na tode (Square-Rectangle problem). ISP: Printer/Scanner alag interfaces, mota Machine interface nahi. DIP: OrderService NotificationSender interface par depend kare, concrete SMS class par nahi, aur constructor se inject ho.
Q: Open/Closed principle ko design patterns kaise support karte hain?
A: Strategy (naye algorithms nayi classes), Decorator (naya behaviour wrap karke), Factory (naye types bina client change), Observer (naye listeners bina subject change). Sab me extension nayi class se hota hai, existing code modify nahi.
Q: Dependency Injection kya hai aur fayda?
A: Object apni dependencies khud `new` se banane ki jagah bahar se (constructor/setter/framework jaise Spring) paata hai. Fayde: loose coupling, implementations swap karna easy, unit testing me mocks/fakes inject kar sakte hain, aur DIP follow hota hai.
:::

@lesson design-principles
@title DRY, KISS, YAGNI aur Composition over Inheritance

SOLID ke alawa kuch simple principles jo roz ke code ko behtar banate hain.

## DRY: Don't Repeat Yourself

Same logic do jagah copy mat karo. Ek jagah change hua, doosri jagah bhool gaye = bug. Common logic ko function/class me nikaalo.

> [!warn] DRY ka over-use
> Do code jo abhi same dikhte hain par alag reasons se badlenge, unhe zabardasti ek mat karo. Galat abstraction duplication se zyada mehenga hai.

## KISS: Keep It Simple, Stupid

Sabse simple solution jo kaam kare. Clever, complex code padhna aur debug karna mushkil. Interview me bhi pehle simple working design, phir improve.

## YAGNI: You Aren't Gonna Need It

Jo feature abhi chahiye nahi, uske liye code/abstraction mat banao. "Kabhi future me shayad..." wala code aksar kabhi use nahi hota aur bojh banta hai.

## Composition over Inheritance

Inheritance tight coupling laata hai aur deep hierarchies fragile hoti hain. Behaviour ko alag objects me rakh ke **compose** karo.

```java
// Inheritance explosion: FlyingQuackingDuck, NonFlyingQuackingDuck, ...
// Composition: behaviours inject karo
interface FlyBehaviour { void fly(); }
interface QuackBehaviour { void quack(); }

class Duck {
    private FlyBehaviour fly;
    private QuackBehaviour quack;
    Duck(FlyBehaviour f, QuackBehaviour q) { this.fly = f; this.quack = q; }
    void setFly(FlyBehaviour f) { this.fly = f; }      // runtime par badal sakte ho
    void performFly() { fly.fly(); }
}
```

## Law of Demeter (least knowledge)

"Sirf apne doston se baat karo." `order.getCustomer().getAddress().getCity()` jaisi lambi chains coupling badhati hain. Behtar: `order.getShippingCity()`.

## Program to an interface, not an implementation

`List<String> items = new ArrayList<>();` (interface type), `ArrayList<String> items` nahi. Implementation baad me badal sakte ho.

:::interview
Q: Composition over inheritance kyun?
A: Inheritance compile-time par fixed, tight coupling wala relation hai; parent change subclasses tod sakta hai (fragile base class), aur combinations ke liye class explosion hota hai. Composition me behaviour alag objects me hota hai jinhe runtime par inject/swap kar sakte hain, classes chhoti aur testable rehti hain. Strategy aur Decorator patterns isi par based hain.
Q: YAGNI aur extensibility me balance kaise?
A: Abhi ke requirements ke liye simple design, par extension points wahan jahan change ki clear likelihood hai (jaise payment methods, pricing rules). Speculative frameworks/abstractions nahi. SOLID se code naturally changeable rehta hai bina future features pehle se banaye.
:::

@lesson patterns-creational
@title Design Patterns: Creational (Singleton, Factory, Builder)

**Design patterns** baar-baar aane wali design problems ke tested solutions hain (Gang of Four book: 23 patterns). Teen categories: **Creational** (objects banana), **Structural** (objects jodna), **Behavioral** (objects ka aapas me kaam).

## 1. Singleton

Poori application me class ka **sirf ek object**, aur ek global access point. Use: config, logger, connection pool, cache manager.

```java
public class ConfigManager {
    private static volatile ConfigManager instance;
    private ConfigManager() { /* config load */ }          // bahar se new nahi
    public static ConfigManager getInstance() {
        if (instance == null) {                             // pehla check (fast path)
            synchronized (ConfigManager.class) {
                if (instance == null) instance = new ConfigManager();   // doosra check
            }
        }
        return instance;
    }
}
```

**Double-checked locking** + `volatile` thread-safe banata hai. Java me simplest safe tareeka: **enum singleton** ya static holder class.

> [!warn] Singleton ke nuksaan
> Hidden global state, testing mushkil (mock nahi kar sakte), tight coupling. Zyada tar jagah dependency injection se ek instance pass karna behtar.

## 2. Factory Method / Simple Factory

Object banane ka logic ek jagah. Client ko concrete class nahi pata hona chahiye.

```java
interface Notification { void send(String msg); }
class SmsNotification implements Notification { public void send(String m) { ... } }
class EmailNotification implements Notification { public void send(String m) { ... } }

class NotificationFactory {
    static Notification create(String channel) {
        return switch (channel) {
            case "SMS" -> new SmsNotification();
            case "EMAIL" -> new EmailNotification();
            default -> throw new IllegalArgumentException("Unknown channel: " + channel);
        };
    }
}
```

**Abstract Factory**: related objects ke poore family ka factory (jaise `DarkThemeFactory` jo DarkButton, DarkCheckbox banaye).

## 3. Builder

Bahut saare optional parameters wale complex object ko step-by-step banana, readable tareeke se. "Telescoping constructors" (`new Pizza(true, false, true, ...)`) se bachav.

```java
Pizza p = new Pizza.Builder("LARGE")
        .cheese(true)
        .toppings(List.of("paneer", "onion"))
        .extraSpicy(true)
        .build();

class Pizza {
    private final String size; private final boolean cheese, extraSpicy; private final List<String> toppings;
    private Pizza(Builder b) { size = b.size; cheese = b.cheese; extraSpicy = b.extraSpicy; toppings = b.toppings; }
    static class Builder {
        private final String size; private boolean cheese, extraSpicy; private List<String> toppings = List.of();
        Builder(String size) { this.size = size; }
        Builder cheese(boolean v) { cheese = v; return this; }
        Builder extraSpicy(boolean v) { extraSpicy = v; return this; }
        Builder toppings(List<String> t) { toppings = t; return this; }
        Pizza build() { return new Pizza(this); }
    }
}
```

## 4. Prototype

Naya object banane ki jagah existing ko **clone** karo (mehenga creation, jaise game ke enemy objects, document templates).

| Pattern | Problem | Example |
|---|---|---|
| Singleton | Sirf ek instance | Config, logger, DB pool |
| Factory | Kaun si class banani hai, ek jagah decide | NotificationFactory, VehicleFactory |
| Abstract Factory | Related objects ki family | UI theme components |
| Builder | Bahut saare optional params | HTTP request, Pizza, Query builders |
| Prototype | Clone karke banana | Templates, game objects |

:::interview
Q: Thread-safe singleton kaise banayenge?
A: Options: eager initialization (static final instance), double-checked locking with volatile instance, static inner holder class (lazy aur thread-safe JVM class loading se), ya enum singleton (serialization aur reflection safe bhi). Interview me double-checked locking samjhao aur volatile kyun zaroori hai (instruction reordering se half-constructed object na dikhe).
Q: Factory pattern ka fayda?
A: Object creation logic centralize hota hai, client concrete classes se decoupled rehta hai (sirf interface jaanta hai), naye types add karne par client code nahi badalta (sirf factory), aur creation me validation/caching ek jagah.
Q: Builder pattern kab use karenge?
A: Jab object ke bahut saare optional parameters hon, immutability chahiye, ya construction steps me validation ho. Telescoping constructors aur half-initialized objects (setters ke beech invalid state) se bachata hai. Examples: StringBuilder, HTTP clients, Lombok @Builder.
:::

@lesson patterns-structural
@title Design Patterns: Structural (Adapter, Decorator, Facade, Proxy, Composite)

Structural patterns batate hain ki classes/objects ko **jodkar** bade structures kaise banayein.

## 1. Adapter

Do incompatible interfaces ko jodna. Travel adapter jaisa: Indian plug, UK socket.

```java
interface PaymentGateway { void pay(int paise); }
class LegacyBankApi { void makePayment(double rupees, String currency) { ... } }   // purana, badal nahi sakte

class LegacyBankAdapter implements PaymentGateway {
    private final LegacyBankApi api = new LegacyBankApi();
    public void pay(int paise) { api.makePayment(paise / 100.0, "INR"); }
}
```

Use: third-party libraries, legacy systems ko apne interface me fit karna.

## 2. Decorator

Object me **runtime par naya behaviour** add karna, bina class badle, wrap karke. Layers jodte jao.

```java
interface Coffee { double cost(); String desc(); }
class BasicCoffee implements Coffee { public double cost() { return 100; } public String desc() { return "Coffee"; } }

abstract class CoffeeDecorator implements Coffee {
    protected final Coffee inner;
    CoffeeDecorator(Coffee c) { inner = c; }
}
class Milk extends CoffeeDecorator {
    Milk(Coffee c) { super(c); }
    public double cost() { return inner.cost() + 20; }
    public String desc() { return inner.desc() + " + milk"; }
}
class Caramel extends CoffeeDecorator {
    Caramel(Coffee c) { super(c); }
    public double cost() { return inner.cost() + 35; }
    public String desc() { return inner.desc() + " + caramel"; }
}
Coffee c = new Caramel(new Milk(new BasicCoffee()));   // 155, "Coffee + milk + caramel"
```

Use: Java I/O streams (`BufferedInputStream(new FileInputStream(...))`), middleware (logging, auth wrappers), pricing add-ons.

## 3. Facade

Complex subsystem ke aage ek **simple interface**. Ek button, andar 10 kaam.

```java
class OrderFacade {
    private final InventoryService inventory; private final PaymentService payment; private final ShippingService shipping;
    OrderFacade(InventoryService i, PaymentService p, ShippingService s) { inventory = i; payment = p; shipping = s; }
    public String placeOrder(Cart cart, PaymentInfo info) {
        inventory.reserve(cart);
        payment.charge(info, cart.total());
        return shipping.schedule(cart);
    }
}
```

## 4. Proxy

Asli object ki jagah ek **stand-in** jo access control kare: lazy loading, caching, permission check, remote call, logging.

```java
interface Image { void display(); }
class RealImage implements Image { RealImage(String f) { /* disk se bhaari load */ } public void display() { ... } }
class LazyImageProxy implements Image {
    private final String file; private RealImage real;
    LazyImageProxy(String f) { file = f; }
    public void display() { if (real == null) real = new RealImage(file); real.display(); }   // zaroorat par hi load
}
```

## 5. Composite

**Tree structure** me single items aur groups ko same tarah treat karna. File aur Folder dono `size()` de sakte hain; folder apne children ka total.

```java
interface FileSystemItem { long size(); }
class FileItem implements FileSystemItem { long bytes; public long size() { return bytes; } }
class Folder implements FileSystemItem {
    List<FileSystemItem> children = new ArrayList<>();
    public long size() { return children.stream().mapToLong(FileSystemItem::size).sum(); }
}
```

| Pattern | Ek line | Real use |
|---|---|---|
| Adapter | Incompatible interface ko fit karna | Third-party/legacy API |
| Decorator | Wrap karke behaviour add | Add-ons pricing, I/O streams, middleware |
| Facade | Complex system ka simple front | Order placement, SDKs |
| Proxy | Access control karne wala stand-in | Lazy load, cache, auth, RPC stubs |
| Composite | Tree me leaf aur group same | File system, org chart, menus |

:::interview
Q: Decorator aur inheritance me farak?
A: Inheritance compile time par behaviour fix karta hai aur har combination ke liye subclass chahiye (MilkCaramelCoffee...). Decorator runtime par objects ko wrap karke behaviours stack karta hai, combinations freely ban jaate hain, aur Open/Closed follow hota hai.
Q: Adapter, Facade aur Proxy me farak?
A: Adapter ek existing interface ko doosre expected interface me convert karta hai (compatibility). Facade ek complex subsystem ke liye naya simplified interface deta hai (convenience). Proxy same interface rakhta hai par access ko control karta hai (lazy loading, caching, security, remote).
Q: Composite pattern kahan use hota hai?
A: Jahan part-whole hierarchy ho aur client ko individual aur group objects ko same treat karna ho: file system (file/folder), UI component trees, company org chart (employee/manager), menu/submenu, expression trees.
:::

@lesson patterns-behavioral
@title Design Patterns: Behavioral (Strategy, Observer, State, Command, Chain)

Behavioral patterns batate hain ki objects **aapas me responsibility kaise baantein aur baat kaise karein**. LLD problems me ye sabse zyada use hote hain.

## 1. Strategy

Ek kaam ke **kai algorithms**, runtime par choose. if-else chains ka ilaaj.

```java
interface PricingStrategy { double price(double base); }
class NormalPricing implements PricingStrategy { public double price(double b) { return b; } }
class SurgePricing implements PricingStrategy {
    private final double m; SurgePricing(double m) { this.m = m; }
    public double price(double b) { return b * m; }
}
class RideFareCalculator {
    private PricingStrategy strategy;
    void setStrategy(PricingStrategy s) { strategy = s; }
    double fare(double base) { return strategy.price(base); }
}
```

Use: payment methods, parking fee calculation, sorting, routing algorithms, discount rules.

## 2. Observer (Pub/Sub ka chhota roop)

Ek object (subject) badle to uske saare **subscribers ko automatic notify**.

```java
interface StockObserver { void onPriceChange(String symbol, double price); }
class StockTicker {
    private final List<StockObserver> observers = new ArrayList<>();
    void subscribe(StockObserver o) { observers.add(o); }
    void unsubscribe(StockObserver o) { observers.remove(o); }
    void update(String s, double p) { for (StockObserver o : observers) o.onPriceChange(s, p); }
}
```

Use: notifications, event listeners (UI buttons), "back in stock" alerts, YouTube subscribe.

## 3. State

Object ka behaviour uski **state ke hisaab se badle**, aur har state ek alag class. Bade switch-case ka ilaaj.

```java
interface VendingState { void insertCoin(VendingMachine m, int amt); void selectItem(VendingMachine m, String code); }
class IdleState implements VendingState {
    public void insertCoin(VendingMachine m, int amt) { m.addBalance(amt); m.setState(new HasMoneyState()); }
    public void selectItem(VendingMachine m, String c) { System.out.println("Pehle paise daaliye"); }
}
```

Use: vending machine, order lifecycle, elevator, traffic light, TCP connection. (Vending Machine lesson me poora code.)

## 4. Command

Request ko ek **object** bana do: queue me daal sakte ho, log kar sakte ho, **undo** kar sakte ho.

```java
interface Command { void execute(); void undo(); }
class AddTextCommand implements Command {
    private final Document doc; private final String text;
    AddTextCommand(Document d, String t) { doc = d; text = t; }
    public void execute() { doc.append(text); }
    public void undo() { doc.removeLast(text.length()); }
}
// Editor ek Deque<Command> history rakhta hai; Ctrl+Z = history.pop().undo()
```

Use: undo/redo, task queues, remote control buttons, transaction logs.

## 5. Chain of Responsibility

Request ko handlers ki **chain** se guzaro; har handler ya to handle kare ya aage bhej de.

```java
abstract class Handler {
    private Handler next;
    Handler linkWith(Handler n) { next = n; return n; }
    void handle(Request r) { if (next != null) next.handle(r); }
}
class AuthHandler extends Handler { void handle(Request r) { if (!r.hasToken()) throw new SecurityException("401"); super.handle(r); } }
class RateLimitHandler extends Handler { void handle(Request r) { /* check */ super.handle(r); } }
```

Use: middleware pipelines, ATM cash dispenser (₹2000 -> ₹500 -> ₹100 notes), support ticket escalation, logging levels.

## 6. Template Method

Algorithm ka **dhaancha parent class** me, kuch steps subclasses fill karein.

```java
abstract class DataExporter {
    final void export() { fetch(); format(); write(); }      // fixed sequence
    abstract void fetch(); abstract void format();
    void write() { System.out.println("file me likha"); }
}
```

| Pattern | Kab | LLD problem me |
|---|---|---|
| Strategy | Algorithm swap karna | Parking fee, payment, elevator scheduling, split type |
| Observer | Change par kai logon ko batana | Notifications, display boards |
| State | State ke hisaab se behaviour | Vending machine, elevator, order status |
| Command | Actions ko object banana, undo | Text editor, task queue |
| Chain of Responsibility | Handlers ki pipeline | Middleware, ATM, approvals |
| Template Method | Fixed steps, kuch customizable | Report exporters, game turns |

:::interview
Q: Strategy aur State pattern me farak?
A: Dono me interface ke implementations swap hote hain. Strategy me client khud algorithm choose karta hai aur strategies ek doosre ke baare me nahi jaantin (pricing, sorting). State me object ki internal state badalne par behaviour badalta hai, aur states khud transitions karti hain (IdleState -> HasMoneyState). Intent alag hai: algorithm selection vs state machine.
Q: Observer pattern ka real example aur ek pitfall?
A: Stock price changes par portfolio app, alerts aur charts ko notify karna; YouTube channel subscribers; UI event listeners. Pitfalls: observers ko unsubscribe na karne se memory leaks, notification order par depend karna, aur ek slow observer sabko slow kar de (isliye async event bus).
Q: Undo/redo feature kaise design karenge?
A: Command pattern: har user action ek Command object (execute/undo). Execute karke undo stack me push; undo par pop karke undo() aur redo stack me push; naya action redo stack clear kare. Memento pattern se state snapshots bhi rakh sakte hain jahan undo logic complex ho.
:::

@lesson lld-approach
@title LLD interview approach aur concurrency basics

Machine coding / LLD round me 60–90 minute me working code chahiye. Structure ke bina time nikal jaata hai.

## Step-by-step approach

1. **Requirements clarify (5–10 min)**: core features, scope ke bahar kya. "Parking lot me multiple floors? Vehicle types? Payment? Kitne entry gates?"
2. **Entities (nouns) nikaalo**: requirements me nouns = classes (ParkingLot, Floor, Spot, Vehicle, Ticket, Payment).
3. **Relationships aur behaviour (verbs)**: verbs = methods (park, unpark, calculateFee). Has-a / is-a.
4. **Class diagram / interfaces** jaldi se.
5. **Design patterns lagao** jahan naturally fit ho (fee calculation -> Strategy, spot allocation -> Strategy, display -> Observer).
6. **Code karo**: pehle core flow (happy path), phir edge cases.
7. **Main/driver** se demo chalao.
8. **Extensibility batao**: "Naya vehicle type aaye to sirf enum/class add."

> [!key] Machine coding round me kya dekhte hain
> - Working code (demo chale).
> - **Modularity**: classes ki saaf responsibilities.
> - **Extensibility**: naye features bina bada change.
> - Naming, readability, enums for fixed types.
> - Edge cases aur exceptions.
> - Thread safety jahan zaroori (concurrent bookings).
> - In-memory data store chalta hai (HashMap), DB ki zaroorat nahi.

## Concurrency basics (LLD me baar-baar aata hai)

Jab do threads ek saath shared data badalein to **race condition**. Example: do gates ek saath last spot allot karein.

### Tools (Java)

- **synchronized**: ek time ek thread.
- **ReentrantLock**: zyada control (tryLock, timeout).
- **Atomic classes**: `AtomicInteger.incrementAndGet()` lock-free counters.
- **ConcurrentHashMap**: thread-safe map.
- **volatile**: variable ki latest value sab threads ko dikhe (visibility), par atomicity nahi.

```java
class ParkingFloor {
    private final Map<String, ParkingSpot> freeSpots = new ConcurrentHashMap<>();
    // compute ko atomic rakhne ke liye lock
    public synchronized Optional<ParkingSpot> allocate(VehicleType type) {
        for (ParkingSpot s : freeSpots.values()) {
            if (s.fits(type)) { freeSpots.remove(s.getId()); return Optional.of(s); }
        }
        return Optional.empty();
    }
}
```

### Deadlock

Thread A ne lock 1 liya aur lock 2 ka wait; Thread B ne lock 2 liya aur lock 1 ka wait. Dono hamesha atke.
**Bachav**: locks hamesha **same order** me lo, timeout ke saath tryLock, lock scope chhota rakho.

### Producer-Consumer

`BlockingQueue` se: producer `put()`, consumer `take()`; queue full/empty par apne aap wait. Thread pools (`ExecutorService`) andar yahi use karte hain.

:::interview
Q: LLD problem kaise approach karenge?
A: Requirements aur scope clarify, nouns se entities aur verbs se behaviours nikaalna, relationships tay karna, class diagram, jahan fit ho wahan design patterns (Strategy, State, Observer, Factory), SOLID follow karte hue code (interfaces, enums, small classes), happy path pehle, phir edge cases aur concurrency, aur end me extensibility discuss karna.
Q: Race condition kya hai, ek example aur fix?
A: Jab kai threads shared state ko bina coordination ke read-modify-write karein aur result interleaving par depend kare. Example: do threads `count++` ek saath karein aur ek increment lost ho jaye, ya do users ek saath last seat book karein. Fix: synchronized/locks, atomic operations (AtomicInteger, compare-and-set), ya concurrent data structures; DB level par transactions/conditional updates.
Q: Deadlock ki 4 conditions aur bachav?
A: Mutual exclusion, hold and wait, no preemption, circular wait. Bachav: global lock ordering (circular wait todna), tryLock with timeout (hold-and-wait todna), locks kam aur chhote scope me, ya lock-free structures.
:::
