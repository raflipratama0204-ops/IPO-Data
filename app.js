// js/app.js

// Currency Formatting Helper
function formatRupiah(amount) {
  if (amount === undefined || amount === null) return 'Rp 0';
  const val = parseFloat(amount);
  const rounded = Math.round(val);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(rounded);
}

// Global Variables
let currentTab = 'dashboard';
let profitChart = null;

// DOMContentLoaded initialization
document.addEventListener('DOMContentLoaded', () => {
  // db is loaded globally from js/db.js
  if (typeof db !== 'undefined') {
    db.initDB();
  } else {
    console.error('Database module (db.js) failed to load!');
    return;
  }
  
  // Tab Routing
  setupTabs();
  
  // Modals Controller
  setupModals();
  
  // Setup Search and Filters
  setupFilters();
  
  // Setup Form Submissions
  setupForms();
  
  // Backup / Demo Data buttons
  setupBackupHandlers();
  
  // Initial Render
  refreshAll();
});

// Refresh all UI elements
function refreshAll() {
  renderDashboard();
  renderNominees();
  renderStocks();
  renderOrders();
  renderTransactions();
  renderDebts();
  populateSelectDropdowns();
}

// ----------------- TABS ROUTING -----------------
function setupTabs() {
  const navItems = document.querySelectorAll('.nav-item');
  const tabContents = document.querySelectorAll('.tab-content');
  const pageTitle = document.getElementById('page-title');
  const pageSubtitle = document.getElementById('page-subtitle');
  
  const headersMap = {
    dashboard: {
      title: 'Ringkasan Portofolio',
      subtitle: 'Selamat datang kembali! Berikut adalah statistik agregat akun IPO Anda.'
    },
    nominees: {
      title: 'Database Akun Nominee',
      subtitle: 'Daftar pemilik akun nominee yang digunakan untuk memesan IPO.'
    },
    stocks: {
      title: 'Daftar Saham IPO',
      subtitle: 'Kelola database saham yang sedang atau telah melakukan IPO.'
    },
    orders: {
      title: 'Transaksi Pemesanan Saham',
      subtitle: 'Catat pesanan lot, input hasil penjatahan, dan input harga jual saham.'
    },
    transactions: {
      title: 'Log Keuangan',
      subtitle: 'Log keluar masuknya dana transfer modal dan pengembalian dana dari akun nominee.'
    },
    debts: {
      title: 'Manajemen Hutang Saya',
      subtitle: 'Lacak dana pinjaman dari pihak ketiga untuk modal operasional IPO.'
    }
  };

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = item.getAttribute('data-tab');
      
      // Update sidebar state
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      
      // Update content state
      tabContents.forEach(content => content.classList.remove('active'));
      document.getElementById(`tab-${targetTab}`).classList.add('active');
      
      // Update titles
      pageTitle.textContent = headersMap[targetTab].title;
      pageSubtitle.textContent = headersMap[targetTab].subtitle;
      
      currentTab = targetTab;
      
      // Reload relevant data
      if (currentTab === 'dashboard') {
        renderDashboard();
      } else if (currentTab === 'nominees') {
        renderNominees();
      } else if (currentTab === 'stocks') {
        renderStocks();
      } else if (currentTab === 'orders') {
        renderOrders();
      } else if (currentTab === 'transactions') {
        renderTransactions();
      } else if (currentTab === 'debts') {
        renderDebts();
      }
    });
  });
}

// ----------------- MODALS CONTROLLER -----------------
function setupModals() {
  // Modal Backdrops
  const modalBackdrops = document.querySelectorAll('.modal-backdrop');
  
  // Close buttons handler
  const closeButtons = document.querySelectorAll('[data-close]');
  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close');
      closeModal(modalId);
    });
  });
  
  // Click backdrop to close
  modalBackdrops.forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeModal(backdrop.id);
      }
    });
  });

  // Action Buttons to open Modals
  document.getElementById('btn-add-nominee').addEventListener('click', () => {
    openNomineeModal();
  });
  
  document.getElementById('btn-add-stock').addEventListener('click', () => {
    openStockModal();
  });

  document.getElementById('btn-add-order').addEventListener('click', () => {
    openOrderModal();
  });

  document.getElementById('btn-add-transaction').addEventListener('click', () => {
    openTransactionModal();
  });

  document.getElementById('btn-add-debt').addEventListener('click', () => {
    openDebtModal();
  });
}

function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// Modals Openers for Add/Edit
function openNomineeModal(nominee = null) {
  const form = document.getElementById('form-nominee');
  form.reset();
  
  const title = document.getElementById('nominee-modal-title');
  const idInput = document.getElementById('nominee-id');
  
  if (nominee) {
    title.textContent = 'Edit Akun Nominee';
    idInput.value = nominee.id;
    document.getElementById('nominee-name').value = nominee.name;
    document.getElementById('nominee-phone').value = nominee.phone;
    document.getElementById('nominee-bank-name').value = nominee.bankName;
    document.getElementById('nominee-bank-acc').value = nominee.bankAccount;
    document.getElementById('nominee-profit-share-pct').value = nominee.profitSharePct || 0;
    document.getElementById('nominee-notes').value = nominee.notes;
  } else {
    title.textContent = 'Tambah Akun Baru';
    idInput.value = '';
    document.getElementById('nominee-profit-share-pct').value = 0;
  }
  
  openModal('modal-nominee');
}

function openStockModal(stock = null) {
  const form = document.getElementById('form-stock');
  form.reset();
  
  const title = document.getElementById('stock-modal-title');
  const idInput = document.getElementById('stock-id');
  
  if (stock) {
    title.textContent = 'Edit Saham IPO';
    idInput.value = stock.id;
    document.getElementById('stock-code').value = stock.code;
    document.getElementById('stock-name').value = stock.name;
    document.getElementById('stock-price').value = stock.ipoPrice;
    document.getElementById('stock-offering-date').value = stock.offeringDate;
    document.getElementById('stock-listing-date').value = stock.listingDate;
    document.getElementById('stock-status').value = stock.status;
  } else {
    title.textContent = 'Tambah Saham IPO';
    idInput.value = '';
  }
  
  openModal('modal-stock');
}

function openOrderModal(order = null) {
  const form = document.getElementById('form-order');
  form.reset();
  
  const title = document.getElementById('order-modal-title');
  const idInput = document.getElementById('order-id');
  
  populateSelectDropdowns();
  
  const orderLotInput = document.getElementById('order-lot');
  const orderStockSelect = document.getElementById('order-stock');
  const orderEstVal = document.getElementById('order-est-value');
  
  // Instant calculations when lot or stock selection changes
  const updateOrderEst = () => {
    const stockId = orderStockSelect.value;
    const lot = parseInt(orderLotInput.value) || 0;
    const stocks = db.getStocks();
    const selectedStock = stocks.find(s => s.id === stockId);
    
    if (selectedStock && lot > 0) {
      const est = lot * 100 * selectedStock.ipoPrice;
      orderEstVal.textContent = `Estimasi Kebutuhan Dana: ${formatRupiah(est)}`;
    } else {
      orderEstVal.textContent = 'Estimasi Kebutuhan Dana: Rp 0';
    }
  };
  
  orderLotInput.addEventListener('input', updateOrderEst);
  orderStockSelect.addEventListener('change', updateOrderEst);

  if (order) {
    title.textContent = 'Edit Pesanan IPO';
    idInput.value = order.id;
    document.getElementById('order-nominee').value = order.nomineeId;
    document.getElementById('order-stock').value = order.stockId;
    document.getElementById('order-lot').value = order.lotOrdered;
    updateOrderEst();
  } else {
    title.textContent = 'Buat Pesanan IPO Baru';
    idInput.value = '';
    orderEstVal.textContent = 'Estimasi Kebutuhan Dana: Rp 0';
  }
  
  openModal('modal-order');
}

function openAllotmentModal(orderId) {
  const orders = db.getOrders();
  const stocks = db.getStocks();
  const nominees = db.getNominees();
  
  const order = orders.find(o => o.id === orderId);
  const stock = stocks.find(s => s.id === order.stockId);
  const nominee = nominees.find(n => n.id === order.nomineeId);
  
  if (!order || !stock) return;
  
  document.getElementById('allotment-order-id').value = orderId;
  
  const infoEl = document.getElementById('allotment-info');
  infoEl.innerHTML = `Akun: <strong>${nominee.name}</strong><br>Saham: <strong>${stock.code} (${stock.name})</strong><br>Pesanan Awal: <strong>${order.lotOrdered} Lot</strong> (${formatRupiah(order.lotOrdered * 100 * stock.ipoPrice)})`;
  
  const lotInput = document.getElementById('allotment-lot');
  lotInput.value = order.lotAllotted || 0;
  
  const refundEl = document.getElementById('allotment-refund-value');
  
  const updateRefundEst = () => {
    const allottedLot = parseInt(lotInput.value) || 0;
    const orderedValue = order.lotOrdered * 100 * stock.ipoPrice;
    const allottedCost = allottedLot * 100 * stock.ipoPrice;
    const refund = orderedValue - allottedCost;
    
    if (allottedLot > order.lotOrdered) {
      refundEl.textContent = 'Error: Lot Penjatahan melebihi Pesanan!';
      refundEl.style.color = 'var(--danger)';
    } else {
      refundEl.textContent = `Estimasi Sisa Uang Refund: ${formatRupiah(refund)}`;
      refundEl.style.color = 'var(--success)';
    }
  };
  
  lotInput.addEventListener('input', updateRefundEst);
  updateRefundEst();
  
  openModal('modal-allotment');
}

function openSellModal(orderId) {
  const orders = db.getOrders();
  const stocks = db.getStocks();
  const nominees = db.getNominees();
  
  const order = orders.find(o => o.id === orderId);
  const stock = stocks.find(s => s.id === order.stockId);
  const nominee = nominees.find(n => n.id === order.nomineeId);
  
  if (!order || !stock) return;
  
  document.getElementById('sell-order-id').value = orderId;
  
  const infoEl = document.getElementById('sell-info');
  infoEl.innerHTML = `Akun: <strong>${nominee.name}</strong><br>Saham: <strong>${stock.code}</strong><br>Lot Didapatkan: <strong>${order.lotAllotted} Lot</strong> (Modal: ${formatRupiah(order.lotAllotted * 100 * stock.ipoPrice)})`;
  
  const priceInput = document.getElementById('sell-price');
  priceInput.value = order.sellPrice || stock.ipoPrice;
  
  const profitEl = document.getElementById('sell-profit-value');
  
  const updateProfitEst = () => {
    const sellPrice = parseFloat(priceInput.value) || 0;
    const cost = order.lotAllotted * 100 * stock.ipoPrice;
    const sellVal = order.lotAllotted * 100 * sellPrice;
    const profit = sellVal - cost;
    
    if (profit >= 0) {
      profitEl.textContent = `Estimasi Keuntungan: ${formatRupiah(profit)}`;
      profitEl.style.color = 'var(--success)';
    } else {
      profitEl.textContent = `Estimasi Kerugian: ${formatRupiah(Math.abs(profit))}`;
      profitEl.style.color = 'var(--danger)';
    }
  };
  
  priceInput.addEventListener('input', updateProfitEst);
  updateProfitEst();
  
  openModal('modal-sell');
}

function openTransactionModal(transfer = null) {
  const form = document.getElementById('form-transaction');
  form.reset();
  
  const title = document.getElementById('transaction-modal-title');
  const idInput = document.getElementById('transaction-id');
  
  populateSelectDropdowns();
  
  // Set default date to today
  document.getElementById('transaction-date').value = new Date().toISOString().split('T')[0];

  if (transfer) {
    title.textContent = 'Edit Transaksi';
    idInput.value = transfer.id;
    document.getElementById('transaction-nominee').value = transfer.nomineeId;
    document.getElementById('transaction-type').value = transfer.type;
    document.getElementById('transaction-date').value = transfer.date;
    document.getElementById('transaction-amount').value = transfer.amount;
    document.getElementById('transaction-notes').value = transfer.notes;
  } else {
    title.textContent = 'Catat Transaksi Keuangan';
    idInput.value = '';
  }
  
  openModal('modal-transaction');
}

function openDebtModal(debt = null) {
  const form = document.getElementById('form-debt');
  form.reset();
  
  const title = document.getElementById('debt-modal-title');
  const idInput = document.getElementById('debt-id');
  const amountInput = document.getElementById('debt-amount');
  const paidInput = document.getElementById('debt-paid');
  const remainingEl = document.getElementById('debt-remaining-est');
  
  const updateDebtEst = () => {
    const amount = parseFloat(amountInput.value) || 0;
    const paid = parseFloat(paidInput.value) || 0;
    const remaining = amount - paid;
    
    if (remaining < 0) {
      remainingEl.textContent = 'Error: Jumlah Terbayar melebihi Pinjaman!';
      remainingEl.style.color = 'var(--danger)';
    } else {
      remainingEl.textContent = `Estimasi Sisa Hutang: ${formatRupiah(remaining)}`;
      remainingEl.style.color = remaining === 0 ? 'var(--success)' : 'var(--warning)';
    }
  };
  
  amountInput.addEventListener('input', updateDebtEst);
  paidInput.addEventListener('input', updateDebtEst);
  
  document.getElementById('debt-date').value = new Date().toISOString().split('T')[0];

  if (debt) {
    title.textContent = 'Edit Data Hutang';
    idInput.value = debt.id;
    document.getElementById('debt-creditor').value = debt.creditorName;
    document.getElementById('debt-date').value = debt.date;
    amountInput.value = debt.amount;
    paidInput.value = debt.paidAmount;
    document.getElementById('debt-notes').value = debt.notes;
    updateDebtEst();
  } else {
    title.textContent = 'Catat Hutang Baru';
    idInput.value = '';
    remainingEl.textContent = 'Estimasi Sisa Hutang: Rp 0';
    remainingEl.style.color = 'var(--warning)';
  }
  
  openModal('modal-debt');
}

function openNomineeDetailModal(nomineeId) {
  const stats = db.getNomineeStats(nomineeId);
  if (!stats) return;
  
  document.getElementById('detail-nominee-name').textContent = `Detail Portofolio: ${stats.name}`;
  document.getElementById('detail-total-transferred').textContent = formatRupiah(stats.totalTransferred);
  document.getElementById('detail-total-returned').textContent = formatRupiah(stats.totalReturned);
  document.getElementById('detail-total-profit').textContent = formatRupiah(stats.totalProfit);
  document.getElementById('detail-profit-share-pct-label').textContent = `(${stats.profitSharePct || 0}%)`;
  document.getElementById('detail-profit-share-amount').textContent = formatRupiah(stats.profitShareAmount);
  document.getElementById('detail-user-net-profit').textContent = formatRupiah(stats.userNetProfit);
  document.getElementById('detail-outstanding-balance').textContent = formatRupiah(stats.outstandingBalance);
  
  document.getElementById('detail-liquid-cash').textContent = formatRupiah(stats.liquidCashBalance);
  document.getElementById('detail-active-unsold').textContent = formatRupiah(stats.activeUnsoldCost);

  // Styling outstanding balance based on positive/negative
  const balanceEl = document.getElementById('detail-outstanding-balance');
  if (stats.outstandingBalance > 0) {
    balanceEl.className = 'detail-val text-outstanding';
  } else if (stats.outstandingBalance < 0) {
    balanceEl.className = 'detail-val text-loss';
  } else {
    balanceEl.className = 'detail-val';
  }

  // Populate orders for nominee
  const orders = db.getOrders().filter(o => o.nomineeId === nomineeId);
  const stocks = db.getStocks();
  const listBody = document.getElementById('detail-nominee-orders');
  listBody.innerHTML = '';
  
  if (orders.length === 0) {
    listBody.innerHTML = `<tr><td colspan="6" class="text-muted text-center">Belum ada pemesanan saham untuk akun ini.</td></tr>`;
  } else {
    orders.forEach(o => {
      const stock = stocks.find(s => s.id === o.stockId);
      if (!stock) return;

      const orderedValue = o.lotOrdered * 100 * stock.ipoPrice;
      const allottedCost = o.lotAllotted * 100 * stock.ipoPrice;
      const refund = orderedValue - allottedCost;
      
      let profit = 0;
      let badgeHTML = '';
      
      if (o.status === 'ordered') {
        badgeHTML = `<span class="badge badge-primary">Ordered</span>`;
      } else if (o.status === 'allotted') {
        badgeHTML = `<span class="badge badge-warning">Allotted</span>`;
      } else if (o.status === 'sold') {
        badgeHTML = `<span class="badge badge-success">Sold</span>`;
        profit = (o.lotAllotted * 100 * o.sellPrice) - allottedCost;
      }
      
      const profitText = o.status === 'sold' 
        ? `<span class="${profit >= 0 ? 'text-profit' : 'text-loss'}">${formatRupiah(profit)}</span>`
        : `<span class="text-muted">-</span>`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${stock.code}</strong><br><span style="font-size: 0.8rem; color: var(--text-muted);">${stock.name}</span></td>
        <td class="text-right">${o.lotOrdered} Lot<br><span style="font-size: 0.75rem; color: var(--text-muted);">${formatRupiah(orderedValue)}</span></td>
        <td class="text-right">${o.status !== 'ordered' ? `${o.lotAllotted} Lot` : '-'}</td>
        <td class="text-right">${o.status !== 'ordered' ? formatRupiah(refund) : '-'}</td>
        <td class="text-right">${profitText}</td>
        <td>${badgeHTML}</td>
      `;
      listBody.appendChild(tr);
    });
  }

  openModal('modal-nominee-detail');
}

// Populates dropdown lists inside modals
function populateSelectDropdowns() {
  const nominees = db.getNominees();
  const stocks = db.getStocks();
  
  // Nominee Select in Order form
  const orderNomineeSelect = document.getElementById('order-nominee');
  orderNomineeSelect.innerHTML = '<option value="" disabled selected>Pilih Pemilik Akun...</option>';
  nominees.forEach(n => {
    const option = document.createElement('option');
    option.value = n.id;
    option.textContent = n.name;
    orderNomineeSelect.appendChild(option);
  });
  
  // Stock Select in Order form
  const orderStockSelect = document.getElementById('order-stock');
  orderStockSelect.innerHTML = '<option value="" disabled selected>Pilih Saham IPO...</option>';
  stocks.forEach(s => {
    const option = document.createElement('option');
    option.value = s.id;
    option.textContent = `${s.code} - ${s.name} (Rp ${s.ipoPrice})`;
    orderStockSelect.appendChild(option);
  });

  // Nominee Select in Transaction form
  const txNomineeSelect = document.getElementById('transaction-nominee');
  txNomineeSelect.innerHTML = '<option value="" disabled selected>Pilih Pemilik Akun...</option>';
  nominees.forEach(n => {
    const option = document.createElement('option');
    option.value = n.id;
    option.textContent = n.name;
    txNomineeSelect.appendChild(option);
  });
}

// ----------------- FORMS SUBMISSIONS -----------------
function setupForms() {
  // Nominee Form
  document.getElementById('form-nominee').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('nominee-id').value;
    const name = document.getElementById('nominee-name').value;
    const phone = document.getElementById('nominee-phone').value;
    const bankName = document.getElementById('nominee-bank-name').value;
    const bankAccount = document.getElementById('nominee-bank-acc').value;
    const profitSharePct = document.getElementById('nominee-profit-share-pct').value;
    const notes = document.getElementById('nominee-notes').value;
    
    if (id) {
      db.updateNominee(id, { name, phone, bankName, bankAccount, profitSharePct, notes });
    } else {
      db.addNominee({ name, phone, bankName, bankAccount, profitSharePct, notes });
    }
    
    closeModal('modal-nominee');
    refreshAll();
  });

  // Stock Form
  document.getElementById('form-stock').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('stock-id').value;
    const code = document.getElementById('stock-code').value;
    const name = document.getElementById('stock-name').value;
    const ipoPrice = document.getElementById('stock-price').value;
    const offeringDate = document.getElementById('stock-offering-date').value;
    const listingDate = document.getElementById('stock-listing-date').value;
    const status = document.getElementById('stock-status').value;
    
    if (id) {
      db.updateStock(id, { code, name, ipoPrice, offeringDate, listingDate, status });
    } else {
      db.addStock({ code, name, ipoPrice, offeringDate, listingDate, status });
    }
    
    closeModal('modal-stock');
    refreshAll();
  });

  // Order Form
  document.getElementById('form-order').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('order-id').value;
    const nomineeId = document.getElementById('order-nominee').value;
    const stockId = document.getElementById('order-stock').value;
    const lotOrdered = document.getElementById('order-lot').value;
    
    if (id) {
      db.updateOrder(id, { nomineeId, stockId, lotOrdered });
    } else {
      db.addOrder({ nomineeId, stockId, lotOrdered });
    }
    
    closeModal('modal-order');
    refreshAll();
  });

  // Allotment Form
  document.getElementById('form-allotment').addEventListener('submit', (e) => {
    e.preventDefault();
    const orderId = document.getElementById('allotment-order-id').value;
    const lotAllotted = parseInt(document.getElementById('allotment-lot').value) || 0;
    
    const orders = db.getOrders();
    const order = orders.find(o => o.id === orderId);
    
    if (lotAllotted > order.lotOrdered) {
      alert('Jumlah lot penjatahan tidak boleh lebih besar dari pesanan!');
      return;
    }
    
    db.updateOrder(orderId, {
      lotAllotted: lotAllotted,
      status: 'allotted'
    });
    
    closeModal('modal-allotment');
    refreshAll();
  });

  // Sell Form
  document.getElementById('form-sell').addEventListener('submit', (e) => {
    e.preventDefault();
    const orderId = document.getElementById('sell-order-id').value;
    const sellPrice = parseFloat(document.getElementById('sell-price').value) || 0;
    
    db.updateOrder(orderId, {
      sellPrice: sellPrice,
      status: 'sold'
    });
    
    closeModal('modal-sell');
    refreshAll();
  });

  // Transaction Form
  document.getElementById('form-transaction').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('transaction-id').value;
    const nomineeId = document.getElementById('transaction-nominee').value;
    const type = document.getElementById('transaction-type').value;
    const date = document.getElementById('transaction-date').value;
    const amount = document.getElementById('transaction-amount').value;
    const notes = document.getElementById('transaction-notes').value;
    
    if (id) {
      db.updateTransfer(id, { nomineeId, type, date, amount, notes });
    } else {
      db.addTransfer({ nomineeId, type, date, amount, notes });
    }
    
    closeModal('modal-transaction');
    refreshAll();
  });

  // Debt Form
  document.getElementById('form-debt').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('debt-id').value;
    const creditorName = document.getElementById('debt-creditor').value;
    const date = document.getElementById('debt-date').value;
    const amount = document.getElementById('debt-amount').value;
    const paidAmount = document.getElementById('debt-paid').value;
    const notes = document.getElementById('debt-notes').value;
    
    if (id) {
      db.updateDebt(id, { creditorName, date, amount, paidAmount, notes });
    } else {
      db.addDebt({ creditorName, date, amount, paidAmount, notes });
    }
    
    closeModal('modal-debt');
    refreshAll();
  });

  // Import Form
  document.getElementById('form-import').addEventListener('submit', (e) => {
    e.preventDefault();
    const jsonStr = document.getElementById('import-json-data').value;
    const success = db.importDatabase(jsonStr);
    
    if (success) {
      alert('Database berhasil diimpor!');
      closeModal('modal-import');
      refreshAll();
    } else {
      alert('Format backup JSON tidak valid! Silakan cek kembali.');
    }
  });
}

// ----------------- BACKUP & DEMO HANDLERS -----------------
function setupBackupHandlers() {
  document.getElementById('btn-seed-data').addEventListener('click', () => {
    if (confirm('Apakah Anda ingin memuat data demo? Ini akan menimpa data yang ada saat ini.')) {
      db.seedDatabase();
      refreshAll();
      alert('Data demo berhasil dimuat!');
    }
  });

  document.getElementById('btn-export-db').addEventListener('click', () => {
    const dataStr = db.exportDatabase();
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `ipo_hub_backup_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  });

  document.getElementById('btn-import-db').addEventListener('click', () => {
    document.getElementById('form-import').reset();
    openModal('modal-import');
  });
}

// ----------------- SEARCH & FILTERS -----------------
function setupFilters() {
  document.getElementById('search-nominee').addEventListener('input', renderNominees);
  document.getElementById('search-stock').addEventListener('input', renderStocks);
  document.getElementById('filter-stock-status').addEventListener('change', renderStocks);
  document.getElementById('search-order').addEventListener('input', renderOrders);
  document.getElementById('filter-order-status').addEventListener('change', renderOrders);
  document.getElementById('search-transaction').addEventListener('input', renderTransactions);
  document.getElementById('filter-transaction-type').addEventListener('change', renderTransactions);
  document.getElementById('search-debt').addEventListener('input', renderDebts);
}

// ----------------- RENDERING SYSTEM -----------------

// DASHBOARD RENDER
function renderDashboard() {
  const stats = db.getDashboardStats();
  
  document.getElementById('kpi-total-transferred').textContent = formatRupiah(stats.totalTransferred);
  document.getElementById('kpi-total-returned-sub').textContent = `Sudah dikembalikan: ${formatRupiah(stats.totalReturned)}`;
  
  document.getElementById('kpi-total-profit').textContent = formatRupiah(stats.totalNetProfit);
  const roi = stats.totalTransferred > 0 ? (stats.totalNetProfit / stats.totalTransferred) * 100 : 0;
  document.getElementById('kpi-profit-pct').textContent = `Bagi Hasil: ${formatRupiah(stats.totalProfitShare)} | ROI: ${roi.toFixed(1)}%`;
  
  document.getElementById('kpi-total-outstanding').textContent = formatRupiah(stats.totalOutstanding);
  document.getElementById('kpi-cash-vs-stock').textContent = `RDN Cash: ${formatRupiah(stats.totalLiquidCash)} | Saham: ${formatRupiah(stats.totalActiveUnsold)}`;
  
  // Populate Debt KPI
  document.getElementById('kpi-total-debt-remaining').textContent = formatRupiah(stats.totalDebtRemaining);
  document.getElementById('kpi-debt-details').textContent = `Pinjaman: ${formatRupiah(stats.totalDebtAmount)} | Terbayar: ${formatRupiah(stats.totalDebtPaid)}`;

  document.getElementById('kpi-counts').textContent = `${stats.nomineeCount} Akun`;
  document.getElementById('kpi-counts-sub').textContent = `${stats.stockCount} Saham | ${stats.orderCount} Total Pesanan`;

  renderProfitChart();

  const listDashboardNominees = document.getElementById('list-dashboard-nominees');
  listDashboardNominees.innerHTML = '';
  const nominees = db.getNominees();
  
  let hasBillings = false;
  nominees.forEach(n => {
    const nomineeStats = db.getNomineeStats(n.id);
    if (nomineeStats.outstandingBalance !== 0) {
      hasBillings = true;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <strong>${nomineeStats.name}</strong>
          <div style="font-size: 0.75rem; color: var(--text-muted);">
            Cash: ${formatRupiah(nomineeStats.liquidCashBalance)} | Saham: ${formatRupiah(nomineeStats.activeUnsoldCost)}
          </div>
        </td>
        <td class="text-right text-outstanding">${formatRupiah(nomineeStats.outstandingBalance)}</td>
      `;
      listDashboardNominees.appendChild(tr);
    }
  });

  if (!hasBillings) {
    listDashboardNominees.innerHTML = `<tr><td colspan="2" class="text-center text-muted">Semua tagihan lunas!</td></tr>`;
  }

  const listDashboardTransfers = document.getElementById('list-dashboard-transfers');
  listDashboardTransfers.innerHTML = '';
  const transfers = db.getTransfers();
  const recentTransfers = [...transfers]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  if (recentTransfers.length === 0) {
    listDashboardTransfers.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Belum ada transaksi.</td></tr>`;
  } else {
    recentTransfers.forEach(t => {
      const nominee = nominees.find(n => n.id === t.nomineeId);
      const name = nominee ? nominee.name : 'Unknown';
      const typeText = t.type === 'transfer' 
        ? `<span class="badge badge-primary">Transfer</span>`
        : `<span class="badge badge-success">Return</span>`;
      const valClass = t.type === 'transfer' ? '' : 'text-profit';
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${t.date}</td>
        <td><strong>${name}</strong></td>
        <td>${typeText}</td>
        <td class="text-right ${valClass}">${formatRupiah(t.amount)}</td>
        <td><span style="font-size: 0.85rem; color: var(--text-secondary);">${t.notes}</span></td>
      `;
      listDashboardTransfers.appendChild(tr);
    });
  }
}

function renderProfitChart() {
  const ctx = document.getElementById('chart-stock-profits').getContext('2d');
  
  if (profitChart) {
    profitChart.destroy();
  }
  
  const stocks = db.getStocks();
  const stockLabels = [];
  const stockData = [];
  const barColors = [];
  
  stocks.forEach(s => {
    const stats = db.getStockStats(s.id);
    if (stats.totalProfit !== 0 || stats.totalAllottedCost > 0) {
      stockLabels.push(s.code);
      stockData.push(stats.totalProfit);
      barColors.push(stats.totalProfit >= 0 ? 'rgba(16, 185, 129, 0.75)' : 'rgba(244, 63, 94, 0.75)');
    }
  });

  if (stockLabels.length === 0) {
    stockLabels.push('Belum Ada Data');
    stockData.push(0);
    barColors.push('rgba(255, 255, 255, 0.1)');
  }

  profitChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: stockLabels,
      datasets: [{
        label: 'Realisasi Keuntungan (Rp)',
        data: stockData,
        backgroundColor: barColors,
        borderColor: barColors.map(c => c.replace('0.75', '1')),
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Keuntungan: ${formatRupiah(context.raw)}`;
            }
          }
        }
      },
      scales: {
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: '#94a3b8',
            callback: function(value) {
              if (value >= 1000000) return 'Rp ' + (value / 1000000) + 'jt';
              if (value <= -1000000) return 'Rp ' + (value / 1000000) + 'jt';
              return 'Rp ' + value;
            }
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#94a3b8'
          }
        }
      }
    }
  });
}

// NOMINEES TAB RENDER
function renderNominees() {
  const grid = document.getElementById('grid-nominees');
  grid.innerHTML = '';
  
  const searchVal = document.getElementById('search-nominee').value.toLowerCase();
  const nominees = db.getNominees();
  
  const filteredNominees = nominees.filter(n => {
    return n.name.toLowerCase().includes(searchVal) || 
           n.bankName.toLowerCase().includes(searchVal) ||
           n.notes.toLowerCase().includes(searchVal);
  });

  if (filteredNominees.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon"><i class="fa-solid fa-users-slash"></i></div>
        <h3>Belum ada Akun Nominee</h3>
        <p>Silakan buat akun nominee dengan mengklik tombol "Tambah Akun Baru".</p>
      </div>
    `;
    return;
  }

  filteredNominees.forEach(n => {
    const stats = db.getNomineeStats(n.id);
    const card = document.createElement('div');
    card.className = 'glass-card nominee-card';
    
    let statusBorder = '';
    if (stats.outstandingBalance > 0) {
      statusBorder = 'border-left: 4px solid var(--warning);';
    } else if (stats.outstandingBalance === 0 && stats.totalTransferred > 0) {
      statusBorder = 'border-left: 4px solid var(--success);';
    }

    card.setAttribute('style', statusBorder);
    
    card.innerHTML = `
      <div class="nominee-card-header">
        <div class="nominee-card-title">
          <h3>${stats.name}</h3>
          <span>${stats.bankName ? `${stats.bankName} - ${stats.bankAccount}` : 'Rincian Bank Belum Ada'}</span>
        </div>
        <button class="btn btn-secondary btn-sm" id="btn-view-${stats.id}" title="Lihat Portofolio Lengkap">
          <i class="fa-solid fa-eye"></i> Detail
        </button>
      </div>
      
      <div class="nominee-stats-list">
        <div class="nominee-stat-item">
          <span class="nominee-stat-label">Total Ditransfer:</span>
          <span class="nominee-stat-val">${formatRupiah(stats.totalTransferred)}</span>
        </div>
        <div class="nominee-stat-item">
          <span class="nominee-stat-label">Sudah Dikembalikan:</span>
          <span class="nominee-stat-val text-profit">${formatRupiah(stats.totalReturned)}</span>
        </div>
        <div class="nominee-stat-item" style="border-top: 1px dashed var(--glass-border); padding-top: 0.4rem;">
          <span class="nominee-stat-label">Cash Menganggur (RDN):</span>
          <span class="nominee-stat-val" style="color: var(--primary);">${formatRupiah(stats.liquidCashBalance)}</span>
        </div>
        <div class="nominee-stat-item">
          <span class="nominee-stat-label">Modal di Saham Aktif:</span>
          <span class="nominee-stat-val" style="color: var(--secondary);">${formatRupiah(stats.activeUnsoldCost)}</span>
        </div>
        <div class="nominee-stat-item">
          <span class="nominee-stat-label">Keuntungan Saham (Gross):</span>
          <span class="nominee-stat-val text-profit">${formatRupiah(stats.totalProfit)}</span>
        </div>
        <div class="nominee-stat-item">
          <span class="nominee-stat-label">Bagi Hasil Nominee (${stats.profitSharePct}%):</span>
          <span class="nominee-stat-val text-loss">${formatRupiah(stats.profitShareAmount)}</span>
        </div>
        <div class="nominee-stat-item">
          <span class="nominee-stat-label">Keuntungan Bersih Saya:</span>
          <span class="nominee-stat-val text-profit">${formatRupiah(stats.userNetProfit)}</span>
        </div>
        <div class="nominee-stat-item" style="border-top: 1px solid var(--glass-border); padding-top: 0.5rem; font-size: 0.95rem;">
          <span class="nominee-stat-label" style="font-weight: 700;">Sisa Tagihan:</span>
          <span class="nominee-stat-val ${stats.outstandingBalance > 0 ? 'text-outstanding' : stats.outstandingBalance < 0 ? 'text-loss' : ''}" style="font-weight: 700;">
            ${formatRupiah(stats.outstandingBalance)}
          </span>
        </div>
      </div>
      
      <div class="nominee-card-actions">
        <button class="btn btn-secondary btn-sm" id="btn-edit-nom-${stats.id}"><i class="fa-solid fa-pen"></i> Edit</button>
        <button class="btn btn-danger btn-sm" id="btn-del-nom-${stats.id}"><i class="fa-solid fa-trash"></i> Hapus</button>
      </div>
    `;
    
    grid.appendChild(card);
    
    document.getElementById(`btn-view-${stats.id}`).addEventListener('click', () => openNomineeDetailModal(stats.id));
    document.getElementById(`btn-edit-nom-${stats.id}`).addEventListener('click', () => openNomineeModal(n));
    document.getElementById(`btn-del-nom-${stats.id}`).addEventListener('click', () => {
      if (confirm(`Hapus akun ${stats.name}? Semua pesanan dan log transaksi untuk akun ini akan dihapus permanen!`)) {
        db.deleteNominee(stats.id);
        refreshAll();
      }
    });
  });
}

// STOCKS TAB RENDER
function renderStocks() {
  const tbody = document.getElementById('list-stocks');
  tbody.innerHTML = '';
  
  const searchVal = document.getElementById('search-stock').value.toLowerCase();
  const filterStatus = document.getElementById('filter-stock-status').value;
  const stocks = db.getStocks();
  
  const filteredStocks = stocks.filter(s => {
    const matchesSearch = s.code.toLowerCase().includes(searchVal) || s.name.toLowerCase().includes(searchVal);
    const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (filteredStocks.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">Tidak ada data saham ditemukan.</td></tr>`;
    return;
  }

  const badgeMap = {
    active: '<span class="badge badge-primary">Offering</span>',
    allotted: '<span class="badge badge-warning">Allotted</span>',
    listed: '<span class="badge badge-info">Listed</span>',
    closed: '<span class="badge badge-success">Closed</span>'
  };

  filteredStocks.forEach(s => {
    const stats = db.getStockStats(s.id);
    const profitClass = stats.totalProfit > 0 ? 'text-profit' : stats.totalProfit < 0 ? 'text-loss' : '';
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${s.code}</strong></td>
      <td>${s.name}</td>
      <td class="text-right">${formatRupiah(s.ipoPrice)}</td>
      <td>${s.listingDate || '-'}</td>
      <td>${badgeMap[s.status] || s.status}</td>
      <td class="text-right">${stats.totalOrderedLots} Lot<br><span style="font-size: 0.75rem; color: var(--text-muted);">${formatRupiah(stats.totalOrderedValue)}</span></td>
      <td class="text-right ${profitClass}">${formatRupiah(stats.totalProfit)}</td>
      <td>
        <button class="btn btn-secondary btn-sm" id="btn-edit-stk-${s.id}"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-danger btn-sm" id="btn-del-stk-${s.id}"><i class="fa-solid fa-trash"></i></button>
      </td>
    `;
    
    tbody.appendChild(tr);
    
    document.getElementById(`btn-edit-stk-${s.id}`).addEventListener('click', () => openStockModal(s));
    document.getElementById(`btn-del-stk-${s.id}`).addEventListener('click', () => {
      if (confirm(`Hapus saham ${s.code}? Semua pesanan untuk saham ini akan ikut terhapus!`)) {
        db.deleteStock(s.id);
        refreshAll();
      }
    });
  });
}

// ORDERS TAB RENDER
function renderOrders() {
  const tbody = document.getElementById('list-orders');
  tbody.innerHTML = '';
  
  const searchVal = document.getElementById('search-order').value.toLowerCase();
  const filterStatus = document.getElementById('filter-order-status').value;
  
  const orders = db.getOrders();
  const stocks = db.getStocks();
  const nominees = db.getNominees();
  
  const filteredOrders = orders.filter(o => {
    const nominee = nominees.find(n => n.id === o.nomineeId);
    const stock = stocks.find(s => s.id === o.stockId);
    
    const nomineeName = nominee ? nominee.name.toLowerCase() : '';
    const stockCode = stock ? stock.code.toLowerCase() : '';
    
    const matchesSearch = nomineeName.includes(searchVal) || stockCode.includes(searchVal);
    const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  if (filteredOrders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted">Tidak ada pesanan ditemukan.</td></tr>`;
    return;
  }

  filteredOrders.forEach(o => {
    const nominee = nominees.find(n => n.id === o.nomineeId);
    const stock = stocks.find(s => s.id === o.stockId);
    
    if (!nominee || !stock) return;

    const orderedValue = o.lotOrdered * 100 * stock.ipoPrice;
    const allottedCost = o.lotAllotted * 100 * stock.ipoPrice;
    const refund = orderedValue - allottedCost;
    
    let profit = 0;
    let badgeHTML = '';
    let actionButtons = '';
    
    if (o.status === 'ordered') {
      badgeHTML = `<span class="badge badge-primary">Ordered</span>`;
      actionButtons = `
        <button class="btn btn-secondary btn-sm" id="btn-allot-ord-${o.id}" title="Input Penjatahan"><i class="fa-solid fa-percent"></i> Penjatahan</button>
      `;
    } else if (o.status === 'allotted') {
      badgeHTML = `<span class="badge badge-warning">Allotted</span>`;
      actionButtons = `
        <button class="btn btn-primary btn-sm" id="btn-sell-ord-${o.id}" title="Input Hasil Jual"><i class="fa-solid fa-dollar-sign"></i> Jual</button>
        <button class="btn btn-secondary btn-sm" id="btn-allot-ord-${o.id}" title="Edit Penjatahan"><i class="fa-solid fa-percent"></i></button>
      `;
    } else if (o.status === 'sold') {
      badgeHTML = `<span class="badge badge-success">Sold</span>`;
      profit = (o.lotAllotted * 100 * o.sellPrice) - allottedCost;
      actionButtons = `
        <button class="btn btn-secondary btn-sm" id="btn-sell-ord-${o.id}" title="Edit Penjualan"><i class="fa-solid fa-dollar-sign"></i></button>
      `;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${nominee.name}</strong></td>
      <td><strong>${stock.code}</strong><br><span style="font-size: 0.75rem; color: var(--text-muted);">Rp ${stock.ipoPrice}</span></td>
      <td class="text-right">${o.lotOrdered} Lot</td>
      <td class="text-right">${formatRupiah(orderedValue)}</td>
      <td class="text-right">${o.status !== 'ordered' ? `${o.lotAllotted} Lot` : '-'}</td>
      <td class="text-right" style="color: var(--primary);">${o.status !== 'ordered' ? formatRupiah(refund) : '-'}</td>
      <td class="text-right">${o.status === 'sold' ? formatRupiah(o.sellPrice) : '-'}</td>
      <td class="text-right ${profit >= 0 ? 'text-profit' : 'text-loss'}">${o.status === 'sold' ? formatRupiah(profit) : '-'}</td>
      <td>${badgeHTML}</td>
      <td>
        <div style="display: flex; gap: 0.25rem;">
          ${actionButtons}
          <button class="btn btn-secondary btn-sm" id="btn-edit-ord-${o.id}" title="Edit Pesanan"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-danger btn-sm" id="btn-del-ord-${o.id}" title="Hapus Pesanan"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    `;
    
    tbody.appendChild(tr);

    if (o.status === 'ordered' || o.status === 'allotted') {
      document.getElementById(`btn-allot-ord-${o.id}`).addEventListener('click', () => openAllotmentModal(o.id));
    }
    if (o.status === 'allotted' || o.status === 'sold') {
      document.getElementById(`btn-sell-ord-${o.id}`).addEventListener('click', () => openSellModal(o.id));
    }
    
    document.getElementById(`btn-edit-ord-${o.id}`).addEventListener('click', () => openOrderModal(o));
    document.getElementById(`btn-del-ord-${o.id}`).addEventListener('click', () => {
      if (confirm(`Hapus pesanan saham ini?`)) {
        db.deleteOrder(o.id);
        refreshAll();
      }
    });
  });
}

// TRANSACTIONS TAB RENDER
function renderTransactions() {
  const tbody = document.getElementById('list-transactions');
  tbody.innerHTML = '';
  
  const searchVal = document.getElementById('search-transaction').value.toLowerCase();
  const filterType = document.getElementById('filter-transaction-type').value;
  
  const transfers = db.getTransfers();
  const nominees = db.getNominees();
  
  const filteredTransfers = transfers.filter(t => {
    const nominee = nominees.find(n => n.id === t.nomineeId);
    const nomineeName = nominee ? nominee.name.toLowerCase() : '';
    
    const matchesSearch = nomineeName.includes(searchVal) || t.notes.toLowerCase().includes(searchVal);
    const matchesType = filterType === 'all' || t.type === filterType;
    
    return matchesSearch && matchesType;
  });

  filteredTransfers.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (filteredTransfers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Tidak ada log transaksi ditemukan.</td></tr>`;
    return;
  }

  filteredTransfers.forEach(t => {
    const nominee = nominees.find(n => n.id === t.nomineeId);
    const name = nominee ? nominee.name : 'Unknown Account';
    
    const typeBadge = t.type === 'transfer'
      ? `<span class="badge badge-primary">Transfer (Modal)</span>`
      : `<span class="badge badge-success">Return (Sisa/Hasil)</span>`;
      
    const valClass = t.type === 'transfer' ? '' : 'text-profit';
    
    const tr = document.createElement('tr');
    tr.className = t.type === 'transfer' ? 'tx-type-transfer' : 'tx-type-return';
    tr.innerHTML = `
      <td>${t.date}</td>
      <td><strong>${name}</strong></td>
      <td>${typeBadge}</td>
      <td class="text-right ${valClass}"><strong>${formatRupiah(t.amount)}</strong></td>
      <td><span style="font-size: 0.85rem; color: var(--text-secondary);">${t.notes}</span></td>
      <td>
        <button class="btn btn-secondary btn-sm" id="btn-edit-tx-${t.id}"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-danger btn-sm" id="btn-del-tx-${t.id}"><i class="fa-solid fa-trash"></i></button>
      </td>
    `;
    
    tbody.appendChild(tr);
    
    document.getElementById(`btn-edit-tx-${t.id}`).addEventListener('click', () => openTransactionModal(t));
    document.getElementById(`btn-del-tx-${t.id}`).addEventListener('click', () => {
      if (confirm(`Hapus transaksi ini dari log?`)) {
        db.deleteTransfer(t.id);
        refreshAll();
      }
    });
  });
}

// DEBTS TAB RENDER
function renderDebts() {
  const tbody = document.getElementById('list-debts');
  tbody.innerHTML = '';
  
  const searchVal = document.getElementById('search-debt').value.toLowerCase();
  const debts = db.getDebts();
  
  const filteredDebts = debts.filter(d => {
    return d.creditorName.toLowerCase().includes(searchVal) || 
           d.notes.toLowerCase().includes(searchVal);
  });

  if (filteredDebts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">Tidak ada data hutang ditemukan.</td></tr>`;
    return;
  }

  filteredDebts.sort((a, b) => new Date(b.date) - new Date(a.date));

  filteredDebts.forEach(d => {
    const remaining = d.amount - d.paidAmount;
    const statusBadge = remaining <= 0 
      ? '<span class="badge badge-success">Lunas</span>' 
      : '<span class="badge badge-danger">Belum Lunas</span>';
      
    const valClass = remaining <= 0 ? 'text-profit' : 'text-loss';
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${d.date}</td>
      <td><strong>${d.creditorName}</strong></td>
      <td class="text-right">${formatRupiah(d.amount)}</td>
      <td class="text-right text-profit">${formatRupiah(d.paidAmount)}</td>
      <td class="text-right ${valClass}"><strong>${formatRupiah(remaining)}</strong></td>
      <td>${statusBadge}</td>
      <td><span style="font-size: 0.85rem; color: var(--text-secondary);">${d.notes}</span></td>
      <td>
        <button class="btn btn-secondary btn-sm" id="btn-edit-debt-${d.id}"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-danger btn-sm" id="btn-del-debt-${d.id}"><i class="fa-solid fa-trash"></i></button>
      </td>
    `;
    
    tbody.appendChild(tr);
    
    document.getElementById(`btn-edit-debt-${d.id}`).addEventListener('click', () => openDebtModal(d));
    document.getElementById(`btn-del-debt-${d.id}`).addEventListener('click', () => {
      if (confirm(`Hapus data hutang kepada ${d.creditorName}?`)) {
        db.deleteDebt(d.id);
        refreshAll();
      }
    });
  });
}
