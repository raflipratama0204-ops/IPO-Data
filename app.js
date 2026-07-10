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

// Currency input masking with custom property descriptors for transparent value reading
function initCurrencyInput(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type = 'text';
  input.inputMode = 'numeric';
  
  const cleanValue = (val) => String(val).replace(/\D/g, "");
  
  const formatValue = (val) => {
    let clean = cleanValue(val);
    if (!clean) return "";
    return new Intl.NumberFormat('id-ID').format(parseInt(clean));
  };

  // Formats typed input and updates cursor position
  input.addEventListener('input', () => {
    let cursorPosition = input.selectionStart;
    let originalLength = input.value.length;
    
    let rawTyped = cleanValue(input.value);
    let formatted = formatValue(rawTyped);
    
    // Assign formatted value using native setter to avoid descriptor recursion
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    descriptor.set.call(input, formatted);
    
    let diff = formatted.length - originalLength;
    let newCursorPosition = Math.max(0, cursorPosition + diff);
    input.setSelectionRange(newCursorPosition, newCursorPosition);
  });

  // Override prototype property descriptor of value to transparently get and set unformatted string
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  Object.defineProperty(input, 'value', {
    get: function() {
      return cleanValue(descriptor.get.call(this));
    },
    set: function(val) {
      const formatted = formatValue(val);
      descriptor.set.call(this, formatted);
    },
    configurable: true
  });
  
  // Format existing value if present
  if (input.value) {
    input.value = input.value;
  }
}

function initAllCurrencyInputs() {
  const currencyInputIds = [
    'stock-price',
    'sell-price',
    'transaction-amount',
    'refund-returned-amount',
    'sell-returned-amount',
    'debt-amount',
    'debt-paid'
  ];
  currencyInputIds.forEach(initCurrencyInput);
}

// Global Variables
let currentTab = 'dashboard';
let profitChart = null;

// App initialization function
function initApp() {
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
  
  // Sidebar Toggle Setup
  setupSidebarToggle();

  // Initialize Currency Input Masking
  initAllCurrencyInputs();

  // Initialize Google Drive Sync
  setupGoogleSync();
}

// Run initialization immediately if the document has already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}


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

// ----------------- SIDEBAR TOGGLE -----------------
function setupSidebarToggle() {
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('btn-toggle-sidebar');
  if (!sidebar || !toggleBtn) return;

  // Read saved state from localStorage
  const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
  if (isCollapsed) {
    sidebar.classList.add('collapsed');
    toggleBtn.setAttribute('title', 'Tampilkan Menu');
  }

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    const nowCollapsed = sidebar.classList.contains('collapsed');
    localStorage.setItem('sidebar-collapsed', nowCollapsed);
    toggleBtn.setAttribute('title', nowCollapsed ? 'Tampilkan Menu' : 'Sembunyikan Menu');
    
    // Dispatch window resize events to resize Chart.js dynamically
    window.dispatchEvent(new Event('resize'));
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300);
  });
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
    },
    cloud: {
      title: 'Sinkronisasi Cloud Google Drive',
      subtitle: 'Amankan dan sinkronisasikan database portfolio akun IPO Anda ke Google Drive pribadi.'
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
      } else if (currentTab === 'cloud') {
        updateGoogleSyncUI();
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

function openStockModal(stock) {
  if (stock === undefined) stock = null;
  const form = document.getElementById('form-stock');
  form.reset();
  
  const title = document.getElementById('stock-modal-title');
  const idInput = document.getElementById('stock-id');
  
  if (stock) {
    title.textContent = 'Edit Saham IPO';
    idInput.value = stock.id;
    document.getElementById('stock-code').value = stock.code;
    document.getElementById('stock-name').value = stock.name;
    document.getElementById('stock-underwriter').value = stock.underwriter || '';
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
  
  populateSelectDropdowns(order ? order.stockId : null);
  
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
  
  const brokerFeeValInput = document.getElementById('sell-broker-fee-val');
  const brokerFeeTypeSelect = document.getElementById('sell-broker-fee-type');
  const exchangeFeeValInput = document.getElementById('sell-exchange-fee-val');
  const exchangeFeeTypeSelect = document.getElementById('sell-exchange-fee-type');

  // Pre-populate with saved values or standard defaults (0.15% and 0.043%)
  brokerFeeValInput.value = order.sellBrokerFeeValue !== undefined ? order.sellBrokerFeeValue : 0.15;
  brokerFeeTypeSelect.value = order.sellBrokerFeeType || 'percent';
  exchangeFeeValInput.value = order.sellExchangeFeeValue !== undefined ? order.sellExchangeFeeValue : 0.043;
  exchangeFeeTypeSelect.value = order.sellExchangeFeeType || 'percent';
  
  const detailsEl = document.getElementById('sell-calculation-details');
  
  const updateProfitEst = () => {
    const sellPrice = parseFloat(priceInput.value) || 0;
    const lotAllotted = order.lotAllotted || 0;
    const grossSellValue = lotAllotted * 100 * sellPrice;
    const initialCost = lotAllotted * 100 * stock.ipoPrice;
    
    const brokerFeeVal = parseFloat(brokerFeeValInput.value) || 0;
    const brokerFeeType = brokerFeeTypeSelect.value;
    let brokerFeeRp = 0;
    if (brokerFeeType === 'percent') {
      brokerFeeRp = Math.round(grossSellValue * (brokerFeeVal / 100));
    } else {
      brokerFeeRp = Math.round(brokerFeeVal);
    }
    
    const exchangeFeeVal = parseFloat(exchangeFeeValInput.value) || 0;
    const exchangeFeeType = exchangeFeeTypeSelect.value;
    let exchangeFeeRp = 0;
    if (exchangeFeeType === 'percent') {
      exchangeFeeRp = Math.round(grossSellValue * (exchangeFeeVal / 100));
    } else {
      exchangeFeeRp = Math.round(exchangeFeeVal);
    }
    
    const netSellValue = grossSellValue - brokerFeeRp - exchangeFeeRp;
    const netProfit = netSellValue - initialCost;
    
    const profitClass = netProfit >= 0 ? 'text-profit' : 'text-loss';
    const profitText = netProfit >= 0 ? 'Estimasi Keuntungan Bersih' : 'Estimasi Kerugian Bersih';
    
    detailsEl.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
        <span>Nilai Jual Kotor:</span>
        <strong>${formatRupiah(grossSellValue)}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
        <span>Biaya Broker (${brokerFeeType === 'percent' ? brokerFeeVal + '%' : 'Flat'}):</span>
        <span style="color: var(--danger);">- ${formatRupiah(brokerFeeRp)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
        <span>Biaya Bursa (${exchangeFeeType === 'percent' ? exchangeFeeVal + '%' : 'Flat'}):</span>
        <span style="color: var(--danger);">- ${formatRupiah(exchangeFeeRp)}</span>
      </div>
      <hr style="border: 0; border-top: 1px solid var(--glass-border); margin: 0.5rem 0;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
        <span>Nilai Jual Bersih:</span>
        <strong>${formatRupiah(netSellValue)}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
        <span>Modal Awal (Penjatahan):</span>
        <span>${formatRupiah(initialCost)}</span>
      </div>
      <hr style="border: 0; border-top: 1px solid var(--glass-border); margin: 0.5rem 0;">
      <div style="display: flex; justify-content: space-between; font-size: 0.95rem;">
        <span>${profitText}:</span>
        <strong class="${profitClass}">${formatRupiah(netProfit)}</strong>
      </div>
    `;
  };
  
  priceInput.oninput = updateProfitEst;
  brokerFeeValInput.oninput = updateProfitEst;
  brokerFeeTypeSelect.onchange = updateProfitEst;
  exchangeFeeValInput.oninput = updateProfitEst;
  exchangeFeeTypeSelect.onchange = updateProfitEst;
  
  updateProfitEst();
  
  openModal('modal-sell');
}

function openRefundReturnModal(orderId) {
  const orders = db.getOrders();
  const stocks = db.getStocks();
  const nominees = db.getNominees();
  
  const order = orders.find(o => o.id === orderId);
  const stock = stocks.find(s => s.id === order.stockId);
  const nominee = nominees.find(n => n.id === order.nomineeId);
  
  if (!order || !stock) return;
  
  document.getElementById('refund-return-order-id').value = orderId;
  
  const infoEl = document.getElementById('refund-return-info');
  infoEl.innerHTML = `Akun Nominee: <strong>${nominee.name}</strong><br>Saham IPO: <strong>${stock.code}</strong><br>Status: <strong>${order.status.toUpperCase()}</strong>`;
  
  // 1. Refund Penjatahan
  const refund = (order.lotOrdered - order.lotAllotted) * 100 * stock.ipoPrice;
  document.getElementById('refund-total-amount').textContent = formatRupiah(refund);
  
  const refundReturnedInput = document.getElementById('refund-returned-amount');
  refundReturnedInput.value = order.refundReturned !== undefined ? order.refundReturned : 0;
  
  const refundRemainingEl = document.getElementById('refund-remaining-label');
  
  const updateRefundRemaining = () => {
    const returned = parseFloat(refundReturnedInput.value) || 0;
    const remaining = Math.max(0, refund - returned);
    refundRemainingEl.textContent = `Sisa Tagihan Refund: ${formatRupiah(remaining)}`;
    if (remaining === 0) {
      refundRemainingEl.style.color = 'var(--success)';
    } else {
      refundRemainingEl.style.color = 'var(--warning)';
    }
  };
  
  refundReturnedInput.oninput = updateRefundRemaining;
  updateRefundRemaining();
  
  // 2. Hasil Penjualan
  const sellReturnContainer = document.getElementById('sell-return-container');
  const sellReturnedInput = document.getElementById('sell-returned-amount');
  const sellRemainingEl = document.getElementById('sell-remaining-label');
  
  if (order.status === 'sold') {
    sellReturnContainer.style.display = 'block';
    sellReturnedInput.required = true;
    
    const grossSellValue = order.lotAllotted * 100 * order.sellPrice;
    const netSellValue = grossSellValue - (order.sellBrokerFee || 0) - (order.sellExchangeFee || 0);
    document.getElementById('sell-net-amount').textContent = formatRupiah(netSellValue);
    
    sellReturnedInput.value = order.sellReturned !== undefined ? order.sellReturned : 0;
    
    const updateSellRemaining = () => {
      const returned = parseFloat(sellReturnedInput.value) || 0;
      const remaining = Math.max(0, netSellValue - returned);
      sellRemainingEl.textContent = `Sisa Tagihan Hasil Jual: ${formatRupiah(remaining)}`;
      if (remaining === 0) {
        sellRemainingEl.style.color = 'var(--success)';
      } else {
        sellRemainingEl.style.color = 'var(--warning)';
      }
    };
    
    sellReturnedInput.oninput = updateSellRemaining;
    updateSellRemaining();
  } else {
    sellReturnContainer.style.display = 'none';
    sellReturnedInput.required = false;
    sellReturnedInput.value = 0;
  }
  
  openModal('modal-refund-return');
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
      } else if (o.status === 'not_allotted') {
        badgeHTML = `<span class="badge badge-danger">Not Allotted</span>`;
      } else if (o.status === 'sold') {
        badgeHTML = `<span class="badge badge-success">Sold</span>`;
        const brokerFee = o.sellBrokerFee || 0;
        const exchangeFee = o.sellExchangeFee || 0;
        profit = (o.lotAllotted * 100 * o.sellPrice) - allottedCost - brokerFee - exchangeFee;
      }
      
      const netSellValue = o.status === 'sold' ? ((o.lotAllotted * 100 * o.sellPrice) - (o.sellBrokerFee || 0) - (o.sellExchangeFee || 0)) : 0;
      const profitText = o.status === 'sold' 
        ? `
          <span class="${profit >= 0 ? 'text-profit' : 'text-loss'}">${formatRupiah(profit)}</span>
          <br>
          ${(o.sellReturned || 0) >= netSellValue ? `
            <span style="font-size: 0.65rem; color: var(--success);"><i class="fa-solid fa-circle-check"></i> Hasil Lunas</span>
          ` : `
            <span style="font-size: 0.65rem; color: var(--warning);" title="Sudah dikembalikan: ${formatRupiah(o.sellReturned || 0)}">
              Sisa: ${formatRupiah(netSellValue - (o.sellReturned || 0))}
            </span>
          `}
        `
        : `<span class="text-muted">-</span>`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${stock.code}</strong><br><span style="font-size: 0.8rem; color: var(--text-muted);">${stock.name}</span></td>
        <td class="text-right">${o.lotOrdered} Lot<br><span style="font-size: 0.75rem; color: var(--text-muted);">${formatRupiah(orderedValue)}</span></td>
        <td class="text-right">${o.status !== 'ordered' ? `${o.lotAllotted} Lot` : '-'}</td>
        <td class="text-right">
          ${o.status !== 'ordered' ? `
            <span>${formatRupiah(refund)}</span>
            ${refund > 0 ? `
              <br>
              ${(o.refundReturned || 0) >= refund ? `
                <span style="font-size: 0.65rem; color: var(--success);"><i class="fa-solid fa-circle-check"></i> Lunas</span>
              ` : `
                <span style="font-size: 0.65rem; color: var(--warning);" title="Sudah dikembalikan: ${formatRupiah(o.refundReturned || 0)}">
                  Sisa: ${formatRupiah(refund - (o.refundReturned || 0))}
                </span>
              `}
            ` : ''}
          ` : '-'}
        </td>
        <td class="text-right">${profitText}</td>
        <td>${badgeHTML}</td>
      `;
      listBody.appendChild(tr);
    });
  }

  openModal('modal-nominee-detail');
}

// Populates dropdown lists inside modals
function populateSelectDropdowns(selectedStockId = null) {
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
    // Only show active stocks, or the stock currently selected by the order we are editing
    if (s.status === 'active' || s.id === selectedStockId) {
      const option = document.createElement('option');
      option.value = s.id;
      option.textContent = `${s.code} - ${s.name} (Rp ${s.ipoPrice})`;
      orderStockSelect.appendChild(option);
    }
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
    const underwriter = document.getElementById('stock-underwriter').value;
    const ipoPrice = document.getElementById('stock-price').value;
    const offeringDate = document.getElementById('stock-offering-date').value;
    const listingDate = document.getElementById('stock-listing-date').value;
    const status = document.getElementById('stock-status').value;
    
    if (id) {
      db.updateStock(id, { code, name, underwriter, ipoPrice, offeringDate, listingDate, status });
    } else {
      db.addStock({ code, name, underwriter, ipoPrice, offeringDate, listingDate, status });
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
  document.getElementById('form-allotment').addEventListener('submit', async (e) => {
    e.preventDefault();
    const orderId = document.getElementById('allotment-order-id').value;
    const lotAllotted = parseInt(document.getElementById('allotment-lot').value) || 0;
    
    const orders = db.getOrders();
    const order = orders.find(o => o.id === orderId);
    
    if (lotAllotted > order.lotOrdered) {
      await showCustomAlert('Jumlah lot penjatahan tidak boleh lebih besar dari pesanan!');
      return;
    }
    
    db.updateOrder(orderId, {
      lotAllotted: lotAllotted,
      status: lotAllotted === 0 ? 'not_allotted' : 'allotted'
    });
    
    closeModal('modal-allotment');
    refreshAll();
  });

  // Sell Form
  document.getElementById('form-sell').addEventListener('submit', (e) => {
    e.preventDefault();
    const orderId = document.getElementById('sell-order-id').value;
    const sellPrice = parseFloat(document.getElementById('sell-price').value) || 0;
    
    const brokerFeeVal = parseFloat(document.getElementById('sell-broker-fee-val').value) || 0;
    const brokerFeeType = document.getElementById('sell-broker-fee-type').value;
    const exchangeFeeVal = parseFloat(document.getElementById('sell-exchange-fee-val').value) || 0;
    const exchangeFeeType = document.getElementById('sell-exchange-fee-type').value;

    const orders = db.getOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const stocks = db.getStocks();
    const stock = stocks.find(s => s.id === order.stockId);
    if (!stock) return;

    const grossSellValue = (order.lotAllotted || 0) * 100 * sellPrice;

    let sellBrokerFee = 0;
    if (brokerFeeType === 'percent') {
      sellBrokerFee = Math.round(grossSellValue * (brokerFeeVal / 100));
    } else {
      sellBrokerFee = Math.round(brokerFeeVal);
    }

    let sellExchangeFee = 0;
    if (exchangeFeeType === 'percent') {
      sellExchangeFee = Math.round(grossSellValue * (exchangeFeeVal / 100));
    } else {
      sellExchangeFee = Math.round(exchangeFeeVal);
    }

    db.updateOrder(orderId, {
      sellPrice: sellPrice,
      sellBrokerFee: sellBrokerFee,
      sellBrokerFeeType: brokerFeeType,
      sellBrokerFeeValue: brokerFeeVal,
      sellExchangeFee: sellExchangeFee,
      sellExchangeFeeType: exchangeFeeType,
      sellExchangeFeeValue: exchangeFeeVal,
      status: 'sold'
    });
    
    closeModal('modal-sell');
    refreshAll();
  });

  // Refund & Return Form
  document.getElementById('form-refund-return').addEventListener('submit', (e) => {
    e.preventDefault();
    const orderId = document.getElementById('refund-return-order-id').value;
    const refundReturned = parseFloat(document.getElementById('refund-returned-amount').value) || 0;
    const sellReturned = parseFloat(document.getElementById('sell-returned-amount').value) || 0;
    
    db.updateOrder(orderId, {
      refundReturned: refundReturned,
      sellReturned: sellReturned
    });
    
    closeModal('modal-refund-return');
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
  const formImport = document.getElementById('form-import');
  if (formImport) {
    formImport.addEventListener('submit', async (e) => {
      e.preventDefault();
      const jsonStr = document.getElementById('import-json-data').value;
      const success = db.importDatabase(jsonStr);
      
      if (success) {
        await showCustomAlert('Database berhasil diimpor!');
        closeModal('modal-import');
        refreshAll();
      } else {
        await showCustomAlert('Format backup JSON tidak valid! Silakan cek kembali.');
      }
    });
  }
}

// ----------------- BACKUP & DEMO HANDLERS -----------------
function setupBackupHandlers() {
  const btnSeed = document.getElementById('btn-seed-data');
  if (btnSeed) {
    btnSeed.addEventListener('click', async () => {
      const isConfirmed = await showCustomConfirm('Apakah Anda ingin memuat data demo? Ini akan menimpa data yang ada saat ini.', 'Muat Data Demo');
      if (isConfirmed) {
        db.seedDatabase();
        refreshAll();
        await showCustomAlert('Data demo berhasil dimuat!');
      }
    });
  }

  const btnExport = document.getElementById('btn-export-db');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const dataStr = db.exportDatabase();
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `ipo_hub_backup_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    });
  }

  const btnImport = document.getElementById('btn-import-db');
  if (btnImport) {
    btnImport.addEventListener('click', () => {
      document.getElementById('form-import').reset();
      openModal('modal-import');
    });
  }
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

  // Group expand/collapse event listeners
  document.getElementById('btn-expand-all-orders').addEventListener('click', () => {
    const nominees = db.getNominees();
    if (!window.expandedNomineeOrders) {
      window.expandedNomineeOrders = new Set();
    }
    nominees.forEach(n => window.expandedNomineeOrders.add(n.id));
    renderOrders();
  });

  document.getElementById('btn-collapse-all-orders').addEventListener('click', () => {
    if (window.expandedNomineeOrders) {
      window.expandedNomineeOrders.clear();
    }
    renderOrders();
  });
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
  const canvas = document.getElementById('chart-stock-profits');
  if (!canvas) return;
  
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js is not loaded. Skipping chart rendering.');
    return;
  }
  
  const ctx = canvas.getContext('2d');
  
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
    document.getElementById(`btn-del-nom-${stats.id}`).addEventListener('click', async () => {
      const isConfirmed = await showCustomConfirm(`Hapus akun ${stats.name}? Semua pesanan dan log transaksi untuk akun ini akan dihapus permanen!`, 'Hapus Akun Nominee');
      if (isConfirmed) {
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
    
    // Format underwriter info below stock name
    const underwriterHtml = s.underwriter 
      ? `<br><span style="font-size: 0.72rem; color: var(--text-secondary); display: inline-flex; align-items: center; gap: 4px; margin-top: 4px;"><i class="fa-solid fa-building-shield"></i> ${s.underwriter}</span>` 
      : '';
      
    // Format profit percentage badge
    let profitPctHtml = '';
    if (stats.profitPercentage !== undefined && stats.profitPercentage !== 0) {
      const pctSign = stats.profitPercentage >= 0 ? '+' : '';
      const badgeClass = stats.profitPercentage >= 0 ? 'badge-success' : 'badge-danger';
      profitPctHtml = `<br><span class="badge ${badgeClass}" style="font-size: 0.65rem; padding: 2px 6px; margin-top: 4px; display: inline-block; font-weight: 700; border-radius: 4px;">${pctSign}${stats.profitPercentage.toFixed(2)}%</span>`;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${s.code}</strong></td>
      <td><strong>${s.name}</strong>${underwriterHtml}</td>
      <td class="text-right">${formatRupiah(s.ipoPrice)}</td>
      <td>${s.listingDate || '-'}</td>
      <td>${badgeMap[s.status] || s.status}</td>
      <td class="text-right">${stats.totalOrderedLots} Lot<br><span style="font-size: 0.75rem; color: var(--text-muted);">${formatRupiah(stats.totalOrderedValue)}</span></td>
      <td class="text-right ${profitClass}"><strong>${formatRupiah(stats.totalProfit)}</strong>${profitPctHtml}</td>
      <td>
        <button class="btn btn-secondary btn-sm" id="btn-edit-stk-${s.id}"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-danger btn-sm" id="btn-del-stk-${s.id}"><i class="fa-solid fa-trash"></i></button>
      </td>
    `;
    
    tbody.appendChild(tr);
    
    document.getElementById(`btn-edit-stk-${s.id}`).addEventListener('click', () => openStockModal(s));
    document.getElementById(`btn-del-stk-${s.id}`).addEventListener('click', async () => {
      const isConfirmed = await showCustomConfirm(`Hapus saham ${s.code}? Semua pesanan untuk saham ini akan ikut terhapus!`, 'Hapus Saham IPO');
      if (isConfirmed) {
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

  // Initialize expandedNomineeOrders set globally if not present
  if (!window.expandedNomineeOrders) {
    window.expandedNomineeOrders = new Set();
  }

  // Group filtered orders by Nominee
  const groupedOrders = {};
  filteredOrders.forEach(o => {
    if (!groupedOrders[o.nomineeId]) {
      groupedOrders[o.nomineeId] = [];
    }
    groupedOrders[o.nomineeId].push(o);
  });

  // Render nominees and their orders
  Object.keys(groupedOrders).forEach(nomineeId => {
    const nominee = nominees.find(n => n.id === nomineeId);
    if (!nominee) return;

    const nomineeOrders = groupedOrders[nomineeId];
    
    // Calculate summaries for this group
    let totalOrderedVal = 0;
    let totalAllottedVal = 0;
    nomineeOrders.forEach(o => {
      const stock = stocks.find(s => s.id === o.stockId);
      if (!stock) return;
      totalOrderedVal += o.lotOrdered * 100 * stock.ipoPrice;
      totalAllottedVal += o.lotAllotted * 100 * stock.ipoPrice;
    });

    const isExpanded = window.expandedNomineeOrders.has(nomineeId);

    // Create Nominee Header Row
    const headerTr = document.createElement('tr');
    headerTr.className = `nominee-group-header ${isExpanded ? 'expanded' : ''}`;
    headerTr.setAttribute('data-nominee-id', nomineeId);
    headerTr.innerHTML = `
      <td colspan="10">
        <div class="nominee-group-content">
          <div class="nominee-group-title">
            <i class="fa-solid fa-chevron-right toggle-icon"></i>
            <strong>${nominee.name}</strong>
            <span class="nominee-group-badge">${nomineeOrders.length} Pesanan</span>
          </div>
          <div class="nominee-group-summary">
            Total Dipesan: <strong>${formatRupiah(totalOrderedVal)}</strong>
            ${totalAllottedVal > 0 ? ` | Total Penjatahan: <strong style="color: var(--primary);">${formatRupiah(totalAllottedVal)}</strong>` : ''}
          </div>
        </div>
      </td>
    `;
    tbody.appendChild(headerTr);

    // Create Order Rows
    nomineeOrders.forEach(o => {
      const stock = stocks.find(s => s.id === o.stockId);
      if (!stock) return;

      const orderedValue = o.lotOrdered * 100 * stock.ipoPrice;
      const allottedCost = o.lotAllotted * 100 * stock.ipoPrice;
      const refund = orderedValue - allottedCost;
      
      let profit = 0;
      let badgeHTML = '';
      let actionButtons = '';
      
      if (o.status === 'ordered') {
        badgeHTML = `<span class="badge badge-primary">Ordered</span>`;
        actionButtons = `
          <button class="btn btn-secondary btn-sm" id="btn-allot-ord-${o.id}" title="Input Penjatahan"><i class="fa-solid fa-percent"></i></button>
        `;
      } else if (o.status === 'allotted') {
        badgeHTML = `<span class="badge badge-warning">Allotted</span>`;
        actionButtons = `
          <button class="btn btn-primary btn-sm" id="btn-sell-ord-${o.id}" title="Input Hasil Jual"><i class="fa-solid fa-dollar-sign"></i></button>
          <button class="btn btn-secondary btn-sm" id="btn-allot-ord-${o.id}" title="Edit Penjatahan"><i class="fa-solid fa-percent"></i></button>
          <button class="btn btn-secondary btn-sm" id="btn-return-ord-${o.id}" title="Kelola Pengembalian Uang"><i class="fa-solid fa-wallet"></i></button>
        `;
      } else if (o.status === 'not_allotted') {
        badgeHTML = `<span class="badge badge-danger">Not Allotted</span>`;
        actionButtons = `
          <button class="btn btn-secondary btn-sm" id="btn-allot-ord-${o.id}" title="Edit Penjatahan"><i class="fa-solid fa-percent"></i></button>
          <button class="btn btn-secondary btn-sm" id="btn-return-ord-${o.id}" title="Kelola Pengembalian Uang"><i class="fa-solid fa-wallet"></i></button>
        `;
      } else if (o.status === 'sold') {
        badgeHTML = `<span class="badge badge-success">Sold</span>`;
        const brokerFee = o.sellBrokerFee || 0;
        const exchangeFee = o.sellExchangeFee || 0;
        profit = (o.lotAllotted * 100 * o.sellPrice) - allottedCost - brokerFee - exchangeFee;
        actionButtons = `
          <button class="btn btn-secondary btn-sm" id="btn-sell-ord-${o.id}" title="Edit Penjualan"><i class="fa-solid fa-dollar-sign"></i></button>
          <button class="btn btn-danger btn-sm" id="btn-unsell-ord-${o.id}" title="Batal Jual"><i class="fa-solid fa-rotate-left"></i></button>
          <button class="btn btn-secondary btn-sm" id="btn-return-ord-${o.id}" title="Kelola Pengembalian Uang"><i class="fa-solid fa-wallet"></i></button>
        `;
      }

      const orderTr = document.createElement('tr');
      orderTr.className = `nominee-order-row order-row-nominee-${nomineeId}`;
      orderTr.style.display = isExpanded ? 'table-row' : 'none';
      
      const netSellValue = o.status === 'sold' ? ((o.lotAllotted * 100 * o.sellPrice) - (o.sellBrokerFee || 0) - (o.sellExchangeFee || 0)) : 0;
      
      orderTr.innerHTML = `
        <td style="padding-left: 1.5rem; color: var(--text-secondary); font-size: 0.85rem;">
          <i class="fa-solid fa-caret-right" style="margin-right: 0.5rem; color: var(--primary);"></i> Detail Pesanan
        </td>
        <td><strong>${stock.code}</strong><br><span style="font-size: 0.75rem; color: var(--text-muted);">Rp ${stock.ipoPrice}</span></td>
        <td class="text-right">${o.lotOrdered} Lot</td>
        <td class="text-right">${formatRupiah(orderedValue)}</td>
        <td class="text-right">${(o.status !== 'ordered' && o.status !== 'not_allotted') ? `${o.lotAllotted} Lot` : '-'}</td>
        <td class="text-right">
          ${o.status !== 'ordered' ? `
            <span style="color: var(--primary); font-weight: 500;">${formatRupiah(refund)}</span>
            ${refund > 0 ? `
              <br>
              ${(o.refundReturned || 0) >= refund ? `
                <span class="badge badge-success" style="font-size: 0.65rem; padding: 0.15rem 0.3rem;"><i class="fa-solid fa-circle-check"></i> Refund Lunas</span>
              ` : `
                <span class="badge badge-warning" style="font-size: 0.65rem; padding: 0.15rem 0.3rem;" title="Sudah dikembalikan: ${formatRupiah(o.refundReturned || 0)}">
                  Sisa: ${formatRupiah(refund - (o.refundReturned || 0))}
                </span>
              `}
            ` : ''}
          ` : '-'}
        </td>
        <td class="text-right">${o.status === 'sold' ? formatRupiah(o.sellPrice) : '-'}</td>
        <td class="text-right">
          ${o.status === 'sold' ? `
            <span class="${profit >= 0 ? 'text-profit' : 'text-loss'}">${formatRupiah(profit)}</span>
            <br>
            ${netSellValue > 0 ? `
              ${(o.sellReturned || 0) >= netSellValue ? `
                <span class="badge badge-success" style="font-size: 0.65rem; padding: 0.15rem 0.3rem;"><i class="fa-solid fa-circle-check"></i> Hasil Lunas</span>
              ` : `
                <span class="badge badge-warning" style="font-size: 0.65rem; padding: 0.15rem 0.3rem;" title="Sudah dikembalikan: ${formatRupiah(o.sellReturned || 0)}">
                  Sisa Jual: ${formatRupiah(netSellValue - (o.sellReturned || 0))}
                </span>
              `}
            ` : ''}
          ` : '-'}
        </td>
        <td>${badgeHTML}</td>
        <td>
          <div style="display: flex; gap: 0.25rem;">
            ${actionButtons}
            <button class="btn btn-secondary btn-sm" id="btn-edit-ord-${o.id}" title="Edit Pesanan"><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn-danger btn-sm" id="btn-del-ord-${o.id}" title="Hapus Pesanan"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      `;
      tbody.appendChild(orderTr);

      // Event Listeners
      if (o.status === 'ordered' || o.status === 'allotted' || o.status === 'not_allotted') {
        document.getElementById(`btn-allot-ord-${o.id}`).addEventListener('click', (e) => {
          e.stopPropagation();
          openAllotmentModal(o.id);
        });
      }
      if (o.status === 'allotted' || o.status === 'sold') {
        document.getElementById(`btn-sell-ord-${o.id}`).addEventListener('click', (e) => {
          e.stopPropagation();
          openSellModal(o.id);
        });
      }
      if (o.status === 'allotted' || o.status === 'sold' || o.status === 'not_allotted') {
        document.getElementById(`btn-return-ord-${o.id}`).addEventListener('click', (e) => {
          e.stopPropagation();
          openRefundReturnModal(o.id);
        });
      }
      if (o.status === 'sold') {
        document.getElementById(`btn-unsell-ord-${o.id}`).addEventListener('click', async (e) => {
          e.stopPropagation();
          const isConfirmed = await showCustomConfirm('Batalkan penjualan saham ini? Status pesanan akan dikembalikan ke Penjatahan (Allotted) dan harga jual di-reset.', 'Batalkan Penjualan');
          if (isConfirmed) {
            db.updateOrder(o.id, {
              sellPrice: 0,
              sellBrokerFee: 0,
              sellBrokerFeeValue: 0,
              sellExchangeFee: 0,
              sellExchangeFeeValue: 0,
              sellReturned: 0,
              status: 'allotted'
            });
            refreshAll();
          }
        });
      }
      
      document.getElementById(`btn-edit-ord-${o.id}`).addEventListener('click', (e) => {
        e.stopPropagation();
        openOrderModal(o);
      });
      document.getElementById(`btn-del-ord-${o.id}`).addEventListener('click', async (e) => {
        e.stopPropagation();
        const isConfirmed = await showCustomConfirm(`Hapus pesanan saham ini?`, 'Hapus Pesanan Saham');
        if (isConfirmed) {
          db.deleteOrder(o.id);
          refreshAll();
        }
      });
    });

    // Add toggle event to header
    headerTr.addEventListener('click', () => {
      headerTr.classList.toggle('expanded');
      const expandedNow = headerTr.classList.contains('expanded');
      
      if (expandedNow) {
        window.expandedNomineeOrders.add(nomineeId);
      } else {
        window.expandedNomineeOrders.delete(nomineeId);
      }

      const rows = tbody.querySelectorAll(`.order-row-nominee-${nomineeId}`);
      rows.forEach(r => {
        r.style.display = expandedNow ? 'table-row' : 'none';
      });
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
    document.getElementById(`btn-del-tx-${t.id}`).addEventListener('click', async () => {
      const isConfirmed = await showCustomConfirm(`Hapus transaksi ini dari log?`, 'Hapus Transaksi Keuangan');
      if (isConfirmed) {
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
    document.getElementById(`btn-del-debt-${d.id}`).addEventListener('click', async () => {
      const isConfirmed = await showCustomConfirm(`Hapus data hutang kepada ${d.creditorName}?`, 'Hapus Data Hutang');
      if (isConfirmed) {
        db.deleteDebt(d.id);
        refreshAll();
      }
    });
  });
}

// ================= CUSTOM POPUPS & MODALS =================

function showCustomToast(message, type) {
  if (type === undefined) type = 'info';
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconHtml = '<i class="fa-solid fa-circle-info text-primary"></i>';
  if (type === 'success') {
    iconHtml = '<i class="fa-solid fa-circle-check" style="color: #10b981;"></i>';
  } else if (type === 'warning') {
    iconHtml = '<i class="fa-solid fa-triangle-exclamation" style="color: #f59e0b;"></i>';
  } else if (type === 'error') {
    iconHtml = '<i class="fa-solid fa-circle-xmark" style="color: #ef4444;"></i>';
  }

  toast.innerHTML = `
    <div class="toast-icon">${iconHtml}</div>
    <div class="toast-content">${message}</div>
    <button class="toast-close">&times;</button>
  `;

  // Close event listener
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.classList.add('toast-fade-out');
    setTimeout(() => toast.remove(), 300);
  });

  container.appendChild(toast);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add('toast-fade-out');
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
}

function showCustomAlert(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop active';
    overlay.style.zIndex = '999999';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.width = '100%';
    modal.style.maxWidth = '400px';
    modal.style.margin = '1rem';
    
    modal.innerHTML = `
      <div class="modal-header">
        <h2 style="display: flex; align-items: center; gap: 0.5rem; margin: 0; font-family: var(--font-title); font-size: 1.25rem;">
          <i class="fa-solid fa-circle-info text-info"></i> IPO Hub Info
        </h2>
      </div>
      <div class="modal-body" style="padding: 1.5rem; line-height: 1.5; font-size: 0.95rem; color: var(--text-primary);">
        <p>${message}</p>
      </div>
      <div class="modal-footer" style="padding: 1rem 1.5rem;">
        <button class="btn btn-primary" id="custom-alert-ok" style="min-width: 80px;">OK</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const closeAlert = () => {
      overlay.classList.remove('active');
      setTimeout(() => {
        overlay.remove();
        resolve();
      }, 250);
    };

    document.getElementById('custom-alert-ok').addEventListener('click', closeAlert);
  });
}

function showCustomConfirm(message, confirmTitle) {
  if (confirmTitle === undefined) confirmTitle = 'Konfirmasi Aksi';
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop active';
    overlay.style.zIndex = '999999';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.width = '100%';
    modal.style.maxWidth = '400px';
    modal.style.margin = '1rem';
    
    modal.innerHTML = `
      <div class="modal-header">
        <h2 style="display: flex; align-items: center; gap: 0.5rem; margin: 0; font-family: var(--font-title); font-size: 1.25rem;">
          <i class="fa-solid fa-circle-question text-warning"></i> ${confirmTitle}
        </h2>
      </div>
      <div class="modal-body" style="padding: 1.5rem; line-height: 1.5; font-size: 0.95rem; color: var(--text-primary);">
        <p>${message}</p>
      </div>
      <div class="modal-footer" style="padding: 1rem 1.5rem; gap: 0.75rem;">
        <button class="btn btn-secondary" id="custom-confirm-cancel" style="min-width: 80px;">Batal</button>
        <button class="btn btn-danger" id="custom-confirm-ok" style="min-width: 80px;">Lanjutkan</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const handleAction = (value) => {
      overlay.classList.remove('active');
      setTimeout(() => {
        overlay.remove();
        resolve(value);
      }, 250);
    };

    document.getElementById('custom-confirm-ok').addEventListener('click', () => handleAction(true));
    document.getElementById('custom-confirm-cancel').addEventListener('click', () => handleAction(false));
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        handleAction(false);
      }
    });
  });
}

// ----------------- GOOGLE DRIVE SYNC HANDLERS -----------------
let isSigningIn = false;
let syncPollInterval = null;

function startGoogleSyncPolling() {
  if (typeof googleSync === 'undefined') return;
  if (syncPollInterval) clearInterval(syncPollInterval);
  
  syncPollInterval = setInterval(async () => {
    // Only poll if connected and sync is enabled
    if (!googleSync.isConnected() || !googleSync.isSyncEnabled()) return;
    
    try {
      const status = await googleSync.getCloudStatus();
      if (status.cloudFile && status.cloudFile.modifiedTime) {
        const cloudModifiedTime = new Date(status.cloudFile.modifiedTime).getTime();
        
        // Retrieve last sync time
        const lastSyncTimeStr = localStorage.getItem('google_last_sync_time');
        const lastSyncTime = lastSyncTimeStr ? new Date(lastSyncTimeStr).getTime() : 0;
        
        // If cloud file is newer by at least 2 seconds (buffer for network delays)
        if (cloudModifiedTime > lastSyncTime + 2000) {
          console.log('Menemukan data awan baru di Google Drive. Memulai sinkronisasi otomatis ke lokal...');
          const data = await googleSync.downloadData();
          if (data && (data.nominees || data.stocks || data.orders)) {
            // Save to DB and refresh UI
            db.saveDB(data);
            refreshAll();
            
            // Save the exact modified time from cloud as our last sync time!
            localStorage.setItem('google_last_sync_time', status.cloudFile.modifiedTime);
            updateGoogleSyncUI();
            
            showCustomToast('Data portofolio diperbarui dari Cloud!', 'success');
          }
        }
      }
    } catch (e) {
      console.warn('Realtime polling background sync error:', e);
    }
  }, 12000); // Check every 12 seconds
}

function showDashboard() {
  const tempStyle = document.getElementById('temp-hide-app');
  if (tempStyle) tempStyle.remove();
  // Ensure chart adjusts to the newly shown container
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
  }, 50);
}

function bindLoginOverlayButtons() {
  const btnLoginGoogle = document.getElementById('btn-login-google');
  const btnLoginGuest = document.getElementById('btn-login-guest');
  const loginOverlay = document.getElementById('login-overlay');

  if (btnLoginGoogle && btnLoginGuest && loginOverlay) {
    btnLoginGuest.addEventListener('click', () => {
      localStorage.setItem('user_mode', 'guest');
      loginOverlay.classList.add('hidden');
      showDashboard(); // Reveal dashboard
      setTimeout(() => {
        loginOverlay.style.display = 'none';
      }, 400); // Wait for transition
    });

    btnLoginGoogle.addEventListener('click', () => {
      if (typeof googleSync === 'undefined') {
        showCustomAlert('Fitur sinkronisasi Google gagal dimuat. Harap periksa apakah berkas google-sync.js sudah diunggah.');
        return;
      }
      const id = googleSync.getClientId();
      if (!id) {
        showCustomAlert('Google Client ID tidak dikonfigurasi. Periksa berkas google-sync.js.');
        return;
      }
      isSigningIn = true; // Set flag to trigger cloud data download upon successful login
      googleSync.connect();
    });
  }
}

function setupGoogleSync() {
  // Bind login overlay buttons first (so Guest mode always works!)
  bindLoginOverlayButtons();

  if (typeof googleSync === 'undefined') {
    console.warn('googleSync module is not loaded. Google Drive Sync features are disabled.');
    return;
  }

  const btnSaveId = document.getElementById('btn-save-client-id');
  const inputClientId = document.getElementById('google-client-id');
  const btnConnect = document.getElementById('btn-google-connect');
  const btnDisconnect = document.getElementById('btn-google-disconnect');
  const btnUpload = document.getElementById('btn-google-upload');
  const btnDownload = document.getElementById('btn-google-download');
  const toggleAuto = document.getElementById('google-auto-sync-toggle');

  // Load saved client ID if elements exist
  if (inputClientId) {
    inputClientId.value = googleSync.getClientId();
  }

  // Bind status callback
  googleSync.registerStatusCallback(updateGoogleSyncUI);

  // Initialize GIS client and check session
  googleSync.init((status) => {
    console.log('Google Sync Initialized status:', status);
    updateGoogleSyncUI();
  });

  // Save Client ID handler (if UI exists)
  if (btnSaveId && inputClientId) {
    btnSaveId.addEventListener('click', () => {
      const id = inputClientId.value.trim();
      if (!id) {
        showCustomAlert('Silakan masukkan Client ID yang valid.');
        return;
      }
      googleSync.saveClientId(id);
      showCustomAlert('Google Client ID berhasil disimpan and diinisialisasi.');
    });
  }

  // Connect Google Account
  if (btnConnect) {
    btnConnect.addEventListener('click', () => {
      isSigningIn = true; // Set flag to trigger cloud data check/download
      googleSync.connect();
    });
  }

  // Disconnect Google Account
  if (btnDisconnect) {
    btnDisconnect.addEventListener('click', () => {
      localStorage.removeItem('user_mode');
      localStorage.removeItem('google_connected');
      if (syncPollInterval) {
        clearInterval(syncPollInterval);
        syncPollInterval = null;
      }
      googleSync.disconnect();
      
      const loginOverlay = document.getElementById('login-overlay');
      if (loginOverlay) {
        loginOverlay.style.display = 'flex';
        setTimeout(() => {
          loginOverlay.classList.remove('hidden');
        }, 50);
      }
    });
  }

  // Manual Upload
  if (btnUpload) {
    btnUpload.addEventListener('click', async () => {
      btnUpload.disabled = true;
      const originalHtml = btnUpload.innerHTML;
      btnUpload.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengunggah...';
      try {
        const dbData = db.getDB();
        await googleSync.uploadData(dbData);
        localStorage.setItem('google_last_sync_time', new Date().toISOString());
        updateGoogleSyncUI();
        showCustomAlert('Database berhasil diunggah ke Google Drive.');
      } catch (err) {
        console.error(err);
        showCustomAlert('Gagal mengunggah data: ' + err.message);
      } finally {
        btnUpload.disabled = false;
        btnUpload.innerHTML = originalHtml;
      }
    });
  }

  // Manual Download
  if (btnDownload) {
    btnDownload.addEventListener('click', async () => {
      const confirmText = 'Apakah Anda yakin ingin mengunduh data dari Cloud? Data lokal saat ini akan DITIMPA secara keseluruhan. Silakan lakukan ekspor backup manual terlebih dahulu jika perlu.';
      const confirm = await showCustomConfirm(confirmText, 'Konfirmasi Unduh Cloud');
      if (!confirm) return;

      btnDownload.disabled = true;
      const originalHtml = btnDownload.innerHTML;
      btnDownload.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengunduh...';
      try {
        const data = await googleSync.downloadData();
        if (data && (data.nominees || data.stocks || data.orders)) {
          // Save to DB and refresh UI
          db.saveDB(data);
          refreshAll();
          localStorage.setItem('google_last_sync_time', new Date().toISOString());
          updateGoogleSyncUI();
          showCustomAlert('Database berhasil diunduh dan dipulihkan dari Google Drive.');
        } else {
          throw new Error('Format berkas tidak valid atau kosong.');
        }
      } catch (err) {
        console.error(err);
        showCustomAlert('Gagal mengunduh data: ' + err.message);
      } finally {
        btnDownload.disabled = false;
        btnDownload.innerHTML = originalHtml;
      }
    });
  }

  // Toggle Auto Sync
  if (toggleAuto) {
    toggleAuto.checked = googleSync.isSyncEnabled();
    toggleAuto.addEventListener('change', (e) => {
      googleSync.setSyncEnabled(e.target.checked);
    });
  }

  // Start background sync polling check
  startGoogleSyncPolling();
}

async function updateGoogleSyncUI() {
  if (typeof googleSync === 'undefined') return;
  const disconnectState = document.getElementById('google-disconnected-state');
  const connectedState = document.getElementById('google-connected-state');
  const syncControls = document.getElementById('google-sync-controls');
  const userNameEl = document.getElementById('google-user-name');
  const userEmailEl = document.getElementById('google-user-email');
  const userPicEl = document.getElementById('google-user-pic');
  const lastSyncEl = document.getElementById('google-last-sync');
  const autoSyncToggle = document.getElementById('google-auto-sync-toggle');
  const loginOverlay = document.getElementById('login-overlay');

  if (!disconnectState) return;

  const connected = googleSync.isConnected();
  
  if (connected) {
    disconnectState.style.display = 'none';
    connectedState.style.display = 'flex';
    syncControls.style.display = 'block';

    const user = googleSync.getUserInfo();
    if (user) {
      userNameEl.textContent = user.name || 'Pengguna Google';
      userEmailEl.textContent = user.email || '';
      userPicEl.src = user.picture || 'https://lh3.googleusercontent.com/a/default-user=s48';
    }

    // Hide login overlay if visible
    if (loginOverlay && !loginOverlay.classList.contains('hidden')) {
      localStorage.setItem('user_mode', 'google'); // Set preference to google
      if (isSigningIn) {
        // Show loading state while checking Google Drive
        const loginBox = loginOverlay.querySelector('.login-box');
        const originalContent = loginBox.innerHTML;
        loginBox.innerHTML = `
          <div class="login-logo-container" style="margin-bottom: 2rem;">
            <div class="login-logo-icon">IP</div>
            <div class="login-logo-text">IPO HUB</div>
          </div>
          <div style="margin: 2.5rem 0; text-align: center;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 2.5rem; color: var(--primary); margin-bottom: 1rem;"></i>
            <p style="font-weight: 600; font-size: 1rem; color: #fff;">Memeriksa data di Google Drive...</p>
          </div>
        `;

        try {
          const status = await googleSync.getCloudStatus();
          if (status.cloudFile) {
            // Backup found, download and restore
            const data = await googleSync.downloadData();
            if (data && (data.nominees || data.stocks || data.orders)) {
              db.saveDB(data);
              refreshAll();
              localStorage.setItem('google_last_sync_time', new Date().toISOString());
              console.log('Restored cloud backup on login screen.');
            }
          } else {
            // No backup found, upload current local database as initial backup
            const currentDB = db.getDB();
            if (currentDB.nominees.length > 0 || currentDB.stocks.length > 0) {
              await googleSync.uploadData(currentDB);
              localStorage.setItem('google_last_sync_time', new Date().toISOString());
              console.log('Created initial cloud backup.');
            }
          }
        } catch (e) {
          console.warn('Initial cloud sync error:', e);
        } finally {
          loginOverlay.classList.add('hidden');
          showDashboard(); // Reveal dashboard
          isSigningIn = false;
          setTimeout(() => {
            loginOverlay.style.display = 'none'; // Hide completely
            loginBox.innerHTML = originalContent;
            bindLoginOverlayButtons();
          }, 500);
        }
      } else {
        // Just hide the overlay instantly if already logged in on startup
        loginOverlay.classList.add('hidden');
        loginOverlay.style.display = 'none'; // Hide completely
        showDashboard(); // Reveal dashboard
      }
    }
  } else {
    disconnectState.style.display = 'none'; // Hide disconnect details
    connectedState.style.display = 'none';
    syncControls.style.display = 'none';

    // Show login overlay if not connected AND not guest
    const userMode = localStorage.getItem('user_mode');
    if (userMode !== 'guest') {
      if (loginOverlay && loginOverlay.classList.contains('hidden')) {
        loginOverlay.style.display = 'flex';
        setTimeout(() => {
          loginOverlay.classList.remove('hidden');
        }, 50);
      }
    } else {
      // If guest mode is active, make sure overlay is hidden
      if (loginOverlay) {
        loginOverlay.classList.add('hidden');
        loginOverlay.style.display = 'none';
      }
    }
  }

  // Last Sync display formatting
  const lastSyncTime = localStorage.getItem('google_last_sync_time');
  if (lastSyncTime) {
    const date = new Date(lastSyncTime);
    lastSyncEl.textContent = date.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } else {
    lastSyncEl.textContent = 'Belum pernah';
  }

  // Update auto sync checkbox
  if (autoSyncToggle) {
    autoSyncToggle.checked = googleSync.isSyncEnabled();
  }
}

