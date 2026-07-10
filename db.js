// js/db.js

(function(global) {
  const DB_KEY = 'ipo_account_db';

  const defaultDB = {
    nominees: [],
    stocks: [],
    orders: [],
    transfers: [],
    debts: []
  };

  let memoryStorage = null;

  // Initialize database
  function initDB() {
    try {
      if (!localStorage.getItem(DB_KEY)) {
        localStorage.setItem(DB_KEY, JSON.stringify(defaultDB));
      }
    } catch (e) {
      console.warn('localStorage is not available, falling back to memoryStorage.', e);
      if (!memoryStorage) {
        memoryStorage = JSON.stringify(defaultDB);
      }
    }
  }

  // Get the entire database object
  function getDB() {
    initDB();
    try {
      const db = JSON.parse(localStorage.getItem(DB_KEY)) || defaultDB;
      if (!db.debts) db.debts = [];
      return db;
    } catch (e) {
      console.error('Error parsing localStorage, falling back to memoryStorage', e);
      try {
        const db = JSON.parse(memoryStorage) || defaultDB;
        if (!db.debts) db.debts = [];
        return db;
      } catch (err) {
        return defaultDB;
      }
    }
  }

  // Save database
  function saveDB(data) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save to localStorage, saving to memoryStorage instead.', e);
      memoryStorage = JSON.stringify(data);
    }
  }

  function parseCurrency(val) {
    if (val === undefined || val === null) return 0;
    const cleanStr = String(val).replace(/\D/g, '');
    return parseFloat(cleanStr) || 0;
  }

  // Generate unique ID
  function generateUUID() {
    return 'uuid-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
  }

  // ================= NOMINEES CRUD =================
  function getNominees() {
    return getDB().nominees || [];
  }

  function addNominee(nominee) {
    const db = getDB();
    const newNominee = {
      id: generateUUID(),
      name: nominee.name,
      phone: nominee.phone || '',
      bankName: nominee.bankName || '',
      bankAccount: nominee.bankAccount || '',
      profitSharePct: nominee.profitSharePct !== undefined ? parseFloat(nominee.profitSharePct) : 0,
      notes: nominee.notes || '',
      createdAt: new Date().toISOString()
    };
    db.nominees.push(newNominee);
    saveDB(db);
    return newNominee;
  }

  function updateNominee(id, updatedData) {
    const db = getDB();
    const index = db.nominees.findIndex(n => n.id === id);
    if (index !== -1) {
      if (updatedData.profitSharePct !== undefined) updatedData.profitSharePct = parseFloat(updatedData.profitSharePct);
      db.nominees[index] = { ...db.nominees[index], ...updatedData };
      saveDB(db);
      return db.nominees[index];
    }
    return null;
  }

  function deleteNominee(id) {
    const db = getDB();
    db.nominees = db.nominees.filter(n => n.id !== id);
    db.orders = db.orders.filter(o => o.nomineeId !== id);
    db.transfers = db.transfers.filter(t => t.nomineeId !== id);
    saveDB(db);
  }

  // ================= STOCKS CRUD =================
  function getStocks() {
    return getDB().stocks || [];
  }

  function addStock(stock) {
    const db = getDB();
    const newStock = {
      id: generateUUID(),
      code: stock.code.toUpperCase(),
      name: stock.name,
      ipoPrice: parseCurrency(stock.ipoPrice),
      offeringDate: stock.offeringDate || '',
      listingDate: stock.listingDate || '',
      status: stock.status || 'active',
      createdAt: new Date().toISOString()
    };
    db.stocks.push(newStock);
    saveDB(db);
    return newStock;
  }

  function updateStock(id, updatedData) {
    const db = getDB();
    const index = db.stocks.findIndex(s => s.id === id);
    if (index !== -1) {
      if (updatedData.ipoPrice !== undefined) updatedData.ipoPrice = parseCurrency(updatedData.ipoPrice);
      db.stocks[index] = { ...db.stocks[index], ...updatedData };
      saveDB(db);
      return db.stocks[index];
    }
    return null;
  }

  function deleteStock(id) {
    const db = getDB();
    db.stocks = db.stocks.filter(s => s.id !== id);
    db.orders = db.orders.filter(o => o.stockId !== id);
    saveDB(db);
  }

  // ================= ORDERS CRUD =================
  function getOrders() {
    const orders = getDB().orders || [];
    let changed = false;
    orders.forEach(o => {
      if (o.status === 'allotted' && o.lotAllotted === 0) {
        o.status = 'not_allotted';
        changed = true;
      }
    });
    if (changed) {
      const db = getDB();
      db.orders = orders;
      saveDB(db);
    }
    return orders;
  }

  function addOrder(order) {
    const db = getDB();
    const newOrder = {
      id: generateUUID(),
      nomineeId: order.nomineeId,
      stockId: order.stockId,
      lotOrdered: parseInt(order.lotOrdered),
      lotAllotted: order.lotAllotted !== undefined ? parseInt(order.lotAllotted) : 0,
      sellPrice: order.sellPrice !== undefined ? parseCurrency(order.sellPrice) : 0,
      sellBrokerFee: order.sellBrokerFee !== undefined ? parseFloat(order.sellBrokerFee) : 0,
      sellBrokerFeeType: order.sellBrokerFeeType || 'percent',
      sellBrokerFeeValue: order.sellBrokerFeeValue !== undefined ? parseFloat(order.sellBrokerFeeValue) : 0,
      sellExchangeFee: order.sellExchangeFee !== undefined ? parseFloat(order.sellExchangeFee) : 0,
      sellExchangeFeeType: order.sellExchangeFeeType || 'percent',
      sellExchangeFeeValue: order.sellExchangeFeeValue !== undefined ? parseFloat(order.sellExchangeFeeValue) : 0,
      refundReturned: order.refundReturned !== undefined ? parseCurrency(order.refundReturned) : 0,
      sellReturned: order.sellReturned !== undefined ? parseCurrency(order.sellReturned) : 0,
      status: order.status || 'ordered',
      createdAt: new Date().toISOString()
    };
    db.orders.push(newOrder);
    saveDB(db);
    return newOrder;
  }

  function updateOrder(id, updatedData) {
    const db = getDB();
    const index = db.orders.findIndex(o => o.id === id);
    if (index !== -1) {
      if (updatedData.lotAllotted !== undefined) updatedData.lotAllotted = parseInt(updatedData.lotAllotted);
      if (updatedData.lotOrdered !== undefined) updatedData.lotOrdered = parseInt(updatedData.lotOrdered);
      if (updatedData.sellPrice !== undefined) updatedData.sellPrice = parseCurrency(updatedData.sellPrice);
      if (updatedData.sellBrokerFee !== undefined) updatedData.sellBrokerFee = parseFloat(updatedData.sellBrokerFee);
      if (updatedData.sellBrokerFeeValue !== undefined) updatedData.sellBrokerFeeValue = parseFloat(updatedData.sellBrokerFeeValue);
      if (updatedData.sellExchangeFee !== undefined) updatedData.sellExchangeFee = parseFloat(updatedData.sellExchangeFee);
      if (updatedData.sellExchangeFeeValue !== undefined) updatedData.sellExchangeFeeValue = parseFloat(updatedData.sellExchangeFeeValue);
      if (updatedData.refundReturned !== undefined) updatedData.refundReturned = parseCurrency(updatedData.refundReturned);
      if (updatedData.sellReturned !== undefined) updatedData.sellReturned = parseCurrency(updatedData.sellReturned);
      
      db.orders[index] = { ...db.orders[index], ...updatedData };
      saveDB(db);
      return db.orders[index];
    }
    return null;
  }

  function deleteOrder(id) {
    const db = getDB();
    db.orders = db.orders.filter(o => o.id !== id);
    saveDB(db);
  }

  // ================= TRANSFERS CRUD =================
  function getTransfers() {
    return getDB().transfers || [];
  }

  function addTransfer(transfer) {
    const db = getDB();
    const newTransfer = {
      id: generateUUID(),
      nomineeId: transfer.nomineeId,
      type: transfer.type,
      amount: parseCurrency(transfer.amount),
      date: transfer.date || new Date().toISOString().split('T')[0],
      notes: transfer.notes || '',
      createdAt: new Date().toISOString()
    };
    db.transfers.push(newTransfer);
    saveDB(db);
    return newTransfer;
  }

  function updateTransfer(id, updatedData) {
    const db = getDB();
    const index = db.transfers.findIndex(t => t.id === id);
    if (index !== -1) {
      if (updatedData.amount !== undefined) updatedData.amount = parseCurrency(updatedData.amount);
      db.transfers[index] = { ...db.transfers[index], ...updatedData };
      saveDB(db);
      return db.transfers[index];
    }
    return null;
  }

  function deleteTransfer(id) {
    const db = getDB();
    db.transfers = db.transfers.filter(t => t.id !== id);
    saveDB(db);
  }

  // ================= DEBTS CRUD =================
  function getDebts() {
    return getDB().debts || [];
  }

  function addDebt(debt) {
    const db = getDB();
    const newDebt = {
      id: generateUUID(),
      creditorName: debt.creditorName,
      amount: parseCurrency(debt.amount),
      paidAmount: debt.paidAmount !== undefined ? parseCurrency(debt.paidAmount) : 0,
      date: debt.date || new Date().toISOString().split('T')[0],
      notes: debt.notes || '',
      createdAt: new Date().toISOString()
    };
    db.debts.push(newDebt);
    saveDB(db);
    return newDebt;
  }

  function updateDebt(id, updatedData) {
    const db = getDB();
    const index = db.debts.findIndex(d => d.id === id);
    if (index !== -1) {
      if (updatedData.amount !== undefined) updatedData.amount = parseCurrency(updatedData.amount);
      if (updatedData.paidAmount !== undefined) updatedData.paidAmount = parseCurrency(updatedData.paidAmount);
      db.debts[index] = { ...db.debts[index], ...updatedData };
      saveDB(db);
      return db.debts[index];
    }
    return null;
  }

  function deleteDebt(id) {
    const db = getDB();
    db.debts = db.debts.filter(d => d.id !== id);
    saveDB(db);
  }

  // ================= FINANCIAL COMPUTATIONS =================
  function getNomineeStats(nomineeId) {
    const dbData = getDB();
    const nominee = dbData.nominees.find(n => n.id === nomineeId);
    if (!nominee) return null;

    const nomineeTransfers = dbData.transfers.filter(t => t.nomineeId === nomineeId);
    const totalTransferred = nomineeTransfers
      .filter(t => t.type === 'transfer')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalReturned = nomineeTransfers
      .filter(t => t.type === 'return')
      .reduce((sum, t) => sum + t.amount, 0);

    const nomineeOrders = dbData.orders.filter(o => o.nomineeId === nomineeId);
    
    let totalOrderedValue = 0;
    let totalAllottedCost = 0;
    let totalRefundValue = 0;
    let totalSellValue = 0;
    let totalProfit = 0;
    let activeUnsoldCost = 0;

    nomineeOrders.forEach(o => {
      const stock = dbData.stocks.find(s => s.id === o.stockId);
      if (!stock) return;

      const price = stock.ipoPrice;
      const orderedVal = o.lotOrdered * 100 * price;
      totalOrderedValue += orderedVal;

      if (o.status === 'allotted' || o.status === 'sold' || o.status === 'not_allotted') {
        const allottedVal = o.lotAllotted * 100 * price;
        totalAllottedCost += allottedVal;
        totalRefundValue += (orderedVal - allottedVal);

        if (o.status === 'sold') {
          const sellVal = o.lotAllotted * 100 * o.sellPrice;
          const brokerFee = o.sellBrokerFee || 0;
          const exchangeFee = o.sellExchangeFee || 0;
          totalSellValue += sellVal;
          totalProfit += (sellVal - allottedVal - brokerFee - exchangeFee);
        } else {
          activeUnsoldCost += allottedVal;
        }
      }
    });

    const profitSharePct = nominee.profitSharePct !== undefined ? parseFloat(nominee.profitSharePct) : 0;
    const profitShareAmount = totalProfit > 0 ? Math.round(totalProfit * (profitSharePct / 100)) : 0;
    const userNetProfit = totalProfit - profitShareAmount;

    const outstandingBalance = (totalTransferred + totalProfit - profitShareAmount) - totalReturned;

    return {
      ...nominee,
      profitSharePct,
      profitShareAmount,
      userNetProfit,
      totalTransferred,
      totalReturned,
      totalOrderedValue,
      totalAllottedCost,
      totalRefundValue,
      totalSellValue,
      totalProfit,
      activeUnsoldCost,
      liquidCashBalance: outstandingBalance - activeUnsoldCost,
      outstandingBalance
    };
  }

  function getDashboardStats() {
    const dbData = getDB();
    const nominees = getNominees();
    
    let totalTransferred = 0;
    let totalReturned = 0;
    let totalOrdered = 0;
    let totalAllotted = 0;
    let totalRefunds = 0;
    let totalSellValue = 0;
    let totalProfit = 0;
    let totalActiveUnsold = 0;
    let totalLiquidCash = 0;
    let totalOutstanding = 0;
    let totalProfitShare = 0;
    let totalNetProfit = 0;

    nominees.forEach(n => {
      const stats = getNomineeStats(n.id);
      if (!stats) return;
      totalTransferred += stats.totalTransferred;
      totalReturned += stats.totalReturned;
      totalOrdered += stats.totalOrderedValue;
      totalAllotted += stats.totalAllottedCost;
      totalRefunds += stats.totalRefundValue;
      totalSellValue += stats.totalSellValue;
      totalProfit += stats.totalProfit;
      totalActiveUnsold += stats.activeUnsoldCost;
      totalLiquidCash += stats.liquidCashBalance;
      totalOutstanding += stats.outstandingBalance;
      totalProfitShare += stats.profitShareAmount;
      totalNetProfit += stats.userNetProfit;
    });

    const debts = dbData.debts || [];
    let totalDebtAmount = 0;
    let totalDebtPaid = 0;
    let totalDebtRemaining = 0;

    debts.forEach(d => {
      totalDebtAmount += d.amount;
      totalDebtPaid += d.paidAmount;
      totalDebtRemaining += (d.amount - d.paidAmount);
    });

    return {
      totalTransferred,
      totalReturned,
      totalOrdered,
      totalAllotted,
      totalRefunds,
      totalSellValue,
      totalProfit,
      totalProfitShare,
      totalNetProfit,
      totalActiveUnsold,
      totalLiquidCash,
      totalOutstanding,
      nomineeCount: nominees.length,
      stockCount: dbData.stocks.length,
      orderCount: dbData.orders.length,
      totalDebtAmount,
      totalDebtPaid,
      totalDebtRemaining,
      debtCount: debts.length
    };
  }

  function getStockStats(stockId) {
    const dbData = getDB();
    const stock = dbData.stocks.find(s => s.id === stockId);
    if (!stock) return null;

    const stockOrders = dbData.orders.filter(o => o.stockId === stockId);
    
    let totalOrderedLots = 0;
    let totalAllottedLots = 0;
    let totalOrderedValue = 0;
    let totalAllottedCost = 0;
    let totalRefundValue = 0;
    let totalSellValue = 0;
    let totalProfit = 0;
    let activeNomineesCount = new Set(stockOrders.map(o => o.nomineeId)).size;
    let ordersCount = stockOrders.length;

    stockOrders.forEach(o => {
      totalOrderedLots += o.lotOrdered;
      totalAllottedLots += o.lotAllotted;

      const orderedVal = o.lotOrdered * 100 * stock.ipoPrice;
      totalOrderedValue += orderedVal;

      if (o.status === 'allotted' || o.status === 'sold' || o.status === 'not_allotted') {
        const allottedVal = o.lotAllotted * 100 * stock.ipoPrice;
        totalAllottedCost += allottedVal;
        totalRefundValue += (orderedVal - allottedVal);

        if (o.status === 'sold') {
          const sellVal = o.lotAllotted * 100 * o.sellPrice;
          const brokerFee = o.sellBrokerFee || 0;
          const exchangeFee = o.sellExchangeFee || 0;
          totalSellValue += sellVal;
          totalProfit += (sellVal - allottedVal - brokerFee - exchangeFee);
        }
      }
    });

    return {
      ...stock,
      totalOrderedLots,
      totalAllottedLots,
      totalOrderedValue,
      totalAllottedCost,
      totalRefundValue,
      totalSellValue,
      totalProfit,
      activeNomineesCount,
      ordersCount
    };
  }

  function exportDatabase() {
    const data = getDB();
    return JSON.stringify(data, null, 2);
  }

  function importDatabase(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.nominees && parsed.stocks && parsed.orders && parsed.transfers) {
        if (!parsed.debts) parsed.debts = [];
        saveDB(parsed);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to import database:', e);
      return false;
    }
  }

  function seedDatabase() {
    const dbData = {
      nominees: [
        {
          id: "nominee-1",
          name: "Ahmad Subarjo",
          phone: "081234567890",
          bankName: "BCA",
          bankAccount: "1234567890",
          profitSharePct: 10,
          notes: "Akun IPO Keluarga",
          createdAt: new Date().toISOString()
        },
        {
          id: "nominee-2",
          name: "Siti Rahma",
          phone: "089876543210",
          bankName: "Mandiri",
          bankAccount: "9876543210",
          profitSharePct: 15,
          notes: "Akun IPO Kerabat",
          createdAt: new Date().toISOString()
        },
        {
          id: "nominee-3",
          name: "Budi Santoso",
          phone: "085612345678",
          bankName: "BRI",
          bankAccount: "5678901234",
          profitSharePct: 20,
          notes: "Akun IPO Teman Kantor",
          createdAt: new Date().toISOString()
        }
      ],
      stocks: [
        {
          id: "stock-1",
          code: "ADRO",
          name: "Adaro Energy Indonesia Tbk",
          ipoPrice: 3250,
          offeringDate: "2026-06-01",
          listingDate: "2026-06-15",
          status: "closed",
          createdAt: new Date().toISOString()
        },
        {
          id: "stock-2",
          code: "BUMI",
          name: "Bumi Resources Tbk",
          ipoPrice: 150,
          offeringDate: "2026-06-18",
          listingDate: "2026-06-28",
          status: "listed",
          createdAt: new Date().toISOString()
        },
        {
          id: "stock-3",
          code: "GOTO",
          name: "GoTo Gojek Tokopedia Tbk",
          ipoPrice: 338,
          offeringDate: "2026-07-02",
          listingDate: "2026-07-15",
          status: "allotted",
          createdAt: new Date().toISOString()
        }
      ],
      orders: [
        {
          id: "order-1",
          nomineeId: "nominee-1",
          stockId: "stock-1",
          lotOrdered: 100,
          lotAllotted: 5,
          sellPrice: 3600,
          status: "sold",
          createdAt: new Date().toISOString()
        },
        {
          id: "order-2",
          nomineeId: "nominee-1",
          stockId: "stock-2",
          lotOrdered: 500,
          lotAllotted: 50,
          sellPrice: 0,
          status: "allotted",
          createdAt: new Date().toISOString()
        },
        {
          id: "order-3",
          nomineeId: "nominee-2",
          stockId: "stock-1",
          lotOrdered: 50,
          lotAllotted: 2,
          sellPrice: 3500,
          status: "sold",
          createdAt: new Date().toISOString()
        },
        {
          id: "order-4",
          nomineeId: "nominee-2",
          stockId: "stock-3",
          lotOrdered: 1000,
          lotAllotted: 120,
          sellPrice: 0,
          status: "allotted",
          createdAt: new Date().toISOString()
        }
      ],
      transfers: [
        {
          id: "tx-1",
          nomineeId: "nominee-1",
          type: "transfer",
          amount: 45000000,
          date: "2026-05-25",
          notes: "Modal awal untuk IPO ADRO & BUMI",
          createdAt: new Date().toISOString()
        },
        {
          id: "tx-2",
          nomineeId: "nominee-1",
          type: "return",
          amount: 30000000,
          date: "2026-06-16",
          notes: "Pengembalian refund sisa ADRO",
          createdAt: new Date().toISOString()
        },
        {
          id: "tx-3",
          nomineeId: "nominee-2",
          type: "transfer",
          amount: 50000000,
          date: "2026-05-28",
          notes: "Transfer modal IPO ADRO & GOTO",
          createdAt: new Date().toISOString()
        },
        {
          id: "tx-4",
          nomineeId: "nominee-2",
          type: "return",
          amount: 15600000,
          date: "2026-06-16",
          notes: "Pengembalian refund ADRO",
          createdAt: new Date().toISOString()
        },
        {
          id: "tx-5",
          nomineeId: "nominee-3",
          type: "transfer",
          amount: 10000000,
          date: "2026-07-01",
          notes: "Modal IPO GOTO",
          createdAt: new Date().toISOString()
        }
      ],
      debts: [
        {
          id: "debt-1",
          creditorName: "Hendra Wijaya",
          amount: 50000000,
          paidAmount: 20000000,
          date: "2026-05-10",
          notes: "Pinjaman modal untuk IPO ADRO",
          createdAt: new Date().toISOString()
        },
        {
          id: "debt-2",
          creditorName: "Santi Putri",
          amount: 30000000,
          paidAmount: 30000000,
          date: "2026-06-01",
          notes: "Pinjaman jangka pendek",
          createdAt: new Date().toISOString()
        }
      ]
    };
    saveDB(dbData);
  }

  // Expose to global scope as a namespace object
  global.db = {
    initDB,
    getDB,
    saveDB,
    getNominees,
    addNominee,
    updateNominee,
    deleteNominee,
    getStocks,
    addStock,
    updateStock,
    deleteStock,
    getOrders,
    addOrder,
    updateOrder,
    deleteOrder,
    getTransfers,
    addTransfer,
    updateTransfer,
    deleteTransfer,
    getDebts,
    addDebt,
    updateDebt,
    deleteDebt,
    getNomineeStats,
    getDashboardStats,
    getStockStats,
    exportDatabase,
    importDatabase,
    seedDatabase
  };

})(window);
