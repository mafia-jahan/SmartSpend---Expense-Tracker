const App = {
  expenses: [],
  currentView: 'dashboard',

  CATEGORY_COLORS: {
    'Food & Dining': '#e17055',
    'Transportation': '#0984e3',
    'Shopping': '#fd79a8',
    'Entertainment': '#6c5ce7',
    'Bills & Utilities': '#fdcb6e',
    'Health': '#00b894',
    'Education': '#74b9ff',
    'Travel': '#e84393',
    'Other': '#636e72',
  },

  CATEGORY_ICONS: {
    'Food & Dining': 'fa-utensils',
    'Transportation': 'fa-car',
    'Shopping': 'fa-shopping-bag',
    'Entertainment': 'fa-film',
    'Bills & Utilities': 'fa-bolt',
    'Health': 'fa-heartbeat',
    'Education': 'fa-graduation-cap',
    'Travel': 'fa-plane',
    'Other': 'fa-circle',
  },

  init() {
    this.loadFromStorage()
    this.setupEventListeners()
    this.setDefaultDate()
    this.populateFilterCategories()
    this.render()
  },

  loadFromStorage() {
    try {
      const data = localStorage.getItem('smartspend_expenses')
      this.expenses = data ? JSON.parse(data) : []
    } catch {
      this.expenses = []
    }
  },

  saveToStorage() {
    localStorage.setItem('smartspend_expenses', JSON.stringify(this.expenses))
  },

  setDefaultDate() {
    const today = new Date().toISOString().split('T')[0]
    document.getElementById('expenseDate').value = today
  },

  setupEventListeners() {
    document.getElementById('menuToggle').addEventListener('click', () => {
      document.querySelector('.sidebar').classList.toggle('open')
    })

    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault()
        const view = item.dataset.view
        this.switchView(view)
        const sidebar = document.querySelector('.sidebar')
        if (window.innerWidth <= 768) sidebar.classList.remove('open')
      })
    })

    document.getElementById('expenseForm').addEventListener('submit', (e) => {
      e.preventDefault()
      this.addExpense()
    })

    document.getElementById('searchInput').addEventListener('input', () => {
      this.renderExpenses()
      this.renderRecent()
    })

    document.getElementById('filterCategory').addEventListener('change', () => {
      this.renderExpenses()
    })

    document.getElementById('filterSort').addEventListener('change', () => {
      this.renderExpenses()
    })

    document.querySelectorAll('.quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('expenseName').value = btn.dataset.name
        document.getElementById('expenseAmount').value = btn.dataset.amount
        document.getElementById('expenseCategory').value = btn.dataset.category
        this.switchView('add')
        document.getElementById('expenseName').focus()
      })
    })

    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768) {
        const sidebar = document.querySelector('.sidebar')
        const toggle = document.getElementById('menuToggle')
        if (sidebar.classList.contains('open') &&
            !sidebar.contains(e.target) &&
            !toggle.contains(e.target)) {
          sidebar.classList.remove('open')
        }
      }
    })
  },

  switchView(view) {
    this.currentView = view
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'))
    document.getElementById(`view-${view}`).classList.add('active')
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))
    document.querySelector(`.nav-item[data-view="${view}"]`).classList.add('active')
    if (view === 'dashboard') {
      this.renderDashboard()
    }
    if (view === 'expenses') {
      this.renderExpenses()
    }
  },

  addExpense() {
    const name = document.getElementById('expenseName').value.trim()
    const amount = parseFloat(document.getElementById('expenseAmount').value)
    const category = document.getElementById('expenseCategory').value
    const date = document.getElementById('expenseDate').value

    if (!name || !amount || !category || !date) {
      this.showToast('Please fill in all fields', 'error')
      return
    }

    const expense = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name,
      amount,
      category,
      date,
      createdAt: new Date().toISOString(),
    }

    this.expenses.push(expense)
    this.saveToStorage()
    this.render()
    document.getElementById('expenseForm').reset()
    this.setDefaultDate()
    this.showToast(`Added "${name}" - $${amount.toFixed(2)}`, 'success')
  },

  deleteExpense(id) {
    const expense = this.expenses.find(e => e.id === id)
    this.expenses = this.expenses.filter(e => e.id !== id)
    this.saveToStorage()
    this.render()
    if (expense) {
      this.showToast(`Deleted "${expense.name}"`, 'error')
    }
  },

  getFilteredExpenses() {
    const search = document.getElementById('searchInput').value.toLowerCase().trim()
    const category = document.getElementById('filterCategory').value
    const sort = document.getElementById('filterSort').value

    let filtered = [...this.expenses]

    if (search) {
      filtered = filtered.filter(e =>
        e.name.toLowerCase().includes(search) ||
        e.category.toLowerCase().includes(search)
      )
    }

    if (category !== 'all') {
      filtered = filtered.filter(e => e.category === category)
    }

    filtered.sort((a, b) => {
      switch (sort) {
        case 'oldest': return new Date(a.date) - new Date(b.date)
        case 'highest': return b.amount - a.amount
        case 'lowest': return a.amount - b.amount
        default: return new Date(b.date) - new Date(a.date)
      }
    })

    return filtered
  },

  getTotal() {
    return this.expenses.reduce((sum, e) => sum + e.amount, 0)
  },

  getMonthTotal() {
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()
    return this.expenses
      .filter(e => {
        const d = new Date(e.date)
        return d.getMonth() === month && d.getFullYear() === year
      })
      .reduce((sum, e) => sum + e.amount, 0)
  },

  getCategoryTotals() {
    const totals = {}
    this.expenses.forEach(e => {
      totals[e.category] = (totals[e.category] || 0) + e.amount
    })
    return totals
  },

  formatCurrency(amount) {
    return '$' + amount.toFixed(2)
  },

  formatDate(dateStr) {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  },

  render() {
    this.renderStats()
    this.renderDashboard()
    this.renderExpenses()
  },

  renderStats() {
    const total = this.getTotal()
    const count = this.expenses.length
    const monthTotal = this.getMonthTotal()
    const categories = Object.keys(this.getCategoryTotals()).length

    document.getElementById('statTotal').textContent = this.formatCurrency(total)
    document.getElementById('statCount').textContent = count
    document.getElementById('statMonth').textContent = this.formatCurrency(monthTotal)
    document.getElementById('statCategories').textContent = categories
    document.getElementById('totalExpensesDisplay').textContent = this.formatCurrency(total)
  },

  renderDashboard() {
    this.renderCategoryChart()
    this.renderRecent()
  },

  renderCategoryChart() {
    const container = document.getElementById('categoryChart')
    const totals = this.getCategoryTotals()
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1])

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="chart-empty">
          <i class="fas fa-chart-bar"></i>
          <p>No data yet — add some expenses!</p>
        </div>
      `
      return
    }

    const maxAmount = entries[0][1]

    container.innerHTML = entries.map(([category, amount]) => {
      const pct = maxAmount > 0 ? (amount / maxAmount) * 100 : 0
      const color = this.CATEGORY_COLORS[category] || '#636e72'
      return `
        <div class="chart-bar-wrapper">
          <span class="chart-bar-label">${category}</span>
          <div class="chart-bar-track">
            <div class="chart-bar-fill" style="width: ${pct}%; background: ${color};"></div>
          </div>
          <span class="chart-bar-value">${this.formatCurrency(amount)}</span>
        </div>
      `
    }).join('')
  },

  renderRecent() {
    const container = document.getElementById('recentList')
    const search = document.getElementById('searchInput').value.toLowerCase().trim()
    let recent = [...this.expenses]

    if (search) {
      recent = recent.filter(e =>
        e.name.toLowerCase().includes(search) ||
        e.category.toLowerCase().includes(search)
      )
    }

    recent.sort((a, b) => new Date(b.date) - new Date(a.date))
    recent = recent.slice(0, 6)

    if (recent.length === 0) {
      container.innerHTML = `
        <div class="chart-empty">
          <i class="fas fa-receipt"></i>
          <p>No recent expenses</p>
        </div>
      `
      return
    }

    container.innerHTML = recent.map(e => {
      const color = this.CATEGORY_COLORS[e.category] || '#636e72'
      const icon = this.CATEGORY_ICONS[e.category] || 'fa-circle'
      return `
        <div class="recent-item">
          <div class="recent-icon" style="background: ${color}22; color: ${color};">
            <i class="fas ${icon}"></i>
          </div>
          <div class="recent-info">
            <div class="recent-name">${e.name}</div>
            <div class="recent-date">${this.formatDate(e.date)} · ${e.category}</div>
          </div>
          <div class="recent-amount" style="color: ${color};">${this.formatCurrency(e.amount)}</div>
        </div>
      `
    }).join('')
  },

  renderExpenses() {
    const tbody = document.getElementById('expenseTableBody')
    const empty = document.getElementById('emptyExpenses')
    const filtered = this.getFilteredExpenses()

    if (filtered.length === 0) {
      tbody.innerHTML = ''
      empty.style.display = 'block'
      return
    }

    empty.style.display = 'none'

    tbody.innerHTML = filtered.map(e => {
      const color = this.CATEGORY_COLORS[e.category] || '#636e72'
      return `
        <tr>
          <td>${this.formatDate(e.date)}</td>
          <td><strong>${e.name}</strong></td>
          <td>
            <span class="category-badge" style="background: ${color}22; color: ${color};">
              ${e.category}
            </span>
          </td>
          <td class="amount-cell">${this.formatCurrency(e.amount)}</td>
          <td>
            <button class="delete-btn" onclick="App.deleteExpense('${e.id}')" title="Delete expense">
              <i class="fas fa-trash-alt"></i>
            </button>
          </td>
        </tr>
      `
    }).join('')
  },

  populateFilterCategories() {
    const select = document.getElementById('filterCategory')
    const categories = Object.keys(this.CATEGORY_COLORS)
    categories.forEach(cat => {
      const opt = document.createElement('option')
      opt.value = cat
      opt.textContent = cat
      select.appendChild(opt)
    })
  },

  showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer')
    const toast = document.createElement('div')
    toast.className = `toast ${type}`
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'
    toast.innerHTML = `<i class="fas ${icon}"></i> ${message}`
    container.appendChild(toast)
    setTimeout(() => {
      if (toast.parentNode) toast.remove()
    }, 3000)
  },
}

document.addEventListener('DOMContentLoaded', () => App.init())
