## ADDED Requirements

### Requirement: Verify x-callback-token at router
The system SHALL compare the incoming `x-callback-token` header against the `XENDIT_WEBHOOK_TOKEN` Worker secret before any parsing or forwarding. Requests with a missing or non-matching token SHALL receive `401` with an error payload and SHALL NOT be forwarded. When the secret itself is unconfigured in the runtime, the system SHALL return `500` with an error payload and SHALL NOT forward (fail closed).

#### Scenario: Valid token proceeds to routing
- **WHEN** a POST arrives with an `x-callback-token` matching `XENDIT_WEBHOOK_TOKEN`
- **THEN** the system continues to prefix routing and forwarding as normal.

#### Scenario: Invalid token rejected
- **WHEN** a POST arrives with a missing or non-matching `x-callback-token`
- **THEN** the system returns `401` with an error code such as `INVALID_TOKEN` and makes no outbound fetch.

#### Scenario: Unconfigured secret fails closed
- **WHEN** a POST arrives and `XENDIT_WEBHOOK_TOKEN` is not set in the runtime
- **THEN** the system returns `500` with an error code such as `TOKEN_NOT_CONFIGURED` and makes no outbound fetch.

## MODIFIED Requirements

### Requirement: Forward raw body with passthrough headers
The system SHALL forward the exact raw request body bytes to the brand URL with `Content-Type` preserved and the incoming `x-callback-token` header passed through unchanged. The token has already been verified against the Worker secret at the router (see `Verify x-callback-token at router`); brand endpoints continue verifying it independently.

#### Scenario: Body and token pass through
- **WHEN** a valid routed POST arrives with a JSON body and an `x-callback-token` header
- **THEN** the brand receives the identical body bytes, the same `Content-Type`, and the same `x-callback-token` value.
