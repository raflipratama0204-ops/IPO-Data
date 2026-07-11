// js/ui-render.js

// ----------------- RENDERING SYSTEM -----------------

// DASHBOARD RENDER
function renderDashboard() {
  const stats = db.getDashboardStats();
  const lang = localStorage.getItem('app_lang') || 'id';
  const dict = UI_TRANSLATIONS[lang] || UI_TRANSLATIONS.id;
  
  document.getElementById('kpi-total-transferred').textContent = formatRupiah(stats.totalTransferred);
  document.getElementById('kpi-total-returned-sub').textContent = `${dict.kpiReturnedSub}: ${formatRupiah(stats.totalReturned)}`;
  
  document.getElementById('kpi-total-profit').textContent = formatRupiah(stats.totalNetProfit);
  const roi = stats.totalTransferred > 0 ? (stats.totalNetProfit / stats.totalTransferred) * 100 : 0;
  document.getElementById('kpi-profit-pct').textContent = `${dict.kpiProfitShare}: ${formatRupiah(stats.totalProfitShare)} | ROI: ${roi.toFixed(1)}%`;
  
  document.getElementById('kpi-total-outstanding').textContent = formatRupiah(stats.totalOutstanding);
  document.getElementById('kpi-cash-vs-stock').textContent = `${dict.kpiLiquidCash}: ${formatRupiah(stats.totalLiquidCash)} | ${dict.kpiActiveUnsold}: ${formatRupiah(stats.totalActiveUnsold)}`;
  
  // Populate Debt KPI
  document.getElementById('kpi-total-debt-remaining').textContent = formatRupiah(stats.totalDebtRemaining);
  document.getElementById('kpi-debt-details').textContent = `${dict.kpiDebtLoan}: ${formatRupiah(stats.totalDebtAmount)} | ${dict.kpiDebtPaid}: ${formatRupiah(stats.totalDebtPaid)}`;

  document.getElementById('kpi-counts').textContent = `${stats.nomineeCount} ${dict.lblAccounts}`;
  document.getElementById('kpi-counts-sub').textContent = `${stats.stockCount} ${dict.lblStocks} | ${stats.orderCount} ${dict.lblTotalOrders}`;

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
            Cash: ${formatRupiah(nomineeStats.liquidCashBalance)} | ${dict.kpiActiveUnsold}: ${formatRupiah(nomineeStats.activeUnsoldCost)}
          </div>
        </td>
        <td class="text-right text-outstanding">${formatRupiah(nomineeStats.outstandingBalance)}</td>
      `;
      listDashboardNominees.appendChild(tr);
    }
  });

  if (!hasBillings) {
    listDashboardNominees.innerHTML = `<tr><td colspan="2" class="text-center text-muted">${dict.allBillingsPaid}</td></tr>`;
  }

  const listDashboardTransfers = document.getElementById('list-dashboard-transfers');
  listDashboardTransfers.innerHTML = '';
  const transfers = db.getTransfers();
  const recentTransfers = [...transfers]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  if (recentTransfers.length === 0) {
    listDashboardTransfers.innerHTML = `<tr><td colspan="5" class="text-center text-muted">${dict.noTransactions}</td></tr>`;
  } else {
    recentTransfers.forEach(t => {
      const nominee = nominees.find(n => n.id === t.nomineeId);
      const name = nominee ? nominee.name : 'Unknown';
      const typeText = t.type === 'transfer' 
        ? `<span class="badge badge-primary">${dict.typeTransfer}</span>`
        : `<span class="badge badge-success">${dict.typeReturn}</span>`;
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
  
  const lang = localStorage.getItem('app_lang') || 'id';
  const dict = UI_TRANSLATIONS[lang] || UI_TRANSLATIONS.id;
  
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
    stockLabels.push(dict.noData);
    stockData.push(0);
    barColors.push('rgba(255, 255, 255, 0.1)');
  }

  profitChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: stockLabels,
      datasets: [{
        label: dict.realizedProfitTitle,
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
              return `${dict.realizedProfitLabel}: ${formatRupiah(context.raw)}`;
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
  
  const lang = localStorage.getItem('app_lang') || 'id';
  const dict = UI_TRANSLATIONS[lang] || UI_TRANSLATIONS.id;
  
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
        <h3>${dict.noNominees || 'Belum ada Akun Nominee'}</h3>
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
    
    const bankDetails = stats.bankName 
      ? `${stats.bankName} - ${stats.bankAccount}` 
      : (lang === 'id' ? 'Rincian Bank Belum Ada' : 'No Bank Details');
      
    card.innerHTML = `
      <div class="nominee-card-header">
        <div class="nominee-card-title">
          <h3>${stats.name}</h3>
          <span>${bankDetails}</span>
        </div>
        <button class="btn btn-secondary btn-sm" id="btn-view-${stats.id}" title="${dict.detailOrder || 'Detail'}">
          <i class="fa-solid fa-eye"></i> ${dict.detailOrder || 'Detail'}
        </button>
      </div>
      
      <div class="nominee-stats-list">
        <div class="nominee-stat-item">
          <span class="nominee-stat-label">${dict.lblTotalDeposited || 'Total Ditransfer'}:</span>
          <span class="nominee-stat-val">${formatRupiah(stats.totalTransferred)}</span>
        </div>
        <div class="nominee-stat-item">
          <span class="nominee-stat-label">${dict.lblTotalReturned || 'Sudah Dikembalikan'}:</span>
          <span class="nominee-stat-val text-profit">${formatRupiah(stats.totalReturned)}</span>
        </div>
        <div class="nominee-stat-item" style="border-top: 1px dashed var(--glass-border); padding-top: 0.4rem;">
          <span class="nominee-stat-label">${dict.lblCashInRdn || 'Cash Menganggur (RDN)'}:</span>
          <span class="nominee-stat-val" style="color: var(--primary);">${formatRupiah(stats.liquidCashBalance)}</span>
        </div>
        <div class="nominee-stat-item">
          <span class="nominee-stat-label">${dict.lblActiveStocks || 'Modal di Saham Aktif'}:</span>
          <span class="nominee-stat-val" style="color: var(--secondary);">${formatRupiah(stats.activeUnsoldCost)}</span>
        </div>
        <div class="nominee-stat-item">
          <span class="nominee-stat-label">${lang === 'id' ? 'Keuntungan Saham (Gross)' : 'Gross Stock Profit'}:</span>
          <span class="nominee-stat-val text-profit">${formatRupiah(stats.totalProfit)}</span>
        </div>
        <div class="nominee-stat-item">
          <span class="nominee-stat-label">${dict.lblNomineeProfitShare || 'Bagi Hasil Nominee'} (${stats.profitSharePct}%):</span>
          <span class="nominee-stat-val text-loss">${formatRupiah(stats.profitShareAmount)}</span>
        </div>
        <div class="nominee-stat-item">
          <span class="nominee-stat-label">${lang === 'id' ? 'Keuntungan Bersih Saya' : 'My Net Profit'}:</span>
          <span class="nominee-stat-val text-profit">${formatRupiah(stats.userNetProfit)}</span>
        </div>
        <div class="nominee-stat-item" style="border-top: 1px solid var(--glass-border); padding-top: 0.5rem; font-size: 0.95rem;">
          <span class="nominee-stat-label" style="font-weight: 700;">${dict.lblRemainingBilling || 'Sisa Tagihan'}:</span>
          <span class="nominee-stat-val ${stats.outstandingBalance > 0 ? 'text-outstanding' : stats.outstandingBalance < 0 ? 'text-loss' : ''}" style="font-weight: 700;">
            ${formatRupiah(stats.outstandingBalance)}
          </span>
        </div>
      </div>
      
      <div class="nominee-card-actions">
        <button class="btn btn-secondary btn-sm" id="btn-edit-nom-${stats.id}"><i class="fa-solid fa-pen"></i> ${dict.edit || 'Edit'}</button>
        <button class="btn btn-danger btn-sm" id="btn-del-nom-${stats.id}"><i class="fa-solid fa-trash"></i> ${dict.delete || 'Hapus'}</button>
      </div>
    `;
    
    grid.appendChild(card);
    
    document.getElementById(`btn-view-${stats.id}`).addEventListener('click', () => openNomineeDetailModal(stats.id));
    document.getElementById(`btn-edit-nom-${stats.id}`).addEventListener('click', () => openNomineeModal(n));
    document.getElementById(`btn-del-nom-${stats.id}`).addEventListener('click', async () => {
      const isConfirmed = await showCustomConfirm(lang === 'id' ? `Hapus akun ${stats.name}? Semua pesanan dan log transaksi untuk akun ini akan dihapus permanen!` : `Delete account ${stats.name}? All orders and financial transaction logs for this account will be permanently deleted!`, lang === 'id' ? 'Hapus Akun Nominee' : 'Delete Nominee Account');
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
  
  const lang = localStorage.getItem('app_lang') || 'id';
  const dict = UI_TRANSLATIONS[lang] || UI_TRANSLATIONS.id;
  
  const searchVal = document.getElementById('search-stock').value.toLowerCase();
  const filterStatus = document.getElementById('filter-stock-status').value;
  const stocks = db.getStocks();
  
  // Populate underwriter filter options dynamically
  const underwriterSelect = document.getElementById('filter-stock-underwriter');
  const selectedUnderwriter = underwriterSelect ? underwriterSelect.value : 'all';
  
  if (underwriterSelect) {
    const underwriters = [...new Set(stocks.map(s => s.underwriter).filter(Boolean))].sort();
    underwriterSelect.innerHTML = `<option value="all" data-i18n="optAllUnderwriters">${dict.optAllUnderwriters || 'Semua Underwriter'}</option>`;
    underwriters.forEach(uw => {
      const opt = document.createElement('option');
      opt.value = uw;
      opt.textContent = uw;
      underwriterSelect.appendChild(opt);
    });
    
    // Restore selected value if valid
    if (underwriters.includes(selectedUnderwriter)) {
      underwriterSelect.value = selectedUnderwriter;
    } else {
      underwriterSelect.value = 'all';
    }
  }
  
  const activeUnderwriter = underwriterSelect ? underwriterSelect.value : 'all';
  
  const filteredStocks = stocks.filter(s => {
    const matchesSearch = s.code.toLowerCase().includes(searchVal) || s.name.toLowerCase().includes(searchVal);
    const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
    const matchesUnderwriter = activeUnderwriter === 'all' || s.underwriter === activeUnderwriter;
    return matchesSearch && matchesStatus && matchesUnderwriter;
  });

  if (filteredStocks.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">${dict.noStocks || 'Belum ada data saham IPO.'}</td></tr>`;
    return;
  }

  const badgeMap = {
    active: `<span class="badge badge-primary">${dict.statusBookbuilding || 'Offering'}</span>`,
    allotted: `<span class="badge badge-warning">${dict.statusAllotted || 'Allotted'}</span>`,
    listed: `<span class="badge badge-info">${dict.statusListed || 'Listed'}</span>`,
    closed: `<span class="badge badge-success">${dict.statusClosed || 'Closed'}</span>`
  };

  filteredStocks.forEach(s => {
    const stats = db.getStockStats(s.id);
    const profitClass = stats.totalProfit > 0 ? 'text-profit' : stats.totalProfit < 0 ? 'text-loss' : '';
    
    // Format underwriter info below stock name
    const underwriterHtml = s.underwriter 
      ? `<span class="stock-underwriter"><i class="fa-solid fa-building-shield"></i> ${s.underwriter}</span>` 
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
      <td>
        <div class="stock-name-container">
          <span class="stock-title"><strong>${s.name}</strong></span>
          ${underwriterHtml}
        </div>
      </td>
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
      const isConfirmed = await showCustomConfirm(lang === 'id' ? `Hapus saham ${s.code}? Semua pesanan untuk saham ini akan ikut terhapus!` : `Delete stock ${s.code}? All orders for this stock will also be deleted!`, lang === 'id' ? 'Hapus Saham IPO' : 'Delete IPO Stock');
      if (isConfirmed) {
        db.deleteStock(s.id);
        refreshAll();
      }
    });
  });
}

// TEMPLATE & PORTFOLIO ORDERS RENDER
function renderOrders() {
  const tbody = document.getElementById('list-orders');
  tbody.innerHTML = '';
  
  const lang = localStorage.getItem('app_lang') || 'id';
  const dict = UI_TRANSLATIONS[lang] || UI_TRANSLATIONS.id;
  
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
    tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted">${dict.noOrders || 'Tidak ada pesanan ditemukan.'}</td></tr>`;
    return;
  }

  if (!window.expandedNomineeOrders) {
    window.expandedNomineeOrders = new Set();
  }

  const groupedOrders = {};
  filteredOrders.forEach(o => {
    if (!groupedOrders[o.nomineeId]) {
      groupedOrders[o.nomineeId] = [];
    }
    groupedOrders[o.nomineeId].push(o);
  });

  Object.keys(groupedOrders).forEach(nomineeId => {
    const nominee = nominees.find(n => n.id === nomineeId);
    if (!nominee) return;

    const nomineeOrders = groupedOrders[nomineeId];
    
    let totalOrderedVal = 0;
    let totalAllottedVal = 0;
    nomineeOrders.forEach(o => {
      const stock = stocks.find(s => s.id === o.stockId);
      if (!stock) return;
      totalOrderedVal += o.lotOrdered * 100 * stock.ipoPrice;
      totalAllottedVal += o.lotAllotted * 100 * stock.ipoPrice;
    });

    const isExpanded = window.expandedNomineeOrders.has(nomineeId);

    const headerTr = document.createElement('tr');
    headerTr.className = `nominee-group-header ${isExpanded ? 'expanded' : ''}`;
    headerTr.setAttribute('data-nominee-id', nomineeId);
    headerTr.innerHTML = `
      <td colspan="10">
        <div class="nominee-group-content">
          <div class="nominee-group-title">
            <i class="fa-solid fa-chevron-right toggle-icon"></i>
            <strong>${nominee.name}</strong>
            <span class="nominee-group-badge">${nomineeOrders.length} ${lang === 'id' ? 'Pesanan' : 'Orders'}</span>
          </div>
          <div class="nominee-group-summary">
            ${lang === 'id' ? 'Total Dipesan' : 'Total Ordered'}: <strong>${formatRupiah(totalOrderedVal)}</strong>
            ${totalAllottedVal > 0 ? ` | ${lang === 'id' ? 'Total Penjatahan' : 'Total Allotted'}: <strong style="color: var(--primary);">${formatRupiah(totalAllottedVal)}</strong>` : ''}
          </div>
        </div>
      </td>
    `;
    tbody.appendChild(headerTr);

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
        badgeHTML = `<span class="badge badge-primary">${dict.ordered || 'Ordered'}</span>`;
        actionButtons = `
          <button class="btn btn-secondary btn-sm" id="btn-allot-ord-${o.id}" title="${dict.tooltipInputAllotment || 'Input Penjatahan'}"><i class="fa-solid fa-percent"></i></button>
        `;
      } else if (o.status === 'allotted') {
        badgeHTML = `<span class="badge badge-warning">${dict.allotted || 'Allotted'}</span>`;
        actionButtons = `
          <button class="btn btn-primary btn-sm" id="btn-sell-ord-${o.id}" title="${dict.tooltipInputSale || 'Input Hasil Jual'}"><i class="fa-solid fa-dollar-sign"></i></button>
          <button class="btn btn-secondary btn-sm" id="btn-allot-ord-${o.id}" title="${dict.tooltipEditAllotment || 'Edit Penjatahan'}"><i class="fa-solid fa-percent"></i></button>
          <button class="btn btn-secondary btn-sm" id="btn-return-ord-${o.id}" title="${dict.tooltipManageRefund || 'Kelola Pengembalian Uang'}"><i class="fa-solid fa-wallet"></i></button>
        `;
      } else if (o.status === 'not_allotted') {
        badgeHTML = `<span class="badge badge-danger">${dict.notAllotted || 'Not Allotted'}</span>`;
        actionButtons = `
          <button class="btn btn-secondary btn-sm" id="btn-allot-ord-${o.id}" title="${dict.tooltipEditAllotment || 'Edit Penjatahan'}"><i class="fa-solid fa-percent"></i></button>
          <button class="btn btn-secondary btn-sm" id="btn-return-ord-${o.id}" title="${dict.tooltipManageRefund || 'Kelola Pengembalian Uang'}"><i class="fa-solid fa-wallet"></i></button>
        `;
      } else if (o.status === 'sold') {
        badgeHTML = `<span class="badge badge-success">${dict.sold || 'Sold'}</span>`;
        const brokerFee = o.sellBrokerFee || 0;
        const exchangeFee = o.sellExchangeFee || 0;
        profit = (o.lotAllotted * 100 * o.sellPrice) - allottedCost - brokerFee - exchangeFee;
        actionButtons = `
          <button class="btn btn-secondary btn-sm" id="btn-sell-ord-${o.id}" title="${dict.tooltipEditSale || 'Edit Penjualan'}"><i class="fa-solid fa-dollar-sign"></i></button>
          <button class="btn btn-danger btn-sm" id="btn-unsell-ord-${o.id}" title="${dict.tooltipCancelSale || 'Batal Jual'}"><i class="fa-solid fa-rotate-left"></i></button>
          <button class="btn btn-secondary btn-sm" id="btn-return-ord-${o.id}" title="${dict.tooltipManageRefund || 'Kelola Pengembalian Uang'}"><i class="fa-solid fa-wallet"></i></button>
        `;
      }

      const orderTr = document.createElement('tr');
      orderTr.className = `nominee-order-row order-row-nominee-${nomineeId}`;
      if (!isExpanded) {
        orderTr.classList.add('hidden-row');
      }
      
      const netSellValue = o.status === 'sold' ? ((o.lotAllotted * 100 * o.sellPrice) - (o.sellBrokerFee || 0) - (o.sellExchangeFee || 0)) : 0;
      
      orderTr.innerHTML = `
        <td style="padding-left: 1.5rem; color: var(--text-secondary); font-size: 0.85rem;">
          <i class="fa-solid fa-caret-right" style="margin-right: 0.5rem; color: var(--primary);"></i> ${dict.detailOrder || 'Detail Pesanan'}
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
                <span class="badge badge-success" style="font-size: 0.65rem; padding: 0.15rem 0.3rem;"><i class="fa-solid fa-circle-check"></i> ${dict.refundPaid || 'Refund Lunas'}</span>
              ` : `
                <span class="badge badge-warning" style="font-size: 0.65rem; padding: 0.15rem 0.3rem;" title="${lang === 'id' ? 'Sudah dikembalikan' : 'Returned'}: ${formatRupiah(o.refundReturned || 0)}">
                  ${dict.remainingRefund || 'Sisa'}: ${formatRupiah(refund - (o.refundReturned || 0))}
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
                <span class="badge badge-success" style="font-size: 0.65rem; padding: 0.15rem 0.3rem;"><i class="fa-solid fa-circle-check"></i> ${dict.salesPaid || 'Hasil Lunas'}</span>
              ` : `
                <span class="badge badge-warning" style="font-size: 0.65rem; padding: 0.15rem 0.3rem;" title="${lang === 'id' ? 'Sudah dikembalikan' : 'Returned'}: ${formatRupiah(o.sellReturned || 0)}">
                  ${dict.remainingSales || 'Sisa Jual'}: ${formatRupiah(netSellValue - (o.sellReturned || 0))}
                </span>
              `}
            ` : ''}
          ` : '-'}
        </td>
        <td>${badgeHTML}</td>
        <td>
          <div style="display: flex; gap: 0.25rem;">
            ${actionButtons}
            <button class="btn btn-secondary btn-sm" id="btn-edit-ord-${o.id}" title="${dict.tooltipEditOrder || 'Edit Pesanan'}"><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn-danger btn-sm" id="btn-del-ord-${o.id}" title="${dict.tooltipDeleteOrder || 'Hapus Pesanan'}"><i class="fa-solid fa-trash"></i></button>
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
          const isConfirmed = await showCustomConfirm(lang === 'id' ? 'Batalkan penjualan saham ini? Status pesanan akan dikembalikan ke Penjatahan (Allotted) dan harga jual di-reset.' : 'Cancel sale of this stock? The order status will revert to Allotted and selling price will be reset.', lang === 'id' ? 'Batalkan Penjualan' : 'Cancel Sale');
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
        const isConfirmed = await showCustomConfirm(lang === 'id' ? 'Hapus pesanan saham ini?' : 'Delete this stock order?', lang === 'id' ? 'Hapus Pesanan Saham' : 'Delete Stock Order');
        if (isConfirmed) {
          db.deleteOrder(o.id);
          refreshAll();
        }
      });
    });

    headerTr.addEventListener('click', () => {
      headerTr.classList.toggle('expanded');
      const expandedNow = headerTr.classList.contains('expanded');
      
      if (expandedNow) {
        window.expandedNomineeOrders.add(nomineeId);
      } else {
        window.expandedNomineeOrders.delete(nomineeId);
      }

      const rows = tbody.querySelectorAll(`.order-row-nominee-${nomineeId}`);
      if (expandedNow) {
        // Tampilkan baris dengan efek staggered fade-in
        rows.forEach((r, idx) => {
          r.classList.remove('hidden-row');
          r.style.opacity = '0';
          r.style.transform = 'translateY(-6px)';
          setTimeout(() => {
            r.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
            r.style.opacity = '1';
            r.style.transform = 'translateY(0)';
          }, idx * 40);
        });
      } else {
        // Sembunyikan baris dengan efek fade-out
        rows.forEach((r, idx) => {
          r.style.transition = 'opacity 0.18s ease, transform 0.18s ease';
          r.style.opacity = '0';
          r.style.transform = 'translateY(-4px)';
          setTimeout(() => {
            r.classList.add('hidden-row');
            r.style.opacity = '';
            r.style.transform = '';
            r.style.transition = '';
          }, 180 + idx * 20);
        });
      }
    });
  });
}

// TRANSACTIONS TAB RENDER
function renderTransactions() {
  const tbody = document.getElementById('list-transactions');
  tbody.innerHTML = '';
  
  const lang = localStorage.getItem('app_lang') || 'id';
  const dict = UI_TRANSLATIONS[lang] || UI_TRANSLATIONS.id;
  
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
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">${dict.noTransactionsFound || 'Tidak ada log transaksi ditemukan.'}</td></tr>`;
    return;
  }

  filteredTransfers.forEach(t => {
    const nominee = nominees.find(n => n.id === t.nomineeId);
    const name = nominee ? nominee.name : (lang === 'id' ? 'Akun Tidak Dikenal' : 'Unknown Account');
    
    const typeBadge = t.type === 'transfer'
      ? `<span class="badge badge-primary">${dict.typeTransfer || 'Transfer (Modal)'}</span>`
      : `<span class="badge badge-success">${dict.typeReturn || 'Return (Sisa/Hasil)'}</span>`;
      
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
      const isConfirmed = await showCustomConfirm(
        lang === 'id' ? `Hapus transaksi ini dari log?` : `Delete this transaction from log?`,
        lang === 'id' ? 'Hapus Transaksi Keuangan' : 'Delete Financial Transaction'
      );
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
  
  const lang = localStorage.getItem('app_lang') || 'id';
  const dict = UI_TRANSLATIONS[lang] || UI_TRANSLATIONS.id;
  
  const searchVal = document.getElementById('search-debt').value.toLowerCase();
  const debts = db.getDebts();
  
  const filteredDebts = debts.filter(d => {
    return d.creditorName.toLowerCase().includes(searchVal) || 
           d.notes.toLowerCase().includes(searchVal);
  });

  if (filteredDebts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">${dict.noDebts || 'Tidak ada data hutang ditemukan.'}</td></tr>`;
    return;
  }

  filteredDebts.sort((a, b) => new Date(b.date) - new Date(a.date));

  filteredDebts.forEach(d => {
    const remaining = d.amount - d.paidAmount;
    const statusBadge = remaining <= 0 
      ? `<span class="badge badge-success">${dict.badgePaid || 'Lunas'}</span>` 
      : `<span class="badge badge-danger">${dict.badgeUnpaid || 'Belum Lunas'}</span>`;
      
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
      const isConfirmed = await showCustomConfirm(
        lang === 'id' ? `Hapus data hutang kepada ${d.creditorName}?` : `Delete loan from ${d.creditorName}?`,
        lang === 'id' ? 'Hapus Data Hutang' : 'Delete Loan Record'
      );
      if (isConfirmed) {
        db.deleteDebt(d.id);
        refreshAll();
      }
    });
  });
}
