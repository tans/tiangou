# Portal Event Stream Compact Dashboard Design

## Goal

Replace the current token-monitor-centric dashboard with a compact monitoring console for the Flap Portal contract.

The new page must:

- Listen to the full Portal event set from `0xe2cE6ab80874Fa9Fa2aAE65D277Dd6B8e65C9De0`
- Show a compact two-column main area
- Keep sniper conditions at the top in a compact control bar
- Show a structured event stream in the left column
- Show live prices for the latest 20 created tokens in the right column

This change should preserve the existing wallet import, node settings, sniper config persistence, and trading flow where possible.

## Scope

In scope:

- Replace the current monitoring data source with Portal event monitoring
- Normalize all supported Portal events into one event stream model
- Add live price refresh for the latest 20 created tokens
- Redesign the dashboard to be visually compact and dense
- Move sniper conditions into a top compact panel

Out of scope:

- Rewriting the trading engine architecture
- Adding new dependencies
- Building historical pagination or long-term event storage
- Adding charts or advanced analytics

## Event Coverage

The listener must support these Portal events:

- `TokenCreated(uint256 ts,address creator,uint256 nonce,address token,string name,string symbol,string meta)`
- `TokenQuoteSet(address token,address quoteToken)`
- `TokenCurveSetV2(address token,uint256 r,uint256 h,uint256 k)`
- `TokenDexSupplyThreshSet(address token,uint256 dexSupplyThresh)`
- `FlapTokenTaxSet(address token,uint256 tax)`
- `FlapTokenAsymmetricTaxSet(address token,uint256 buyTax,uint256 sellTax)`
- `TokenBought(uint256 ts,address token,address buyer,uint256 amount,uint256 eth,uint256 fee,uint256 postPrice)`
- `TokenSold(uint256 ts,address token,address seller,uint256 amount,uint256 eth,uint256 fee,uint256 postPrice)`
- `LaunchedToDEX(address token,address pool,uint256 amount,uint256 eth)`

## Architecture

### Data source

Replace the current Flap indexer’s narrow token feed logic with a Portal-oriented event feed.

The monitoring layer will:

- Read Portal logs from the configured BNB Chain RPC
- Decode all supported events
- Normalize them into a compact internal event shape
- Maintain a newest-first in-memory event list for UI rendering
- Track token metadata discovered from `TokenCreated`

The implementation may continue using polling over block ranges instead of websocket subscriptions, as long as it covers all nine event types reliably and updates the UI continuously.

### Event normalization

Introduce a normalized event model with:

- `id`
- `type`
- `ts`
- `blockNumber`
- `txHash`
- `token`
- `symbol`
- `name`
- `summary`
- `details`

`summary` is the compact one-line human-readable text for the stream.
`details` carries event-specific numeric and address payloads needed for rendering or later enrichment.

### Latest-20 live price model

The live price panel will be keyed off the latest 20 created tokens only.

Rules:

- Source list comes from the newest 20 `TokenCreated` tokens
- Tokens are unique by address
- For each token, refresh the latest quote on a fixed interval
- If a quote fails, keep the token visible and mark the price as unavailable or stale
- The panel is sorted by creation recency, not by price movement

## UI Design

### Top control bar

The top section becomes a compact sniper-condition strip.

It contains:

- Buy amount
- Slippage
- Stop loss
- Take profit 1
- Take profit 2
- Auto-snipe toggle

Design rules:

- Compact height
- Small labels
- Dense spacing
- No large card paddings
- Keep wallet button and status visible in the header area

### Main layout

Use a two-column layout on desktop:

- Left: event stream
- Right: live price list

On smaller screens, stack vertically with the event stream first.

The previous large stats cards, roomy monitor card, and footer status summary should be removed to reduce visual noise and recover space.

### Event stream presentation

The event stream keeps all supported events and renders them in structured compact form.

Examples:

- `NEW  PEPE  0xabc...  creator 0xdef...`
- `QUOTE  PEPE  quote-> WBNB`
- `CURVE  PEPE  r/h/k updated`
- `TAX  PEPE  5%`
- `ATAX  PEPE  buy 3% sell 7%`
- `BUY  PEPE  120000  for 0.32 BNB`
- `SELL PEPE  80000  for 0.21 BNB`
- `DEX  PEPE  pool 0x123...`

Each row should also show:

- event time
- token symbol if known
- a concise secondary line only when needed

The stream should be newest first and scrollable.

### Live price panel

The live price panel shows the latest 20 created tokens and their latest known quote.

Each row should include:

- token symbol and name
- token address short form
- latest price
- last refresh time or stale state

This panel should also be compact, scrollable, and optimized for fast scanning.

## State Changes

The store should be extended rather than replaced.

Add state for:

- normalized Portal events
- token metadata map
- latest-20 created token list
- live price map
- price refresh timestamps

Existing sniper config, wallet state, position state, and transaction state remain in place.

## Error Handling

- RPC failures must not clear existing UI data
- Event fetch failures should surface as a monitoring error state but keep last known events visible
- Price refresh failures should degrade per token, not kill the whole panel
- Unknown token metadata should render with safe fallbacks

## Testing

Minimum verification target:

- Event normalization for each supported event type
- Latest-20 token selection logic
- Quote refresh mapping and stale handling
- Dashboard rendering of compact two-column layout
- Top control bar still updates config state correctly

## Implementation Strategy

Recommended implementation sequence:

1. Add Portal event ABI and normalized event types
2. Replace or extend the current monitor/indexer layer to fetch all Portal events
3. Track latest 20 created tokens
4. Add quote refresh logic for those tokens
5. Replace dashboard layout with compact header controls plus two columns
6. Remove obsolete monitor/stat UI sections
7. Verify state updates and rendering behavior

## Risks

- RPC polling across many event types may increase request volume
- Some event rows may arrive before token metadata is known if historical windows are narrow
- Price quoting may fail for tokens that are not yet tradable or whose quote path is incomplete

## Decisions

- Use all Portal events, not just token creation
- Show a structured compact event stream rather than a filtered subset
- Show live prices for the latest 20 created tokens only
- Keep the page visually dense and remove non-essential summary UI
