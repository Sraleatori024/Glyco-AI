# Security Specification (TDD SPEC)

## 1. Data Invariants
1. **User Ownership Boundaries**: No standard user can read or write data (glucose records, meals, exercises, medications, chat histories) belonging to any other user.
2. **Path Integrity**: Path document IDs must conform to a strict alphanumeric pattern (`isValidId`) preventing directory traversal, injection, or excessive size payloads.
3. **Privilege-Escalation Immunity**: Standard users cannot modify or self-assign the `role` field (e.g. promoting themselves to 'admin') or alter their blocked status.
4. **Audit Immutability**: Logs stored in `audit_logs` are write-once only. Updates and deletions are completely blocked for all identities, including administrators.

---

## 2. The "Dirty Dozen" Threat Payloads

### Payload 1: Privilege Escalation (Self-Promote to Admin)
* **Target Collection**: `users/target_uid`
* **Intruder Intent**: Force-write `role: "admin"` during user onboarding/profile modification.
* **Deny Logic**: Standard user updates block change of `role` unless performed by an verified administrator.

### Payload 2: Cross-Tenant Data Hijack
* **Target Collection**: `glucose_records/malicious_id`
* **Intruder Intent**: Log blood glucose record setting `uid: "victim_user_uid"`.
* **Deny Logic**: Record validation checks that the logged field `uid` strictly equals the request's authenticated user UID (`request.auth.uid`).

### Payload 3: SQL/Path ID Poisoning
* **Target Collection**: `meals/../../../etc/passwd`
* **Intruder Intent**: Document ID injection to bypass path separation.
* **Deny Logic**: Rigorous regular expression validation (`matches('^[a-zA-Z0-9_\-]+$')`) blocks special character injections.

### Payload 4: Denial of Wallet (Bloated ID Attack)
* **Target Collection**: `medications/` with a 1MB string document ID.
* **Intruder Intent**: Exhaust Firebase storage indexes and inflate cost structure.
* **Deny Logic**: Strict length limit (`docId.size() <= 128`) on all target paths.

### Payload 5: Audit Log Deletion
* **Target Collection**: `audit_logs/log_123` (DELETE request)
* **Intruder Intent**: Cover administrative abuse tracks by purging logging records.
* **Deny Logic**: Deletes on `audit_logs` are unconditionally blocked (`allow delete: if false;`).

### Payload 6: Anonymous Write Spam
* **Target Collection**: `glucose_records/log_abc`
* **Intruder Intent**: Insert records from unauthenticated sources.
* **Deny Logic**: All standard write operations are locked behind `isSignedIn()`.

### Payload 7: Bulk User Scrape
* **Target Collection**: `users` (Query list request)
* **Intruder Intent**: Scrape and index names, weights, and health information of all users.
* **Deny Logic**: Query list operations on the root `/users` collection are restricted strictly to administrators.

### Payload 8: Value Poisoning (Fake Glucose Units)
* **Target Collection**: `glucose_records/log_xyz`
* **Intruder Intent**: Inject negative value or extremely high values (e.g. 5,000,000 mg/dL) to crash client graphs.
* **Deny Logic**: Range check (`value >= 0 && value <= 1000`) prevents invalid bounds.

### Payload 9: Fake Sender Chat Spoofing
* **Target Collection**: `ai_history/msg_123`
* **Intruder Intent**: Inject chatbot advice with `sender: "assistant"` from client SDK.
* **Deny Logic**: Chat messages are restricted to standard validated shapes.

### Payload 10: Inactive Plan Bypass
* **Target Collection**: `users/target_uid` (modifying `plan` or `subscriptionStatus`)
* **Intruder Intent**: Forcibly elevate tier to "premium" by overriding `subscriptionStatus: "active"`.
* **Deny Logic**: Users cannot override plan settings unless modified by an admin.

### Payload 11: Cross-User Read Probe
* **Target Collection**: `meals/victim_meal_id` (GET request)
* **Intruder Intent**: Retrieve and inspect food profiles of unrelated users.
* **Deny Logic**: Get/list access verifies `existing().data.uid == request.auth.uid` before authorizing.

### Payload 12: Empty Payload Creation
* **Target Collection**: `medications/med_123`
* **Intruder Intent**: Create blank records to pollute database index tables.
* **Deny Logic**: Strict entity field validation requires existence and proper types for all schema fields.
