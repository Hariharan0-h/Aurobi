// Global state
let state = {
    tables: [],
    selectedTable: null,
    tableSchema: [],
    tableData: [],
    availableAttributes: [],
    selectedAttributes: [],
    relations: [],
    savedDatasets: [],
    chart: null,
    filteredData: [],
    groupedData: [],
    currentFilter: null,
    currentGrouping: null
};

function saveAsDataset() {
    if (!state.selectedTable || !state.selectedAttributes.length) {
        alert("Please select a table and at least one attribute first");
        return;
    }
    
    const datasetName = prompt("Enter a name for this dataset:", `${state.selectedTable}_dataset`);
    if (!datasetName) return;

    const newDataset = {
        id: Date.now(),
        name: datasetName,
        table: state.selectedTable,
        attributes: [...state.selectedAttributes],
        createdAt: new Date().toISOString()
    };
    
    state.savedDatasets.push(newDataset);
    localStorage.setItem('dashboardDatasets', JSON.stringify(state.savedDatasets));
    renderDatasets();
    document.querySelector('.tab[data-tab="datasets"]').click();
}

function loadSavedDatasets() {
    const saved = localStorage.getItem('dashboardDatasets');
    if (saved) state.savedDatasets = JSON.parse(saved);
}

function renderDatasets() {
    const datasetsContent = document.getElementById('datasets-content');
    datasetsContent.innerHTML = state.savedDatasets.length 
        ? `<div class="saved-datasets"><h3>Saved Datasets</h3><ul class="datasets-list">${state.savedDatasets.map(dataset => `
            <li class="dataset-item" data-id="${dataset.id}">
                <div class="dataset-info">
                    <h4>${dataset.name}</h4>
                    <p>Table: ${dataset.table}</p>
                    <p>Attributes: ${dataset.attributes.join(', ')}</p>
                    <p class="dataset-date">Created: ${new Date(dataset.createdAt).toLocaleString()}</p>
                </div>
                <div class="dataset-actions">
                    <button class="btn load-dataset-btn" onclick="loadDataset(${dataset.id})">Load</button>
                    <button class="btn delete-dataset-btn" onclick="deleteDataset(${dataset.id})">Delete</button>
                </div>
            </li>`).join('')}</ul></div>`
        : '<p>Saved datasets will appear here</p>';
}

function loadDataset(datasetId) {
    const dataset = state.savedDatasets.find(ds => ds.id === datasetId);
    if (!dataset) return;

    selectTable(dataset.table);
    state.selectedAttributes = [...dataset.attributes];
    renderAttributes();
    renderDataTable();
    updateFilterAndGroupSelects();
    updateChart();
}

function deleteDataset(datasetId) {
    if (confirm("Are you sure you want to delete this dataset?")) {
        state.savedDatasets = state.savedDatasets.filter(ds => ds.id !== datasetId);
        localStorage.setItem('dashboardDatasets', JSON.stringify(state.savedDatasets));
        renderDatasets();
    }
}

function addSaveDatasetButton() {
    const actionsDiv = document.querySelector('.actions');
    const saveDatasetBtn = document.createElement('button');
    saveDatasetBtn.id = 'save-dataset-btn';
    saveDatasetBtn.className = 'btn save-dataset-btn';
    saveDatasetBtn.textContent = 'Save Dataset';
    saveDatasetBtn.addEventListener('click', saveAsDataset);
    actionsDiv.appendChild(saveDatasetBtn);
}

document.addEventListener('DOMContentLoaded', init);

function init() {
    setupTabs();
    fetchTables();
    fetchRelations();
    addSaveDatasetButton();
    loadSavedDatasets();
    renderDatasets();
    setupFilterControls();
    setupGroupControls();
    document.getElementById('move-right').addEventListener('click', () => moveAllAttributes('right'));
    document.getElementById('move-left').addEventListener('click', () => moveAllAttributes('left'));
    document.getElementById('export-btn').addEventListener('click', exportData);
    document.getElementById('chart-type').addEventListener('change', updateChart);
    document.getElementById('data-field').addEventListener('change', updateChart);
    setupTooltips();
}

function setupTooltips() {
    document.querySelectorAll('[title]').forEach(el => el.classList.add('tooltip'));
}

function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.tab-content > div').forEach(content => content.classList.remove('active'));
            document.getElementById(`${tab.dataset.tab}-content`).classList.add('active');
        });
    });
}

function setupFilterControls() {
    const applyFilterBtn = document.getElementById('apply-filter');
    const clearFilterBtn = document.getElementById('clear-filter');
    applyFilterBtn.addEventListener('click', applyFilter);
    clearFilterBtn.addEventListener('click', clearFilter);
    document.getElementById('filter-value').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') applyFilter();
    });
}

function setupGroupControls() {
    document.getElementById('apply-group').addEventListener('click', applyGrouping);
    document.getElementById('clear-group').addEventListener('click', clearGrouping);
}

function updateFilterAndGroupSelects() {
    if (!state.selectedAttributes.length) return;

    const filterFieldSelect = document.getElementById('filter-field');
    const groupFieldSelect = document.getElementById('group-field');
    filterFieldSelect.innerHTML = '';
    groupFieldSelect.innerHTML = '';

    state.selectedAttributes.forEach(attr => {
        const option = document.createElement('option');
        option.value = attr;
        option.textContent = attr;
        filterFieldSelect.appendChild(option);
        groupFieldSelect.appendChild(option.cloneNode(true));
    });
    updateDataFieldSelect();
}

function applyFilter() {
    const field = document.getElementById('filter-field').value;
    const operator = document.getElementById('filter-operator').value;
    const value = document.getElementById('filter-value').value;

    if (!field || value === '') {
        alert('Please select a field and enter a value to filter by');
        return;
    }

    state.currentFilter = { field, operator, value };
    state.filteredData = state.tableData.filter(row => {
        if (row[field] === undefined || row[field] === null) return false;
        const cellValue = String(row[field]).toLowerCase();
        const filterValue = value.toLowerCase();
        return operator === 'equals' ? cellValue === filterValue :
               operator === 'contains' ? cellValue.includes(filterValue) :
               operator === 'greater' ? !isNaN(parseFloat(cellValue)) && !isNaN(parseFloat(filterValue)) && parseFloat(cellValue) > parseFloat(filterValue) :
               operator === 'less' ? !isNaN(parseFloat(cellValue)) && !isNaN(parseFloat(filterValue)) && parseFloat(cellValue) < parseFloat(filterValue) : true;
    });

    if (state.currentGrouping) clearGrouping();
    document.querySelector('.filter-controls').classList.add('active-filter');
    renderDataTable();
    updateChart();
}

function clearFilter() {
    state.currentFilter = null;
    state.filteredData = [];
    document.getElementById('filter-value').value = '';
    document.querySelector('.filter-controls').classList.remove('active-filter');
    renderDataTable();
    updateChart();
}

function applyGrouping() {
    const field = document.getElementById('group-field').value;
    if (!field) {
        alert('Please select a field to group by');
        return;
    }

    state.currentGrouping = { field };
    const dataToGroup = state.currentFilter ? state.filteredData : state.tableData;

    if (!dataToGroup.length) {
        alert('No data to group. Please check your filter.');
        state.currentGrouping = null;
        return;
    }

    const groupedObj = dataToGroup.reduce((acc, row) => {
        const groupValue = row[field] || 'Unknown';
        acc[groupValue] = acc[groupValue] || [];
        acc[groupValue].push(row);
        return acc;
    }, {});

    state.groupedData = Object.keys(groupedObj).map(key => {
        const group = groupedObj[key];
        const result = { [field]: key, count: group.length };
        state.selectedAttributes.forEach(attr => {
            if (attr !== field) {
                const values = group.map(row => parseFloat(row[attr])).filter(v => !isNaN(v));
                if (values.length) {
                    result[`sum_${attr}`] = values.reduce((a, b) => a + b, 0);
                    result[`avg_${attr}`] = result[`sum_${attr}`] / values.length;
                    result[`min_${attr}`] = Math.min(...values);
                    result[`max_${attr}`] = Math.max(...values);
                }
            }
        });
        return result;
    });

    document.querySelector('.group-controls').classList.add('active-group');
    renderGroupedDataTable();
    updateGroupedChart();
}

function clearGrouping() {
    state.currentGrouping = null;
    state.groupedData = [];
    document.querySelector('.group-controls').classList.remove('active-group');
    renderDataTable();
    updateChart();
}

async function fetchTables() {
    try {
        const response = await fetch('https://localhost:7129/api/database/tables');
        state.tables = await response.json();
        renderTableList();
    } catch {
        state.tables = ['Customers', 'Orders', 'Products', 'Employees'];
        renderTableList();
    }
}

async function fetchTableSchema(tableName) {
    try {
        const response = await fetch(`https://localhost:7129/api/database/schema/${tableName}`);
        state.tableSchema = await response.json();
        state.availableAttributes = state.tableSchema.map(column => column.column_name);
        state.selectedAttributes = []; // Reset selected attributes
        renderAttributes();
        updateFilterAndGroupSelects();
    } catch {
        state.availableAttributes = tableName === 'Customers' ? ['CustomerId', 'CompanyName', 'ContactName', 'City', 'Country', 'Phone'] :
            tableName === 'Orders' ? ['OrderId', 'CustomerId', 'EmployeeId', 'OrderDate', 'ShipCountry'] :
            tableName === 'Products' ? ['ProductId', 'ProductName', 'UnitPrice', 'CategoryId', 'UnitsInStock'] :
            ['Field1', 'Field2', 'Field3', 'Field4', 'Field5'];
        state.selectedAttributes = [];
        renderAttributes();
        updateFilterAndGroupSelects();
    }
}

async function fetchTableData(tableName) {
    try {
        const response = await fetch(`https://localhost:7129/api/database/data/${tableName}`);
        state.tableData = await response.json();
        renderDataTable();
        updateChart();
        document.getElementById('export-btn').disabled = false;
    } catch {
        state.tableData = tableName === 'Customers' ? [
            { CustomerId: 'ALFKI', CompanyName: 'Alfreds Futterkiste', ContactName: 'Maria Anders', City: 'Berlin', Country: 'Germany', Phone: '030-0074321' },
            { CustomerId: 'ANATR', CompanyName: 'Ana Trujillo Emparedados', ContactName: 'Ana Trujillo', City: 'México D.F.', Country: 'Mexico', Phone: '(5) 555-4729' },
            { CustomerId: 'ANTON', CompanyName: 'Antonio Moreno Taquería', ContactName: 'Antonio Moreno', City: 'México D.F.', Country: 'Mexico', Phone: '(5) 555-3932' }
        ] : tableName === 'Orders' ? [
            { OrderId: 10248, CustomerId: 'VINET', EmployeeId: 5, OrderDate: '1996-07-04', ShipCountry: 'France' },
            { OrderId: 10249, CustomerId: 'TOMSP', EmployeeId: 6, OrderDate: '1996-07-05', ShipCountry: 'Germany' },
            { OrderId: 10250, CustomerId: 'HANAR', EmployeeId: 4, OrderDate: '1996-07-08', ShipCountry: 'Brazil' }
        ] : tableName === 'Products' ? [
            { ProductId: 1, ProductName: 'Chai', UnitPrice: 18.00, CategoryId: 1, UnitsInStock: 39 },
            { ProductId: 2, ProductName: 'Chang', UnitPrice: 19.00, CategoryId: 1, UnitsInStock: 17 },
            { ProductId: 3, ProductName: 'Aniseed Syrup', UnitPrice: 10.00, CategoryId: 2, UnitsInStock: 13 }
        ] : [
            { Field1: 'Value1', Field2: 'Value2', Field3: 100, Field4: 200, Field5: 'Text' },
            { Field1: 'Value3', Field2: 'Value4', Field3: 300, Field4: 400, Field5: 'Text' },
            { Field1: 'Value5', Field2: 'Value6', Field3: 500, Field4: 600, Field5: 'Text' }
        ];
        renderDataTable();
        updateChart();
        document.getElementById('export-btn').disabled = false;
    }
}

async function fetchRelations() {
    try {
        const response = await fetch('https://localhost:7129/api/database/primary-keys');
        state.relations = await response.json();
        if (state.tables.length) renderTableList();
    } catch {
        state.relations = [
            { primary_table: 'Customers', primary_column: 'CustomerId', foreign_table: 'Orders', foreign_column: 'CustomerId' },
            { primary_table: 'Products', primary_column: 'ProductId', foreign_table: 'Order Details', foreign_column: 'ProductId' }
        ];
    }
}

function renderTableList() {
    const tableList = document.getElementById('table-list');
    tableList.innerHTML = state.tables.map(table => {
        const tableRelations = state.relations.filter(r => r.primary_table === table || r.foreign_table === table);
        return `<li class="${table === state.selectedTable ? 'selected' : ''}" onclick="selectTable('${table}')">
            ${table}
            ${tableRelations.length ? `<div class="relations"><small>Relations:</small><ul>${tableRelations.map(relation => `
                <li>${relation.primary_table === table ? `→ ${relation.foreign_table} (${relation.foreign_column})` : `← ${relation.primary_table} (${relation.primary_column})`}</li>`).join('')}</ul></div>` : ''}
        </li>`;
    }).join('');
}

function renderAttributes() {
    const availableAttributesList = document.getElementById('available-attributes');
    const selectedAttributesList = document.getElementById('selected-attributes');
    availableAttributesList.innerHTML = state.availableAttributes.filter(attr => !state.selectedAttributes.includes(attr)).map(attr => `
        <li class="attribute-item" onclick="selectAttribute('${attr}')">${attr}</li>`).join('');
    selectedAttributesList.innerHTML = state.selectedAttributes.map(attr => `
        <li class="attribute-item selected" onclick="unselectAttribute('${attr}')">${attr}</li>`).join('');
}

function renderGroupedDataTable() {
    if (!state.groupedData.length) {
        document.getElementById('table-header').innerHTML = '';
        document.getElementById('table-body').innerHTML = '';
        return;
    }

    const groupField = state.currentGrouping.field;
    const columns = [groupField, 'count', ...new Set(state.groupedData.flatMap(row => Object.keys(row).filter(key => key !== groupField && key !== 'count')))];

    document.getElementById('table-header').innerHTML = `<tr>${columns.map(col => `<th>${col}</th>`).join('')}</tr>`;
    document.getElementById('table-body').innerHTML = state.groupedData.map(row => `<tr>${columns.map(col => `<td>${row[col] !== undefined ? row[col] : ''}</td>`).join('')}</tr>`).join('');
}

function renderDataTable() {
    const dataToRender = state.currentGrouping ? state.groupedData : state.currentFilter ? state.filteredData : state.tableData;
    const selectedAttributes = state.selectedAttributes;

    if (!dataToRender.length || !selectedAttributes.length) {
        document.getElementById('table-header').innerHTML = '';
        document.getElementById('table-body').innerHTML = '<tr><td colspan="100%" class="no-data">No data to display</td></tr>';
        return;
    }

    document.getElementById('table-header').innerHTML = `<tr>${selectedAttributes.map(attr => `<th>${attr}</th>`).join('')}</tr>`;
    document.getElementById('table-body').innerHTML = dataToRender.slice(0, 1000).map(row => `<tr>${selectedAttributes.map(attr => `<td>${row[attr] !== undefined ? row[attr] : ''}</td>`).join('')}</tr>`).join('');
    if (dataToRender.length > 1000) {
        document.getElementById('table-body').innerHTML += `<tr class="info-row"><td colspan="${selectedAttributes.length}">Showing 1000 of ${dataToRender.length} rows</td></tr>`;
    }
}

function updateDataFieldSelect() {
    const dataFieldSelect = document.getElementById('data-field');
    dataFieldSelect.innerHTML = state.selectedAttributes.map(attr => `<option value="${attr}">${attr}</option>`).join('');
}

function updateChart() {
    if (state.currentGrouping) return updateGroupedChart();
    const dataToUse = state.currentFilter ? state.filteredData : state.tableData;
    if (!dataToUse.length || !state.selectedAttributes.length) return clearChart();

    if (state.chart) state.chart.destroy();
    const chartType = document.getElementById('chart-type').value;
    const dataField = document.getElementById('data-field').value;

    if (chartType === 'pie') renderPieChart(dataField, dataToUse);
    else if (chartType === 'bar') renderBarChart(dataField, dataToUse);
}

function clearChart() {
    if (state.chart) {
        state.chart.destroy();
        state.chart = null;
    }
    const ctx = document.getElementById('chart-canvas').getContext('2d');
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function renderPieChart(dataField, dataToUse) {
    const counts = dataToUse.reduce((acc, row) => {
        const value = row[dataField] || 'Unknown';
        acc[value] = (acc[value] || 0) + 1;
        return acc;
    }, {});

    const sortedLabels = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 15);
    if (sortedLabels.length > 15) {
        counts['Other'] = Object.keys(counts).slice(15).reduce((sum, label) => sum + counts[label], 0);
        sortedLabels.push('Other');
    }

    const data = sortedLabels.map(label => counts[label]);
    const ctx = document.getElementById('chart-canvas').getContext('2d');
    state.chart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: sortedLabels,
            datasets: [{
                data,
                backgroundColor: sortedLabels.map((_, index) => getChartColor(index)),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: `Distribution of ${dataField}`, font: { size: 16 } },
                legend: { position: 'right' },
                tooltip: {
                    callbacks: {
                        label: context => {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((context.raw / total) * 100);
                            return `${context.label}: ${context.raw} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function renderBarChart(dataField, dataToUse) {
    const counts = dataToUse.reduce((acc, row) => {
        const value = row[dataField] || 'Unknown';
        acc[value] = (acc[value] || 0) + 1;
        return acc;
    }, {});

    const sortedLabels = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 20);
    const data = sortedLabels.map(label => counts[label]);
    const ctx = document.getElementById('chart-canvas').getContext('2d');
    state.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedLabels,
            datasets: [{
                label: dataField,
                data,
                backgroundColor: getChartColor(0),
                borderColor: getDarkerColor(getChartColor(0)),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: `Distribution of ${dataField}`, font: { size: 16 } }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Count' } },
                x: { title: { display: true, text: dataField } }
            }
        }
    });
}

function getChartColor(index) {
    const colors = [
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 99, 132, 0.8)',
        'rgba(75, 192, 192, 0.8)',
        'rgba(255, 206, 86, 0.8)',
        'rgba(153, 102, 255, 0.8)',
        'rgba(255, 159, 64, 0.8)'
    ];
    return colors[index % colors.length];
}

function getDarkerColor(rgba) {
    const match = rgba.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
    if (match) {
        const r = Math.max(0, parseInt(match[1]) - 20);
        const g = Math.max(0, parseInt(match[2]) - 20);
        const b = Math.max(0, parseInt(match[3]) - 20);
        return `rgba(${r}, ${g}, ${b}, ${match[4]})`;
    }
    return rgba;
}

function selectTable(table) {
    state.selectedTable = table;
    renderTableList();
    fetchTableSchema(table);
    fetchTableData(table);
}

function selectAttribute(attr) {
    if (!state.selectedAttributes.includes(attr)) {
        state.selectedAttributes.push(attr);
        state.availableAttributes = state.availableAttributes.filter(a => a !== attr); // Remove from available
        renderAttributes();
        renderDataTable();
        updateFilterAndGroupSelects();
        updateChart();
    }
}

function unselectAttribute(attr) {
    state.selectedAttributes = state.selectedAttributes.filter(a => a !== attr);
    state.availableAttributes.push(attr); // Add back to available
    renderAttributes();
    renderDataTable();
    updateFilterAndGroupSelects();
    updateChart();
}

function moveAllAttributes(direction) {
    if (direction === 'right') {
        state.selectedAttributes = [...new Set([...state.selectedAttributes, ...state.availableAttributes])];
        state.availableAttributes = []; // Clear available attributes
    } else if (direction === 'left') {
        state.availableAttributes = [...new Set([...state.availableAttributes, ...state.selectedAttributes])];
        state.selectedAttributes = []; // Clear selected attributes
    }
    renderAttributes();
    renderDataTable();
    updateFilterAndGroupSelects();
    updateChart();
}

function exportData() {
    const dataToExport = state.currentGrouping ? state.groupedData : state.currentFilter ? state.filteredData : state.tableData;
    if (!dataToExport.length) return alert('No data to export');

    const headers = state.currentGrouping ? Object.keys(dataToExport[0]) : state.selectedAttributes;
    const csvContent = [
        headers.join(','),
        ...dataToExport.map(row => headers.map(header => {
            const value = row[header] !== undefined ? row[header] : '';
            return value === '' || String(value).includes(',') || String(value).includes('"') || String(value).includes('\n')
                ? `"${String(value).replace(/"/g, '""')}"`
                : value;
        }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `${state.selectedTable}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => {
        errorDiv.classList.add('show');
        setTimeout(() => {
            errorDiv.classList.remove('show');
            setTimeout(() => document.body.removeChild(errorDiv), 300);
        }, 3000);
    }, 10);
}