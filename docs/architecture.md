# Hesabpak — Architecture & Module Overview

This document captures the current project layout and the agreed roadmap modules. It should be kept up to date as new components land.

## Repository Layout

```
hp/
├── backend/               # FastAPI service
│   ├── app/               # Application package
│   │   ├── activity_logger.py
│   │   ├── ai_*.py
│   │   ├── financial_automation.py
│   │   ├── models.py / schemas.py / crud.py
│   │   ├── security.py / db.py / main.py
│   │   └── ...
│   ├── alembic/           # Database migrations
│   ├── requirements.txt   # Python dependencies
│   ├── Dockerfile
│   └── .env.example
├── frontend/              # React + Vite client
│   ├── src/
│   │   ├── components/    # UI modules (Dashboard, SmartDatePicker, etc.)
│   │   ├── context/
│   │   ├── services/
│   │   └── utils/
│   ├── public/
│   ├── vite.config.ts
│   ├── package.json
│   └── Dockerfile
├── docs/                  # Architectural notes, specs, ADRs
├── infra/                 # Deployment notes and IaC stubs
├── tests/                 # Backend pytest suite
├── docker-compose.yml
└── README.md / README.fa.md
```

## Planned Modules (High Level)

| Category             | Scope |
|----------------------|-------|
| **Auth & RBAC**      | JWT/refresh tokens, role-based permissions, audit logs, 2FA option. |
| **Master Data**      | Products, persons, cash/bank accounts, POS devices, import/export helpers. |
| **Sales & Purchases**| Pre-invoice, invoice, dynamic line items, conversions, ledger integration. |
| **Receipts & Payments** | Cash/bank flows, cheques, settlement against invoices. |
| **Dashboard & Widgets** | Retro themed layout, drag/drop widgets, real-time stats & external feeds. |
| **Reports**          | P&L variations, ledgers, turnover, printable/exportable outputs. |
| **Search**           | Global search bar backed by Meilisearch, per-module filters, fuzzy matching. |
| **Blockchain Bridge**| Hash anchoring of critical documents, verification UI, queue-based sync. |
| **Backup & Time Sync** | Automatic client/server backups, world-clock synchronization, recovery flow. |

## Shared Tooling

- **Python**: `pytest`, `black`, `isort`, `mypy` (planned), `pre-commit`.
- **Node/React**: `eslint` + `@typescript-eslint`, `prettier`, `lint-staged`.
- **Git Hooks**: `pre-commit` (Python) and Husky (frontend) to enforce lint/test before commit.
- **CI/CD**: GitHub Actions workflow under `.github/workflows/`.

Keep this file updated when new modules or services are introduced.

## موتور نقشه راه خودکار NeuroChainX

- هدف: یک منبع واحد نقشه راه که برای انسان، سیستم و عامل‌های AI قابل مصرف باشد.
- آرتیفکت‌ها: `roadmap/roadmap.json`, `roadmap/status.json`, `roadmap/roadmap.md`, `roadmap/progress.log`, `roadmap/generated-page/live.html`.
- عامل همگام‌سازی: اجرای `python backend/agents/roadmap_sync.py --commit-limit 50` داده را بازتولید می‌کند و پیام‌های کامیت را برای `DONE:<milestone_id>` اسکن می‌کند۔
- API (FastAPI): GET `/roadmap/json`, GET `/roadmap/status`, GET `/roadmap/live` برای ارائه داده و UI زنده.
- جریان: نشان در پیام کامیت -> محاسبه دوباره درصدها در roadmap_sync -> آرتیفکت‌ها بازتولید -> API/UI همگام می‌مانند.
- مستندات: مشخصات هر فاز در `docs/phases/<id>-<name>.md` نگهداری و توسط عامل به‌روزرسانی می‌شود.

## P2P Synchronization Design (F03-M1)

This section outlines a preliminary design for peer discovery and gossip protocols as part of the F03-P2P phase. The goal is to establish stable peer-to-peer synchronization with conflict resolution.

### Peer Discovery

*   **Initial Seed Nodes:** For bootstrapping, a list of well-known, stable peer addresses will be hardcoded into the configuration. These nodes serve as initial contact points.
*   **Local Network Discovery (LAN):**
    *   **Mechanism:** UDP broadcast on a designated port. Nodes send periodic "hello" messages containing their IP address and port.
    *   **Response:** Peers listening on the port respond with their own "hello" message.
    *   **Limitations:** This approach is limited to the local network segment.
*   **Wide Area Network Discovery (WAN):
    *   **Mechanism:** Centralized Directory Service (for prototype simplicity). Peers register themselves with a known HTTP endpoint, providing their external IP/port. This service returns a list of active peers.
    *   **Future/Decentralized:** In a more mature system, this would evolve into a Distributed Hash Table (DHT) or a more sophisticated decentralized discovery mechanism.
*   **Peer Table:** Each node maintains a local table of active and known peers, including their addresses and last-seen timestamps.

### Gossip Protocol

*   **Mechanism:** Periodic, randomized peer-to-peer communication.
*   **Information Exchange:**
    *   **State Summary:** Peers exchange a summary of their local ledger state (e.g., the hash of their latest `BlockchainEntry` or a Merkle root of their entire ledger).
    *   **Missing Entries:** If a peer identifies missing entries in another peer's summary (e.g., a gap in `previous_hash` chain), it can request those specific entries.
    *   **New Entries:** Peers can broadcast new `BlockchainEntry` records they have created to a subset of their known peers.
*   **Frequency:** Messages are exchanged periodically (e.g., every few seconds or minutes) to maintain freshness.
*   **Reliability:** The gossip protocol is eventually consistent; not all peers need to receive every message directly, as information propagates through the network over time.
*   **Conflict Resolution:** (To be detailed in F3-M2) The exchanged state summaries will be used as input for conflict resolution algorithms (e.g., longest chain rule, CRDTs). For now, the gossip simply enables the exchange of information needed for conflict detection.

### Implementation Notes (Prototype)

*   **FastAPI Endpoints:** Peers will expose simple HTTP/HTTPS endpoints (e.g., `/p2p/hello`, `/p2p/gossip`) to receive discovery and gossip messages.
*   **Background Task:** A background task (e.g., using `asyncio` or a simple `threading.Timer`) will be responsible for initiating periodic discovery and gossip rounds.
*   **Configuration:** Configurable via environment variables (e.g., `P2P_BOOTSTRAP_NODES`, `P2P_LISTEN_PORT`).

This design serves as a foundational step. Further milestones will refine conflict resolution, offline synchronization, and observability.

## Conflict Resolution Strategy (F03-M2)

This section outlines a preliminary strategy for conflict resolution within the P2P synchronization process. The goal is to ensure data consistency across distributed nodes, especially when concurrent modifications or network partitions occur.

### Types of Conflicts

In a distributed ledger or state-based replication system, conflicts typically arise from:

*   **Concurrent Modifications:** Two or more peers attempt to modify the same data concurrently, resulting in different versions.
*   **Divergent Histories:** Network partitions or delays can lead to peers having different sequences of operations, creating branched histories.
*   **Phantom Reads/Writes:** Data appearing or disappearing unexpectedly due to inconsistent views across peers.

### Conflict Resolution Approaches

To address these conflicts, a combination of strategies will be employed, prioritized by their suitability for different data types and consistency requirements.

1.  **Conflict-Free Replicated Data Types (CRDTs):**
    *   **Concept:** CRDTs are data structures that can be replicated across multiple machines, allowing concurrent updates to be merged automatically without requiring complex coordination logic or undo operations. They guarantee strong eventual consistency.
    *   **Application:** Ideal for simple data types where merges are commutative, associative, and idempotent (e.g., counters, sets, registers). For instance, the number of "likes" on a post, or a shopping cart contents.
    *   **Example:** A G-Counter (Grow-only Counter) for tallies, or a G-Set (Grow-only Set) for collections.
    *   **Benefit:** Simplifies development significantly by offloading conflict resolution to the data type itself.

2.  **Merkle Tree Differences (Merkle Diff):**
    *   **Concept:** Merkle trees provide an efficient way to summarize a large set of data. By comparing the Merkle root hash of two peer's data, differences can be quickly detected. If roots differ, sub-trees can be compared to pinpoint the exact divergent data blocks.
    *   **Application:** Primarily for detecting and pinpointing divergences in the `BlockchainEntry` ledger.
    *   **Process:**
        *   Peers periodically exchange their Merkle root of the `BlockchainEntry` chain.
        *   If roots don't match, peers exchange hashes of sub-trees until the conflicting branches or individual entries are identified.
        *   Once conflicting entries are found, a resolution policy is applied.
    *   **Benefit:** Minimizes network traffic for synchronization, as only divergent parts of the state need to be exchanged.

3.  **Resolution Policies for Non-CRDTs / Merkle Diff Conflicts:**
    For data that cannot be modeled as CRDTs or when Merkle Diff reveals deeper, unresolvable divergences, explicit policies are needed:

    *   **Last-Write Wins (LWW):**
        *   **Concept:** The update with the latest timestamp (or a sufficiently fine-grained logical clock) is accepted as the canonical version.
        *   **Application (Prototype):** For initial prototyping, LWW can be applied to `BlockchainEntry` conflicts where two valid entries might appear for the same `entity_id` at a similar logical time.
        *   **Limitations:** Can lead to data loss if two important concurrent updates occur and one is simply overwritten. Requires robust timestamping or logical clocks.
    *   **Longest Chain Rule (for Blockchain Entries):**
        *   **Concept:** In a blockchain-like structure, if two branches emerge from a common ancestor, the branch with the most accumulated "work" (e.g., entries, difficulty, or simply length) is considered the canonical chain.
        *   **Application:** Applicable directly to the `BlockchainEntry` chain to resolve forks.
        *   **Refinement:** Requires each `BlockchainEntry` to correctly reference its `previous_hash`.
    *   **Operator Intervention:** For critical or unresolvable conflicts, the system may flag the conflict for human review and manual resolution.

### Proposed Prototype Resolution Flow

1.  **Gossip Exchange:** Peers exchange state summaries, including Merkle roots of their `BlockchainEntry` ledger.
2.  **Divergence Detection:** If Merkle roots differ, use Merkle diff to identify conflicting `BlockchainEntry` sequences.
3.  **Automated Resolution (Blockchain Entries):** Apply the **Longest Chain Rule** to resolve forks in the `BlockchainEntry` chain. The chain with more entries is preferred. If lengths are equal, a tie-breaking rule (e.g., lexicographical comparison of the Merkle root or the `data_hash` of the last block) will be used.
4.  **Conflict Logging:** All detected and automatically resolved conflicts are logged in an append-only "conflict log" (potentially another `BlockchainEntry` type) for auditing and analysis.
5.  **Manual Intervention (Future):** Implement an administrative UI to review and manually resolve conflicts that cannot be handled automatically, especially for higher-level domain objects (e.g., conflicting invoice details).

This strategy prioritizes automatic resolution where feasible while providing mechanisms to detect and eventually handle more complex scenarios. It will be refined as the P2P implementation progresses.

## Offline-First Synchronization (F03-M3)

This section outlines a preliminary strategy for implementing offline-first synchronization with resumable sessions as part of the F03-P2P phase. The goal is to allow users (or edge nodes) to continue operating and making changes even without a continuous network connection, and to seamlessly synchronize these changes once connectivity is restored.

### Core Principles

*   **Availability over Consistency (Initially):** Prioritize allowing users to perform operations locally, even if it means temporary divergence from the global state. Eventual consistency will be achieved through synchronization and conflict resolution.
*   **Local Data Persistence:** All necessary data for offline operations must be stored locally and durably.
*   **Change Tracking:** All local modifications must be accurately tracked and queued for synchronization.

### Key Components & Mechanisms

1.  **Local Data Persistence:**
    *   **Mechanism:** For client-side applications (e.g., frontend React app, mobile app), this could involve IndexedDB, Web SQL, or local SQLite databases. For edge backend nodes, a local instance of PostgreSQL or SQLite would be used.
    *   **Data Scope:** Only data relevant to the local node's operations needs to be persistently cached.
    *   **Schema:** The local data schema should mirror the canonical schema to simplify mapping during synchronization.

2.  **Local Change Tracking (Operation Log):**
    *   **Mechanism:** An append-only log of all local operations/mutations performed while offline or awaiting synchronization. This log will effectively be a local, miniature `BlockchainEntry` chain for local changes.
    *   **Content:** Each entry in this local log should capture:
        *   The operation (create, update, delete).
        *   The entity type and ID affected.
        *   The full data payload of the change (or a diff).
        *   A local timestamp.
        *   A unique local operation ID.
    *   **Relationship to Core Ledger:** These local log entries will eventually be proposed as `BlockchainEntry` records to the NeuroChainX core ledger upon synchronization.

3.  **Synchronization Triggers:**
    *   **Network Re-establishment:** Automatically trigger a sync attempt when network connectivity is detected.
    *   **Periodic Background Sync:** Attempt synchronization at regular intervals when connected.
    *   **Manual User Trigger:** Provide a UI element for users to initiate synchronization manually.
    *   **Event-Based:** Trigger sync after critical local operations (e.g., "finalize invoice").

4.  **Synchronization Process & Resumable Sessions:**
    *   **Handshake:** When two peers (e.g., a client and a server, or two server-side peers) attempt to synchronize, they first exchange their current state summaries (e.g., latest `BlockchainEntry` hash, latest local operation log entry ID).
    *   **Delta Identification:** Using the exchanged summaries and the Merkle Diff strategy (from F03-M2), peers identify the differences (deltas) in their respective data sets and operation logs.
    *   **Chunked Transmission:** Deltas are transmitted in chunks. This allows for:
        *   **Resumption:** If the connection drops, the synchronization can resume from the last successfully transmitted chunk.
        *   **Efficiency:** Only changed data is sent.
    *   **Optimistic Replication:** Changes are applied locally as soon as they are made. During synchronization, if conflicts arise, the documented conflict resolution strategy (F03-M2) is applied.
    *   **Progress Tracking:** The state of an ongoing synchronization (last transmitted chunk, current progress, next expected chunk) is persisted locally on both ends. If a session is interrupted, this stored state allows it to be resumed from the point of failure.

5.  **Conflict Handling:**
    *   During the delta identification and application phase, if a peer detects a conflict that cannot be automatically resolved by CRDTs or the Longest Chain Rule, it will be flagged.
    *   The system will log these unresolved conflicts and potentially trigger a manual intervention flow (as discussed in F03-M2). Automated rollback to the last consistent state may be considered for severe cases.

### Implementation Notes (Prototype)

*   **Client-side (Frontend):** Would likely use a dedicated service worker and IndexedDB for local storage and change tracking.
*   **Server-side (Backend):** FastAPI endpoints for `sync/init`, `sync/delta`, `sync/resume` would be created. A background process/thread manages local change tracking and outbound sync attempts.
*   **State:** The "resumable session" state would be small, storing just enough info (e.g., a hash, a timestamp, a block range) to identify where to pick up synchronization.

This offline-first approach ensures a resilient and highly available user experience, even under challenging network conditions. It will leverage the core ledger and conflict resolution designs from preceding milestones.

## Observability for P2P Sync Flows (F03-M4)

This section outlines strategies for implementing observability for the P2P synchronization flows, especially focusing on edge nodes. Effective observability is crucial for understanding the health, performance, and correctness of the distributed synchronization process.

### Pillars of Observability

1.  **Logging:**
    *   **Granularity:** Detailed logs will be generated for all critical events related to P2P synchronization.
    *   **Key Events to Log:**
        *   **Peer Discovery:** Successful/failed discovery attempts, new peers identified, peer departures/disconnections.
        *   **Gossip Messages:** Sent/received summaries, specific data requests, new entries broadcast.
        *   **Synchronization Sessions:** Session initiation, progress updates (chunks sent/received), completion, interruption, resumption.
        *   **Conflict Detection:** Details of detected conflicts, resolution strategy applied, outcome of resolution (automatic/manual).
        *   **Errors/Warnings:** Network issues, data validation failures, unexpected peer behavior.
    *   **Log Structure:** Logs will be structured (e.g., JSON format) to facilitate automated parsing and analysis. Each log entry will include:
        *   Timestamp (UTC with high precision).
        *   Node ID/Peer ID.
        *   Log Level (INFO, WARN, ERROR, DEBUG).
        *   Message describing the event.
        *   Relevant Contextual Data (e.g., peer address, `BlockchainEntry` ID, Merkle root, error details).
    *   **Centralized Logging (Future):** Logs from multiple edge nodes will ideally be aggregated into a centralized logging system (e.g., ELK Stack, Grafana Loki) for comprehensive analysis and troubleshooting.

2.  **Metrics:**
    *   **Purpose:** Quantifiable data points to monitor the performance and health of the sync process.
    *   **Key Metrics to Track:**
        *   **Sync Latency:** Time taken for a full synchronization cycle between two peers.
        *   **Sync Success Rate:** Percentage of successful synchronization attempts.
        *   **Data Volume Transferred:** Amount of data (bytes, number of entries) exchanged during sync sessions.
        *   **Active Peers:** Number of currently connected/known peers.
        *   **Conflict Rate:** Frequency of conflicts detected and how they were resolved (auto vs. manual).
        *   **Local Change Queue Size:** Number of pending local operations awaiting synchronization.
        *   **Resource Utilization:** CPU, memory, network bandwidth consumed by the sync process.
    *   **Exposure:** Metrics will be exposed via a standardized interface (e.g., Prometheus endpoint) for scraping by monitoring systems.
    *   **Dashboards:** Customizable dashboards (e.g., Grafana) will visualize these metrics over time, allowing operators to spot trends and anomalies.

3.  **Tracing:**
    *   **Purpose:** To follow the flow of a single synchronization event or a critical data change across multiple nodes in the distributed system.
    *   **Mechanism:** Distributed Tracing (e.g., OpenTelemetry, Jaeger). Each operation (e.g., a new `BlockchainEntry` created locally, then gossiped, then synchronized) will have a unique trace ID.
    *   **Spans:** Individual steps within a trace will be represented as spans, detailing start/end times, duration, and relevant attributes (e.g., peer sending, peer receiving, processing time).
    *   **Benefit:** Invaluable for debugging complex distributed issues, identifying bottlenecks, and understanding the end-to-end journey of data.

4.  **Alerting:**
    *   **Purpose:** To proactively notify operators of potential issues or critical events that require attention.
    *   **Alert Conditions:**
        *   **Sync Failures:** Repeated or prolonged synchronization failures between peers.
        *   **High Conflict Rate:** An unusual spike in detected conflicts.
        *   **Stale Peers:** Peers that haven't synchronized or gossiped for an extended period.
        *   **Resource Thresholds:** Sync process consuming excessive CPU/memory.
        *   **Security Events:** Detection of anomalous P2P behavior (e.g., large data transfer from unknown peer).
    *   **Notification Channels:** Alerts will be sent via appropriate channels (e.g., email, SMS, PagerDuty, Slack) to the relevant teams.

### Implementation Notes (Prototype)

*   **Python Logging Module:** Utilize Python's standard `logging` module, configured to output structured logs.
*   **Simple Metrics:** For a prototype, basic counters and timers can be implemented directly within the P2P codebase, incrementing on relevant events.
*   **Manual Inspection:** Initially, observability will rely on manual inspection of logs. As the system matures, dedicated monitoring and tracing tools would be integrated.

This robust observability framework will enable rapid detection, diagnosis, and resolution of issues within the P2P synchronization layer, ensuring the overall stability and reliability of NeuroChainX.