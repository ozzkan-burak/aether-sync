High-Performance, Local-First Sync Engine with Rust-Powered CRDTs

AetherSync, modern web uygulamaları için düşük gecikmeli (zero-latency), çevrimdışı öncelikli (offline-first) ve çakışmasız (conflict-free) bir veri senkronizasyon motorudur. Bu proje, veriyi merkezi bir veritabanının statik bir kaydı olarak değil, yerel cihazlarda yaşayan ve zamanla birleşen bir "olay akışı" (event stream) olarak ele alır.

🏗 Architecture & Core Principles
AetherSync üç ana sütun üzerine inşa edilmiştir:

Local-First Persistence: Kullanıcı etkileşimleri doğrudan IndexedDB üzerinde, ana iş parçacığını (Main Thread) bloklamayan bir Web Worker aracılığıyla işlenir.

Event Sourcing & CRDT: Her değişiklik bir "Operation" (Op) olarak kaydedilir. Çakışma çözümleri (Conflict Resolution), matematiksel tutarlılığı garanti eden LWW (Last-Write-Wins) ve CRDT algoritmaları ile yönetilir.

WASM Computation Layer: Karmaşık veri birleştirme ve fark hesaplama (diffing) işlemleri, yüksek performans için Rust (WebAssembly) katmanında gerçekleştirilir.

Technical Stack
Core: JavaScript (ESNext) / TypeScript

Storage: IndexedDB (via idb wrapper)

Logic: Rust (WASM) for Conflict-Free Replicated Data Types

Communication: WebSockets (Binary Protocol / Protocol Buffers)

Concurrency: Web Workers (Dedicated Worker for DB I/O)

Implementation Roadmap
Phase 1: The Foundation (Current)
[ ] Multi-threaded IndexedDB abstraction layer.

[ ] Batch write mechanism for high-frequency updates.

[ ] Basic operation log schema design.

Phase 2: The Brain (Rust/WASM)
[ ] Rust-based CRDT implementation.

[ ] WASM bridge for efficient memory sharing between JS and Rust.

Phase 3: The Bridge (Sync)
[ ] WebSocket provider for real-time operation broadcast.

[ ] Vector clocks for causal ordering of events.

Research Points & Deep Dive
Optimistic UI: Kullanıcı deneyimini maksimize etmek için ağ onayı beklenmeden yapılan arayüz güncellemeleri.

Binary Serialization: JSON yükünü azaltmak için MessagePack veya Protobuf kullanımı.

Idempotency: Aynı operasyonun birden fazla kez uygulanmasının sistem durumunu bozmaması.

graph TD
    A[UI / User Input] -->|1. Optimistic Update| B[Reactive State]
    A -->|2. Create Operation| C[Operation Queue]
    
    subgraph "Web Worker (Background Thread)"
        C -->|3. Batch Write| D[(IndexedDB)]
        D -->|4. Fetch Unsynced| E[Sync Manager]
    end

    subgraph "Rust / WASM Layer"
        E -->|5. Resolve Conflicts| F{CRDT Engine}
        F -->|6. Converged State| E
    end

    E -->|7. Binary Sync| G[Remote Server / Peers]
    G -->|8. Remote Ops| E
    E -->|9. Apply Remote| B
