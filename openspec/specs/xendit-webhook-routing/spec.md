# xendit-webhook-routing Specification

## Purpose
Provides a single Xendit webhook entrypoint on the BrennLabs portal that routes payment events to the correct brand-owned webhook by inspecting the caller-controlled `reference_id` prefix.

## Requirements

### Requirement: Route webhook by reference_id prefix
The system SHALL extract `data.reference_id` from the Xendit JSON body, derive the brand prefix as the substring before the first `-`, and forward the request to the matching brand URL in the hardcoded prefix map. Prefix matching SHALL be exact and case-sensitive (uppercase `A-Z` letters, multi-character supported).

#### Scenario: Known prefix is routed
- **WHEN** a POST arrives with body `{ "data": { "reference_id": "H-415976b1ee6e4713aa3d7a9795151f62" } }` and the map contains `H`
- **THEN** the system forwards the request to the `H` brand URL and returns the brand outcome to the caller.

#### Scenario: Multi-character prefix is routed
- **WHEN** a POST arrives with body `{ "data": { "reference_id": "HIM-abc123" } }` and the map contains `HIM`
- **THEN** the system forwards the request to the `HIM` brand URL.

### Requirement: Accept only POST
The system SHALL accept only `POST` requests at the webhook route and reject all other methods with `405 Method Not Allowed`.

#### Scenario: Non-POST rejected
- **WHEN** a `GET` request arrives at the webhook route
- **THEN** the system returns `405` without forwarding.

### Requirement: Forward raw body with passthrough headers
The system SHALL forward the exact raw request body bytes to the brand URL with `Content-Type` preserved and the incoming `x-callback-token` header passed through unchanged. The system SHALL NOT verify the token itself; verification remains the brand endpoint's responsibility.

#### Scenario: Body and token pass through
- **WHEN** a valid routed POST arrives with a JSON body and an `x-callback-token` header
- **THEN** the brand receives the identical body bytes, the same `Content-Type`, and the same `x-callback-token` value.

### Requirement: Await brand response with timeout and propagate failure
The system SHALL await the brand response with an explicit timeout (10 seconds) and propagate the outcome: brand 2xx SHALL yield router 2xx to Xendit; brand non-2xx, network error, or timeout SHALL yield router `502` so Xendit retries.

#### Scenario: Brand success propagates
- **WHEN** the brand responds `200`
- **THEN** the router returns `200` to Xendit.

#### Scenario: Brand failure propagates
- **WHEN** the brand responds `500`, the fetch throws, or the 10-second timeout fires
- **THEN** the router returns `502` to Xendit.

### Requirement: Unknown or missing prefix returns 200 without forwarding
The system SHALL return `200` with an error payload and SHALL NOT forward when `data.reference_id` is missing, empty, has no `-`-separated prefix, or its prefix is not in the map. This intentionally suppresses Xendit retries for unroutable events.

#### Scenario: Unknown prefix swallowed
- **WHEN** a POST arrives with `reference_id: "ZZZ-123"` and `ZZZ` is not in the map
- **THEN** the system returns `200` with an error code such as `UNKNOWN_PREFIX` and makes no outbound fetch.

#### Scenario: Missing reference_id swallowed
- **WHEN** a POST arrives with no `data.reference_id`
- **THEN** the system returns `200` with an error code such as `MISSING_REFERENCE_ID` and makes no outbound fetch.

### Requirement: Invalid JSON returns 400
The system SHALL return `400` when the request body is not parseable JSON or the JSON shape cannot be inspected for `data.reference_id`.

#### Scenario: Malformed body rejected
- **WHEN** a POST arrives with a non-JSON body
- **THEN** the system returns `400` without forwarding.

### Requirement: Emit per-request Worker logs
The system SHALL log every webhook request with `reference_id`, derived prefix, target brand URL (or `unrouted` reason), downstream status, and latency in milliseconds, using `console.log` for routed and `console.warn` for unrouted/failed requests.

#### Scenario: Routed request is logged
- **WHEN** a request is forwarded to a brand and the brand responds
- **THEN** a log line contains the prefix, target URL, downstream status, and latency.

#### Scenario: Unrouted request is warned
- **WHEN** a request has an unknown prefix
- **THEN** a warning log contains the `reference_id` and the reason `UNKNOWN_PREFIX`.
