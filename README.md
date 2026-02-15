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

```graph TD
    %% Katmanlar arası akış
    User[Kullanıcı Girişi] -->|1. Arayüzü Güncelle| UI[Optimistic UI State]
    User -->|2. İşlem Oluştur| Queue[Operation Queue]

    subgraph Web_Worker [Web Worker Arka Plan Katmanı]
        Queue -->|3. Toplu Yazma| DB[(IndexedDB Yerel Depo)]
        DB -->|4. Senkronize Edilmemişleri Çek| Sync[Sync Manager]
    end

    subgraph WASM_Engine [Rust / WASM Hesaplama Katmanı]
        Sync -->|5. Çakışma Çözümü| CRDT{CRDT Engine}
        CRDT -->|6. Birleşmiş Veri| Sync
    end

    Sync -->|7. Binary Paket| Server[Uzak Sunucu / Eşler]
    Server -->|8. Uzak Güncellemeler| Sync
    Sync -->|9. Nihai Veriyi Uygula| UI

    %% Stil Tanımlamaları
    style User fill:#fff,stroke:#333,stroke-width:2px
    style DB fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    style CRDT fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    style Server fill:#fff3e0,stroke:#e65100,stroke-width:2px
```
