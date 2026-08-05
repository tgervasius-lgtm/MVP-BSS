# BSS Pricing & Commercial Offer Baseline

| Field | Value |
|---|---|
| Status | `PROPOSED / NOT APPROVED FOR EXTERNAL USE` |
| Version | `0.1` |
| Date | `2026-08-05` |
| Owner | BSS Product Owner |
| Related issue | `#71` |
| Applies to | Internal pricing analysis, pilot preparation, offer approval and commercial handoff |
| Does not represent | Final price list, accounting advice, tax advice, customer offer or signed contract |

## 1. Purpose

This document creates a controlled commercial framework before BSS has final hardware, infrastructure, support, accounting and market inputs.

Its purpose is not to freeze a price too early. It ensures that every future number has a clear status, calculation, owner, approval and evidence trail.

No number in this version may be copied into an external offer unless the Product Owner changes its status to `INTERNAL APPROVED` and the customer-specific margin check passes.

## 2. Commercial truth statuses

Every price, fee, discount or term must carry exactly one status.

| Status | Meaning | External use |
|---|---|---|
| `ASSUMPTION` | Placeholder used for planning before evidence exists | prohibited |
| `WORKING BAND` | Internal range used for comparison and sensitivity analysis | prohibited |
| `INTERNAL APPROVED` | Approved internal price or rule for a defined market/version | permitted only through an approved offer |
| `CUSTOMER OFFERED` | Price and terms formally sent to one named customer | permitted only for that offer and validity period |
| `CONTRACTED` | Signed customer price and terms | binding according to the signed agreement |
| `RETIRED` | Old price/version no longer offered | prohibited for new offers |

A chat message, draft document or verbal discussion does not change pricing status.

## 3. Current direction

### 3.1 Preferred commercial direction

The current preferred direction is an all-inclusive monthly service in which:

- BSS owns the terminal;
- the customer receives the terminal for use during the agreement;
- software, normal support, normal updates and defined replacement coverage are included;
- exceptional installation work, customer-caused damage and out-of-scope services are separately priced;
- the commercial model creates predictable recurring revenue and avoids a large initial purchase for the customer.

This direction remains `PROPOSED` until hardware lifecycle and unit economics are confirmed.

### 3.2 Historic working ideas

| Idea | Status | Note |
|---|---|---|
| Approximately EUR 80 per terminal/month, all-inclusive | `ASSUMPTION` | preferred early concept; not validated |
| Approximately EUR 50 per terminal/month plus EUR 2 per active worker/month | `ASSUMPTION` | alternative early concept; not validated |
| Web-only package | `ASSUMPTION` | requires scope and support boundary |
| One-time hardware purchase plus SaaS | `ASSUMPTION / NON-PREFERRED` | may create support and replacement complexity |

These are internal starting points, not market facts or approved prices.

## 4. Pricing principles

1. Price must cover the full lifecycle, not only hosting and component cost.
2. BSS must price hardware failure, replacement, support and travel risk before offering all-inclusive service.
3. The simplest customer-facing model is preferred when its economics are sustainable.
4. The customer must understand what is included, excluded and charged separately.
5. A lower headline price must not create hidden mandatory charges.
6. Discounting cannot reduce the price below the approved contribution-margin floor.
7. Pilot pricing must test demand without creating a permanent expectation of free service.
8. Device ownership, return and damage responsibility must be explicit.
9. Prices must state whether VAT is included or excluded.
10. A proposed feature, Preview behavior or incomplete production gate cannot be included as delivered value.
11. Each external offer has a version, validity date and named approver.
12. Customer-specific custom development is never silently included in a standard subscription.

## 5. Internal cost stack

Before final approval, BSS must calculate the following for each offer.

### 5.1 Hardware acquisition cost

- Raspberry Pi, display, reader, buzzer and electronic components;
- enclosure and machining/printing;
- power supply, cabling, mounting and consumables;
- RFID/NFC cards included in the offer;
- assembly labour;
- testing and burn-in;
- packaging and delivery;
- spare-parts allocation;
- purchasing loss, defective component and warranty risk;
- VAT/import treatment as confirmed by accounting.

### 5.2 Installation and onboarding cost

- remote preparation;
- customer discovery and configuration;
- data preparation/import;
- physical installation time;
- travel time, kilometres, tolls and accommodation where applicable;
- training;
- acceptance test;
- post-installation support reserve.

### 5.3 Monthly service cost

- production hosting and database;
- staging allocation;
- monitoring and error tracking;
- backup and restore capability;
- transactional email and storage;
- support labour;
- maintenance and security updates;
- customer-success check-ins;
- payment and banking fees;
- accounting/admin allocation;
- sales and renewal allocation;
- incident and SLA reserve.

### 5.4 Hardware lifecycle reserve

- expected useful life;
- expected failure rate;
- replacement parts;
- shipping/reinstallation;
- theft, loss and customer damage policy;
- technology refresh;
- residual value at contract end.

### 5.5 Company overhead allocation

- insurance;
- legal/privacy/accounting;
- tools and subscriptions;
- founder/employee time;
- office/warehouse;
- marketing and sales;
- warranty and bad-debt reserve.

## 6. Core pricing formulas

### 6.1 Monthly direct cost per customer

```text
monthly_direct_cost =
  allocated_infrastructure
  + expected_support
  + hardware_amortisation
  + replacement_reserve
  + payment_admin_cost
  + customer_success_cost
  + travel_service_reserve
```

### 6.2 Minimum sustainable price

```text
minimum_price = monthly_direct_cost / (1 - target_gross_margin)
```

Example only: if monthly direct cost is EUR 30 and target gross margin is 65%, the calculated price floor is approximately EUR 85.71.

The example is mathematical evidence only, not a BSS price decision.

### 6.3 Hardware amortisation

```text
hardware_amortisation = total_deployed_hardware_cost / planned_recovery_months
```

Working recovery windows to test:

| Window | Status | Use |
|---|---|---|
| 12 months | `WORKING BAND` | faster recovery; higher monthly price |
| 18 months | `WORKING BAND` | balanced planning scenario |
| 24 months | `WORKING BAND` | lower monthly burden; higher termination risk |

### 6.4 Contribution per customer

```text
monthly_contribution = recurring_revenue - monthly_variable_and_allocated_direct_cost
```

### 6.5 Customer acquisition payback

```text
payback_months =
  (sales_cost + onboarding_subsidy + unrecovered_hardware_cost)
  / monthly_contribution
```

The launch model must define an approved maximum payback period.

## 7. Candidate commercial models

None of the following models is approved. They are structured alternatives for comparison.

## 7.1 Model A — All-inclusive terminal subscription

### Intended positioning

Simple monthly package for companies that want one predictable invoice and do not want to buy or maintain the terminal.

### Working band

| Component | Working value | Status |
|---|---:|---|
| Monthly fee per terminal | EUR 70–100 | `WORKING BAND` |
| Included active workers | to be decided | `ASSUMPTION` |
| Additional worker fee | EUR 0–2 | `WORKING BAND` |
| Setup/installation | separate or partially included | `ASSUMPTION` |
| Initial term | 12–24 months | `WORKING BAND` |
| Device owner | BSS | `PROPOSED` |

### Potential inclusions

- one BSS terminal;
- standard web access;
- normal software updates;
- normal remote support;
- standard backups and monitoring after production approval;
- defined hardware replacement for ordinary failure;
- standard reports included in MVP;
- initial administrator training.

### Potential exclusions

- electrical/network construction;
- non-standard wall or industrial installation;
- repeated on-site visits caused by customer environment;
- customer-caused damage, theft or loss;
- extra terminals;
- custom reports or integrations;
- payroll/ERP integration;
- premium SLA;
- new functions outside approved product scope.

### Advantages

- simple customer message;
- predictable recurring revenue;
- BSS retains device control;
- easier replacement and standardisation.

### Risks

- BSS finances hardware upfront;
- early cancellation can create loss;
- support and travel can consume margin;
- unclear worker allowance can create unpriced scaling.

## 7.2 Model B — Terminal base plus active worker

### Intended positioning

Separates hardware/service base from usage scale.

### Working band

| Component | Working value | Status |
|---|---:|---|
| Monthly terminal/base fee | EUR 40–60 | `WORKING BAND` |
| Monthly active worker fee | EUR 1.50–3.00 | `WORKING BAND` |
| Setup/installation | separate | `ASSUMPTION` |
| Initial term | 12–24 months | `WORKING BAND` |
| Device owner | BSS | `PROPOSED` |

### Active-worker definition required

An `active worker` must be contractually defined, for example:

- enabled worker account during the billing month;
- worker with an attendance event during the billing month;
- maximum active worker count during the month;
- agreed licensed worker tier.

BSS must select one rule before approval to prevent billing disputes.

### Advantages

- revenue grows with customer size;
- smaller firms may see a lower entry price;
- cost and value scale more visibly.

### Risks

- less predictable invoice;
- customer may dispute active-worker count;
- larger firms may compare the total unfavourably;
- requires accurate metering and billing evidence.

## 7.3 Model C — Web-only subscription

### Intended positioning

For customers who do not use a BSS terminal or during a future software-only scenario.

### Working band

| Component | Working value | Status |
|---|---:|---|
| Organisation/platform fee | EUR 30–60/month | `WORKING BAND` |
| Active worker fee | EUR 1–2/month | `WORKING BAND` |
| Setup/data preparation | separate | `ASSUMPTION` |
| Terminal | not included | `PROPOSED` |

### Required scope decision

The current frozen MVP centres on terminal attendance. Before external use, BSS must define how attendance enters a web-only package and ensure that the offer does not promise an unimplemented manual/mobile punch workflow.

### Advantages

- no hardware financing;
- simpler remote onboarding;
- potentially higher software margin.

### Risks

- may not solve the primary customer problem;
- can create a second support/product model;
- current implementation evidence may not support the required workflow.

## 7.4 Model D — Hardware purchase plus SaaS

### Intended positioning

Customer buys the terminal and pays separately for software/service.

### Working method

```text
hardware_sale_price = landed_hardware_cost × approved_hardware_multiplier
monthly_software_price = platform_fee + optional_worker_fee
```

Candidate hardware multiplier for analysis: `2.0–2.5`, status `WORKING BAND`.

### Advantages

- BSS recovers hardware capital immediately;
- lower early cash-flow risk;
- easier termination economics.

### Risks

- ownership, repair and obsolescence become complicated;
- customer may expect indefinite hardware support;
- lower recurring revenue;
- inconsistent hardware versions may emerge.

This remains the non-preferred candidate unless cash-flow analysis proves it is needed.

## 8. Recommended comparison set for launch analysis

The launch decision should compare at least:

| Candidate | Main hypothesis |
|---|---|
| A1 | EUR 80/terminal/month, defined worker allowance, separate setup |
| A2 | EUR 90/terminal/month, broader normal replacement/support inclusion |
| B1 | EUR 50/terminal/month + EUR 2/active worker/month |
| B2 | lower base with worker tiers instead of exact metering |
| C1 | web-only model after technical scope validation |

All values remain assumptions until approved.

## 9. Pilot commercial models

The standard technical pilot target is four weeks, one company, one location and one terminal.

### 9.1 Pilot option P1 — Paid fixed-fee validation

- one-time fixed pilot fee;
- explicitly covers preparation, temporary configuration, training and support;
- no automatic production promise;
- part of the fee may be credited after conversion.

Working band: `EUR 250–750`, status `WORKING BAND`.

### 9.2 Pilot option P2 — Reduced fee with signed conversion intent

- lower pilot fee;
- customer signs a pilot agreement and pre-agreed conversion framework;
- hardware remains BSS property;
- continuation requires go-live and commercial approval.

Working band: `EUR 0–400`, status `WORKING BAND`.

### 9.3 Pilot option P3 — Founder-sponsored design partner

- permitted only for a highly valuable reference/design partner;
- all direct costs and foregone revenue recorded;
- limited number of sponsored pilots;
- no automatic free extension;
- customer must provide structured feedback and agreed access for the pilot process.

Status: `EXCEPTION / PRODUCT OWNER APPROVAL REQUIRED`.

### 9.4 Pilot conversion credit

Candidate rule:

- credit 50–100% of eligible pilot fee against initial setup or first contract invoices;
- credit applies only if the production contract is signed within a defined period;
- travel, damage and third-party costs are not automatically credited.

Status: `WORKING BAND`.

## 10. Setup, installation and additional charges

### 10.1 Standard setup fee

Potentially covers:

- organisation configuration;
- initial users/workers;
- standard shifts and departments;
- terminal preparation;
- administrator training;
- standard acceptance checklist.

Working band: `EUR 150–500`, status `WORKING BAND`.

### 10.2 On-site installation

Candidate pricing methods:

- fixed local-zone installation;
- hourly installation labour;
- kilometres plus travel time;
- customer-specific quotation for complex sites.

No standard rate is approved.

### 10.3 Data import

- small standard template import may be included;
- data cleaning, transformation and repeated corrections are separate;
- customer remains responsible for lawful and accurate source data.

### 10.4 Extra RFID/NFC cards

Price must include:

- card cost;
- encoding/assignment labour if applicable;
- packaging and delivery;
- replacement administration.

### 10.5 Exceptional services

Separate quotation required for:

- custom development;
- custom reports;
- integrations;
- on-site emergency support;
- non-standard SLA;
- installation construction;
- customer-caused reinstallations;
- large data remediation;
- legal/compliance work belonging to the customer controller.

## 11. Contract-term candidates

| Term | Candidate rule | Status |
|---|---|---|
| Initial term for BSS-owned hardware | 24 months preferred for analysis | `PROPOSED` |
| Alternative initial term | 12 months with higher setup/deposit or faster hardware recovery | `WORKING BAND` |
| Renewal | monthly or annual after initial term | `ASSUMPTION` |
| Notice period | 30–90 days | `WORKING BAND` |
| Early termination | remaining unrecovered hardware/onboarding amount or defined fee | `PROPOSED` |
| Device return | required within defined period | `PROPOSED` |
| Lost/damaged device | customer liable except ordinary failure | `PROPOSED` |
| Annual price review | allowed with contractual notice | `PROPOSED` |

Final terms require Croatian legal and accounting review.

## 12. VAT, currency and invoicing controls

1. Internal calculations use EUR.
2. External offers must clearly state `net`, VAT rate/treatment and `gross` where applicable.
3. BSS must not assume its VAT-registration status before accounting confirmation.
4. Domestic Croatian, EU cross-border and non-EU invoices may have different VAT treatment.
5. Payment period, advance payment, deposit and late-payment rules require approval.
6. Hardware ownership and recurring service must be described consistently on offers and invoices.
7. Free services, credits and discounts must be documented for accounting.

## 13. Discount and approval matrix

No discount is automatic in v0.1.

| Discount or concession | Minimum approval |
|---|---|
| 0–5% | Product Owner and margin check |
| 5–10% | Product Owner, documented reason and updated payback |
| More than 10% | exceptional decision, full unit-economics review |
| Free setup | Product Owner and recorded acquisition investment |
| Free pilot | design-partner exception only |
| Extra support included | capacity and margin review |
| Custom feature included | prohibited without scope/change approval |
| Extended payment term | cash-flow and credit-risk approval |

Discount order of preference:

1. limited setup credit;
2. annual prepayment incentive;
3. time-limited pilot conversion credit;
4. volume tier after actual cost validation;
5. recurring-price reduction as last option.

## 14. Potential volume structure

To test later:

| Customer size | Potential method | Status |
|---|---|---|
| 10–30 workers | standard launch package | `ASSUMPTION` |
| 31–100 workers | standard package plus worker/tier adjustment | `ASSUMPTION` |
| 100+ workers or multi-location | customer-specific quote | `PROPOSED` |
| Multiple terminals | per-terminal discount only after hardware/support analysis | `ASSUMPTION` |

No tier is approved.

## 15. Offer structure

Every customer-specific offer must contain:

1. customer legal entity and contact;
2. offer number, version and validity date;
3. customer problem and approved scope;
4. precise product truth status;
5. included organisations, locations, terminals and workers/tier;
6. included software functions;
7. excluded functions and customer responsibilities;
8. setup, installation and training scope;
9. recurring price and billing unit;
10. one-time fees;
11. VAT treatment statement;
12. initial term, renewal and notice;
13. device ownership and return;
14. support boundary and hours;
15. data protection/DPA dependency;
16. pilot and go-live gates;
17. payment terms;
18. signature/acceptance method;
19. Product Owner approval evidence;
20. link to the approved internal pricing version.

## 16. Prohibited commercial claims

The following may not appear in an offer unless evidence exists:

- “production ready” while critical gates remain open;
- “fully GDPR compliant” as an unconditional product guarantee;
- guaranteed payroll/legal correctness;
- guaranteed uptime without an approved SLA and infrastructure;
- “unlimited support”;
- “all customisations included”;
- a roadmap feature presented as delivered;
- Preview screens presented as working production behavior;
- hardware lifetime or replacement promise without policy;
- a final tax-inclusive price before VAT treatment is confirmed.

## 17. Fictional comparison scenario

This scenario is for model comparison only.

### 17.1 Assumptions

- fictional customer: `TEST-METAL d.o.o.`;
- 25 active workers;
- one location;
- one terminal;
- 12 months comparison period;
- setup fee excluded from recurring comparison;
- no VAT included;
- no custom work.

### 17.2 Model comparison

| Model | Assumption | Monthly | 12-month recurring |
|---|---|---:|---:|
| A1 | EUR 80 per terminal | EUR 80 | EUR 960 |
| A2 | EUR 90 per terminal | EUR 90 | EUR 1,080 |
| B1 | EUR 50 terminal + EUR 2 × 25 workers | EUR 100 | EUR 1,200 |
| C1 | EUR 40 platform + EUR 1.50 × 25 workers | EUR 77.50 | EUR 930 |

### 17.3 Interpretation

- the EUR 80 all-inclusive assumption is simplest but requires proof that support and hardware lifecycle fit inside the margin;
- worker pricing produces more revenue in this scenario but can be harder to explain and bill;
- web-only pricing cannot be selected until the actual product flow is technically approved;
- the table does not establish market willingness to pay.

## 18. Sensitivity templates

### 18.1 Customer count scenarios

For 5, 20 and 100 customers calculate:

- total terminals;
- total active workers;
- monthly recurring revenue;
- hardware capital required;
- infrastructure cost;
- monthly support hours;
- replacement reserve;
- gross contribution;
- acquisition/onboarding cash requirement;
- break-even customer count;
- founder/employee workload.

### 18.2 Required sensitivity variables

- terminal landed cost ±20%;
- failure/replacement rate;
- installation time;
- travel distance;
- support minutes per customer/month;
- hosting cost per tenant;
- payment delay and bad debt;
- churn before hardware payback;
- worker count changes;
- discount level;
- VAT/accounting treatment.

## 19. Approval gates

| Gate | Requirement | Current status |
|---|---|---|
| C1 | final hardware BOM and deployed unit cost | `OPEN` |
| C2 | hardware lifecycle/replacement assumptions | `OPEN` |
| C3 | infrastructure cost by scale | `PARTIAL` |
| C4 | support capacity and cost model | `OPEN` |
| C5 | installation/travel cost model | `OPEN` |
| C6 | Croatian VAT/accounting review | `OPEN / EXTERNAL` |
| C7 | market/competitor research | `OPEN` |
| C8 | pilot customer willingness-to-pay evidence | `OPEN` |
| C9 | approved launch package and price | `OPEN / PRODUCT OWNER` |
| C10 | approved external offer template | `OPEN` |

No external price list may be published while C1–C10 are incomplete according to their applicability.

## 20. Evidence index

| Evidence ID | Required evidence | Status |
|---|---|---|
| `PRICE-001` | confirmed hardware BOM and landed cost | `OPEN` |
| `PRICE-002` | assembly and installation time study | `OPEN` |
| `PRICE-003` | lifecycle/failure/replacement model | `OPEN` |
| `PRICE-004` | infrastructure unit-cost model | `PARTIAL` |
| `PRICE-005` | support capacity model | `OPEN` |
| `PRICE-006` | Croatian accounting/VAT memo | `OPEN / EXTERNAL` |
| `PRICE-007` | competitor and substitute price research | `OPEN` |
| `PRICE-008` | customer discovery willingness-to-pay notes | `OPEN` |
| `PRICE-009` | 5/20/100 customer sensitivity model | `OPEN` |
| `PRICE-010` | approved discount matrix | `OPEN` |
| `PRICE-011` | approved launch model | `OPEN` |
| `PRICE-012` | approved offer template | `OPEN` |
| `PRICE-013` | first customer-specific margin approval | `OPEN` |
| `PRICE-014` | first signed commercial evidence | `OPEN` |

## 21. Versioning

A pricing version change is required when any of the following changes materially:

- hardware cost or ownership model;
- hosting or support cost;
- package inclusions;
- billing unit;
- standard price;
- discount authority;
- initial term or cancellation;
- pilot credit;
- VAT/accounting treatment;
- target customer segment.

Version sequence:

- `0.x`: proposed internal planning;
- `1.0`: first Product Owner-approved launch baseline;
- `1.x`: backward-compatible price/process refinements;
- `2.0`: material package or commercial model change.

Existing signed customers remain governed by their contracted terms unless a lawful and contractually permitted change is applied.

## 22. Next actions

1. Confirm hardware BOM and lifecycle through issue `#60`.
2. Convert infrastructure planning from issue `#59` into customer-level unit costs.
3. Estimate real support and installation labour.
4. Conduct Croatian competitor and substitute research.
5. Validate willingness to pay through discovery calls without presenting assumptions as final pricing.
6. Obtain Croatian accounting/VAT review before external offers.
7. Run 5/20/100-customer sensitivity analysis.
8. Product Owner selects one launch model.
9. Produce an approved offer template and pilot commercial schedule.
10. Record the first customer-specific price as `CUSTOMER OFFERED` only after margin approval.

## 23. Decision statement

The current commercial direction is recurring all-inclusive service with BSS-owned hardware, but no price or term is approved for external use.

The historic EUR 80 terminal/month idea and EUR 50 plus EUR 2 per worker idea remain useful comparison assumptions only.

BSS will approve the launch price only after hardware, infrastructure, support, installation, accounting and market evidence are available.