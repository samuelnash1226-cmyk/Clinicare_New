# 📦 Inventory Management System - Complete Guide

## 🎯 Overview

The **SRB ClinicCare Inventory Management System** provides comprehensive tracking of medicines and medical equipment with smart integration into the clinic visit logging workflow.

---

## ✨ Key Features Implemented

### 1. 🏥 **Inventory Dashboard**
- **Dual Category Management**: Medicines & Medical Equipment
- **Real-time Stock Tracking**: Visual indicators for stock levels
- **Smart Filters**: Search by name, filter by category
- **Analytics Cards**: Quick stats at a glance
- **CRUD Operations**: Add, Edit, Delete inventory items

### 2. 💊 **Smart Medicine Dispensing**
- **Autocomplete Search**: Type medicine name, get instant suggestions
- **Stock Validation**: Real-time stock availability checks
- **Quantity Controls**: Prevents dispensing more than available
- **Auto-subtraction**: Stock automatically updated after visit logging
- **Transaction History**: Every dispensing action is logged

### 3. 🔍 **Enhanced Student Search**
- **Smart Type-ahead**: Search by Student ID or Name
- **Keyboard Navigation**: Use arrow keys and Enter
- **Visual Student Card**: See student details before confirming
- **Fast UX**: No more grade-level filtering needed

---

## 🗂️ Database Structure

### Firestore Collections

```
📁 inventory/
│
└── {itemId}
    ├── name: string              (e.g., "Paracetamol 500mg")
    ├── category: string          ("medicine" | "equipment")
    ├── stockQuantity: number     (Current stock count)
    ├── unit: string              (e.g., "tablets", "bottles", "pcs")
    ├── expirationDate: Date      (For medicines only)
    ├── status: string            ("in_stock" | "low_stock" | "out_of_stock")
    ├── minStockLevel: number     (Threshold for low stock alert)
    ├── createdAt: timestamp
    ├── updatedAt: timestamp
    └── createdBy: string         (User email)

📁 inventoryTransactions/
│
└── {transactionId}
    ├── itemId: string            (Reference to inventory item)
    ├── itemName: string
    ├── type: string              ("dispensed" | "restocked")
    ├── quantityChanged: number   (Negative for dispensed)
    ├── stockBefore: number
    ├── stockAfter: number
    ├── dispensedBy: string       (Nurse email)
    └── timestamp: timestamp
```

---

## 📊 Inventory Dashboard Features

### Analytics Cards

**Total Medicines**
- Count of all medicine items
- Blue themed card with Pill icon

**Low Stock Alerts**
- Items at or below minimum stock level
- Amber themed card with Alert icon

**Expiring Soon**
- Medicines expiring within 30 days
- Red themed card with Calendar icon

**Total Equipment**
- Count of all equipment items
- Green themed card with Package icon

### Item List Features

| Column | Description |
|--------|-------------|
| **Item Name** | Name with category icon |
| **Category** | Medicine or Equipment badge |
| **Stock** | Quantity with progress bar |
| **Unit** | Measurement unit |
| **Expiration** | Date (highlighted if expiring soon) |
| **Status** | Color-coded badge |
| **Actions** | Edit / Delete buttons |

### Stock Status Indicators

- **🟢 In Stock**: Sufficient quantity (green)
- **🟡 Low Stock**: At or below minimum level (amber)
- **🔴 Out of Stock**: Zero quantity (red)

---

## 💊 Medicine Dispensing Workflow

### In AddVisitForm

1. **Start typing medicine name** in the search field
2. **Dropdown appears** with matching medicines
3. Each suggestion shows:
   - Medicine name
   - Unit (tablets, bottles, etc.)
   - **Current stock count** (color-coded badge)
4. **Click to select** medicine
5. Medicine appears in "Selected Medicines" list
6. **Adjust quantity** using input field
7. **Stock validation**: Red badge if quantity exceeds stock
8. **Submit visit**: Stock automatically deducted

### Auto-subtraction Logic

```typescript
// When visit is logged:
1. Validate all medicine quantities against stock
2. Log clinic visit to Firestore
3. For each selected medicine:
   - Subtract quantity from inventory
   - Update stock status (in_stock → low_stock if needed)
   - Create transaction record
4. Generate medical certificate
```

---

## 🔍 Smart Student Search

### Features

**Type-ahead Search**
- Search by full name or partial name
- Search by Student ID
- Real-time filtering as you type

**Keyboard Navigation**
- `↓ Down Arrow`: Move to next student
- `↑ Up Arrow`: Move to previous student
- `Enter`: Select highlighted student
- `Esc`: Close dropdown

**Student Card Display**
- Avatar icon
- Full name (bolded)
- Student ID
- Grade/Course badge
- Clear selection button

### UX Benefits

| Before | After |
|--------|-------|
| Select grade → Filter students | Direct search by name/ID |
| 2-step process | 1-step process |
| Limited to one grade at a time | Search across all students |
| No keyboard shortcuts | Full keyboard support |

---

## 🎨 UI Design

### Color Coding

**Medicines**
- Icon: Blue pill
- Background: Light blue

**Equipment**
- Icon: Purple package
- Background: Light purple

**Stock Levels**
- Full: Green progress bar
- Low: Amber progress bar
- Empty: Red progress bar

**Expiration Status**
- Normal: Gray date
- Expiring Soon: Red date with warning icon

---

## 🚀 Usage Guide

### For Nurses

**Adding Inventory Items**

1. Click "Add Item" button
2. Fill out form:
   - Item Name (required)
   - Category (Medicine/Equipment)
   - Unit (tablets, bottles, pcs, etc.)
   - Stock Quantity (number)
   - Minimum Stock Level (for alerts)
   - Expiration Date (medicines only)
3. Click "Add Item"

**Logging Visit with Medicine**

1. Click "Add Visit" in Nurse Dashboard
2. Search for student using name or ID
3. Enter symptoms and treatment
4. **Type medicine name** in "Medicines Dispensed" field
5. Select from dropdown
6. Adjust quantity
7. Add more medicines if needed
8. Submit visit

**Editing Stock Levels**

1. Click Edit (pencil icon) on any item
2. Update quantity or other fields
3. Click "Update Item"
4. Stock status auto-recalculates

**Deleting Items**

1. Click Delete (trash icon)
2. Confirm deletion
3. Item and all related transactions are removed

---

## 📈 Analytics & Reporting

### Inventory Statistics

Accessible via `getInventoryStats()`:

```typescript
{
  totalMedicines: 24,
  totalEquipment: 12,
  lowStockCount: 3,
  expiringSoonCount: 2
}
```

### Transaction Logs

Every medicine dispensing creates a transaction record:

- Item details
- Quantity changed
- Stock before/after
- Who dispensed it
- Timestamp

**Future Enhancement**: Dashboard showing dispensing history charts

---

## ⚙️ Technical Implementation

### Key Functions

**addInventoryItem()**
```typescript
await addInventoryItem({
  name: 'Paracetamol 500mg',
  category: 'medicine',
  stockQuantity: 100,
  unit: 'tablets',
  minStockLevel: 20,
  expirationDate: new Date('2025-12-31'),
  createdBy: userEmail,
});
```

**dispenseMedicine()**
```typescript
const result = await dispenseMedicine(
  medicineId,      // ID of medicine item
  quantity,        // Quantity to dispense
  dispensedBy      // Nurse email
);

// Returns:
{
  medicineId: 'abc123',
  medicineName: 'Paracetamol 500mg',
  quantityGiven: 5,
  unit: 'tablets',
  stockBefore: 100,
  stockAfter: 95
}
```

**updateInventoryItem()**
```typescript
await updateInventoryItem(itemId, {
  stockQuantity: 50,
  expirationDate: new Date('2026-01-31'),
});
```

### Stock Status Calculation

```typescript
function determineStockStatus(quantity, minLevel) {
  if (quantity === 0) return 'out_of_stock';
  if (quantity <= minLevel) return 'low_stock';
  return 'in_stock';
}
```

### Expiration Check

```typescript
const thirtyDaysFromNow = new Date();
thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

const isExpiringSoon = expirationDate <= thirtyDaysFromNow;
```

---

## 🔒 Security & Validation

### Input Validation

✅ **Stock Quantity**: Must be ≥ 0  
✅ **Min Stock Level**: Must be > 0  
✅ **Dispense Quantity**: Cannot exceed available stock  
✅ **Medicine Name**: Required, non-empty  

### Firestore Rules

```javascript
match /inventory/{itemId} {
  allow read: if request.auth != null;
  allow create, update: if request.auth != null && 
    (getUserRole(request.auth.uid) == 'admin' || 
     getUserRole(request.auth.uid) == 'nurse');
  allow delete: if request.auth != null && 
    getUserRole(request.auth.uid) == 'admin';
}

match /inventoryTransactions/{transactionId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null && 
    (getUserRole(request.auth.uid) == 'nurse' || 
     getUserRole(request.auth.uid) == 'admin');
}
```

---

## 🎯 User Roles & Permissions

| Feature | Admin | Nurse | Parent | Student |
|---------|-------|-------|--------|---------|
| View Inventory | ✅ | ✅ | ❌ | ❌ |
| Add Items | ✅ | ✅ | ❌ | ❌ |
| Edit Items | ✅ | ✅ | ❌ | ❌ |
| Delete Items | ✅ | ❌ | ❌ | ❌ |
| Dispense Medicine | ✅ | ✅ | ❌ | ❌ |
| View Transactions | ✅ | ✅ | ❌ | ❌ |

---

## 📱 Responsive Design

### Desktop (1024px+)
- 4-column analytics cards
- Full table with all columns
- Side-by-side modals

### Tablet (768px - 1023px)
- 2-column analytics cards
- Scrollable table
- Optimized spacing

### Mobile (<768px)
- 1-column stacked cards
- Horizontal scroll table
- Touch-friendly controls
- Larger tap targets

---

## 🚨 Alerts & Notifications

### Low Stock Alert

Triggered when `stockQuantity <= minStockLevel`:

- Item status changes to "low_stock"
- Amber badge displayed
- Counted in "Low Stock Alerts" stat card

### Expiring Soon Alert

Triggered when expiration date ≤ 30 days:

- Red date display
- Warning icon shown
- Counted in "Expiring Soon" stat card

### Insufficient Stock Warning

When dispensing:

- Real-time validation
- Red badge if quantity > stock
- Submit button disabled
- Toast error on attempt

---

## 🔄 Workflow Integration

### Complete Visit Logging Flow

```
1. Nurse Dashboard
   ↓
2. Click "Add Visit"
   ↓
3. Search Student (Enhanced)
   - Type name or ID
   - Select from dropdown
   ↓
4. Enter Symptoms & Treatment
   ↓
5. Dispense Medicines (Optional)
   - Search medicine
   - Set quantity
   - Auto-validates stock
   ↓
6. Add Notes (Optional)
   ↓
7. Toggle Notifications
   ↓
8. Submit Visit
   ↓
9. Stock Auto-Updated ✅
   ↓
10. Medical Certificate Generated ✅
    ↓
11. Email Sent (if enabled) ✅
```

---

## 📊 Sample Data

### Example Medicines

```typescript
[
  {
    name: 'Paracetamol 500mg',
    category: 'medicine',
    stockQuantity: 100,
    unit: 'tablets',
    minStockLevel: 20,
    expirationDate: '2025-12-31'
  },
  {
    name: 'Biogesic Syrup',
    category: 'medicine',
    stockQuantity: 15,
    unit: 'bottles',
    minStockLevel: 5,
    expirationDate: '2025-06-30'
  },
  {
    name: 'Band-Aid Strips',
    category: 'medicine',
    stockQuantity: 200,
    unit: 'pcs',
    minStockLevel: 50,
    expirationDate: '2026-12-31'
  }
]
```

### Example Equipment

```typescript
[
  {
    name: 'Digital Thermometer',
    category: 'equipment',
    stockQuantity: 5,
    unit: 'pcs',
    minStockLevel: 2
  },
  {
    name: 'Blood Pressure Monitor',
    category: 'equipment',
    stockQuantity: 3,
    unit: 'pcs',
    minStockLevel: 1
  },
  {
    name: 'Stethoscope',
    category: 'equipment',
    stockQuantity: 4,
    unit: 'pcs',
    minStockLevel: 2
  }
]
```

---

## 🐛 Troubleshooting

### Issue: Medicine not appearing in search

**Solution**: Check if:
- Category is set to "medicine"
- Stock quantity > 0
- Name is spelled correctly

### Issue: Stock not updating after dispensing

**Solution**: Verify:
- Visit was successfully logged
- No errors in console
- Firestore permissions are correct

### Issue: Can't delete inventory item

**Solution**: Ensure:
- You're logged in as Admin
- Item exists in Firestore
- No related transactions blocking deletion

---

## 🔮 Future Enhancements

### Planned Features

- [ ] **Barcode Scanning**: Quick item lookup
- [ ] **Bulk Import**: CSV upload for inventory
- [ ] **Reorder Alerts**: Email when stock is low
- [ ] **Supplier Management**: Track where items come from
- [ ] **Batch Tracking**: Lot numbers for medicines
- [ ] **Inventory Reports**: Monthly/yearly summaries
- [ ] **Mobile App**: Inventory scanning on phones
- [ ] **Forecasting**: Predict when to restock based on usage

---

## ✅ Testing Checklist

- [ ] Add a medicine item
- [ ] Add an equipment item
- [ ] Search for an item
- [ ] Filter by category
- [ ] Edit stock quantity
- [ ] Delete an item
- [ ] Log visit with medicine dispensing
- [ ] Verify stock decreased
- [ ] Check transaction log created
- [ ] Test low stock alert
- [ ] Test expiring soon alert
- [ ] Test insufficient stock warning
- [ ] Search student by name
- [ ] Search student by ID
- [ ] Keyboard navigation in dropdowns

---

## 📞 Support

For issues or questions:
- Check console logs for errors
- Verify Firestore rules are correct
- Ensure user has proper role permissions
- Contact development team if issue persists

---

**Version**: 1.0.0  
**Last Updated**: April 15, 2026  
**Status**: ✅ Production Ready
