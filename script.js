// Global State
const state = {
    activeTickers: ['ASML'],
    timeHorizon: '1M',
    chartInstance: null,
    patternChartInstance: null,
    detectionSettings: {
        volumeSpikes: true,
        priceManipulation: true,
        insiderTrading: true,
        spoofing: false
    },
    alerts: [],
    marketData: {}
};

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Set current date
    const now = new Date();
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-GB', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    // Initialize event listeners
    initializeEventListeners();
    
    // Generate initial market data
    generateMarketData();
    
    // Initialize charts
    initializeMainChart();
    initializePatternChart();
    
    // Load initial alerts
    generateAlerts();
    
    // Update displays
    updateActiveTickersList();
    updateStatistics();
    updateAlertsDisplay();
    updateAnalysisTab();
    updateReportsTab();
}

function initializeEventListeners() {
    // Navigation tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });

    // Ticker selection
    document.getElementById('addAllBtn').addEventListener('click', addSelectedTickers);
    
    // Time horizon
    document.getElementById('timeHorizon').addEventListener('change', function(e) {
        state.timeHorizon = e.target.value;
        generateMarketData();
        updateMainChart();
    });

    // Detection settings
    ['volumeSpikes', 'priceManipulation', 'insiderTrading', 'spoofing'].forEach(id => {
        document.getElementById(id).addEventListener('change', function(e) {
            state.detectionSettings[id] = e.target.checked;
        });
    });

    // Analyze button
    document.getElementById('analyzeBtn').addEventListener('click', runAnalysis);

    // Chart type buttons
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            updateMainChart(this.dataset.chart);
        });
    });

    // Report generation
    document.getElementById('generateReportBtn').addEventListener('click', generateReport);

    // Set default dates for reports
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    document.getElementById('reportEndDate').valueAsDate = today;
    document.getElementById('reportStartDate').valueAsDate = weekAgo;
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    // Refresh charts when switching to analysis tab
    if (tabName === 'analysis') {
        setTimeout(() => {
            if (state.patternChartInstance) {
                state.patternChartInstance.resize();
            }
        }, 100);
    }
}

function addSelectedTickers() {
    const select = document.getElementById('tickerSelect');
    const selectedOptions = Array.from(select.selectedOptions);
    
    selectedOptions.forEach(option => {
        const ticker = option.value;
        if (!state.activeTickers.includes(ticker)) {
            state.activeTickers.push(ticker);
        }
    });

    updateActiveTickersList();
    updateStatistics();
    generateMarketData();
    updateMainChart();
}

function removeTicker(ticker) {
    state.activeTickers = state.activeTickers.filter(t => t !== ticker);
    updateActiveTickersList();
    updateStatistics();
    generateMarketData();
    updateMainChart();
}

function updateActiveTickersList() {
    const container = document.getElementById('activeTickersList');
    
    if (state.activeTickers.length === 0) {
        container.innerHTML = '<p style="color: var(--dark-gray); font-style: italic;">No tickers selected</p>';
        return;
    }

    container.innerHTML = state.activeTickers.map(ticker => {
        const status = getTickerStatus(ticker);
        return `
            <div class="ticker-item">
                <span class="ticker-symbol">${ticker}</span>
                <span class="ticker-status status-${status.class}">${status.text}</span>
                <button class="btn-remove" onclick="removeTicker('${ticker}')">×</button>
            </div>
        `;
    }).join('');
}

function getTickerStatus(ticker) {
    const data = state.marketData[ticker];
    if (!data) return { text: 'Loading...', class: 'normal' };

    const latestVolume = data.volume[data.volume.length - 1];
    const avgVolume = data.volume.reduce((a, b) => a + b, 0) / data.volume.length;
    const volumeRatio = latestVolume / avgVolume;

    if (volumeRatio > 3) {
        return { text: 'Alert', class: 'alert' };
    } else if (volumeRatio > 2) {
        return { text: 'Warning', class: 'warning' };
    } else {
        return { text: 'Normal', class: 'normal' };
    }
}

function updateStatistics() {
    const totalVolume = Object.values(state.marketData).reduce((sum, data) => {
        return sum + (data.volume[data.volume.length - 1] || 0);
    }, 0);

    document.getElementById('totalVolume').textContent = `€${(totalVolume / 1000000).toFixed(1)}M`;
    document.getElementById('activeAlerts').textContent = state.alerts.filter(a => a.severity === 'high').length;
    document.getElementById('flaggedEvents').textContent = state.alerts.length;
    document.getElementById('monitoringCount').textContent = `${state.activeTickers.length} ticker${state.activeTickers.length !== 1 ? 's' : ''}`;
}

// Market Data Generation
function generateMarketData() {
    const periods = getPeriodsForHorizon(state.timeHorizon);
    
    state.activeTickers.forEach(ticker => {
        state.marketData[ticker] = {
            dates: generateDates(periods),
            prices: generatePriceData(periods, 50 + Math.random() * 150),
            volume: generateVolumeData(periods, 1000000 + Math.random() * 5000000),
            returns: []
        };

        // Calculate returns
        const prices = state.marketData[ticker].prices;
        state.marketData[ticker].returns = prices.slice(1).map((price, i) => 
            ((price - prices[i]) / prices[i]) * 100
        );
    });
}

function getPeriodsForHorizon(horizon) {
    const horizonMap = {
        '1D': 24,
        '1W': 7,
        '1M': 30,
        '3M': 90,
        '6M': 180,
        '1Y': 365,
        'YTD': Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 1)) / (1000 * 60 * 60 * 24))
    };
    return horizonMap[horizon] || 30;
}

function generateDates(periods) {
    const dates = [];
    const now = new Date();
    for (let i = periods - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        dates.push(date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));
    }
    return dates;
}

function generatePriceData(periods, startPrice) {
    const prices = [startPrice];
    let trend = (Math.random() - 0.5) * 0.02;
    
    for (let i = 1; i < periods; i++) {
        // Add some trend changes
        if (Math.random() < 0.1) {
            trend = (Math.random() - 0.5) * 0.02;
        }
        
        // Add noise and trend
        const change = (Math.random() - 0.5) * 0.05 + trend;
        const newPrice = prices[i - 1] * (1 + change);
        prices.push(Math.max(newPrice, startPrice * 0.5)); // Prevent going too low
    }
    
    // Add some manipulation patterns (spikes)
    const numSpikes = Math.floor(Math.random() * 3);
    for (let i = 0; i < numSpikes; i++) {
        const spikeIndex = Math.floor(Math.random() * (periods - 10)) + 5;
        prices[spikeIndex] *= 1.08 + Math.random() * 0.07;
        // Gradual recovery
        for (let j = 1; j < 5; j++) {
            if (spikeIndex + j < periods) {
                const recovery = 1 - (j * 0.02);
                prices[spikeIndex + j] = prices[spikeIndex] * recovery + prices[spikeIndex + j] * (1 - recovery);
            }
        }
    }
    
    return prices;
}

function generateVolumeData(periods, avgVolume) {
    const volumes = [];
    
    for (let i = 0; i < periods; i++) {
        // Normal volume with some variation
        let volume = avgVolume * (0.7 + Math.random() * 0.6);
        
        // Add volume spikes (potential market abuse)
        if (Math.random() < 0.05) {
            volume *= (3 + Math.random() * 4);
        }
        
        volumes.push(Math.floor(volume));
    }
    
    return volumes;
}

// Chart Functions
function initializeMainChart() {
    const ctx = document.getElementById('mainChart').getContext('2d');
    
    state.chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.dataset.yAxisID === 'y1' ? 
                                    new Intl.NumberFormat('en-US').format(context.parsed.y) :
                                    '€' + context.parsed.y.toFixed(2);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Price (€)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Volume'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            }
        }
    });

    updateMainChart();
}

function updateMainChart(type = 'price') {
    if (!state.chartInstance || state.activeTickers.length === 0) return;

    const firstTicker = state.activeTickers[0];
    const data = state.marketData[firstTicker];
    
    if (!data) return;

    const datasets = [];
    const colors = ['#003d82', '#0066cc', '#ff6600', '#28a745', '#ffc107', '#dc3545'];

    if (type === 'price' || type === 'combined') {
        state.activeTickers.forEach((ticker, index) => {
            const tickerData = state.marketData[ticker];
            datasets.push({
                label: `${ticker} Price`,
                data: tickerData.prices,
                borderColor: colors[index % colors.length],
                backgroundColor: colors[index % colors.length] + '20',
                borderWidth: 2,
                tension: 0.1,
                yAxisID: 'y',
                hidden: type === 'combined' && index > 0
            });
        });
    }

    if (type === 'volume' || type === 'combined') {
        state.activeTickers.forEach((ticker, index) => {
            const tickerData = state.marketData[ticker];
            datasets.push({
                label: `${ticker} Volume`,
                data: tickerData.volume,
                type: 'bar',
                backgroundColor: colors[index % colors.length] + '40',
                borderColor: colors[index % colors.length],
                borderWidth: 1,
                yAxisID: 'y1',
                hidden: type === 'price' || (type === 'combined' && index > 0)
            });
        });
    }

    state.chartInstance.data.labels = data.dates;
    state.chartInstance.data.datasets = datasets;
    state.chartInstance.update();
}

function initializePatternChart() {
    const ctx = document.getElementById('patternChart').getContext('2d');
    
    state.patternChartInstance = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Normal Behavior',
                data: [],
                backgroundColor: '#28a745',
                pointRadius: 5
            }, {
                label: 'Suspicious Activity',
                data: [],
                backgroundColor: '#dc3545',
                pointRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Volume vs. Price Change Pattern Analysis'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Price Change (%)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Volume Deviation (σ)'
                    }
                }
            }
        }
    });

    updatePatternChart();
}

function updatePatternChart() {
    if (!state.patternChartInstance || state.activeTickers.length === 0) return;

    const normalData = [];
    const suspiciousData = [];

    state.activeTickers.forEach(ticker => {
        const data = state.marketData[ticker];
        if (!data) return;

        const avgVolume = data.volume.reduce((a, b) => a + b, 0) / data.volume.length;
        const stdVolume = Math.sqrt(data.volume.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) / data.volume.length);

        data.volume.forEach((volume, i) => {
            if (i === 0) return;
            
            const priceChange = data.returns[i - 1];
            const volumeDeviation = (volume - avgVolume) / stdVolume;

            const point = { x: priceChange, y: volumeDeviation };

            if (Math.abs(volumeDeviation) > 3 || (Math.abs(priceChange) > 5 && Math.abs(volumeDeviation) > 2)) {
                suspiciousData.push(point);
            } else {
                normalData.push(point);
            }
        });
    });

    state.patternChartInstance.data.datasets[0].data = normalData;
    state.patternChartInstance.data.datasets[1].data = suspiciousData;
    state.patternChartInstance.update();
}

// Analysis and Detection
function runAnalysis() {
    generateAlerts();
    updateAlertsDisplay();
    updateAnalysisTab();
    updateStatistics();
    
    // Show notification
    alert('Analysis complete. ' + state.alerts.length + ' potential issues detected.');
}

function generateAlerts() {
    state.alerts = [];

    state.activeTickers.forEach(ticker => {
        const data = state.marketData[ticker];
        if (!data) return;

        // Volume spike detection
        if (state.detectionSettings.volumeSpikes) {
            detectVolumeSpikes(ticker, data);
        }

        // Price manipulation detection
        if (state.detectionSettings.priceManipulation) {
            detectPriceManipulation(ticker, data);
        }

        // Insider trading patterns
        if (state.detectionSettings.insiderTrading) {
            detectInsiderPatterns(ticker, data);
        }

        // Spoofing detection
        if (state.detectionSettings.spoofing) {
            detectSpoofing(ticker, data);
        }
    });

    // Sort by severity
    state.alerts.sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
    });
}

function detectVolumeSpikes(ticker, data) {
    const avgVolume = data.volume.reduce((a, b) => a + b, 0) / data.volume.length;
    const stdVolume = Math.sqrt(data.volume.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) / data.volume.length);

    data.volume.forEach((volume, i) => {
        const deviation = (volume - avgVolume) / stdVolume;
        
        if (deviation > 3) {
            state.alerts.push({
                ticker: ticker,
                type: 'Volume Spike',
                severity: deviation > 5 ? 'high' : 'medium',
                date: data.dates[i],
                description: `Abnormal volume spike detected (${deviation.toFixed(2)}σ above mean). Volume: ${(volume / 1000000).toFixed(2)}M vs avg ${(avgVolume / 1000000).toFixed(2)}M`,
                timestamp: new Date(Date.now() - (data.volume.length - i) * 24 * 60 * 60 * 1000)
            });
        }
    });
}

function detectPriceManipulation(ticker, data) {
    // Look for rapid price movements followed by reversals
    for (let i = 2; i < data.prices.length - 2; i++) {
        const change1 = ((data.prices[i] - data.prices[i-1]) / data.prices[i-1]) * 100;
        const change2 = ((data.prices[i+1] - data.prices[i]) / data.prices[i]) * 100;
        
        // Detect pump and dump pattern
        if (Math.abs(change1) > 5 && Math.sign(change1) !== Math.sign(change2) && Math.abs(change2) > 3) {
            state.alerts.push({
                ticker: ticker,
                type: 'Price Manipulation',
                severity: 'high',
                date: data.dates[i],
                description: `Potential pump-and-dump pattern: ${change1.toFixed(2)}% move followed by ${change2.toFixed(2)}% reversal`,
                timestamp: new Date(Date.now() - (data.prices.length - i) * 24 * 60 * 60 * 1000)
            });
        }
    }
}

function detectInsiderPatterns(ticker, data) {
    // Look for unusual activity before large price movements
    for (let i = 5; i < data.prices.length - 5; i++) {
        const futureReturn = ((data.prices[i+5] - data.prices[i]) / data.prices[i]) * 100;
        
        if (Math.abs(futureReturn) > 10) {
            const recentVolumes = data.volume.slice(i-3, i+1);
            const avgRecentVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
            const normalVolume = data.volume.slice(0, i-3).reduce((a, b) => a + b, 0) / (i-3);
            
            if (avgRecentVolume > normalVolume * 1.5) {
                state.alerts.push({
                    ticker: ticker,
                    type: 'Unusual Pre-Announcement Activity',
                    severity: 'medium',
                    date: data.dates[i],
                    description: `Elevated volume before ${futureReturn > 0 ? 'positive' : 'negative'} price movement of ${Math.abs(futureReturn).toFixed(2)}%`,
                    timestamp: new Date(Date.now() - (data.prices.length - i) * 24 * 60 * 60 * 1000)
                });
                break; // Only report once per ticker
            }
        }
    }
}

function detectSpoofing(ticker, data) {
    // Simplified spoofing detection: look for very high volume with minimal price change
    for (let i = 1; i < data.volume.length; i++) {
        const avgVolume = data.volume.reduce((a, b) => a + b, 0) / data.volume.length;
        const priceChange = Math.abs(((data.prices[i] - data.prices[i-1]) / data.prices[i-1]) * 100);
        
        if (data.volume[i] > avgVolume * 4 && priceChange < 0.5) {
            state.alerts.push({
                ticker: ticker,
                type: 'Potential Spoofing',
                severity: 'low',
                date: data.dates[i],
                description: `High volume (${(data.volume[i] / 1000000).toFixed(2)}M) with minimal price movement (${priceChange.toFixed(2)}%)`,
                timestamp: new Date(Date.now() - (data.volume.length - i) * 24 * 60 * 60 * 1000)
            });
        }
    }
}

function updateAlertsDisplay() {
    const container = document.getElementById('alertsList');
    
    if (state.alerts.length === 0) {
        container.innerHTML = '<p style="color: var(--dark-gray); font-style: italic;">No suspicious activity detected</p>';
        return;
    }

    const recentAlerts = state.alerts.slice(0, 5);
    
    container.innerHTML = recentAlerts.map(alert => `
        <div class="alert-item ${alert.severity}-severity">
            <div class="alert-content">
                <div class="alert-title">${alert.ticker} - ${alert.type}</div>
                <div class="alert-description">${alert.description}</div>
            </div>
            <div class="alert-time">${alert.date}</div>
            <div class="alert-actions">
                <button class="btn-investigate" onclick="investigateAlert('${alert.ticker}', '${alert.type}')">Investigate</button>
                <button class="btn-dismiss" onclick="dismissAlert('${alert.ticker}', '${alert.type}')">Dismiss</button>
            </div>
        </div>
    `).join('');
}

function investigateAlert(ticker, type) {
    alert(`Opening detailed investigation for ${ticker} - ${type}\n\nThis would open a detailed analysis view with:\n- Full transaction history\n- Order book analysis\n- Related party transactions\n- Timeline reconstruction`);
}

function dismissAlert(ticker, type) {
    state.alerts = state.alerts.filter(a => !(a.ticker === ticker && a.type === type));
    updateAlertsDisplay();
    updateStatistics();
}

// Analysis Tab Updates
function updateAnalysisTab() {
    updateAnomaliesList();
    updatePatternChart();
    updateTimeline();
    updateRiskScores();
    updateCorrelationMatrix();
}

function updateAnomaliesList() {
    const container = document.getElementById('anomaliesList');
    const anomalies = state.alerts.filter(a => a.severity === 'high').slice(0, 5);
    
    if (anomalies.length === 0) {
        container.innerHTML = '<p style="color: var(--dark-gray); font-style: italic;">No high-severity anomalies detected</p>';
        return;
    }

    container.innerHTML = anomalies.map(anomaly => `
        <div class="anomaly-item">
            <div class="anomaly-header">
                <span class="anomaly-ticker">${anomaly.ticker}</span>
                <span class="anomaly-score">Risk: ${calculateRiskScore(anomaly)}/10</span>
            </div>
            <div class="anomaly-description">${anomaly.type}: ${anomaly.description}</div>
        </div>
    `).join('');
}

function calculateRiskScore(alert) {
    const baseScores = { high: 8, medium: 5, low: 3 };
    const typeMultipliers = {
        'Price Manipulation': 1.2,
        'Unusual Pre-Announcement Activity': 1.1,
        'Volume Spike': 1.0,
        'Potential Spoofing': 0.9
    };
    
    const score = baseScores[alert.severity] * (typeMultipliers[alert.type] || 1);
    return Math.min(10, score).toFixed(1);
}

function updateTimeline() {
    const container = document.getElementById('timeline');
    const timelineEvents = state.alerts.slice(0, 8);
    
    if (timelineEvents.length === 0) {
        container.innerHTML = '<p style="color: var(--dark-gray); font-style: italic;">No events to display</p>';
        return;
    }

    container.innerHTML = timelineEvents.map((event, index) => {
        const markerClass = event.severity === 'high' ? 'alert' : event.severity === 'medium' ? 'warning' : '';
        return `
            <div class="timeline-item">
                <div class="timeline-marker ${markerClass}">${index + 1}</div>
                <div class="timeline-content">
                    <div class="timeline-date">${event.date} - ${event.ticker}</div>
                    <div class="timeline-title">${event.type}</div>
                    <div class="timeline-description">${event.description}</div>
                </div>
            </div>
        `;
    }).join('');
}

function updateRiskScores() {
    const container = document.getElementById('riskScores');
    
    const riskScores = state.activeTickers.map(ticker => {
        const tickerAlerts = state.alerts.filter(a => a.ticker === ticker);
        const score = tickerAlerts.reduce((sum, alert) => sum + parseFloat(calculateRiskScore(alert)), 0);
        const normalizedScore = Math.min(100, (score / tickerAlerts.length || 0) * 10);
        
        return { ticker, score: normalizedScore };
    });

    container.innerHTML = riskScores.map(item => {
        const riskClass = item.score > 70 ? 'risk-high' : item.score > 40 ? 'risk-medium' : 'risk-low';
        return `
            <div class="risk-item">
                <div class="risk-header">
                    <span class="risk-ticker">${item.ticker}</span>
                    <span class="risk-value">${item.score.toFixed(0)}%</span>
                </div>
                <div class="risk-bar">
                    <div class="risk-fill ${riskClass}" style="width: ${item.score}%">
                        ${item.score > 15 ? item.score.toFixed(0) + '%' : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateCorrelationMatrix() {
    const container = document.getElementById('correlationMatrix');
    
    if (state.activeTickers.length < 2) {
        container.innerHTML = '<p style="color: var(--dark-gray); font-style: italic;">Add more tickers to see correlation analysis</p>';
        return;
    }

    const correlations = calculateCorrelations();
    
    let tableHTML = '<table class="correlation-table"><thead><tr><th></th>';
    state.activeTickers.forEach(ticker => {
        tableHTML += `<th>${ticker}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';

    state.activeTickers.forEach((ticker1, i) => {
        tableHTML += `<tr><th>${ticker1}</th>`;
        state.activeTickers.forEach((ticker2, j) => {
            const corr = i === j ? 1.0 : correlations[i][j];
            const corrClass = corr > 0.3 ? 'correlation-positive' : corr < -0.3 ? 'correlation-negative' : 'correlation-neutral';
            tableHTML += `<td class="${corrClass}">${corr.toFixed(2)}</td>`;
        });
        tableHTML += '</tr>';
    });

    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
}

function calculateCorrelations() {
    const returns = state.activeTickers.map(ticker => state.marketData[ticker].returns);
    const n = state.activeTickers.length;
    const correlations = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i === j) {
                correlations[i][j] = 1.0;
            } else {
                correlations[i][j] = calculatePearsonCorrelation(returns[i], returns[j]);
            }
        }
    }

    return correlations;
}

function calculatePearsonCorrelation(x, y) {
    const n = Math.min(x.length, y.length);
    const sumX = x.slice(0, n).reduce((a, b) => a + b, 0);
    const sumY = y.slice(0, n).reduce((a, b) => a + b, 0);
    const sumXY = x.slice(0, n).reduce((sum, xi, idx) => sum + xi * y[idx], 0);
    const sumX2 = x.slice(0, n).reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.slice(0, n).reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = (n * sumXY) - (sumX * sumY);
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    return denominator === 0 ? 0 : numerator / denominator;
}

// Reports Tab
function updateReportsTab() {
    // Placeholder for any dynamic updates needed in the reports tab
}   