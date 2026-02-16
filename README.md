# AetherSync: High-Performance, Local-First Synchronization Engine

**AetherSync**, modern web uygulamaları için düşük gecikmeli (zero-latency), çevrimdışı öncelikli (offline-first) ve çakışma dirençli (conflict-resilient) bir veri senkronizasyon motorudur.

Bu proje, veriyi merkezi bir veritabanının statik bir kaydı olarak değil, yerel cihazlarda yaşayan, zamanla birleşen ve tutarlılığa ulaşan (eventual consistency) bir "olay akışı" olarak ele alır.

## Architecture & Core Principles

AetherSync, dağıtık sistemlerin karmaşıklığını yönetmek için üç ana sütun üzerine inşa edilmiştir:

### 1. Local-First Persistence (Yerel Öncelikli Kalıcılık)

Kullanıcı etkileşimleri ağ durumundan bağımsızdır. Tüm veriler doğrudan **IndexedDB** üzerine yazılır. Bu işlem, ana iş parçacığını (Main Thread) bloklamamak için izole bir **Web Worker** üzerinde gerçekleştirilir. Sonuç: **0ms Gecikme Hissi.**

### 2. Event Sourcing & Vector Clocks

Her değişiklik bir "Operation" (Op) olarak kaydedilir. Dağıtık sistemlerde fiziksel zamanın güvenilmezliği nedeniyle, olayların sırasını ve nedenselliğini (Causality) takip etmek için **Vector Clocks (Vektör Saatleri)** algoritması kullanılır.

### 3. Smart Conflict Resolution (Akıllı Çakışma Çözümü)

Çevrimdışı modda yapılan çakışan değişiklikler (Concurrent Updates), klasik "Son Yazan Kazanır" mantığıyla silinmez. Sistem, **Custom Merge Strategies** kullanarak veriyi birleştirir ve veri kaybını (Data Loss) önler.

---

## Technical Stack

Proje, dış bağımlılıkları minimize ederek **Saf (Vanilla) TypeScript** ile inşa edilmiştir.

- **Core:** TypeScript (Strict Mode)
- **Storage:** IndexedDB (via idb wrapper)
- **Logic:** Custom Conflict Resolution Algorithm (Vector Clocks & Causality Tracking)
- **Communication:** WebSockets (JSON with Batching Optimization)
- **Concurrency:** Web Workers (Dedicated Worker for I/O & Logic)

---

## 🚀 Implementation Roadmap

### Phase 1: The Foundation (Completed)

- [x] Multi-threaded IndexedDB abstraction layer (Worker Thread).
- [x] Basic operation log schema design (UUID based).
- [x] Zod-based runtime validation.

### Phase 2: The Logic (Completed)

- [x] **Vector Clock Implementation:** Mantıksal saatler ile olay sıralama.
- [x] **Outbox Pattern:** Çevrimdışı değişikliklerin kuyruklanması.
- [x] **Optimistic UI Updates:** Ağ cevabı beklenmeden arayüz güncelleme.

### Phase 3: The Network & Sync (Completed)

- [x] **WebSocket Server:** Node.js tabanlı mock broadcast sunucusu.
- [x] **Smart Batching (Debounce):** Yüksek frekanslı güncellemelerin (örn: text input) paketlenerek gönderilmesi.
- [x] **Conflict Detection:** Eş zamanlı (Concurrent) değişikliklerin tespiti ve "Smart Merge" ile birleştirilmesi.

---

## Research Points & Deep Dive

- **Optimistic UI:** Kullanıcı deneyimini maksimize etmek için ağ onayı beklenmeden yapılan, "başarılı olacağı varsayılan" arayüz güncellemeleri.
- **Batching Strategy:** 1000 tuş vuruşunu tek tek göndermek yerine, "Debounce" mekanizması ile anlamlı paketler halinde sunucuya ileterek bant genişliği optimizasyonu.
- **Eventual Consistency:** Sistemin anlık olarak değil, zaman içinde (tüm mesajlar iletildiğinde) tutarlı hale geleceğinin matematiksel garantisi.

---

## Tasarım Felsefesi: Neden "Headless"?

AetherSync, bir **Headless Sync SDK** (Arayüzsüz Senkronizasyon Kiti) olarak işlev görmek üzere tasarlanmıştır. Çekirdek mantık (`/src/db`, `/src/sync`), UI (Arayüz) katmanından kesin çizgilerle ayrılmıştır.

- **Framework Bağımsızlığı:** Bu motor; React, Vue, Svelte, React Native veya Electron uygulamalarına hiçbir mimari değişiklik gerektirmeden entegre edilebilir.
- **Performans:** Kritik senkronizasyon işlemleri, arayüz oluşturma döngülerinin (Virtual DOM / Re-renders) getirdiği yükten etkilenmeden, arka planda sessizce çalışır.
- **Uzun Ömürlülük:** Arayüz trendleri değişse de veri senkronizasyon mantığı sabit ve kararlı kalır.

```mermaid
graph TD
  A[UI / User Input] -->|1. Debounce & Batch| B[Main Thread Logic]

  subgraph Main_Context [Main Thread - Application Logic]
      B{Conflict Manager}
      B -->|2. Optimistic Update| A
      B -->|3. Vector Clock Comparison| B
      B -->|4. Smart Merge Strategy| A
  end

  subgraph Web_Worker [Web Worker - Storage Layer]
      B -->|5. Async Write (PostMessage)| D[(IndexedDB Storage)]
      D -.->|Load History| B
  end

  subgraph Network_Layer [Network / WebSocket]
      B -->|6. JSON Payload| G[WebSocket Server]
      G -->|7. Broadcast Ops| B
  end
```
