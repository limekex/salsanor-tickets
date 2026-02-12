# ORG_FINANCE Portal - UI Overview

## Navigation
```
┌─────────────────────────────────────────────────────────────┐
│ [RegiNor Logo]  Dashboard  Users  Registrations  Orders    │
│                 [Finance] ▼Products  ⚙️  🏠                  │
└─────────────────────────────────────────────────────────────┘
```

## Finance Dashboard (/staffadmin/finance)

### Overview Cards (6 cards in 3x2 grid)
```
┌────────────────────┬────────────────────┬────────────────────┐
│ Total Revenue      │ Total Orders       │ Registrations      │
│ kr 50,000          │ 42                 │ 128                │
└────────────────────┴────────────────────┴────────────────────┘
┌────────────────────┬────────────────────┬────────────────────┐
│ Avg Order Value    │ Pending Payments   │ Discounts Given    │
│ kr 1,190           │ 3                  │ kr 5,000           │
└────────────────────┴────────────────────┴────────────────────┘
```

### Revenue by Period Table
```
┌─────────────────────┬────────┬───────────────┬───────────┐
│ Period              │ Orders │ Registrations │ Revenue   │
├─────────────────────┼────────┼───────────────┼───────────┤
│ Spring 2025         │   25   │      75       │ kr 30,000 │
│ CODE-SPRING-2025    │        │               │           │
├─────────────────────┼────────┼───────────────┼───────────┤
│ Winter 2025         │   17   │      53       │ kr 20,000 │
│ CODE-WINTER-2025    │        │               │           │
└─────────────────────┴────────┴───────────────┴───────────┘
```

### Recent Orders Table (Last 10)
```
┌──────────┬────────────┬──────────────┬───────────┬────────┐
│ Order ID │ Date       │ Period       │ Amount    │ Status │
├──────────┼────────────┼──────────────┼───────────┼────────┤
│ a1b2c3d4 │ 25.01.2025 │ Spring 2025  │ kr 1,200  │ [Paid] │
│ e5f6g7h8 │ 24.01.2025 │ Spring 2025  │ kr 1,500  │ [Paid] │
└──────────┴────────────┴──────────────┴───────────┴────────┘
```

## Revenue Reports (/staffadmin/finance/revenue)

### Summary Cards
```
┌────────────────────┬────────────────────┬────────────────────┐
│ Total Gross Revenue│ Total Net Revenue  │ Total MVA          │
│ kr 50,000          │ kr 40,000          │ kr 10,000          │
│ Including MVA      │ Excluding MVA      │ VAT Amount         │
└────────────────────┴────────────────────┴────────────────────┘
```

### MVA Breakdown Table ⚠️ MANDATORY for Norwegian Legal Compliance
```
┌────────────┬────────┬──────────────┬──────────────┬──────────┬────────────┐
│ Period     │ Orders │ Gross Revenue│ Net Revenue  │ MVA Rate │ MVA Amount │
│            │        │ (inkl. MVA)  │ (grunnlag)   │          │ (MVA-beløp)│
├────────────┼────────┼──────────────┼──────────────┼──────────┼────────────┤
│ Spring 2025│   25   │  kr 30,000   │  kr 24,000   │   25%    │  kr 6,000  │
│ SPRING-25  │        │              │              │          │            │
├────────────┼────────┼──────────────┼──────────────┼──────────┼────────────┤
│ Winter 2025│   17   │  kr 20,000   │  kr 16,000   │   25%    │  kr 4,000  │
│ WINTER-25  │        │              │              │          │            │
├════════════┼════════┼══════════════┼══════════════┼══════════┼════════════┤
│ Total      │   42   │  kr 50,000   │  kr 40,000   │    —     │  kr 10,000 │
└────────────┴────────┴──────────────┴──────────────┴──────────┴────────────┘
```

## Payment Status (/staffadmin/finance/payments)

### Statistics Cards
```
┌────────────────┬────────────────┬────────────────┬────────────────┐
│ Succeeded      │ Requires Action│ Failed         │ Refunded       │
│ 42             │ 2              │ 1              │ 0              │
│ kr 50,000      │ kr 2,400       │ kr 1,200       │ kr 0           │
└────────────────┴────────────────┴────────────────┴────────────────┘
```

### All Payments Table
```
┌──────────┬──────────┬────────────┬───────────┬──────────┬────────────┬─────────────┐
│ Payment  │ Order ID │ Date       │ Amount    │ Provider │ Status     │ Payment Ref │
│ ID       │          │            │           │          │            │             │
├──────────┼──────────┼────────────┼───────────┼──────────┼────────────┼─────────────┤
│ p1a2b3c4 │ a1b2c3d4 │ 25.01.2025 │ kr 1,200  │ stripe   │ [SUCCEEDED]│ pi_1ABC... │
│ p2d3e4f5 │ e5f6g7h8 │ 24.01.2025 │ kr 1,500  │ stripe   │ [SUCCEEDED]│ pi_2DEF... │
│ p3g4h5i6 │ i9j0k1l2 │ 23.01.2025 │ kr 1,200  │ stripe   │ [REQUIRES_…│ pi_3GHI... │
└──────────┴──────────┴────────────┴───────────┴──────────┴────────────┴─────────────┘

Badge Colors:
- [SUCCEEDED] = Green
- [REQUIRES_ACTION] = Yellow/Secondary
- [FAILED] = Red/Destructive
- [REFUNDED] = Gray/Outline
```

## Export Page (/staffadmin/finance/export)

```
┌──────────────────────────────────────────────────────────────┐
│ CSV Export                                                    │
│ ──────────────────────────────────────────────────────────── │
│ Export financial data for SalsaNor Oslo with all legally     │
│ required fields for Norwegian accounting compliance.         │
│                                                               │
│ Included Fields:                                             │
│ • Order ID                                                   │
│ • Organization name and number                               │
│ • Period name and code                                       │
│ • Subtotal (NOK)                                            │
│ • Discount amount (NOK)                                      │
│ • Subtotal after discount (NOK)                             │
│ • MVA rate (%)                                              │
│ • MVA amount (NOK)                                          │
│ • Total amount (NOK)                                        │
│ • Currency                                                  │
│ • Registration count                                        │
│ • Payment provider and status                               │
│ • Created and updated timestamps                            │
│                                                               │
│ ┌──────────────────────────────────┐                        │
│ │  📥 Download CSV Export          │                        │
│ └──────────────────────────────────┘                        │
│                                                               │
│ Note: This export includes all paid orders for your          │
│ organization and complies with Norwegian Bokføringsloven     │
│ requirements.                                                │
└──────────────────────────────────────────────────────────────┘
```

## CSV Export Format

```csv
Order ID,Organization,Org.nr,Period,Period Code,Subtotal (NOK),Discount (NOK),Subtotal After Discount (NOK),MVA Rate (%),MVA Amount (NOK),Total (NOK),Currency,Registration Count,Payment Provider,Payment Status,Created At,Updated At
a1b2c3d4-...,SalsaNor Oslo,123 456 789,Spring 2025,SPRING-25,960.00,0.00,960.00,25.00,240.00,1200.00,NOK,3,stripe,SUCCEEDED,2025-01-25T10:30:00.000Z,2025-01-25T10:30:00.000Z
e5f6g7h8-...,SalsaNor Oslo,123 456 789,Spring 2025,SPRING-25,1200.00,0.00,1200.00,25.00,300.00,1500.00,NOK,4,stripe,SUCCEEDED,2025-01-24T15:45:00.000Z,2025-01-24T15:45:00.000Z
```

## Color Scheme (RegiNor Design System)

- Primary: Blue (#...) - for primary buttons and highlights
- Success: Green - for "Paid" and "Succeeded" badges
- Warning: Yellow - for "Requires Action" badges
- Danger: Red - for "Failed" badges
- Muted: Gray - for secondary text and borders
- Surface: White/Light gray - for card backgrounds

## Typography

- Headers: `rn-h2` class
- Meta text: `rn-meta` class
- Caption: `rn-caption` class
- Body: Default text classes

## Spacing

- Card gaps: `gap-rn-4` (RegiNor spacing scale)
- Section spacing: `space-y-rn-6`
- Internal padding: `pt-rn-4`, `mt-rn-2`, etc.
